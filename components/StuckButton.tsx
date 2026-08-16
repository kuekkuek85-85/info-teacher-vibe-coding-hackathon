"use client";

export default function StuckButton({
  stuck,
  onToggle,
}: {
  stuck: boolean;
  onToggle: (next: boolean) => void;
}) {
  // 검정 알약은 화면의 주요 동작(제출, 입장)이 이미 쓰고 있다.
  // 떠 있는 이 버튼은 보조로 두고, 손을 든 상태에서만 마젠타로 바뀐다.
  return (
    <button
      type="button"
      onClick={() => onToggle(!stuck)}
      className={
        stuck
          ? "btn-magenta fixed bottom-6 right-6 z-30"
          : "btn-secondary fixed bottom-6 right-6 z-30"
      }
    >
      {stuck ? "해결됐어요" : "막혔어요 🙋"}
    </button>
  );
}
