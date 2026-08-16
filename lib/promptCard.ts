import type { Mission, Progress } from "./types";

/**
 * 프롬프트 카드의 "(붙여넣기)" 자리에 본인 제출물을 채운다.
 * 참가자가 다른 화면을 오가며 복사해 오지 않아도 되게 하려는 것이다.
 */
export function buildPromptText(
  mission: Mission,
  missions: Mission[],
  progress: Progress | null,
): string {
  const card = mission.promptCard ?? "";
  const fill = mission.promptFill;
  if (!card || !fill?.slot || !fill.sources?.length) return card;

  const blocks: string[] = [];

  for (const source of fill.sources) {
    const from = missions.find((m) => m.id === source.mission);
    const data = progress?.missions?.[source.mission]?.data;
    if (!from) continue;

    const lines: string[] = [];
    for (const key of source.keys) {
      const label = from.fields.find((f) => f.key === key)?.label ?? key;
      const value = data?.[key]?.trim();
      lines.push(`### ${label}`);
      lines.push(value || "(아직 적지 않았습니다)");
      lines.push("");
    }
    if (lines.length === 0) continue;

    blocks.push(`## ${source.label ?? from.title}`);
    blocks.push("");
    blocks.push(...lines);
  }

  if (blocks.length === 0) return card;
  return card.replace(fill.slot, blocks.join("\n").trimEnd());
}
