
export const CAREER_OPTIONS = [
  { job: "フリーター", salary: 300000, label: "安定しないが自由" },
  { job: "営業", salary: 550000, label: "コミュニケーション重視" },
  { job: "エンジニア", salary: 850000, label: "技術職・高収入" },
  { job: "医療系", salary: 950000, label: "社会的信用が高い" },
  { job: "経営者", salary: 1400000, label: "挑戦とリスク" },
  { job: "公務員", salary: 700000, label: "安定志向" }
];

export const HOUSE_OPTIONS = [
  { name: "ワンルーム", price: 1800000 },
  { name: "マンション", price: 4200000 },
  { name: "戸建て", price: 9000000 },
  { name: "別荘", price: 20000000 }
];

export const CAR_OPTIONS = [
  { name: "軽自動車", price: 1200000 },
  { name: "コンパクトカー", price: 2200000 },
  { name: "ミドルクラス車", price: 4000000 },
  { name: "高級車", price: 10000000 }
];

export const FAMILY_STAGES = [
  { name: "独身", family: 0 },
  { name: "婚約", family: 1 },
  { name: "既婚", family: 2 },
  { name: "子育て", family: 3 }
];

export const EVENTS = [
  { title: "🎉 宝くじに当選！", description: "購入していた宝くじが大当たり！", money: 10000000, kind: "good", rarity: "legendary" },
  { title: "💎 お宝を発見！", description: "思いがけない場所で価値あるお宝を発見！", money: 7000000, kind: "good", rarity: "legendary" },
  { title: "🌟 夢の起業が成功！", description: "長年温めていたビジネスが大きく成長した！", money: 15000000, kind: "good", rarity: "ultra-rare" },
  { title: "🏆 仕事で大成功！", description: "大きなプロジェクトを成功させた！", money: 5000000, kind: "good", rarity: "rare" },
  { title: "💼 転職のチャンス", description: "人生を大きく変える転職の話が舞い込んだ。", kind: "good", rarity: "rare", choices: [
    { label: "営業職に転職", job: "営業", salary: 650000, money: 500000 },
    { label: "エンジニアへ転職", job: "エンジニア", salary: 900000, money: 800000 },
    { label: "経営者として独立", job: "経営者", salary: 1500000, money: -300000 }
  ] },
  { title: "🏠 家を買うか？", description: "進路を決める大事な選択がやってきた。", kind: "neutral", rarity: "rare", choices: [
    { label: "ワンルームを購入", house: "ワンルーム", money: -1800000 },
    { label: "マンションを購入", house: "マンション", money: -4200000 },
    { label: "今は見送る", money: 0 }
  ] },
  { title: "🚗 車を選ぶ時が来た", description: "新しい移動手段を手に入れるチャンス。", kind: "neutral", rarity: "normal", choices: [
    { label: "軽自動車を購入", car: "軽自動車", money: -1200000 },
    { label: "コンパクトカーを購入", car: "コンパクトカー", money: -2200000 },
    { label: "まだ先にする", money: 0 }
  ] },
  { title: "💍 結婚の話が舞い込んだ", description: "大切な人と人生をともに歩む決断をする時が来た。", kind: "good", rarity: "rare", choices: [
    { label: "プロポーズを受ける", family: 2, money: -1500000 },
    { label: "もう少し考える", family: 1, money: 0 },
    { label: "結婚はまだ早い", family: 0, money: 0 }
  ] },
  { title: "👶 家族が増える日", description: "新しい命が迎えられる季節がやってきた。", kind: "good", rarity: "rare", choices: [
    { label: "子どもを育てる", family: 3, money: -1800000 },
    { label: "家族計画を見直す", family: 2, money: 0 },
    { label: "今は焦らない", family: 1, money: 0 }
  ] },
  { title: "昇給！", description: "仕事で成果を出した。給料が上がった！", money: 3000000, kind: "good", rarity: "normal" },
  { title: "臨時ボーナス", description: "思いがけないボーナスを受け取った！", money: 2000000, kind: "good", rarity: "normal" },
  { title: "副業が成功", description: "副業の収入が入った！", money: 1500000, kind: "good", rarity: "normal" },
  { title: "節約成功", description: "日々の節約でお金が貯まった。", money: 700000, kind: "good", rarity: "normal" },
  { title: "株価が上昇！", description: "投資していた株の価値が上がった！", money: 2500000, kind: "good", rarity: "rare" },
  { title: "ネットショップが人気！", description: "自分のお店が話題になった！", money: 1800000, kind: "good", rarity: "normal" },
  { title: "家電の買い替え", description: "家電が故障。新しいものを購入した。", money: -800000, kind: "bad", rarity: "normal" },
  { title: "車の修理", description: "車の修理費がかかった。", money: -1200000, kind: "bad", rarity: "normal" },
  { title: "急な出費", description: "予定外の出費が発生した。", money: -1000000, kind: "bad", rarity: "normal" },
  { title: "投資に失敗…", description: "投資先の価値が下がってしまった。", money: -2500000, kind: "bad", rarity: "rare" },
  { title: "引っ越し費用", description: "新生活のために引っ越しをした。", money: -1500000, kind: "bad", rarity: "normal" },
  { title: "スマホを買い替え", description: "最新のスマートフォンを購入！", money: -200000, kind: "bad", rarity: "normal" },
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
  let pool = EVENTS;

  if (roll < 0.03) {
    pool = EVENTS.filter(event => event.rarity === "ultra-rare");
  } else if (roll < 0.10) {
    pool = EVENTS.filter(event => event.rarity === "legendary");
  } else if (roll < 0.28) {
    pool = EVENTS.filter(event => event.rarity === "rare");
  } else {
    pool = EVENTS.filter(event => event.rarity === "normal");
  }

  if (!pool.length) pool = EVENTS;

  return { ...pool[Math.floor(Math.random() * pool.length)] };
}
