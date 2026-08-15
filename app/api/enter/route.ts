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

  const adminDb = getAdminDb();

  // uid 는 클라이언트 값을 믿지 않고 토큰에서 꺼낸다
  let uid: string;
  try {
    uid = (await getAdminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return fail();
  }

  const [codeSnap, rosterSnap] = await Promise.all([
    adminDb.collection("codes").doc(name).get(),
    adminDb.collection("roster").doc(name).get(),
  ]);
  if (!codeSnap.exists || !rosterSnap.exists) return fail();
  if (String(codeSnap.data()?.code) !== code) return fail();

  const roster = rosterSnap.data() as { school: string; role: "student" | "staff" };
  const progressRef = adminDb.collection("progress").doc(name);
  const progressSnap = await progressRef.get();

  if (!progressSnap.exists) {
    await progressRef.set({
      ownerUid: uid,
      name,
      school: roster.school,
      role: roster.role,
      missions: {},
      currentStep: "m1",
      stuck: false,
    });
  } else {
    // 기기를 바꿔 다시 들어온 경우다. 코드가 본인 증명이므로 소유권을 옮긴다.
    await progressRef.set(
      { ownerUid: uid, name, school: roster.school, role: roster.role },
      { merge: true },
    );
  }

  return NextResponse.json({ ok: true, role: roster.role, school: roster.school });
}
