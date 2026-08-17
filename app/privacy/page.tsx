import Link from "next/link";
import PolicyView from "@/components/PolicyView";
import { PRIVACY } from "@/lib/policy";

export const metadata = { title: "개인정보처리방침 · 해커톤 베이스캠프" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[860px] px-6 pb-32 pt-12">
      <Link href="/" className="link-strong body-sm">
        ← 홈으로
      </Link>
      <div className="mt-8">
        <PolicyView title="개인정보처리방침" sections={PRIVACY} />
      </div>
    </main>
  );
}
