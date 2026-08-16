// 원본 pptx 의 슬라이드 노트를 그대로 옮겼다. 강사가 보고 읽는 대본이다.
// 고칠 일이 있으면 pptx 가 아니라 이 파일을 고친다.
const notes: string[] = [
  "GitHub에 저장하고 업로드하는 흐름은 Add, Commit, Push입니다. Commit할 때는 단순히 무엇을 바꿨는지가 아니라, 왜 이 변경을 했는지를 자세한 commit message로 남겨야 합니다. 그리고 Push 직전에는 사람의 검토가 필요합니다. Push하는 순간 코드가 원격 GitHub 서버로 업로드되고 저장되기 때문입니다. 그래서 핵심은 저장 자체보다, Push 전에 검토하고 Commit에 이유를 기록하는 것입니다.",
];

export default notes;
