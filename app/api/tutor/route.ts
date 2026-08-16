import { NextResponse } from "next/server";
import {
  DeadlineError,
  TOTAL_TIMEOUT_MS,
  askGemini,
  checkParticipant,
  checkRate,
  fail,
  tooSlow,
  withDeadline,
} from "@/lib/gemini";
import { buildSystemPrompt, validateTurns } from "@/lib/tutor";
import type { Mission } from "@/lib/types";

export const dynamic = "force-dynamic";

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
  const checked = validateTurns(body.turns);
  if ("error" in checked) return fail(checked.error, 400);

  const who = await checkParticipant(request, name, deadline);
  if ("error" in who) return who.error;

  const tooMany = await checkRate(who.db, name, deadline);
  if (tooMany) return tooMany;

  // 단계 정보는 서버에서 읽는다. 참가자가 보낸 안내문을 그대로 믿지 않는다.
  const missionId = String(body.missionId ?? "").trim();
  let mission: Mission | null = null;
  if (missionId) {
    try {
      const snap = await withDeadline(
        who.db.collection("missions").doc(missionId).get(),
        deadline,
      );
      // 아직 열지 않은 단계의 안내문과 카드는 넘기지 않는다.
      if (snap.exists && snap.data()?.open === true) {
        mission = { id: snap.id, ...snap.data() } as Mission;
      }
    } catch {
      return tooSlow();
    }
  }

  const answer = await askGemini({
    key,
    system: buildSystemPrompt(mission),
    turns: checked.turns,
    deadline,
  });
  if ("error" in answer) return answer.error;

  return NextResponse.json({ ok: true, reply: answer.reply });
}
