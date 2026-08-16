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
import { buildGrillInput, buildGrillPrompt, validateGrillInput } from "@/lib/grill";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;
  const key = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!key) {
    return fail("아직 켜지지 않았습니다. 강사에게 알려 주세요.", 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await withDeadline(request.json(), deadline);
  } catch (e) {
    if (e instanceof DeadlineError) return tooSlow();
    return fail("요청을 읽지 못했습니다. 다시 눌러 주세요.", 400);
  }

  const name = String(body.name ?? "").trim();
  const checked = validateGrillInput(body.idea, body.roles);
  if ("error" in checked) return fail(checked.error, 400);

  const who = await checkParticipant(request, name, deadline);
  if ("error" in who) return who.error;

  const tooMany = await checkRate(who.db, name, deadline);
  if (tooMany) return tooMany;

  // 캐물 감은 참가자가 방금 적은 것이다. 저장을 기다리지 않고 받는다.
  const answer = await askGemini({
    key,
    system: buildGrillPrompt(),
    turns: [{ role: "user", text: buildGrillInput(checked.idea, checked.roles) }],
    deadline,
  });
  if ("error" in answer) return answer.error;

  return NextResponse.json({ ok: true, reply: answer.reply });
}
