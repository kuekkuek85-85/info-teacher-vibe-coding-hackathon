"use client";

import { useEffect, useState } from "react";
import CaseShowcase from "@/components/CaseShowcase";
import TopNav from "@/components/TopNav";
import { clearSession, getSavedName, getSavedRole } from "@/lib/session";

/** 프로젝터에 띄우는 전용 페이지. 팝업과 같은 내용을 쓴다. */
export default function CasesPage() {
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setName(getSavedName());
    setRole(getSavedRole());
  }, []);

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
      <main className="mx-auto max-w-[1280px] px-6 pb-32 pt-12">
        <CaseShowcase />
      </main>
    </>
  );
}
