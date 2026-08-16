"use client";

/**
 * 상단바 왼쪽에 붙는다. 떠 있게 두면 스크롤할 때마다 본문 글자를 덮는다.
 * 상단바가 붙어 다니므로 어느 자리에서든 한 번에 누를 수 있다.
 */
export default function StuckButton({
  stuck,
  onToggle,
}: {
  stuck: boolean;
  onToggle: (next: boolean) => void;
}) {
  // 검정 알약은 화면의 주요 동작(제출, 입장)이 이미 쓰고 있다.
  // 이 버튼은 보조로 두고, 손을 든 상태에서만 마젠타로 바뀐다.
  return (
    <button
      type="button"
      onClick={() => onToggle(!stuck)}
      className={`whitespace-nowrap ${stuck ? "btn-magenta" : "btn-secondary"}`}
    >
      {stuck ? "해결됐어요" : "막혔어요 🙋"}
    </button>
  );
}
