import { CASES } from "@/lib/cases";

/**
 * 수업 적용 사례 한 장. 팝업과 전용 페이지가 같은 내용을 쓴다.
 * 색 블록은 맨 위 한 장뿐이다. 사례는 흰 카드에 색 칩으로 갈래를 표시한다.
 */
export default function CaseShowcase({
  headingLevel = "h1",
  onClose,
}: {
  headingLevel?: "h1" | "h2";
  /** 팝업으로 열렸을 때 위아래에 닫기 버튼을 놓는다. 긴 내용을 다 내리지 않아도 닫힌다. */
  onClose?: () => void;
}) {
  const Heading = headingLevel;

  return (
    <div>
      <div className="color-block bg-blockLime">
        <p className="eyebrow">바이브 코딩 수업 적용 사례</p>
        <Heading className="display-lg mt-3">교실에서 이렇게 썼습니다</Heading>
        <p className="body-lg mt-4">
          네 가지 모두 학교에서 만들어 쓰고 있는 것들입니다. 도구가 아니라 어디가
          아팠는지를 먼저 보세요.
        </p>
        {onClose ? (
          <button type="button" className="btn-primary mt-6" onClick={onClose}>
            닫고 시작하기
          </button>
        ) : null}
      </div>

      <div className="mt-8 grid gap-4 min-[720px]:grid-cols-2">
        {CASES.map((c, i) => (
          <article key={c.title} className="card">
            <div className="flex items-center gap-3">
              <span className="caption">{String(i + 1).padStart(2, "0")}</span>
              <span
                className={`caption px-3 py-1 ${c.tone}`}
                style={{ borderRadius: 50 }}
              >
                {c.track}
              </span>
            </div>
            <h3 className="card-title mt-4">{c.title}</h3>
            <p className="link-strong mt-2">{c.point}</p>
            <p className="body-sm mt-3">{c.detail}</p>
            {c.maker ? <p className="caption mt-3">{c.maker}</p> : null}

            {c.file ? (
              <p className="mt-4">
                <a
                  href={c.file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  aria-label={`${c.file.label}, ${c.file.meta}`}
                >
                  {c.file.label}
                  <span className="caption ml-3">{c.file.meta}</span>
                </a>
              </p>
            ) : null}

            {c.url ? (
              <p className="mt-4">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="link-strong body-sm break-all underline"
                >
                  {c.urlLabel}
                  <span className="caption ml-2">새 창</span>
                </a>
              </p>
            ) : null}
            {c.reference ? (
              <p className="mt-1">
                <a
                  href={c.reference.url}
                  target="_blank"
                  rel="noreferrer"
                  className="caption break-all underline"
                >
                  {c.reference.label}
                  <span className="ml-2">새 창</span>
                </a>
              </p>
            ) : null}
          </article>
        ))}
      </div>

      <p className="body-lg mt-8">
        좋은 도구는 좋은 아이디어에서 나오지 않습니다. 아픈 곳에서 나옵니다.
      </p>
    </div>
  );
}
