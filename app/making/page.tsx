import { readFileSync } from "node:fs";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TopNav from "@/components/TopNav";

function read(file: string): string {
  try {
    return readFileSync(path.join(process.cwd(), file), "utf8");
  } catch {
    return "문서를 읽지 못했습니다.";
  }
}

const PIPELINE = [
  { step: "기획", who: "클로드", detail: "PRD를 대화로 키웠습니다" },
  { step: "구현", who: "클로드 코드", detail: "미션 엔진과 화면을 만들었습니다" },
  { step: "검토", who: "코덱스", detail: "다른 모델에게 결함을 찾게 했습니다" },
  { step: "결정·푸시", who: "사람", detail: "수용과 거부를 정하고 커밋했습니다" },
];

export default function MakingPage() {
  const making = read("content/making.md");
  const reviewLog = read("content/review-log.md");
  const prd = read("PRD-해커톤-베이스캠프.md");

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[820px] px-3 pb-24 pt-3">
        <div className="plate p-1">
          <div className="bg-lavender px-5 py-7">
            <p className="wordmark text-[30px]">이렇게 만들었어요</p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 min-[810px]:grid-cols-2">
          {PIPELINE.map((p) => (
            <div key={p.step} className="plate-raised p-3">
              <p className="chrome-label text-inkSoft">{p.step}</p>
              <p className="wordmark-sm mt-1 text-[18px]">{p.who}</p>
              <p className="mt-2 text-carbon">{p.detail}</p>
            </div>
          ))}
        </div>

        <section className="plate md mt-3 bg-surface p-3 text-ink">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{making}</ReactMarkdown>
        </section>

        <section className="plate mt-3">
          <div className="section-bar">
            <span className="bar-glyph" />
            검토 기록
          </div>
          <div className="md m-2 bg-surface p-3 text-ink">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{reviewLog}</ReactMarkdown>
          </div>
        </section>

        <section className="plate mt-3">
          <div className="section-bar">
            <span className="bar-glyph" />
            PRD 원문
          </div>
          <div className="md m-2 bg-surface p-3 text-ink">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{prd}</ReactMarkdown>
          </div>
        </section>
      </main>
    </>
  );
}
