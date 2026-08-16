"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Mission, Progress } from "@/lib/types";
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
}: {
  mission: Mission;
  progress: Progress | null;
  name: string;
  onSave: (data: Record<string, string>) => Promise<void>;
  onSubmit: () => Promise<void>;
}) {
  const entry = progress?.missions?.[mission.id];
  const submitted = entry?.status === "submitted";

  const { status, savedAt, queue, flush, readBackup } = useDebouncedSave(
    name,
    mission.id,
    onSave,
  );

  const [values, setValues] = useState<Record<string, string>>({});
  const [restoredNotice, setRestoredNotice] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const initialized = useRef(false);

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

    // 프리필은 화면에만 넣으면 손대지 않고 제출했을 때 빈 값으로 남는다. 저장까지 예약한다.
    let prefilled = false;
    if (prefillTarget && !base[prefillTarget]?.trim() && prefillText) {
      base[prefillTarget] = prefillText;
      prefilled = true;
    }

    setValues(base);
    initialized.current = true;
    if (backup || prefilled) queue(base);
  }, [progress, entry, readBackup, queue, prefillTarget, prefillText]);

  const update = (key: string, value: string) => {
    const next = { ...values, [key]: value };
    setValues(next);
    queue(next);
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
          <label key={field.key} className="block">
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
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="btn-primary"
        >
          {submitted ? "다시 제출하기" : "제출하기"}
        </button>
        <span className="body-sm">제출 후에도 수정됩니다</span>
      </div>

      {submitError ? (
        <p className="body-sm link-strong mt-4">{submitError}</p>
      ) : null}
    </div>
  );
}
