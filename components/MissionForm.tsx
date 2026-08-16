"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Mission, Progress } from "@/lib/types";
import { formatRoles, parseRoles } from "@/lib/roleField";
import { useDebouncedSave } from "@/lib/useDebouncedSave";

function buildPrefill(mission: Mission, progress: Progress | null): string | null {
  const p = mission.prefill as
    | { template: string; slot?: string; fromMission?: string; fromKey?: string }
    | undefined;
  if (!p?.template) return null;
  if (!p.slot || !p.fromMission || !p.fromKey) return p.template;
  const source = progress?.missions?.[p.fromMission]?.data?.[p.fromKey];
  return source?.trim() ? p.template.replace(p.slot, source) : p.template;
}

export default function MissionForm({
  mission,
  progress,
  name,
  onSave,
  onSubmit,
  onValuesChange,
  slot,
  slotAfter,
}: {
  mission: Mission;
  progress: Progress | null;
  name: string;
  onSave: (data: Record<string, string>) => Promise<void>;
  onSubmit: () => Promise<void>;
  /** 저장을 기다리지 않고 지금 적은 값을 알려 준다 */
  onValuesChange?: (values: Record<string, string>) => void;
  /** 칸 사이에 끼울 것. slotAfter 로 지정한 칸 바로 아래에 선다 */
  slot?: React.ReactNode;
  slotAfter?: string;
}) {
  const entry = progress?.missions?.[mission.id];
  const submitted = entry?.status === "submitted";

  const { status, savedAt, queue, backup, flush, readBackup } = useDebouncedSave(
    name,
    mission.id,
    onSave,
  );

  const [values, setValues] = useState<Record<string, string>>({});
  // 서버 값을 받기 전에는 제출하지 않는다. 빈 데이터로 제출 표시만 남는다.
  const [ready, setReady] = useState(false);
  const [restoredNotice, setRestoredNotice] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const initialized = useRef(false);
  // 초기화 전에 적은 것. 늦게 온 스냅샷이 이것을 덮어쓰면 안 된다.
  const typed = useRef<Record<string, string>>({});

  const prefillTarget = (mission.prefill as { targetKey?: string } | undefined)?.targetKey;
  const prefillText = useMemo(() => buildPrefill(mission, progress), [mission, progress]);

  // 최초 1회만 초기화한다. 이후에는 사용자 입력이 우선이다.
  useEffect(() => {
    if (initialized.current) return;
    if (!progress) return;

    const backup = readBackup();
    const base: Record<string, string> = { ...(entry?.data ?? {}) };

    if (backup) {
      Object.assign(base, backup);
      setRestoredNotice(true);
    }

    // 서버 응답이 늦으면 그 사이에 이미 적고 있을 수 있다. 적은 것이 이긴다.
    Object.assign(base, typed.current);

    // 프리필은 화면에만 넣으면 손대지 않고 제출했을 때 빈 값으로 남는다. 저장까지 예약한다.
    let prefilled = false;
    if (prefillTarget && !base[prefillTarget]?.trim() && prefillText) {
      base[prefillTarget] = prefillText;
      prefilled = true;
    }

    setValues(base);
    initialized.current = true;
    setReady(true);
    onValuesChange?.(base);
    // 초기화 전에 적은 것이 있으면 여기서 처음 올린다
    if (backup || prefilled || Object.keys(typed.current).length > 0) queue(base);
  }, [progress, entry, readBackup, queue, prefillTarget, prefillText]);

  const update = (key: string, value: string) => {
    const next = { ...values, [key]: value };
    typed.current = next;
    setValues(next);
    // 저장은 data 를 통째로 덮어쓴다. 초기화 전에는 앞서 적어 둔 칸이 아직 없어
    // 지금 친 것만 올라간다. 초기화가 끝난 뒤에 한꺼번에 올린다.
    // 그 사이에도 이 브라우저에는 남겨 둔다. 창을 닫아도 잃지 않는다.
    if (initialized.current) queue(next);
    else backup(next);
    // 카드가 이 값을 바로 받아 간다. 저장을 기다리면 방금 적은 것이 빠진다.
    onValuesChange?.(next);
  };

  const submit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const ok = await flush();
      if (!ok) {
        setSubmitError("저장하지 못해 제출을 멈췄습니다. 연결을 확인하고 다시 눌러 주세요.");
        return;
      }
      await onSubmit();
    } catch {
      setSubmitError("제출하지 못했습니다. 잠시 뒤 다시 눌러 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusText =
    status === "saving"
      ? "저장하는 중"
      : status === "error"
        ? "저장하지 못했습니다"
        : status === "saved" && savedAt
          ? `저장됨 ${savedAt}`
          : "";

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">제출 양식</p>
        <span className="caption">{statusText}</span>
      </div>

      <div className="mt-6 space-y-6">
        {status === "error" ? (
          <p className="body-sm link-strong">
            저장하지 못했습니다. 연결이 돌아오면 자동으로 다시 저장됩니다.
          </p>
        ) : null}

        {restoredNotice ? (
          <p className="body-sm link-strong">저장되지 않은 입력을 복원했습니다.</p>
        ) : null}

        {mission.fields.map((field) => (
          <div key={field.key}>
          <label className="block">
            <span className="body-lg link-strong">{field.label}</span>
            {field.type === "textarea" ? (
              <textarea
                className="text-input mt-2"
                rows={5}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => update(field.key, e.target.value)}
              />
            ) : field.type === "select" ? (
              <select
                className="text-input mt-2"
                value={values[field.key] ?? ""}
                onChange={(e) => update(field.key, e.target.value)}
              >
                <option value="">선택하세요</option>
                {(field.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : field.type === "roles" ? (
              <span className="mt-3 block space-y-3">
                {parseRoles(values[field.key], field.options ?? []).map((row, i, rows) => (
                  <span key={row.option} className="flex flex-wrap items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-black"
                      checked={row.checked}
                      aria-label={`${row.option} 사용`}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...row, checked: e.target.checked };
                        update(field.key, formatRoles(next));
                      }}
                    />
                    <span className="body-lg link-strong w-[64px]">{row.option}</span>
                    <input
                      className="text-input flex-1"
                      style={{ minWidth: 200 }}
                      type="text"
                      placeholder={field.placeholder}
                      aria-label={`${row.option} 역할`}
                      value={row.detail}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...row, detail: e.target.value };
                        update(field.key, formatRoles(next));
                      }}
                    />
                  </span>
                ))}
              </span>
            ) : field.type === "checklist" ? (
              <span className="mt-2 block space-y-2">
                {(field.options ?? []).map((o) => {
                  const chosen = (values[field.key] ?? "").split("|").filter(Boolean);
                  return (
                    <span key={o} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-black"
                        checked={chosen.includes(o)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...chosen, o]
                            : chosen.filter((c) => c !== o);
                          update(field.key, next.join("|"));
                        }}
                      />
                      {o}
                    </span>
                  );
                })}
              </span>
            ) : (
              <input
                className="text-input mt-2"
                type={field.type === "url" ? "url" : "text"}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => update(field.key, e.target.value)}
              />
            )}
          </label>
          {/* 카드를 칸 사이에 끼운다. 앞의 칸을 적은 뒤 카드를 쓰는 순서가 있다. */}
          {slotAfter === field.key ? <div className="mt-6">{slot}</div> : null}
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !ready}
          className="btn-primary"
        >
          {submitted ? "다시 제출하기" : "제출하기"}
        </button>
        <span className="body-sm">
          {ready ? "제출 후에도 수정됩니다" : "불러오는 중입니다. 곧 제출할 수 있습니다"}
        </span>
      </div>

      {submitError ? (
        <p className="body-sm link-strong mt-4">{submitError}</p>
      ) : null}
    </div>
  );
}
