import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/admin";

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

    if (!snap.exists) {
      tx.set(progressRef, {
        ownerUid: uid,
        name,
        school: roster.school,
        role: roster.role,
        missions: {},
        currentStep: "m1",
        stuck: false,
      });
      return false;
    }

    const owner = (snap.data() as { ownerUid?: string | null })?.ownerUid;
    if (owner && owner !== uid) return true;

    tx.set(
      progressRef,
      { ownerUid: uid, name, school: roster.school, role: roster.role },
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
