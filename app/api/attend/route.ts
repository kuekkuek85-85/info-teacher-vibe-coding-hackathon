import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/admin";
import { seoulDay } from "@/lib/attendance";

export const dynamic = "force-dynamic";

/**
 * 오늘 왔다는 표시만 새로 찍는다.
 *
 * 워크숍은 이틀이다. 어제 입장한 사람은 이름이 기기에 남아 있어
 * 오늘은 입장 화면을 거치지 않는다. 그러면 어제 날짜가 그대로 남아
 * 대시보드와 짝 배정에서 빠진다. 화면을 열 때 여기로 한 번 알린다.
 *
 * 수업 코드는 묻지 않는다. 이미 자기 이름을 잡고 있는 기기인지만 본다.
 */
export async function POST(request: Request) {
  let body: { name?: string; idToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const idToken = body.idToken ?? "";
  if (!name || !idToken) return NextResponse.json({ ok: false }, { status: 400 });

  let uid: string;
  try {
    uid = (await getAdminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const adminDb = getAdminDb();
  const ref = adminDb.collection("progress").doc(name);
  const today = seoulDay();

  // 읽고 쓰는 사이에 강사가 셔플을 돌릴 수 있다. 그 틈에 들어온 새 상대를
  // 이 요청이 지우면 짝이 어긋난다. 날짜 확인과 갱신을 한 묶음으로 한다.
  const result = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return "없음";

    // 이 이름을 잡고 있는 기기만 출석을 갱신한다. 남의 이름을 대신 찍지 못한다.
    const data = snap.data() as { ownerUid?: string | null; enteredDay?: string };
    if (!data.ownerUid || data.ownerUid !== uid) return "남의것";
    if (data.enteredDay === today) return "이미";

    // 날이 바뀌었다. 어제 받은 검토 상대는 어제 온 사람들로 짠 것이라 오늘은 맞지 않는다.
    // 남겨 두면 대시보드에 배정된 것으로 보이고 m8 이 옛 상대를 가리킨다.
    tx.update(ref, { enteredDay: today, reviewTarget: FieldValue.delete() });
    return "찍음";
  });

  if (result === "없음") return NextResponse.json({ ok: false }, { status: 404 });
  if (result === "남의것") return NextResponse.json({ ok: false }, { status: 403 });
  return NextResponse.json({ ok: true, enteredDay: today });
}
