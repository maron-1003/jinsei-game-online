
import { BOARD_SIZE, getSpace } from "../data/board.js";
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

export function calculateSalary(player) {
  const base = Number(player.salary || 300000);
  const familyBonus = (player.family || 0) * 150000;
  const houseBonus = player.house && player.house !== "なし" ? 200000 : 0;
  const carBonus = player.car && player.car !== "なし" ? 100000 : 0;
  return base + familyBonus + houseBonus + carBonus;
}

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
  const shuffledPlayers = [...players];

  for (let i = shuffledPlayers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffledPlayers[i], shuffledPlayers[j]] =
      [shuffledPlayers[j], shuffledPlayers[i]];
  }

  return {
    status: "playing",
    turnIndex: 0,
    turnNumber: 1,
    players: shuffledPlayers.map(p => ({
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
    lastMessage: "🎲 サイコロを振る順番がランダムに決定！最初のプレイヤーからスタート！",
    pendingEvent: null
  };
}

export function netWorth(player) {
  return (player.money || 0) - (player.debt || 0);
}

function registerFinish(game, player) {
  if (player.finished) return;

  game.finishOrder ??= [];
  player.finished = true;

  if (!game.finishOrder.includes(player.id)) {
    game.finishOrder.push(player.id);
  }

  player.finishRank = game.finishOrder.length;
}

export function applyChoiceEffect(player, choice = {}) {
  if (!player || !choice) return player;

  if (choice.job) player.job = choice.job;
  if (typeof choice.salary === "number") player.salary = choice.salary;
  if (typeof choice.money === "number") player.money += choice.money;
  if (typeof choice.debt === "number") player.debt += choice.debt;
  if (choice.house) player.house = choice.house;
  if (choice.car) player.car = choice.car;
  if (typeof choice.family === "number") {
    player.family = Math.max(0, (player.family || 0) + choice.family);
  }

  return player;
}

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

  next.moveAnimation = {
    id: crypto.randomUUID(),
    playerId: player.id,
    from: oldPosition,
    to: player.position,
    roll,
    startedAt: Date.now()
  };

  let message = `${player.name} は ${roll} マス進んだ！`;

  if (player.position >= BOARD_SIZE) {
    registerFinish(next, player);
    message += ` 🏁 ${player.name} が${player.finishRank}位でゴール！`;
  } else {
    const space = getSpace(player.position);

    if (space.type === "salary") {
      const income = calculateSalary(player);
      player.money += income;
      message += ` 給料 ${yen(income)} を獲得！`;
    } else if (space.type === "shopping") {
      const costs = [500000, 900000, 1500000, 2200000];
      const spend = costs[Math.floor(Math.random() * costs.length)];
      player.money -= spend;
      message += ` 🛍️ ${yen(spend)} を使って生活を整えた。`;
    } else if (space.type === "investment") {
      const gain = Math.random() > 0.5 ? 1200000 : -700000;
      player.money += gain;
      message += ` 📈 投資結果：${gain >= 0 ? "+" : ""}${yen(gain)}。`;
    } else if (space.type === "rest") {
      const recharge = 200000;
      player.money += recharge;
      message += ` 🌴 休息で心を整え、${yen(recharge)}を節約できた。`;
    } else if (space.type === "event") {
      const event = randomEvent();
      if (event.choices?.length) {
        next.pendingEvent = {
          ...event,
          playerId: player.id,
          id: crypto.randomUUID(),
          choiceMode: true
        };
      } else {
        player.money += event.money;
        next.pendingEvent = {
          ...event,
          playerId: player.id,
          id: crypto.randomUUID()
        };
      }
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

export function advanceTurn(game) {
  const active = game.players.filter(p => !p.finished);

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

  if (index <= game.turnIndex) {
    game.turnNumber += 1;
  }

  game.turnIndex = index;
}

export function closeEvent(game) {
  const next = structuredClone(game);

  next.pendingEvent = null;
  advanceTurn(next);

  return next;
}

export function yen(value) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(value);
}

export function ranking(players) {
  return [...players].sort((a, b) => {
    const difference = netWorth(b) - netWorth(a);

    if (difference !== 0) {
      return difference;
    }

    const rankA = a.finishRank ?? Infinity;
    const rankB = b.finishRank ?? Infinity;

    return rankA - rankB;
  });
}
