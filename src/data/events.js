
export const EVENTS = [
  // 大当たり
  { title: "🎉 宝くじに当選！", description: "購入していた宝くじが大当たり！", money: 10000000, kind: "good", rarity: "legendary" },
  { title: "💎 お宝を発見！", description: "思いがけない場所で価値あるお宝を発見！", money: 7000000, kind: "good", rarity: "legendary" },
  { title: "🏆 仕事で大成功！", description: "大きなプロジェクトを成功させた！", money: 5000000, kind: "good", rarity: "rare" },

  // お金が増えるイベント
  { title: "昇給！", description: "仕事で成果を出した。給料が上がった！", money: 3000000, kind: "good", rarity: "normal" },
  { title: "臨時ボーナス", description: "思いがけないボーナスを受け取った！", money: 2000000, kind: "good", rarity: "normal" },
  { title: "副業が成功", description: "副業の収入が入った！", money: 1500000, kind: "good", rarity: "normal" },
  { title: "節約成功", description: "日々の節約でお金が貯まった。", money: 700000, kind: "good", rarity: "normal" },
  { title: "株価が上昇！", description: "投資していた株の価値が上がった！", money: 2500000, kind: "good", rarity: "rare" },
  { title: "ネットショップが人気！", description: "自分のお店が話題になった！", money: 1800000, kind: "good", rarity: "normal" },

  // お金が減るイベント
  { title: "家電の買い替え", description: "家電が故障。新しいものを購入した。", money: -800000, kind: "bad", rarity: "normal" },
  { title: "車の修理", description: "車の修理費がかかった。", money: -1200000, kind: "bad", rarity: "normal" },
  { title: "急な出費", description: "予定外の出費が発生した。", money: -1000000, kind: "bad", rarity: "normal" },
  { title: "投資に失敗…", description: "投資先の価値が下がってしまった。", money: -2500000, kind: "bad", rarity: "rare" },
  { title: "引っ越し費用", description: "新生活のために引っ越しをした。", money: -1500000, kind: "bad", rarity: "normal" },
  { title: "スマホを買い替え", description: "最新のスマートフォンを購入！", money: -200000, kind: "bad", rarity: "normal" },

  // ニュートラル・人生イベント
  { title: "旅行に出発！", description: "休日を満喫。思い出が増えた！", money: -500000, kind: "neutral", rarity: "normal" },
  { title: "新しい趣味を発見！", description: "夢中になれる趣味が見つかった！", money: 0, kind: "neutral", rarity: "normal" },
  { title: "友人と再会！", description: "久しぶりの友人との時間を楽しんだ！", money: 0, kind: "neutral", rarity: "normal" },
  { title: "豪華ディナー！", description: "特別なレストランで食事を楽しんだ！", money: -100000, kind: "neutral", rarity: "normal" },
  { title: "海外旅行に当選！", description: "キャンペーンで海外旅行が当たった！", money: 500000, kind: "good", rarity: "rare" },
  { title: "新しい出会い！", description: "人生を変えるような出会いがあった！", money: 0, kind: "neutral", rarity: "rare" },
  { title: "フリーマーケット！", description: "使わなくなったものを売ってお金にした！", money: 400000, kind: "good", rarity: "normal" },
  { title: "思い出のプレゼント", description: "大切な人から素敵なプレゼントをもらった！", money: 200000, kind: "good", rarity: "normal" }
];

export function randomEvent() {
  const roll = Math.random();

  // レアイベントは低確率
  const pool = roll < 0.05
    ? EVENTS.filter(event => event.rarity === "legendary")
    : roll < 0.20
      ? EVENTS.filter(event => event.rarity === "rare")
      : EVENTS.filter(event => event.rarity === "normal");

  return pool[Math.floor(Math.random() * pool.length)];
}
