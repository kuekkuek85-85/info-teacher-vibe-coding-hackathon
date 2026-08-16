"use client";

import Modal from "./Modal";

export default function ExpiredNotice({ onReenter }: { onReenter: () => void }) {
  return (
    <Modal title="입장이 만료되었습니다" onClose={onReenter}>
      <p className="eyebrow">입장이 만료되었습니다</p>
      <p className="mt-4">
        다른 기기에서 같은 이름으로 들어갔습니다. 이 기기에서 계속하려면 이름과 수업
        코드를 다시 넣어 주세요.
      </p>
      <button type="button" className="btn-primary mt-6" onClick={onReenter}>
        다시 입장하기
      </button>
    </Modal>
  );
}
