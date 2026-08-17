import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/admin";
import { seoulDay } from "@/lib/attendance";

export const dynamic = "force-dynamic";

const FAIL_DELAY_MS = 1000;

const fail = async () => {
  await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
  return NextResponse.json({ ok: false }, { status: 401 });
};

export async function POST(request: Request) {
  let body: { name?: string; code?: string; idToken?: string };
  try {
    body = await request.json();
  } catch {
    return fail();
  }

  const name = (body.name ?? "").trim();
  const code = (body.code ?? "").trim();
  const idToken = body.idToken ?? "";
  if (!name || !code || !idToken) return fail();

  // 워크숍 전체가 같은 코드를 쓴다. 개인별 코드가 아니다.
  const workshopCode = (process.env.WORKSHOP_CODE ?? "").trim();
  if (!workshopCode || code !== workshopCode) return fail();

  const adminDb = getAdminDb();

  // uid 는 클라이언트 값을 믿지 않고 토큰에서 꺼낸다
  let uid: string;
  try {
    uid = (await getAdminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return fail();
  }

  const rosterSnap = await adminDb.collection("roster").doc(name).get();
  if (!rosterSnap.exists) return fail();

  const roster = rosterSnap.data() as { school: string; role: "student" | "staff" };
  const progressRef = adminDb.collection("progress").doc(name);

  // 코드가 공용이라 이름만 알면 남의 칸에 들어갈 수 있다.
  // 두 기기가 같은 순간에 들어와도 하나만 이름을 잡도록 트랜잭션으로 묶는다.
  // 이미 다른 기기가 쓰는 이름은 운영자가 /teacher 에서 풀어 준 뒤에만 넘어간다.
  const taken = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(progressRef);

    // 오늘 왔다는 표시. 명단에 있어도 못 오는 사람이 있어
    // 대시보드와 짝 배정은 이 날짜를 보고 오늘 온 사람만 센다.
    const enteredDay = seoulDay();

    if (!snap.exists) {
      tx.set(progressRef, {
        ownerUid: uid,
        name,
        school: roster.school,
        role: roster.role,
        missions: {},
        currentStep: "m1",
        stuck: false,
        enteredDay,
      });
      return false;
    }

    const before = snap.data() as { ownerUid?: string | null; enteredDay?: string };
    if (before.ownerUid && before.ownerUid !== uid) return true;

    // 날이 바뀌었으면 어제 받은 검토 상대를 지운다. 어제 온 사람들로 짠 짝이라
    // 오늘 명단과 맞지 않는다. 강사가 오늘 사람으로 다시 배정한다.
    const carried =
      before.enteredDay && before.enteredDay !== enteredDay
        ? { reviewTarget: FieldValue.delete() }
        : {};

    tx.set(
      progressRef,
      { ownerUid: uid, name, school: roster.school, role: roster.role, enteredDay, ...carried },
      { merge: true },
    );
    return false;
  });

  if (taken) {
    return NextResponse.json(
      {
        ok: false,
        reason: "in_use",
        message:
          "이미 다른 기기에서 쓰고 있는 이름입니다. 본인이 맞으면 강사에게 말씀해 주세요.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, role: roster.role, school: roster.school });
}
