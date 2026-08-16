import { NextResponse } from "next/server";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "./admin";
import { modelsToTry, nextHits, shouldTryNextModel } from "./tutor";

/** 모델 하나에 줄 시간. 넘으면 다음 모델로 넘어간다 */
const CALL_TIMEOUT_MS = 20000;
/** 요청 하나에 줄 시간. 모델을 갈아타도 이 이상은 기다리지 않는다 */
export const TOTAL_TIMEOUT_MS = 45000;

/** 지난번에 답한 모델을 기억한다. 막힌 모델을 매번 먼저 두드리지 않는다 */
let lastGood: string | null = null;

/**
 * 토큰 검증과 Firestore 는 자체 시간 제한이 없다.
 * 늦어지면 참가자는 아무 말도 못 듣고 기다린다. 여기서 끊는다.
 */
export class DeadlineError extends Error {}

export function withDeadline<T>(work: Promise<T>, deadline: number): Promise<T> {
  const left = deadline - Date.now();
  if (left <= 0) return Promise.reject(new DeadlineError());
  return Promise.race([
    work,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new DeadlineError()), left),
    ),
  ]);
}

export function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export const tooSlow = () => fail("지금 응답이 늦습니다. 잠시 뒤 다시 눌러 주세요.", 503);

/**
 * 이름만으로는 남의 이름을 대고 쓸 수 있다. 입장할 때 받은 토큰까지 본다.
 * 통과하면 Firestore 손잡이를 함께 돌려준다.
 */
export async function checkParticipant(
  request: Request,
  name: string,
  deadline: number,
): Promise<{ db: Firestore } | { error: NextResponse }> {
  if (!name) {
    return { error: fail("입장한 뒤에 쓸 수 있습니다. 홈에서 이름을 넣어 주세요.", 401) };
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return { error: fail("입장한 뒤에 쓸 수 있습니다. 홈에서 다시 입장해 주세요.", 401) };
  }

  let uid: string;
  try {
    uid = (await withDeadline(getAdminAuth().verifyIdToken(token), deadline)).uid;
  } catch (e) {
    // 토큰이 틀린 것과 늦는 것은 다른 일이다. 다음 행동이 갈린다.
    if (e instanceof DeadlineError) return { error: tooSlow() };
    return { error: fail("입장 상태가 끊겼습니다. 홈에서 다시 입장해 주세요.", 401) };
  }

  const db = getAdminDb();
  try {
    const mine = await withDeadline(db.collection("progress").doc(name).get(), deadline);
    if (!mine.exists || mine.data()?.ownerUid !== uid) {
      return {
        error: fail("이 이름으로 입장한 기기가 아닙니다. 홈에서 다시 입장해 주세요.", 403),
      };
    }
  } catch {
    return { error: tooSlow() };
  }

  return { db };
}

/**
 * 같은 사람이 짧은 시간에 몰아 보내는 것을 막는다.
 * 인스턴스 메모리에 세면 재시작하거나 여러 대로 뜰 때 그냥 뚫린다.
 */
export async function checkRate(
  db: Firestore,
  name: string,
  deadline: number,
): Promise<NextResponse | null> {
  const usage = db.collection("tutorUsage").doc(name);
  let allowed: boolean;
  try {
    allowed = await withDeadline(
      db.runTransaction(async (tx) => {
        const snap = await tx.get(usage);
        const result = nextHits(snap.data()?.hits, Date.now());
        tx.set(usage, { hits: result.hits }, { merge: true });
        return result.allowed;
      }),
      deadline,
    );
  } catch {
    return tooSlow();
  }
  return allowed
    ? null
    : fail("잠시 뒤에 다시 물어봐 주세요. 짧은 시간에 너무 많이 보냈습니다.", 429);
}

export interface Turn {
  role: "user" | "model";
  text: string;
}

/**
 * 모델이 내려가거나 몰려도 멈추지 않게 차례로 시도한다.
 * 답을 받으면 그 모델을 기억해 다음 요청에서 앞세운다.
 */
export async function askGemini({
  key,
  system,
  turns,
  deadline,
}: {
  key: string;
  system: string;
  turns: Turn[];
  deadline: number;
}): Promise<{ reply: string } | { error: NextResponse }> {
  const base = {
    systemInstruction: { parts: [{ text: system }] },
    contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    // 생각하는 데 쓰는 토큰도 이 한도에서 나간다. 좁게 잡으면 답이 중간에 잘린다.
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
  };
  // 길게 생각하면 20초를 넘긴다. 수업 중에 그만큼 기다리게 둘 수 없다.
  const thinking = { thinkingConfig: { thinkingLevel: "low" } };

  const call = (model: string, payload: object) => {
    const left = deadline - Date.now();
    // 남은 시간이 없으면 부르지 않는다. 400 재시도도 여기서 걸린다.
    if (left <= 0) throw new DeadlineError();
    return fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(Math.min(CALL_TIMEOUT_MS, left)),
      },
    );
  };

  let lastStatus = 0;
  for (const model of modelsToTry(process.env.GEMINI_MODEL, lastGood)) {
    if (Date.now() >= deadline) {
      lastStatus = 504;
      break;
    }

    // 본문을 읽다 끊기는 것도 응답이 없는 것과 같다. 한 덩어리로 묶는다.
    let reply: string | null = null;
    try {
      let res = await call(model, { ...base, ...thinking });
      // 이 설정을 모르는 모델이 있다. 그때는 설정 없이 한 번 더 부른다.
      if (res.status === 400) res = await call(model, base);

      if (!res.ok) {
        // 응답 본문에 키가 섞여 돌아올 수 있다. 상태와 모델 이름만 남긴다.
        console.error(`gemini: ${model} ${res.status}`);
        lastStatus = res.status;
        if (shouldTryNextModel(res.status)) continue;
        break;
      }

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      reply =
        (data.candidates?.[0]?.content?.parts ?? [])
          .map((p) => p.text ?? "")
          .join("")
          .trim() || null;
    } catch {
      // 끊기거나 시간이 다 된 것이다. 다음 모델로 넘어간다.
      console.error(`gemini: ${model} 응답 없음`);
      lastStatus = 504;
      continue;
    }

    if (reply) {
      lastGood = model;
      return { reply };
    }

    console.error(`gemini: ${model} 빈 응답`);
    lastStatus = 502;
  }

  if (lastStatus === 429 || lastStatus === 503 || lastStatus === 504) {
    return { error: fail("지금 몰려 있습니다. 잠시 뒤 다시 눌러 주세요.", 503) };
  }
  return { error: fail("답하지 못했습니다. 잠시 뒤 다시 눌러 주세요.", 502) };
}
