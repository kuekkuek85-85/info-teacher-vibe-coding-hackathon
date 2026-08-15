import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin";
import { pairUp } from "@/lib/pairing";

export const dynamic = "force-dynamic";

const FAIL_DELAY_MS = 1000;

const unauthorized = async () => {
  await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
  return NextResponse.json({ ok: false }, { status: 401 });
};

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return unauthorized();
  }

  const pin = String(body.pin ?? "");
  const expected = process.env.TEACHER_PIN ?? "";
  if (!expected || pin !== expected) return unauthorized();

  const action = String(body.action ?? "");
  const adminDb = getAdminDb();

  try {
    switch (action) {
      case "verify":
        return NextResponse.json({ ok: true });

      case "openMission": {
        const missionId = String(body.missionId ?? "");
        if (!missionId) return NextResponse.json({ ok: false }, { status: 400 });
        await adminDb.collection("missions").doc(missionId).update({ open: true });
        return NextResponse.json({ ok: true });
      }

      case "closeMission": {
        const missionId = String(body.missionId ?? "");
        if (!missionId) return NextResponse.json({ ok: false }, { status: 400 });
        await adminDb.collection("missions").doc(missionId).update({ open: false });
        return NextResponse.json({ ok: true });
      }

      case "shuffle": {
        const rosterSnap = await adminDb.collection("roster").get();
        const roster = rosterSnap.docs.map((d) => d.data() as {
          name: string;
          school: string;
          role: "student" | "staff";
        });
        const students = roster.filter((r) => r.role === "student").map((r) => r.name);
        const instructorName = process.env.INSTRUCTOR_NAME || "이승엽";
        const instructor =
          roster.find((r) => r.name === instructorName && r.role === "staff")?.name ??
          roster.find((r) => r.role === "staff")?.name ??
          null;

        const assignment = pairUp(students, instructor);
        const batch = adminDb.batch();

        for (const [person, target] of assignment) {
          const ref = adminDb.collection("progress").doc(person);
          const snap = await ref.get();

          if (snap.exists) {
            // 이미 입장한 사람은 배정만 갈아 끼운다. ownerUid 는 건드리지 않는다.
            batch.update(ref, { reviewTarget: target });
          } else {
            // 아직 입장하지 않은 사람도 배정에서 빠지지 않게 골격을 만든다.
            // ownerUid 는 비워 두고, 본인이 입장할 때 /api/enter 가 채운다.
            const info = roster.find((r) => r.name === person);
            batch.set(ref, {
              ownerUid: null,
              name: person,
              school: info?.school ?? "",
              role: info?.role ?? "student",
              missions: {},
              currentStep: "m1",
              stuck: false,
              reviewTarget: target,
            });
          }
        }

        await batch.commit();
        return NextResponse.json({ ok: true, count: assignment.size });
      }

      case "resolveStuck": {
        const name = String(body.name ?? "");
        if (!name) return NextResponse.json({ ok: false }, { status: 400 });
        await adminDb
          .collection("progress")
          .doc(name)
          .set({ stuck: false, stuckAt: null }, { merge: true });
        return NextResponse.json({ ok: true });
      }

      case "setPresentOrder": {
        const names = Array.isArray(body.names) ? (body.names as string[]) : [];
        await adminDb
          .collection("config")
          .doc("global")
          .set({ presentOrder: names }, { merge: true });
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ ok: false }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "실패" },
      { status: 500 },
    );
  }
}
