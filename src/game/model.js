import { BOARD_SIZE } from "../data/board.js";
import { randomEvent } from "../data/events.js";

export const AVATARS = ["🧑", "👩", "🧔", "👨‍💻", "👩‍🎨", "🧑‍🚀"];
export const COLORS = ["#7c8cff", "#ff8f70", "#36c9a5", "#d58cff", "#f4bd4f", "#55b9e8"];

export function newPlayer(id, name, avatar = "🧑", color = COLORS[0]) {
  return {
    id, name, avatar, color, position: 0, money: 3000000,
    job: "フリーター", salary: 300000, debt: 0, house: "なし",
    car: "なし", family: 0, finished: false, ready: false
  };
}

export function createInitialGame(players) {
  return {
    status: "playing", turnIndex: 0, turnNumber: 1,
    players: players.map(p => ({ ...p, position: 0, money: 3000000, job: "フリーター", salary: 300000, debt: 0, house: "なし", car: "なし", family: 0, finished: false })),
    lastRoll: null, lastMessage: "人生のスタート！最初のプレイヤーからサイコロを振ろう。",
    pendingEvent: null
  };
}

export function takeTurn(game, playerId) {
  if (game.status !== "playing" || game.pendingEvent) return game;
  const current = game.players[game.turnIndex];
  if (!current || current.id !== playerId || current.finished) return game;

  const roll = Math.floor(Math.random() * 6) + 1;
  const next = structuredClone(game);
  const player = next.players[next.turnIndex];
  const oldPosition = player.position;
  player.position = Math.min(BOARD_SIZE, player.position + roll);
  next.lastRoll = roll;

  let message = `${player.name} は ${roll} マス進んだ！`;
  if (player.position >= BOARD_SIZE) {
    player.finished = true;
    message += " ゴール！";
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
    } else if (space === 2 || space === 4 || space === 7 || space === 11) {
      const event = randomEvent();
      player.money += event.money;
      next.pendingEvent = { ...event, playerId: player.id };
      message += ` ${event.title}`;
    } else {
      message += " ひと休み。";
    }
  }

  next.lastMessage = message;
  if (!next.pendingEvent) advanceTurn(next);
  return next;
}

export function advanceTurn(game) {
  const active = game.players.filter(p => !p.finished);
  if (active.length === 0) {
    game.status = "finished";
    return;
  }
  let index = game.turnIndex;
  for (let i = 0; i < game.players.length; i++) {
    index = (index + 1) % game.players.length;
    if (!game.players[index].finished) break;
  }
  if (index <= game.turnIndex) game.turnNumber += 1;
  game.turnIndex = index;
}

export function closeEvent(game) {
  const next = structuredClone(game);
  next.pendingEvent = null;
  advanceTurn(next);
  return next;
}

export function yen(value) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value);
}

export function ranking(players) {
  return [...players].sort((a, b) => (b.money - b.debt) - (a.money - a.debt));
}
