
import { BOARD_SIZE } from "../data/board.js";
import { randomEvent } from "../data/events.js";

export const AVATARS = ["🧑", "👩", "🧔", "👨‍💻", "👩‍🎨", "🧑‍🚀"];

export const COLORS = [
  "#7c8cff",
  "#ff8f70",
  "#36c9a5",
  "#d58cff",
  "#f4bd4f",
  "#55b9e8"
];

export function newPlayer(id, name, avatar = "🧑", color = COLORS[0]) {
  return {
    id,
    name,
    avatar,
    color,
    position: 0,
    money: 3000000,
    job: "フリーター",
    salary: 300000,
    debt: 0,
    house: "なし",
    car: "なし",
    family: 0,
    finished: false,
    finishRank: null,
    ready: false
  };
}

export function createInitialGame(players) {
  return {
    status: "playing",
    turnIndex: 0,
    turnNumber: 1,
    players: players.map(p => ({
      ...p,
      position: 0,
      money: 3000000,
      job: "フリーター",
      salary: 300000,
      debt: 0,
      house: "なし",
      car: "なし",
      family: 0,
      finished: false,
      finishRank: null
    })),
    finishOrder: [],
    finishedAt: null,
    lastRoll: null,
    lastMessage: "人生のスタート！最初のプレイヤーからサイコロを振ろう。",
    pendingEvent: null
  };
}

// プレイヤーの純資産を計算
export function netWorth(player) {
  return (player.money || 0) - (player.debt || 0);
}

// ゴールしたプレイヤーを記録
function registerFinish(game, player) {
  if (player.finished) return;

  game.finishOrder ??= [];

  player.finished = true;

  if (!game.finishOrder.includes(player.id)) {
    game.finishOrder.push(player.id);
  }

  player.finishRank = game.finishOrder.length;
}

// サイコロを振ってターンを進める
export function takeTurn(game, playerId) {
  if (game.status !== "playing" || game.pendingEvent) return game;

  const current = game.players[game.turnIndex];

  if (!current || current.id !== playerId || current.finished) {
    return game;
  }

  const roll = Math.floor(Math.random() * 6) + 1;
  const next = structuredClone(game);

  next.finishOrder ??= [];

  const player = next.players[next.turnIndex];
  const oldPosition = player.position;

  player.position = Math.min(BOARD_SIZE, oldPosition + roll);
  next.lastRoll = roll;

  // コマ移動アニメーション用の情報
  next.moveAnimation = {
    id: crypto.randomUUID(),
    playerId: player.id,
    from: oldPosition,
    to: player.position,
    roll,
    startedAt: Date.now()
  };

  let message = `${player.name} は ${roll} マス進んだ！`;

  // ゴール判定
  if (player.position >= BOARD_SIZE) {
    registerFinish(next, player);
    message += ` 🏁 ${player.name} が${player.finishRank}位でゴール！`;
  } else {
    const space = player.position % 12;

    if (space === 1 || space === 5) {
      player.money += player.salary;
      message += ` 給料 ${yen(player.salary)} を獲得！`;

    } else if (space === 3) {
      player.money -= 500000;
      message += " 買い物で50万円使った。";

    } else if (space === 6) {
      const gain = Math.random() > 0.5 ? 1000000 : -500000;
      player.money += gain;
      message += ` 投資結果：${gain >= 0 ? "+" : ""}${yen(gain)}。`;

    } else if (
      space === 2 ||
      space === 4 ||
      space === 7 ||
      space === 11
    ) {
      const event = randomEvent();

      player.money += event.money;

      next.pendingEvent = {
        ...event,
        playerId: player.id,
        id: crypto.randomUUID()
      };

      message += ` ${event.title}`;

    } else {
      message += " ひと休み。";
    }
  }

  next.lastMessage = message;

  if (!next.pendingEvent) {
    advanceTurn(next);
  }

  return next;
}

// 次のプレイヤーへターンを移す
export function advanceTurn(game) {
  const active = game.players.filter(p => !p.finished);

  // 全員ゴールした場合
  if (active.length === 0) {
    game.status = "finished";
    game.finishedAt = Date.now();
    game.lastMessage = "🎉 全員ゴール！人生ゲーム終了！";
    return;
  }

  let index = game.turnIndex;

  for (let i = 0; i < game.players.length; i++) {
    index = (index + 1) % game.players.length;

    if (!game.players[index].finished) {
      break;
    }
  }

  // 1周したらターン数を増やす
  if (index <= game.turnIndex) {
    game.turnNumber += 1;
  }

  game.turnIndex = index;
}

// イベントを閉じる
export function closeEvent(game) {
  const next = structuredClone(game);

  next.pendingEvent = null;
  advanceTurn(next);

  return next;
}

// 金額表示
export function yen(value) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(value);
}

// 最終ランキング
export function ranking(players) {
  return [...players].sort((a, b) => {
    const difference = netWorth(b) - netWorth(a);

    if (difference !== 0) {
      return difference;
    }

    // 同額なら先にゴールした人を優先
    const rankA = a.finishRank ?? Infinity;
    const rankB = b.finishRank ?? Infinity;

    return rankA - rankB;
  });
}
