"use client";

export default function StuckButton({
  stuck,
  onToggle,
}: {
  stuck: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!stuck)}
      className={
        stuck
          ? "fixed bottom-5 right-5 z-30 rounded-full bg-gCoral px-[15px] py-[10px] text-sm font-medium text-ink"
          : "fixed bottom-5 right-5 z-30 rounded-full bg-surface1 px-[15px] py-[10px] text-sm font-medium text-ink"
      }
    >
      {stuck ? "해결됐어요" : "막혔어요 🙋"}
    </button>
  );
}
