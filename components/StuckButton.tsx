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
          ? "fixed bottom-4 right-4 z-30 bg-brand px-4 py-3 text-white chrome-label"
          : "fixed bottom-4 right-4 z-30 btn-amber"
      }
      style={
        stuck
          ? {
              borderRadius: 2,
              borderTop: "1px solid #ff6b73",
              borderBottom: "2px solid #8c000b",
            }
          : undefined
      }
    >
      {stuck ? "해결됐어요" : "막혔어요 🙋"}
    </button>
  );
}
