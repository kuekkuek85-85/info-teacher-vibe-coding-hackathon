"use client";

export default function ExpiredNotice({ onReenter }: { onReenter: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5">
      <div className="w-full max-w-md rounded-[20px] bg-surface1 p-6">
        <h2 className="display text-2xl">입장이 만료되었습니다</h2>
        <p className="mt-3 text-[15px] text-inkMuted">
          다른 기기에서 같은 이름으로 들어갔습니다. 이 기기에서 계속하려면 이름과 입장
          코드를 다시 넣어 주세요.
        </p>
        <button type="button" className="btn-primary mt-6" onClick={onReenter}>
          다시 입장하기
        </button>
      </div>
    </div>
  );
}
