"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { CHECKLIST_ITEMS, type Progress, type Review } from "@/lib/types";

const REVIEW_SOURCE = [
  { mission: "m3", keys: ["problem", "mvp", "context", "p1", "stack"] },
  { mission: "m4", keys: ["scenario", "wireframe", "test_design"] },
];

export default function PeerReviewSection({
  myName,
  target,
}: {
  myName: string;
  target?: string;
}) {
  const [targetProgress, setTargetProgress] = useState<Progress | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [received, setReceived] = useState<Review[]>([]);

  // 내가 받은 검토
  useEffect(() => {
    const q = query(collection(getDb(), "reviews"), where("target", "==", myName));
    return onSnapshot(q, (snap) => {
      setReceived(snap.docs.map((d) => d.data() as Review));
    });
  }, [myName]);

  // 검토 상대의 제출물과 내가 이미 쓴 검토
  useEffect(() => {
    if (!target) return;
    const db = getDb();
    const unsubTarget = onSnapshot(doc(db, "progress", target), (snap) => {
      setTargetProgress(snap.exists() ? ({ ...snap.data() } as Progress) : null);
    });
    const unsubMine = onSnapshot(doc(db, "reviews", `${myName}_${target}`), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Review;
      setChecklist(data.checklist ?? {});
      setComment(data.comment ?? "");
    });
    return () => {
      unsubTarget();
      unsubMine();
    };
  }, [myName, target]);

  const save = async () => {
    if (!target || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await setDoc(doc(getDb(), "reviews", `${myName}_${target}`), {
        reviewer: myName,
        target,
        checklist,
        comment,
        createdAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveError(
        (e as { code?: string })?.code === "permission-denied"
          ? "배정이 바뀌어 저장되지 않았습니다. 화면을 새로고침해 주세요."
          : "저장하지 못했습니다. 연결을 확인하고 다시 눌러 주세요.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="plate">
        <div className="section-bar">
          <span className="bar-glyph" />
          동료 검토
          {target ? <span className="ml-auto normal-case">상대: {target}</span> : null}
        </div>

        {!target ? (
          <p className="p-3 text-carbon">검토 상대가 아직 배정되지 않았습니다.</p>
        ) : (
          <div className="plate-inset m-2 space-y-4 p-3">
            {REVIEW_SOURCE.map(({ mission, keys }) => {
              const data = targetProgress?.missions?.[mission]?.data;
              return (
                <div key={mission} className="plate-white p-3">
                  <p className="chrome-label text-inkSoft">{mission} 제출물</p>
                  {!data ? (
                    <p className="mt-2 text-ink">상대가 아직 제출하지 않았습니다.</p>
                  ) : (
                    <dl className="mt-2 space-y-2">
                      {keys.map((k) =>
                        data[k]?.trim() ? (
                          <div key={k}>
                            <dt className="chrome-label text-inkSoft">{k}</dt>
                            <dd className="whitespace-pre-wrap text-ink">{data[k]}</dd>
                          </div>
                        ) : null,
                      )}
                    </dl>
                  )}
                </div>
              );
            })}

            <ul className="space-y-2">
              {CHECKLIST_ITEMS.map((item) => (
                <li key={item.key}>
                  <label className="flex items-center gap-2 text-ink">
                    <input
                      type="checkbox"
                      checked={checklist[item.key] === true}
                      onChange={(e) =>
                        setChecklist((prev) => ({ ...prev, [item.key]: e.target.checked }))
                      }
                      className="h-4 w-4 accent-signal"
                    />
                    {item.label}
                  </label>
                </li>
              ))}
            </ul>

            <label className="block">
              <span className="link-bold">코멘트 한 줄</span>
              <textarea
                className="text-input mt-1"
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-signal"
            >
              {saving ? "저장하는 중" : saved ? "저장됨" : "검토 저장"}
            </button>
            {saveError ? (
              <p className="bg-brand px-3 py-2 font-bold text-white">{saveError}</p>
            ) : null}
          </div>
        )}
      </section>

      <section className="plate">
        <div className="section-bar">
          <span className="bar-glyph" />
          내가 받은 검토
        </div>
        {received.length === 0 ? (
          <p className="p-3 text-carbon">아직 받은 검토가 없습니다.</p>
        ) : (
          <ul className="plate-inset m-2 space-y-3 p-3">
            {received.map((r) => (
              <li key={r.reviewer} className="plate-white p-3">
                <p className="chrome-label text-inkSoft">{r.reviewer}</p>
                <ul className="mt-2 space-y-1 text-ink">
                  {CHECKLIST_ITEMS.map((item) => (
                    <li key={item.key}>
                      <span
                        className={
                          r.checklist?.[item.key] ? "font-bold text-brand" : "text-inkSoft"
                        }
                      >
                        {r.checklist?.[item.key] ? "●" : "○"}
                      </span>{" "}
                      {item.label}
                    </li>
                  ))}
                </ul>
                {r.comment ? <p className="mt-2 text-ink">{r.comment}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
