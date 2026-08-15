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
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-6">
        <h1 className="display text-[32px]">이렇게 만들었어요</h1>

        <div className="mt-6 grid gap-3 min-[810px]:grid-cols-2">
          {PIPELINE.map((p) => (
            <div key={p.step} className="card">
              <p className="text-[13px] text-inkMuted">{p.step}</p>
              <p className="display mt-1 text-2xl">{p.who}</p>
              <p className="mt-2 text-sm text-inkMuted">{p.detail}</p>
            </div>
          ))}
        </div>

        <section className="md mt-10 text-[15px]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{making}</ReactMarkdown>
        </section>

        <section className="card md mt-10 text-[15px]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{reviewLog}</ReactMarkdown>
        </section>

        <section className="mt-14">
          <h2 className="display text-2xl">PRD 원문</h2>
          <div className="md mt-4 text-[15px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{prd}</ReactMarkdown>
          </div>
        </section>
      </main>
    </>
  );
}
