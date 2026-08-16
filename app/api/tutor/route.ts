import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/admin";
import {
  buildSystemPrompt,
  modelsToTry,
  nextHits,
  shouldTryNextModel,
  validateTurns,
} from "@/lib/tutor";
import type { Mission } from "@/lib/types";

export const dynamic = "force-dynamic";

// 지난번에 답한 모델을 기억한다. 막힌 모델을 매번 먼저 두드리지 않는다.
let lastGood: string | null = null;

/** 모델 하나에 줄 시간. 넘으면 다음 모델로 넘어간다 */
const CALL_TIMEOUT_MS = 20000;
/** 요청 하나에 줄 시간. 모델을 갈아타도 이 이상은 기다리지 않는다 */
const TOTAL_TIMEOUT_MS = 45000;

/**
 * 토큰 검증과 Firestore 는 자체 시간 제한이 없다.
 * 늦어지면 참가자는 아무 말도 못 듣고 기다린다. 여기서 끊는다.
 */
class DeadlineError extends Error {}

function withDeadline<T>(work: Promise<T>, deadline: number): Promise<T> {
  const left = deadline - Date.now();
  if (left <= 0) return Promise.reject(new DeadlineError());
  return Promise.race([
    work,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new DeadlineError()), left),
    ),
  ]);
}

const tooSlow = () => fail("지금 응답이 늦습니다. 잠시 뒤 다시 눌러 주세요.", 503);

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  // 인증과 조회에 걸린 시간도 참가자가 기다린 시간이다. 여기서 잰다.
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;
  const key = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!key) {
    return fail("AI 튜터가 아직 켜지지 않았습니다. 강사에게 알려 주세요.", 503);
  }

  let body: Record<string, unknown>;
  try {
    // 본문이 늦게 들어오는 것도 기다림이다. 여기부터 시간 안에 둔다.
    body = await withDeadline(request.json(), deadline);
  } catch (e) {
    if (e instanceof DeadlineError) return tooSlow();
    return fail("요청을 읽지 못했습니다. 다시 보내 주세요.", 400);
  }

  const name = String(body.name ?? "").trim();
  if (!name) return fail("입장한 뒤에 쓸 수 있습니다. 홈에서 이름을 넣어 주세요.", 401);

  const checked = validateTurns(body.turns);
  if ("error" in checked) return fail(checked.error, 400);

  // 이름만으로는 남의 이름을 대고 쓸 수 있다. 입장할 때 받은 토큰까지 본다.
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return fail("입장한 뒤에 쓸 수 있습니다. 홈에서 다시 입장해 주세요.", 401);

  let uid: string;
  try {
    uid = (await withDeadline(getAdminAuth().verifyIdToken(token), deadline)).uid;
  } catch (e) {
    // 토큰이 틀린 것과 늦는 것은 다른 일이다. 다음 행동이 갈린다.
    if (e instanceof DeadlineError) return tooSlow();
    return fail("입장 상태가 끊겼습니다. 홈에서 다시 입장해 주세요.", 401);
  }

  const db = getAdminDb();
  const missionId = String(body.missionId ?? "").trim();
  let mission: Mission | null = null;
  let allowed: boolean;

  try {
    const mine = await withDeadline(
      db.collection("progress").doc(name).get(),
      deadline,
    );
    if (!mine.exists || mine.data()?.ownerUid !== uid) {
      return fail("이 이름으로 입장한 기기가 아닙니다. 홈에서 다시 입장해 주세요.", 403);
    }

    // 인스턴스 메모리에 세면 재시작하거나 여러 대로 뜰 때 그냥 뚫린다.
    const usage = db.collection("tutorUsage").doc(name);
    allowed = await withDeadline(
      db.runTransaction(async (tx) => {
        const snap = await tx.get(usage);
        const result = nextHits(snap.data()?.hits, Date.now());
        tx.set(usage, { hits: result.hits }, { merge: true });
        return result.allowed;
      }),
      deadline,
    );

    // 단계 정보는 서버에서 읽는다. 참가자가 보낸 안내문을 그대로 믿지 않는다.
    if (missionId) {
      const snap = await withDeadline(
        db.collection("missions").doc(missionId).get(),
        deadline,
      );
      // 아직 열지 않은 단계의 안내문과 카드는 넘기지 않는다.
      if (snap.exists && snap.data()?.open === true) {
        mission = { id: snap.id, ...snap.data() } as Mission;
      }
    }
  } catch {
    return tooSlow();
  }

  if (!allowed) {
    return fail("잠시 뒤에 다시 물어봐 주세요. 짧은 시간에 너무 많이 보냈습니다.", 429);
  }

  const base = {
    systemInstruction: { parts: [{ text: buildSystemPrompt(mission) }] },
    contents: checked.turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    // 생각하는 데 쓰는 토큰도 이 한도에서 나간다. 좁게 잡으면 답이 중간에 잘린다.
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
  };
  // 길게 생각하면 20초를 넘긴다. 수업 중에 그만큼 기다리게 둘 수 없다.
  const thinking = { thinkingConfig: { thinkingLevel: "low" } };

  const call = (model: string, payload: object) => {
    const left = deadline - Date.now();
    // 남은 시간이 없으면 부르지 않는다. 400 재시도도 여기서 걸린다.
    if (left <= 0) throw new Error("시간이 다 됐습니다");
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
        console.error(`tutor: ${model} ${res.status}`);
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
      console.error(`tutor: ${model} 응답 없음`);
      lastStatus = 504;
      continue;
    }

    if (reply) {
      lastGood = model;
      return NextResponse.json({ ok: true, reply });
    }

    console.error(`tutor: ${model} 빈 응답`);
    lastStatus = 502;
  }

  if (lastStatus === 429 || lastStatus === 503 || lastStatus === 504) {
    return fail("튜터가 지금 몰려 있습니다. 잠시 뒤 다시 눌러 주세요.", 503);
  }
  return fail("튜터가 답하지 못했습니다. 잠시 뒤 다시 눌러 주세요.", 502);
}
