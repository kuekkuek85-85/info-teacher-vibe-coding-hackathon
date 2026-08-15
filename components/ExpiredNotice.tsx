"use client";

export default function ExpiredNotice({ onReenter }: { onReenter: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/70 p-4">
      <div className="plate w-full max-w-[420px]">
        <div className="section-bar">
          <span className="bar-glyph" />
          입장이 만료되었습니다
        </div>
        <div className="plate-inset m-2 p-4">
          <p className="text-ink">
            다른 기기에서 같은 이름으로 들어갔습니다. 이 기기에서 계속하려면 이름과 수업
            코드를 다시 넣어 주세요.
          </p>
          <button type="button" className="btn-signal mt-4" onClick={onReenter}>
            다시 입장하기
          </button>
        </div>
      </div>
    </div>
  );
}
