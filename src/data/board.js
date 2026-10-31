export const BOARD_SIZE = 60;

export const SPACE_TYPES = [
  "start", "salary", "event", "shopping", "event", "salary",
  "investment", "event", "rest", "shopping", "salary", "event"
];

export function getSpace(position) {
  if (position >= BOARD_SIZE) return { type: "goal", label: "GOAL", icon: "🏁" };
  const type = SPACE_TYPES[position % SPACE_TYPES.length];
  const map = {
    start: ["START", "🚩"], salary: ["給料", "💴"], event: ["イベント", "🎲"],
    shopping: ["買い物", "🛍️"], investment: ["投資", "📈"], rest: ["休み", "☕"]
  };
  const [label, icon] = map[type];
  return { type, label, icon };
}
