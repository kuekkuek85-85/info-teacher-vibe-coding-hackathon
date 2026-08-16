"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ExpiredNotice from "@/components/ExpiredNotice";
import TopNav from "@/components/TopNav";
import { buildReadmeDraft, githubRepoUrl } from "@/lib/readme";
import { clearSession, getSavedName, getSavedRole } from "@/lib/session";
import { useProgress } from "@/lib/useProgress";

export default function ReadmePage() {
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const { progress, ready, expired, saveReadme, setReadmePushed } = useProgress(name);

  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [copied, setCopied] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const initialized = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // 아직 저장하지 못한 값. 화면을 떠나거나 닫을 때 이걸 밀어 넣는다.
  const pending = useRef<string | null>(null);
  // 렌더마다 바뀌는 함수를 이벤트에 물리면 정리 함수가 매번 돌아 중복 저장이 난다.
  const flushRef = useRef<() => void>(() => {});
  const backupKey = name ? `readme:${name}` : null;

  useEffect(() => {
    setName(getSavedName());
    setRole(getSavedRole());
    setRestored(true);
  }, []);

  // 순서는 로컬 사본, 서버에 저장된 초안, 제출물로 새로 만든 초안이다.
  // 저장하지 못한 채 브라우저가 닫혔다면 로컬 사본이 가장 최신이다.
  const [restoredNotice, setRestoredNotice] = useState(false);

  useEffect(() => {
    if (initialized.current || !progress) return;

    let backup: string | null = null;
    if (backupKey) {
      try {
        backup = localStorage.getItem(backupKey);
      } catch {
        backup = null;
      }
    }

    const saved = progress.readmeDraft ?? "";
    // 전부 지운 상태도 사용자가 정한 것이다. 빈 문자열도 복원 대상으로 본다.
    if (backup !== null && backup !== saved) {
      setText(backup);
      pending.current = backup;
      setRestoredNotice(true);
      // 복원만 하고 두면 서버에는 반영되지 않는다. 바로 저장을 예약한다.
      clearTimeout(timer.current);
      timer.current = setTimeout(() => flushRef.current(), 1500);
    } else {
      setText(saved.trim() ? saved : buildReadmeDraft(progress));
    }
    initialized.current = true;
  }, [progress, backupKey]);

  const flush = useCallback(async () => {
    const value = pending.current;
    if (value === null) return;
    setStatus("saving");
    try {
      await saveReadme(value);
      if (pending.current === value) {
        pending.current = null;
        // 서버에 들어갔으니 로컬 사본을 지운다
        if (backupKey) {
          try {
            localStorage.removeItem(backupKey);
          } catch {
            // 저장소를 못 써도 서버에는 있다
          }
        }
      }
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, [saveReadme, backupKey]);

  flushRef.current = flush;

  const update = (value: string) => {
    setText(value);
    pending.current = value;
    // 브라우저가 갑자기 닫혀도 남도록 즉시 로컬에 적어 둔다.
    if (backupKey) {
      try {
        localStorage.setItem(backupKey, value);
      } catch {
        // 저장소가 막혔으면 디바운스 저장에만 기댄다
      }
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), 1500);
  };

  // 1.5초가 지나기 전에 탭을 닫거나 다른 화면으로 옮겨도 잃지 않게 한다.
  // 브라우저가 비동기 저장을 끝까지 기다려 주지 않으므로 로컬 사본이 최후 보루다.
  useEffect(() => {
    const onLeave = () => {
      if (pending.current === null) return;
      clearTimeout(timer.current);
      flushRef.current();
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") onLeave();
    };
    window.addEventListener("pagehide", onLeave);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      document.removeEventListener("visibilitychange", onHide);
      onLeave();
    };
  }, []);

  const regenerate = () => {
    if (!confirm("지금 적은 내용을 버리고 제출물에서 다시 만듭니다. 계속할까요?")) return;
    update(buildReadmeDraft(progress));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!restored) return null;

  if (!name) {
    return (
      <main className="mx-auto max-w-[560px] px-6 py-20">
        <p className="body-lg">
          입장하지 않았습니다. 홈에서 이름과 수업 코드를 넣어 주세요.
        </p>
        <Link href="/" className="btn-primary mt-6">
          홈으로
        </Link>
      </main>
    );
  }

  const repo = githubRepoUrl(progress);
  const statusText =
    status === "saving"
      ? "저장하는 중"
      : status === "error"
        ? "저장하지 못했습니다"
        : status === "saved"
          ? "저장됨"
          : "";

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
      <main className="mx-auto max-w-[900px] px-6 pb-32 pt-12">
        <div className="color-block bg-blockCream">
          <p className="eyebrow">발표 준비</p>
          <h1 className="display-lg mt-3">README 하나로 발표합니다</h1>
          <p className="body-lg mt-4">
            m2부터 m8까지 적어 온 내용을 모아 초안을 만들었습니다. 고쳐서 저장소에
            올리고, 그 화면을 띄운 채 5분 동안 시연하세요.
          </p>
        </div>

        {!ready ? (
          <p className="body-lg mt-12">불러오는 중입니다.</p>
        ) : (
          <>
            <section className="mt-12">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="eyebrow">초안</p>
                <span className="caption">{statusText}</span>
              </div>

              {restoredNotice ? (
                <p className="body-sm link-strong mt-4">
                  저장되지 않은 채 닫혔던 내용을 복원했습니다.
                </p>
              ) : null}

              <textarea
                className="text-input mt-4"
                style={{
                  minHeight: "60vh",
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                  fontSize: 15,
                  lineHeight: 1.6,
                }}
                value={text}
                onChange={(e) => update(e.target.value)}
                spellCheck={false}
              />

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button type="button" className="btn-primary" onClick={copy}>
                  {copied ? "복사됨" : "전체 복사"}
                </button>
                <button type="button" className="btn-secondary" onClick={regenerate}>
                  제출물에서 다시 만들기
                </button>
              </div>
            </section>

            <section className="mt-16">
              <p className="eyebrow">저장소에 올리는 법</p>
              <ol className="mt-4 space-y-3">
                <li>1. 위에서 전체 복사를 누릅니다.</li>
                <li>
                  2. 저장소에서 Add file 을 누르고 Create new file 을 고릅니다. README.md
                  가 이미 있으면 연필 모양을 눌러 고칩니다.
                </li>
                <li>3. 파일 이름을 README.md 로 적고 붙여넣습니다.</li>
                <li>4. Commit changes 를 누릅니다. 커밋 메시지는 직접 씁니다.</li>
              </ol>

              {repo ? (
                <a
                  href={repo}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary mt-6"
                >
                  내 저장소 열기
                  <span className="caption ml-3">새 창</span>
                </a>
              ) : (
                <p className="body-sm mt-6">
                  m7 에 깃허브 저장소 주소를 적으면 여기에 바로 가는 단추가 생깁니다.
                </p>
              )}
            </section>

            <section className="mt-16">
              <p className="eyebrow">올렸으면 표시해 주세요</p>
              <p className="body-lg mt-3">
                강사 화면과 발표 모드에서 누가 준비를 마쳤는지 보입니다.
              </p>
              <label className="mt-5 flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-black"
                  checked={progress?.readmePushed === true}
                  onChange={async (e) => {
                    setPushError(null);
                    try {
                      await setReadmePushed(e.target.checked);
                    } catch {
                      setPushError(
                        "표시를 저장하지 못했습니다. 연결을 확인하고 다시 눌러 주세요.",
                      );
                    }
                  }}
                />
                <span className="body-lg link-strong">
                  저장소에 README 를 올렸습니다
                </span>
              </label>
              {pushError ? (
                <p className="body-sm link-strong mt-3">{pushError}</p>
              ) : null}
            </section>
          </>
        )}
      </main>
      {expired ? (
        <ExpiredNotice
          onReenter={() => {
            clearSession();
            setName(null);
          }}
        />
      ) : null}
    </>
  );
}
