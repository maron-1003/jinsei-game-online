export const EVENTS = [
  { title: "昇給！", description: "仕事で成果を出した。給料が上がった！", money: 3000000, kind: "good" },
  { title: "臨時ボーナス", description: "思いがけないボーナスを受け取った！", money: 2000000, kind: "good" },
  { title: "家電の買い替え", description: "家電が故障。新しいものを購入した。", money: -800000, kind: "bad" },
  { title: "旅行に出発！", description: "休日を満喫。思い出が増えた！", money: -500000, kind: "neutral" },
  { title: "副業が成功", description: "副業の収入が入った！", money: 1500000, kind: "good" },
  { title: "車の修理", description: "車の修理費がかかった。", money: -1200000, kind: "bad" },
  { title: "節約成功", description: "日々の節約でお金が貯まった。", money: 700000, kind: "good" },
  { title: "急な出費", description: "予定外の出費が発生した。", money: -1000000, kind: "bad" }
];

export function randomEvent() {
  return EVENTS[Math.floor(Math.random() * EVENTS.length)];
}
