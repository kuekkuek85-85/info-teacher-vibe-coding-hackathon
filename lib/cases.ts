export interface CaseItem {
  /** 어느 시간에 쓴 것인지 */
  track: string;
  title: string;
  /** 무엇을 보여 주는 사례인지 한 줄 */
  point: string;
  /** 만들게 된 경위나 수업에서 쓴 방법 */
  detail: string;
  /** 도구를 만든 사람. 발표자와 다를 때 밝힌다 */
  maker?: string;
  url?: string;
  urlLabel?: string;
  /**
   * 저장소에 함께 둘 자료. 형식과 용량을 함께 적는다.
   * 학생 학번이나 질문 원문이 들어간 자료는 여기에 넣지 않는다.
   * 공개 URL 이라 누구나 내려받을 수 있다.
   */
  file?: { label: string; url: string; meta: string };
  /** 언론 보도 같은 참고 자료 */
  reference?: { label: string; url: string };
  /** 색 블록 배경 클래스 */
  tone: string;
}

export const CASES: CaseItem[] = [
  {
    track: "정보",
    title: "코드쌤봇",
    point: "AI 앞에서 학생이 먼저 생각하게 만드는 도구",
    detail:
      "스크래치 오류를 만나면 15분은 혼자 붙듭니다. 그 뒤에야 봇에게 묻고, 질문은 전부 기록에 남습니다. 문제가 있는 블록이 뭐냐고 묻던 학생이 왜 그 블록이라고 판단했냐고 되묻는 데까지 갑니다.",
    maker: "코드쌤봇 제작 · 장평중 정아림",
    tone: "bg-blockLime",
  },
  {
    track: "정보",
    title: "정보 수업 포털",
    point: "코드쌤봇에서 나온 개선점으로 만든 다음 도구",
    detail:
      "첫 도구를 쓰다 보면 아쉬운 곳이 보입니다. 그 목록을 그대로 다음 도구의 요구사항으로 옮겼습니다.",
    url: "https://info-class-portal.vercel.app/",
    urlLabel: "info-class-portal.vercel.app",
    tone: "bg-blockLilac",
  },
  {
    track: "방과후",
    title: "AICE 캠프",
    point: "엔트리와 스크래치도 바이브 코딩이 됩니다",
    detail:
      "KT 코디니만 되는 것이 아닙니다. 블록 코딩 환경에서도 같은 방식으로 만들 수 있다는 것을 캠프에서 확인했습니다.",
    url: "https://aice-camp.vercel.app/",
    urlLabel: "aice-camp.vercel.app",
    tone: "bg-blockMint",
  },
  {
    track: "동아리",
    title: "장평중 문제해결 연구소",
    point: "학생이 직접 바이브 코딩을 한다면 이런 모습",
    detail:
      "교사가 만든 도구를 쓰는 데서 멈추지 않습니다. 학생이 자기 문제를 골라 도구를 만드는 자리까지 가 봤습니다.",
    url: "https://jp-problem-solving-lab.vercel.app/",
    urlLabel: "jp-problem-solving-lab.vercel.app",
    reference: {
      label: "아시아경제 기사",
      url: "https://www.asiae.co.kr/article/2026070923511705700",
    },
    tone: "bg-blockCoral",
  },
];
