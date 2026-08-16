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
      <main className="mx-auto max-w-[860px] px-6 pb-32 pt-12">
        <div className="color-block bg-blockLilac">
          <p className="eyebrow">만든 과정</p>
          <h1 className="display-lg mt-4">이렇게 만들었어요</h1>
        </div>

        <div className="mt-12 grid gap-6 min-[810px]:grid-cols-2">
          {PIPELINE.map((p) => (
            <div key={p.step} className="card">
              <p className="caption">{p.step}</p>
              <p className="card-title mt-3">{p.who}</p>
              <p className="body-sm mt-2">{p.detail}</p>
            </div>
          ))}
        </div>

        <section className="md mt-16">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{making}</ReactMarkdown>
        </section>

        <section className="mt-16">
          <p className="eyebrow">검토 기록</p>
          <div className="md mt-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{reviewLog}</ReactMarkdown>
          </div>
        </section>

        <section className="mt-16">
          <p className="eyebrow">PRD 원문</p>
          <div className="md mt-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{prd}</ReactMarkdown>
          </div>
        </section>
      </main>
    </>
  );
}
