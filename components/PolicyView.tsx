import type { Section } from "@/lib/policy";
import { POLICY_VERSION } from "@/lib/policy";

/** 약관과 방침을 읽는 화면. 고치는 자리가 아니라 읽는 자리다 */
export default function PolicyView({
  title,
  sections,
}: {
  title: string;
  sections: Section[];
}) {
  return (
    <>
      <div className="color-block bg-blockCream">
        <p className="eyebrow">읽기</p>
        <h1 className="display-lg mt-4">{title}</h1>
        <p className="body-lg mt-6">{POLICY_VERSION} 기준입니다.</p>
      </div>

      <div className="mt-12 space-y-10">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="card-title">{s.heading}</h2>
            <div className="mt-4 space-y-3">
              {s.body.map((line) => (
                <p key={line} className="body-lg">
                  {line}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
