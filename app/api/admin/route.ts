import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/admin";
import { attendees, seoulDay } from "@/lib/attendance";
import { clampIndex, findDeck } from "@/lib/decks";
import { resolveFallbackReviewer } from "@/lib/fallbackReviewer";
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

      case "workshopCode": {
        // 코드는 서버 환경 변수에만 있다. PIN 을 확인한 뒤 여기서만 넘긴다.
        const workshopCode = (process.env.WORKSHOP_CODE ?? "").trim();
        if (!workshopCode) {
          return NextResponse.json(
            {
              ok: false,
              message: "입장 코드가 설정되지 않았습니다. WORKSHOP_CODE 를 넣어 주세요.",
            },
            { status: 500 },
          );
        }
        return NextResponse.json({ ok: true, code: workshopCode });
      }

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

      // 참가자 화면을 강사가 잡는다. 자료가 떠 있는 동안 참가자는 다른 것을 누르지 못한다.
      case "showSlides": {
        const deck = findDeck(String(body.deck ?? ""));
        if (!deck) return NextResponse.json({ ok: false }, { status: 400 });
        const index = clampIndex(deck, Number(body.index ?? 0));
        await adminDb
          .collection("config")
          .doc("slides")
          .set({ deck: deck.id, index }, { merge: true });
        return NextResponse.json({ ok: true, index });
      }

      case "hideSlides": {
        await adminDb
          .collection("config")
          .doc("slides")
          .set({ deck: "", index: 0 }, { merge: true });
        return NextResponse.json({ ok: true });
      }

      case "shuffle": {
        const rosterSnap = await adminDb.collection("roster").get();
        const roster = rosterSnap.docs.map((d) => d.data() as {
          name: string;
          school: string;
          role: "student" | "staff";
        });
        // 명단에 있어도 못 오는 사람이 있다. 오늘 입장한 사람만 짝을 짓는다.
        // 안 온 사람을 넣으면 그 상대는 검토를 기다리다 빈 자리를 마주한다.
        const progressSnap = await adminDb.collection("progress").get();
        const entered: Record<string, unknown> = {};
        progressSnap.docs.forEach((d) => {
          entered[d.id] = (d.data() as { enteredDay?: string }).enteredDay;
        });
        const today = seoulDay();
        const students = attendees(
          roster.filter((r) => r.role === "student").map((r) => r.name),
          entered,
          today,
        );

        if (students.length < 2) {
          return NextResponse.json(
            {
              ok: false,
              message: `오늘 입장한 학생이 ${students.length}명입니다. 두 명 이상 입장한 뒤에 배정해 주세요.`,
            },
            { status: 400 },
          );
        }

        const check = resolveFallbackReviewer(
          roster,
          students,
          process.env.FALLBACK_REVIEWER_NAME,
        );
        if (!check.ok) {
          return NextResponse.json({ ok: false, message: check.message }, { status: 500 });
        }

        const assignment = pairUp(students, check.reviewer);

        // 배정은 전부 되거나 전부 안 되어야 한다. 중간에 끊기면 절반만 새 상대를
        // 받아 짝이 어긋난다. 또 배정 도중 참가자가 입장하면 골격 문서가 방금
        // 만들어진 progress 를 덮어써 ownerUid 를 지운다. 하나의 트랜잭션으로 묶는다.
        const entries = [...assignment];
        // 지난 배정이 남으면 오늘 빠진 사람에게 옛 상대가 붙어 있다.
        // m8 의 동료 도구도 그 사람 것을 가리킨다. 이번 배정 밖은 지운다.
        const stale = progressSnap.docs
          .filter((d) => !assignment.has(d.id))
          .filter((d) => (d.data() as { reviewTarget?: string }).reviewTarget)
          .map((d) => d.id);

        await adminDb.runTransaction(async (tx) => {
          const refs = entries.map(([person]) =>
            adminDb.collection("progress").doc(person),
          );
          const staleRefs = stale.map((person) =>
            adminDb.collection("progress").doc(person),
          );
          // 트랜잭션은 쓰기 전에 읽기를 모두 끝내야 한다.
          const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
          const staleSnaps = await Promise.all(staleRefs.map((ref) => tx.get(ref)));

          staleSnaps.forEach((snap, i) => {
            if (!snap.exists) return;
            tx.update(staleRefs[i], { reviewTarget: FieldValue.delete() });
          });

          entries.forEach(([person, target], i) => {
            const ref = refs[i];
            if (snaps[i].exists) {
              // 이미 입장했거나 골격이 있는 사람은 배정만 갈아 끼운다.
              tx.update(ref, { reviewTarget: target });
              return;
            }
            // 아직 입장하지 않은 사람도 배정에서 빠지지 않게 골격을 만든다.
            // ownerUid 는 비워 두고, 본인이 입장할 때 /api/enter 가 채운다.
            const info = roster.find((r) => r.name === person);
            tx.set(ref, {
              ownerUid: null,
              name: person,
              school: info?.school ?? "",
              role: info?.role ?? "student",
              missions: {},
              currentStep: "m1",
              stuck: false,
              reviewTarget: target,
            });
          });
        });

        return NextResponse.json({ ok: true, count: assignment.size });
      }

      case "releaseName": {
        // 공용 코드라서 이름은 먼저 들어온 기기가 잡는다.
        // 기기를 바꾼 사람이 다시 들어올 수 있게 소유권만 비운다. 제출물은 그대로 둔다.
        const name = String(body.name ?? "");
        if (!name) return NextResponse.json({ ok: false }, { status: 400 });
        const ref = adminDb.collection("progress").doc(name);
        if (!(await ref.get()).exists) {
          return NextResponse.json(
            { ok: false, message: `${name} 은 아직 입장한 적이 없습니다.` },
            { status: 400 },
          );
        }
        await ref.update({ ownerUid: null });
        return NextResponse.json({ ok: true });
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
