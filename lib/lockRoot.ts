/**
 * 화면을 덮는 것이 둘 이상이다. 서약 팝업과 강사 자료가 동시에 뜰 수 있다.
 * 각자 inert 를 붙였다 떼면, 하나가 끝날 때 다른 쪽이 필요한 잠금까지 풀린다.
 * 몇 개가 잠갔는지 세어 마지막 하나가 놓을 때만 푼다.
 */
let holders = 0;
let beforeOverflow = "";

/** 잠근다. 푸는 함수를 돌려준다 */
export function lockRoot(): () => void {
  const root = document.getElementById("app-root");
  if (holders === 0) {
    beforeOverflow = document.body.style.overflow;
    root?.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
  }
  holders += 1;

  let released = false;
  return () => {
    // 같은 잠금을 두 번 풀어도 남의 것까지 열리지 않는다
    if (released) return;
    released = true;
    holders -= 1;
    if (holders > 0) return;
    document.getElementById("app-root")?.removeAttribute("inert");
    document.body.style.overflow = beforeOverflow;
  };
}

/** 지금 잠겨 있는지. 검사와 화면 확인에 쓴다 */
export function isRootLocked(): boolean {
  return holders > 0;
}
