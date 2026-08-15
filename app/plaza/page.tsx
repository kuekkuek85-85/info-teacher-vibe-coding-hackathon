"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import TopNav from "@/components/TopNav";
import { ensureAnonAuth, getDb } from "@/lib/firebase";
import { clearSession, getSavedName, getSavedRole } from "@/lib/session";
import type { Mission, Progress } from "@/lib/types";

export default function PlazaPage() {
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [people, setPeople] = useState<Progress[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setName(getSavedName());
    setRole(getSavedRole());
  }, []);

  useEffect(() => {
    let unsubP: (() => void) | undefined;
    let unsubM: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      await ensureAnonAuth();
      if (cancelled) return;
      const db = getDb();
      unsubM = onSnapshot(collection(db, "missions"), (snap) => {
        setMissions(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Mission)
            .sort((a, b) => a.order - b.order),
        );
      });
      unsubP = onSnapshot(collection(db, "progress"), (snap) => {
        setPeople(snap.docs.map((d) => ({ ...d.data() }) as Progress));
        setReady(true);
      });
    })();

    return () => {
      cancelled = true;
      unsubP?.();
      unsubM?.();
    };
  }, []);

  // 광장에 내보내는 필드는 이 목록만이다. 미션에 필드가 늘어도 저절로 공개되지 않는다.
  const SHOWN_FIELDS: { mission: string; key: string }[] = [
    { mission: "m2", key: "oneline" },
    { mission: "m7", key: "deploy_url" },
  ];
  const publicMissions = missions.filter((m) => m.visibility === "public");
  const shown = SHOWN_FIELDS.filter((s) =>
    publicMissions.some((m) => m.id === s.mission),
  );
  const students = people.filter((p) => p.role !== "staff");
  const staff = people.filter((p) => p.role === "staff");
  const sorted = [...students, ...staff].sort((a, b) =>
    (a.name ?? "").localeCompare(b.name ?? "", "ko"),
  );

  return (
    <>
      <TopNav
        name={name}
        role={role}
        onLeave={() => {
          clearSession();
          setName(null);
        }}
      />
      <main className="mx-auto max-w-[1000px] px-3 pb-24 pt-3">
        <div className="plate p-1">
          <div className="bg-ice px-5 py-6">
            <p className="wordmark text-[30px]">광장</p>
            <p className="mt-2 font-bold text-carbon">지금 어디까지 왔는지 보입니다.</p>
          </div>
        </div>

        {!ready ? (
          <p className="plate mt-3 p-3 text-carbon">불러오는 중입니다.</p>
        ) : sorted.length === 0 ? (
          <p className="plate mt-3 p-3 text-carbon">아직 입장한 사람이 없습니다.</p>
        ) : (
          <div className="mt-3 grid gap-2 min-[810px]:grid-cols-2">
            {sorted.map((p) => {
              const isStaff = p.role === "staff";
              return (
                <article key={p.name} className="plate-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-ink">{p.name}</span>
                    <span className="text-inkSoft">{p.school}</span>
                    {isStaff ? (
                      <span
                        className="bg-amber px-2 py-[1px] micro font-bold text-carbon"
                        style={{ borderRadius: 2 }}
                      >
                        강사
                      </span>
                    ) : null}
                    {p.stuck ? (
                      <span
                        className="bg-brand px-2 py-[1px] micro font-bold text-white"
                        style={{ borderRadius: 2 }}
                      >
                        막혔어요
                      </span>
                    ) : null}
                  </div>

                  {!isStaff ? (
                    <div className="mt-2 flex gap-[2px]">
                      {missions.map((m) => {
                        const entry = p.missions?.[m.id];
                        const tone = !m.open
                          ? "bg-mutedIndigo"
                          : entry?.status === "submitted"
                            ? "bg-signal"
                            : entry?.data
                              ? "bg-canvas"
                              : "bg-platinum";
                        return (
                          <span
                            key={m.id}
                            title={`${m.id} ${m.title}`}
                            className={`h-3 w-6 ${tone}`}
                            style={{ border: "1px solid #3d4f97" }}
                          />
                        );
                      })}
                    </div>
                  ) : null}

                  {!isStaff ? (
                    <dl className="mt-2 space-y-2">
                      {shown.map((s) => {
                        const mission = missions.find((m) => m.id === s.mission);
                        const entry = p.missions?.[s.mission];
                        if (!mission || entry?.status !== "submitted") return null;
                        const field = mission.fields.find((f) => f.key === s.key);
                        const v = entry.data?.[s.key];
                        if (!field || !v?.trim()) return null;
                        return (
                          <div key={`${s.mission}.${s.key}`} className="plate-inset p-2">
                            <dt className="chrome-label text-inkSoft">{field.label}</dt>
                            <dd className="mt-1">
                              {field.type === "url" ? (
                                <a
                                  href={v}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="link-bold break-all"
                                >
                                  {v} ▶
                                </a>
                              ) : (
                                <span className="whitespace-pre-wrap text-ink">{v}</span>
                              )}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
