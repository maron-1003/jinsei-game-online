
import "./style.css";
import { supabase, isOnlineConfigured } from "./lib/supabase.js";
import {
  AVATARS,
  COLORS,
  newPlayer,
  createInitialGame,
  takeTurn,
  closeEvent,
  yen,
  ranking,
  applyChoiceEffect
} from "./game/model.js";
import { getSpace, BOARD_SIZE } from "./data/board.js";

const app = document.querySelector("#app");
const clientId = localStorage.getItem("jg-client-id") || crypto.randomUUID();
localStorage.setItem("jg-client-id", clientId);

let room = null;
let players = [];
let game = null;
let channel = null;
let myPlayer = null;
let screen = "home";
let selectedAvatar = AVATARS[0];
let selectedColor = COLORS[0];
let busy = false;

let visibleEvent = null;
let dismissedEventIds = new Set();
let seenEventIds = new Set();
let animatedEventIds = new Set();
let lobbySyncTimer = null;
let lobbySyncBusy = false;
let displayPositions = {};
let animatedMoveIds = new Set();
let landingPlayerId = null;

// 表彰式の状態
let ceremonyGameKey = null;
let ceremonyTimer = null;
// 表彰式の各段階のアニメーション再生記録
let animatedCeremonyStates = new Set();

function syncPendingEvent() {
  const event = game?.pendingEvent;
  if (!event?.id) return;

  if (seenEventIds.has(event.id)) return;

  seenEventIds.add(event.id);
  visibleEvent = event;

  // 新しいイベントの演出を再生可能にする
  animatedEventIds.delete(event.id);
}

function syncMoveAnimation() {
  const move = game?.moveAnimation;

  if (!move?.id || animatedMoveIds.has(move.id)) return;

  animatedMoveIds.add(move.id);

  // 10秒以上前の移動は再生しない
  if (!move.startedAt || Date.now() - move.startedAt > 10000) {
    return;
  }

  const player = game.players.find(p => p.id === move.playerId);
  if (!player) return;

  // この下は今のコードをそのまま残す

  // 移動前の位置からアニメーション開始
  displayPositions[move.playerId] = move.from;
  renderGame();

  const direction = move.to >= move.from ? 1 : -1;
  const distance = Math.abs(move.to - move.from);

  let step = 0;

  const moveNext = () => {
    step++;

    displayPositions[move.playerId] =
      move.from + direction * Math.min(step, distance);

    if (step >= distance) {
      landingPlayerId = move.playerId;
      renderGame();

      setTimeout(() => {
        delete displayPositions[move.playerId];
        landingPlayerId = null;
        renderGame();
      }, 450);

      return;
    }

    renderGame();
    setTimeout(moveNext, 300);
  };

  if (distance === 0) {
    delete displayPositions[move.playerId];
    return;
  }

  setTimeout(moveNext, 300);
}

const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();

function render() {
  if (screen === "home") return renderHome();
  if (screen === "lobby") return renderLobby();
  if (screen === "game") return renderGame();
}

function shell(content) {
  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <a class="brand" href="#" id="brand-home">
          <span class="brand-mark">L</span>
          LIFE<span class="brand-light"> JOURNEY</span>
        </a>
        <span class="online-pill">
          <i></i>${isOnlineConfigured ? "ONLINE READY" : "DEMO MODE"}
        </span>
      </header>
      ${content}
      <footer>人生ゲーム Online <span>© 2026 LIFE JOURNEY</span></footer>
    </main>
  `;

  document.querySelector("#brand-home")?.addEventListener("click", e => {
    e.preventDefault();
    if (!room) {
      screen = "home";
      render();
    }
  });
}

function renderHome() {
  shell(`
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">YOUR LIFE. YOUR STORY.</span>
        <h1>人生は、<br><em>ここから</em>始まる。</h1>
        <p>
          友達と一緒に、最高の人生をデザインしよう。<br>
          仕事も、買い物も、予想外のイベントも。
        </p>
        <div class="hero-actions">
          <button class="btn primary" id="create-room">
            ルームを作成 <span>→</span>
          </button>
        </div>
        <div class="join-row">
          <input id="join-code" maxlength="6" placeholder="ルームコードを入力">
          <button class="btn secondary" id="join-room">参加する</button>
        </div>
        <p class="hint">
          ${isOnlineConfigured
            ? "最大6人でオンライン対戦"
            : "デモ表示中。オンライン機能にはSupabaseの設定が必要です。"}
        </p>
      </div>

      <div class="hero-art">
        <div class="sun"></div>
        <div class="orbit orbit-one"></div>
        <div class="orbit orbit-two"></div>
        <div class="float-card card-house">🏡<small>MY HOME</small></div>
        <div class="float-card card-car">🚗<small>NEW CAR</small></div>
        <div class="float-card card-money">💰<small>YOUR FUTURE</small></div>
        <div class="road">
          <span>START</span><b>🎓</b><b>💼</b><b>🏠</b><b>✈️</b><strong>GOAL</strong>
        </div>
        <div class="hero-character">🧑‍💼</div>
      </div>
    </section>

    <section class="feature-row">
      <article><b>🎲</b><strong>運命のサイコロ</strong><span>次の一手は誰にもわからない。</span></article>
      <article><b>💼</b><strong>自分だけのキャリア</strong><span>仕事と選択で人生が変わる。</span></article>
      <article><b>👥</b><strong>最大6人で対戦</strong><span>友達と同じ人生を歩もう。</span></article>
    </section>
  `);

  document.querySelector("#create-room").onclick = createRoom;
  document.querySelector("#join-room").onclick = () =>
    joinRoom(document.querySelector("#join-code").value.trim().toUpperCase());
}

async function createRoom() {
  if (!requireOnline()) return;

  const name = await askName();
  if (!name) return;

  busy = true;
  const roomCode = code();
  const player = newPlayer(clientId, name, selectedAvatar, selectedColor);

  const { error: roomError } = await supabase.from("game_rooms").insert({
    code: roomCode,
    host_id: clientId,
    status: "waiting",
    game_state: {}
  });

  if (roomError) return showError(roomError.message);

  const { error } = await supabase.from("game_players").insert({
    ...toDbPlayer(player),
    room_code: roomCode
  });

  if (error) return showError(error.message);

  room = {
    code: roomCode,
    host_id: clientId,
    status: "waiting",
    game_state: {}
  };

  myPlayer = player;

  await loadRoom();
  subscribeRoom();

  screen = "lobby";
  busy = false;
  render();
}

async function joinRoom(roomCode) {
  if (!requireOnline()) return;

  if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
    return showError("6桁のルームコードを入力してください。");
  }

  const name = await askName();
  if (!name) return;

  busy = true;

  const { data: found, error } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("code", roomCode)
    .maybeSingle();

  if (error || !found) {
    return showError("ルームが見つかりません。コードを確認してください。");
  }

  if (found.status !== "waiting") {
    return showError("このゲームはすでに開始されています。");
  }

  const { data: existing, error: existingError } = await supabase
    .from("game_players")
    .select("*")
    .eq("room_code", roomCode)
    .eq("id", clientId)
    .maybeSingle();

  if (existingError) return showError(existingError.message);

  if (existing) {
    room = found;

    myPlayer = {
      ...existing.player_state,
      id: existing.id,
      name: existing.name,
      avatar: existing.avatar,
      color: existing.color,
      ready: existing.ready
    };

    await loadRoom();
    subscribeRoom();

    screen = "lobby";
    busy = false;
    render();
    return;
  }

  const { data: current, error: countError } = await supabase
    .from("game_players")
    .select("id")
    .eq("room_code", roomCode);

  if (countError) return showError(countError.message);

  if ((current || []).length >= 6) {
    return showError("このルームは満員です。");
  }

  const player = newPlayer(clientId, name, selectedAvatar, selectedColor);

  const { error: insertError } = await supabase
    .from("game_players")
    .insert({
      ...toDbPlayer(player),
      room_code: roomCode
    });

  if (insertError) return showError(insertError.message);

  room = found;
  myPlayer = player;

  await loadRoom();
  subscribeRoom();

  screen = "lobby";
  busy = false;
  render();
}

function requireOnline() {
  if (!isOnlineConfigured) {
    showError("オンライン機能を使うには、.envにSupabaseのURLとanon keyを設定してください。README.mdを確認してください。");
    return false;
  }

  if (busy) return false;
  return true;
}

function askName() {
  const value = prompt("ゲーム内の名前を入力してください（最大12文字）", "プレイヤー");
  return Promise.resolve(value?.trim().slice(0, 12) || "");
}

function toDbPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    color: p.color,
    ready: false,
    player_state: p
  };
}

async function loadRoom() {
  const [{ data: r }, { data: ps }] = await Promise.all([
    supabase.from("game_rooms").select("*").eq("code", room.code).single(),
    supabase.from("game_players").select("*").eq("room_code", room.code).order("joined_at")
  ]);

  if (r) room = r;

  players = (ps || []).map(x => ({
    ...x.player_state,
    id: x.id,
    name: x.name,
    avatar: x.avatar,
    color: x.color,
    ready: x.ready
  }));

  const mine = players.find(p => p.id === clientId);
  if (mine) myPlayer = mine;

  // playing / finished のどちらでもゲーム状態を読み込む
  if (room.game_state?.players?.length) {
    game = room.game_state;
    screen = "game";

    syncMoveAnimation();
    syncPendingEvent();

    render();
  }
}



function subscribeRoom() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }

  if (lobbySyncTimer) {
    clearInterval(lobbySyncTimer);
    lobbySyncTimer = null;
  }

  const roomCode = room.code;

  channel = supabase.channel(`room-${roomCode}`)

    // ゲーム状態の変更
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "game_rooms",
      filter: `code=eq.${roomCode}`
    }, payload => {
      console.log("ゲーム変更受信:", payload);

      if (!payload.new) return;

      room = payload.new;

      if (room.game_state?.players?.length) {
        game = room.game_state;
        syncMoveAnimation();
        syncPendingEvent();
        screen = "game";
      }

      render();
    })

    // プレイヤーの参加・準備状態の変更
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "game_players",
      filter: `room_code=eq.${roomCode}`
    }, async payload => {
      console.log("プレイヤー変更受信:", payload);

      if (screen === "lobby") {
        await loadRoom();
        render();
      }
    })

    .subscribe((status, err) => {
      console.log("Realtime status:", status, err || "");

      if (status === "SUBSCRIBED") {
        console.log("Realtime接続成功！");
      }
    });

  // Realtime通知が届かない場合の予備同期
  lobbySyncTimer = setInterval(async () => {
    if (screen !== "lobby" || lobbySyncBusy) return;

    lobbySyncBusy = true;

    try {
      await loadRoom();
      render();
    } catch (error) {
      console.error("ロビー同期エラー:", error);
    } finally {
      lobbySyncBusy = false;
    }
  }, 1500);
}



function renderLobby() {
  const isHost = room?.host_id === clientId;

  shell(`
    <section class="page-head">
      <span class="eyebrow">MULTIPLAYER LOBBY</span>
      <h1>仲間を集めよう。</h1>
      <p>ルームコードを友達に共有して、ゲームに招待しよう。</p>
    </section>

    <section class="lobby-grid">
      <div class="panel room-panel">
        <span class="muted-label">ROOM CODE</span>
        <div class="room-code">
          ${room.code}
          <button id="copy-code" class="btn secondary">
            コードをコピー
          </button>
          <button id="share-room" class="btn primary">
            URLをコピー
          </button>
        </div>
        <p class="subtle">友達にURLを送ると、招待したルームに参加できます。</p>

        <div class="player-list">
          ${players.map((p, i) => `
            <div class="player-slot">
              <div class="avatar" style="background:${p.color}22">${p.avatar}</div>
              <div class="player-info">
                <strong>
                  ${escapeHtml(p.name)}
                  ${p.id === room.host_id ? '<small class="host-tag">HOST</small>' : ""}
                </strong>
                <span>${p.id === clientId ? "あなた" : "参加プレイヤー"}</span>
              </div>
              <span class="ready ${p.ready ? "is-ready" : ""}">
                ${p.ready ? "READY" : "WAITING"}
              </span>
            </div>
          `).join("")}

          ${Array.from({ length: 6 - players.length }, () => `
            <div class="player-slot empty">
              <div class="avatar">＋</div>
              <div class="player-info">
                <strong>参加待ち</strong>
                <span>招待リンクから参加</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <aside class="panel start-panel">
        <div class="lobby-illustration">🎲</div>
        <h2>準備はいい？</h2>
        <p>全員が準備完了になったら、ホストがゲームを開始できます。</p>

        <button class="btn secondary full" id="ready-btn">
          ${players.find(p => p.id === clientId)?.ready
            ? "準備を取り消す"
            : "準備完了にする"}
        </button>

        ${isHost
          ? `<button class="btn primary full" id="start-btn"
              ${players.length < 2 || !players.every(p => p.ready) ? "disabled" : ""}>
              ゲームスタート →
            </button>`
          : '<p class="hint center">ホストがゲームを開始するまで待ってね。</p>'}

        <button class="text-btn" id="leave-room">ルームから退出</button>
      </aside>
    </section>
  `);

  // 招待コードをコピー
  document.querySelector("#copy-code").onclick = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      alert("招待コードをコピーしました！");
    } catch (error) {
      showError("コピーに失敗しました。");
    }
  };

  // 招待URLをコピー
  document.querySelector("#share-room").onclick = async () => {
    try {
      const inviteUrl = new URL(window.location.href);
      inviteUrl.searchParams.set("room", room.code);

      await navigator.clipboard.writeText(inviteUrl.toString());

      alert("招待URLをコピーしました！");
    } catch (error) {
      showError("招待URLのコピーに失敗しました。");
    }
  };

  document.querySelector("#ready-btn").onclick = toggleReady;
  document.querySelector("#start-btn")?.addEventListener("click", startGame);
  document.querySelector("#leave-room").onclick = leaveRoom;
}


async function toggleReady() {
  if (busy) return;

  const current = players.find(p => p.id === clientId);
  if (!current) return;

  busy = true;

  try {
    const { error } = await supabase
      .from("game_players")
      .update({ ready: !current.ready })
      .eq("id", clientId)
      .eq("room_code", room.code);

    if (error) throw error;

    await loadRoom();
    render();

  } catch (error) {
    showError(error.message);
  } finally {
    busy = false;
  }
}


async function startGame() {
  if (room.host_id !== clientId || players.length < 2 || !players.every(p => p.ready)) return;

  const initial = createInitialGame(players);

  initial.ceremonyStarted = false;
  initial.revealCount = 0;
  visibleEvent = null;
  dismissedEventIds.clear();
  seenEventIds.clear();
  animatedCeremonyStates.clear();
  ceremonyGameKey = null;
  animatedMoveIds.clear();
  displayPositions = {};
  landingPlayerId = null;

  if (ceremonyTimer) {
    clearTimeout(ceremonyTimer);
    ceremonyTimer = null;
  }

  const { error } = await supabase
    .from("game_rooms")
    .update({
      status: "playing",
      game_state: initial
    })
    .eq("code", room.code);

  if (error) return showError(error.message);

  game = initial;
  syncPendingEvent();
  screen = "game";
  render();
}
// 3Dサイコロのドットを生成
function createDiceFace(value, className) {
  const patterns = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9]
  };

  return `
    <div class="dice-cube-face ${className}">
      ${Array.from({ length: 9 }, (_, i) => `
        <span class="${patterns[value].includes(i + 1) ? "pip" : ""}"></span>
      `).join("")}
    </div>
  `;
}

function renderGame() {
  if (!game) return renderLobby();

  // ゲーム終了時の表彰式タイマー
  if (game.status === "finished") {
    const key = String(
      game.finishedAt ?? game.finishOrder?.join("|") ?? "finished"
    );

    if (ceremonyGameKey !== key) {
      ceremonyGameKey = key;

      if (ceremonyTimer) {
        clearTimeout(ceremonyTimer);
        ceremonyTimer = null;
      }

      if (!game.ceremonyStarted) {
        const finishTime = game.finishedAt || Date.now();
        const remaining = Math.max(0, finishTime + 5000 - Date.now());

        ceremonyTimer = setTimeout(() => {
          ceremonyTimer = null;
          updateCeremony({ ceremonyStarted: true });
        }, remaining);
      }
    }
  }

    const ceremonyStarted = Boolean(game.ceremonyStarted);
    const revealCount = Number(game.revealCount || 0);
    // 同じ発表段階のアニメーションは一度だけ再生
    const ceremonyAnimationKey = game.status === "finished"
      ? `${game.finishedAt ?? game.finishOrder?.join("|") ?? "finished"}-${ceremonyStarted}-${revealCount}`
      : null;

    const animateCeremony = Boolean(
      ceremonyAnimationKey &&
      !animatedCeremonyStates.has(ceremonyAnimationKey)
    );

    if (animateCeremony) {
      animatedCeremonyStates.add(ceremonyAnimationKey);
    }

    const ceremonyAnimationClass = animateCeremony
      ? ""
      : "ceremony-no-animation";

    // サイコロのアニメーション
    const current = game.players[game.turnIndex];
    const mineTurn = current?.id === clientId;
    const ranked = ranking(game.players);

    // イベントIDごとにアニメーションを一度だけ再生
    const eventId = visibleEvent?.id;
    const visibleEventDelta = Number(visibleEvent?.money ?? 0);
    const animateEvent = Boolean(eventId && !animatedEventIds.has(eventId));

    if (animateEvent) {
      animatedEventIds.add(eventId);
    }

    // 10列のジグザグ型ボード配置
    const tiles = Array.from({ length: BOARD_SIZE + 1 }, (_, i) => {
    const space = getSpace(i);
    const occupants = game.players.filter(p =>
      (displayPositions[p.id] ?? p.position) === i
    );

    // 8列×8行の蛇行ルート
    const columns = 8;
    const row = Math.floor(i / columns);
    const indexInRow = i % columns;

    const col = row % 2 === 0
      ? indexInRow
      : columns - 1 - indexInRow;

    const tileClass = [
      "tile",
      `tile-${space.type}`,
      i === 0 ? "start-tile" : "",
      i === BOARD_SIZE ? "goal-tile" : "",
      occupants.some(p => p.id === clientId) ? "my-tile" : ""
    ].filter(Boolean).join(" ");

    return `
      <div
        class="${tileClass} tile-3d"
        style="grid-column:${col + 1};grid-row:${row + 1}"
      >
        <div class="tile-content">
          <span class="tile-num">${i}</span>

          ${i === 0 ? '<span class="tile-special">START</span>' : ""}
          ${i === BOARD_SIZE ? '<span class="tile-special">GOAL</span>' : ""}

          <span class="tile-icon">${space.icon}</span>
          <small>${escapeHtml(space.label)}</small>

          ${occupants.length ? `
            <div class="pawns">
              ${occupants.map(p => `
                <span
                  title="${escapeHtml(p.name)}"
                  style="background:${p.color}"
                  class="${[
                    p.id === clientId ? "my-pawn" : "",
                    landingPlayerId === p.id ? "pawn-landed" : ""
                  ].filter(Boolean).join(" ")}"
                >${p.avatar}</span>
              `).join("")}
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }).join("");

  shell(`
    <section class="game-top">
      <div>
        <span class="eyebrow">🌈 YOUR LIFE ADVENTURE</span>
        <h1>人生の冒険を楽しもう！</h1>
        <div class="game-subtitle">みんなで最高の人生を作ろう。</div>
      </div>

      <div class="turn-indicator">
        <span class="turn-dot" style="background:${current?.color}"></span>
        <div>
          <small>🎮 NOW PLAYING</small>
          <strong>${escapeHtml(current?.name || "-")}</strong>
        </div>
      </div>
    </section>

    <section class="game-layout">
      <div class="board-panel">
        <div class="board-heading">
          <div>
            <span class="board-kicker">LIFE ADVENTURE MAP</span>
            <strong>🏝️ 人生ワールド</strong>
          </div>
          <span class="board-progress">🏁 GOAL : ${BOARD_SIZE}</span>
        </div>

        <div class="board-world">
          <div class="world-decoration decoration-one">☁️</div>
          <div class="world-decoration decoration-two">🌳</div>
          <div class="world-decoration decoration-three">☀️</div>
          <div class="world-decoration decoration-four">🌲</div>
          <div class="board-grid">${tiles}</div>
        </div>

        <div class="board-legend">
          <span>💰 給料</span>
          <span>🎉 イベント</span>
          <span>🛍️ 買い物</span>
          <span>📈 投資</span>
          <span>🌴 休憩</span>
        </div>
      </div>

      <aside class="game-sidebar">
        <div class="panel dice-panel">
          <span class="muted-label">🎲 YOUR TURN</span>
          <div class="dice-stage">
            <div class="dice-cube-wrapper">
              <div class="dice-cube ${game.diceRolling ? "dice-rolling" : ""}">
                ${createDiceFace(game.lastRoll || 1, "face-top")}
                ${createDiceFace(2, "face-front")}
                ${createDiceFace(3, "face-right")}
                ${createDiceFace(4, "face-back")}
                ${createDiceFace(5, "face-left")}
                ${createDiceFace(6, "face-bottom")}
              </div>
            </div>
          </div>

          <div class="dice-result">
            ${game.diceRolling
              ? "ROLLING..."
              : game.lastRoll
                ? `出目 <strong>${game.lastRoll}</strong>`
                : "サイコロを振ろう！"}
          </div>

          <button class="btn primary full" id="roll-btn"
            ${!mineTurn || game.pendingEvent || game.diceRolling || game.status !== "playing" ? "disabled" : ""}>
            🎲 サイコロを振る！
          </button>

          <div class="last-message">
            ${escapeHtml(game.lastMessage || "次はどんな人生が待っているかな？")}
          </div>

        </div>

        <div class="panel stats-panel">
          <div class="panel-title">
            <span>👥 PLAYER STATUS</span>
            <span>全${game.players.length}人</span>
          </div>

          ${game.players.map(p => `
            <div class="stat-player ${p.id === current?.id ? "active-player" : ""}">
              <span class="stat-avatar" style="background:${p.color}22">${p.avatar}</span>
              <div class="stat-main">
                <strong>${escapeHtml(p.name)}</strong>
                <small>${escapeHtml(p.job || "冒険中")} ・ ${p.position}/${BOARD_SIZE}マス</small>
              </div>
              <b>${yen(p.money)}</b>
            </div>
          `).join("")}
        </div>

        <div class="panel mini-rank">
          <div class="panel-title">🏆 資産ランキング</div>

          ${ranked.map((p, i) => `
            <div class="rank-line">
              <b>${["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣"][i]}</b>
              <span>${escapeHtml(p.name)}</span>
              <strong>${yen(p.money - p.debt)}</strong>
            </div>
          `).join("")}
        </div>
      </aside>
    </section>

    ${visibleEvent && !dismissedEventIds.has(visibleEvent.id) ? `
      <div class="modal-backdrop">
        <div class="event-modal ${
          visibleEvent.kind === "good"
            ? "event-good"
            : visibleEvent.kind === "bad"
              ? "event-bad"
              : "event-neutral"
        } ${visibleEvent.rarity === "legendary" ? "event-legendary" : ""} ${visibleEvent.rarity === "ultra-rare" ? "event-ultra" : ""} ${animateEvent ? "" : "event-no-animation"}">
          <div class="event-emoji">
            ${visibleEvent.kind === "good" ? "🎉" : visibleEvent.kind === "bad" ? "💸" : "🌴"}
          </div>

          <span class="eyebrow">LIFE EVENT</span>
          <div class="event-rarity ${visibleEvent.rarity || "normal"}">
            ${visibleEvent.rarity === "ultra-rare" ? "超レア" : visibleEvent.rarity === "legendary" ? "レア" : visibleEvent.rarity === "rare" ? "レア" : "通常"}
          </div>

          <h2>
            ${escapeHtml(game.players.find(p => p.id === visibleEvent.playerId)?.name || "プレイヤー")}さんにイベント発生！
          </h2>

          <h3>${escapeHtml(visibleEvent.title)}</h3>
          <p>${escapeHtml(visibleEvent.description)}</p>

          <strong class="${visibleEventDelta >= 0 ? "positive" : "negative"}">
            ${visibleEventDelta >= 0 ? "+" : ""}${yen(Math.abs(visibleEventDelta))}
          </strong>

          ${visibleEvent.choices?.length ? `
            <div class="choice-grid">
              ${visibleEvent.choices.map((choice, index) => `
                <button class="choice-btn" data-choice-index="${index}">
                  <span>${escapeHtml(choice.label)}</span>
                  <small>
                    ${choice.job ? `職業: ${escapeHtml(choice.job)}` : ""}
                    ${choice.house ? `住居: ${escapeHtml(choice.house)}` : ""}
                    ${choice.car ? `車: ${escapeHtml(choice.car)}` : ""}
                    ${typeof choice.money === "number" && choice.money !== 0 ? `${choice.money >= 0 ? "+" : ""}${yen(choice.money)}` : ""}
                  </small>
                </button>
              `).join("")}
            </div>
          ` : `
            <button class="btn primary full" id="event-close">閉じる</button>
          `}
        </div>
      </div>
    ` : ""}

    ${game.status === "finished" ? `
      ${!ceremonyStarted ? `
        <div class="modal-backdrop ceremony-backdrop">
          <div class="ceremony-modal ceremony-ready ${ceremonyAnimationClass}">

            <div class="champion-trophy">🏁</div>

            <span class="eyebrow">GAME COMPLETED</span>

            <h2 class="ceremony-title">
              全員ゴール！
            </h2>

            <p class="ceremony-subtitle">
              みんなの人生が終わりました。<br>
              いよいよ最終結果の発表です！
            </p>

            <div class="ceremony-waiting">
              まもなく結果発表が始まります……
            </div>

            <button class="btn primary full" id="ceremony-ok">
              OK！結果発表を見る
            </button>

            <p class="hint center">
              何もしなくても約5秒後に自動で進みます
            </p>

          </div>
        </div>
      ` : `
        <div class="modal-backdrop ceremony-backdrop">
          <div class="ceremony-modal ${ceremonyAnimationClass}">
            <span class="eyebrow">LIFE JOURNEY AWARDS</span>

            <h2 class="ceremony-title">
              🏆 人生の結果発表！
            </h2>

            <p class="ceremony-subtitle">
              最後まで歩んだ人生。その結果は……？
            </p>

            <div class="ceremony-progress">
              ${revealCount} / ${ranked.length} 人 発表済み
            </div>

            <div class="ceremony-results">
              ${[...ranked].reverse().slice(0, revealCount).map(p => {
                const position = ranked.indexOf(p);
                const isWinner = position === 0;

                return `
                  <div class="ceremony-player ${isWinner ? "ceremony-winner" : ""}">
                    <div class="ceremony-rank">
                      ${["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣"][position]}
                    </div>

                    <div class="ceremony-avatar" style="background:${p.color}33">
                      ${p.avatar}
                    </div>

                    <div class="ceremony-player-info">
                      <strong>
                        ${escapeHtml(p.name)}
                        ${isWinner ? '<span class="winner-label">CHAMPION</span>' : ""}
                      </strong>

                      <small>
                        ${escapeHtml(p.job || "職業なし")}
                        ・ ${p.finishRank ? `${p.finishRank}番目にゴール` : "ゴール"}
                      </small>

                      <div class="ceremony-assets">
                        🏠 ${escapeHtml(p.house || "なし")}
                        🚗 ${escapeHtml(p.car || "なし")}
                      </div>
                    </div>

                    <div class="ceremony-money">
                      <strong>${yen(p.money || 0)}</strong>
                      <small>借金 ${yen(p.debt || 0)}</small>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>

            ${revealCount >= ranked.length ? `
              <div class="champion-celebration">
                <div class="champion-trophy">🏆</div>
                <span>THE CHAMPION</span>
                <h2>${escapeHtml(ranked[0]?.name || "")}</h2>
                <p>今回の人生ゲームの優勝者！</p>
                <div class="confetti">🎉 ✨ 🎊 ✨ 🎉</div>
              </div>
            ` : `
              <div class="ceremony-waiting">
                次に発表されるのは……？
              </div>
            `}

            <button class="btn primary full" id="reveal-next">
              ${revealCount >= ranked.length
                ? "トップへ戻る"
                : revealCount === 0
                  ? "結果発表スタート！"
                  : "次の順位を発表 →"}
            </button>

          </div>
        </div>
      `}
    ` : ""}
  `);

  document.querySelector("#roll-btn")?.addEventListener("click", rollDice);
  document.querySelector("#event-close")?.addEventListener("click", dismissEvent);
  document.querySelectorAll(".choice-btn").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.choiceIndex);
      resolveEventChoice(index);
    });
  });

  document.querySelector("#reveal-next")?.addEventListener("click", () => {
    advanceCeremony();
  });

  document.querySelector("#ceremony-ok")?.addEventListener("click", () => {
    if (ceremonyTimer) {
      clearTimeout(ceremonyTimer);
      ceremonyTimer = null;
    }

    updateCeremony({ ceremonyStarted: true });
  });
}

async function rollDice() {
  console.log("🎲 サイコロボタン押された");
  console.log("busy:", busy);
  console.log("game:", game);
  console.log("turnIndex:", game?.turnIndex);
  console.log("current player:", game?.players?.[game?.turnIndex]);
  console.log("clientId:", clientId);

  const current = game?.players?.[game?.turnIndex];
  const isMyTurn = current?.id === clientId;

  console.log("自分のターン:", isMyTurn);

  if (
    busy ||
    !isMyTurn ||
    game.pendingEvent ||
    game.status !== "playing"
  ) {
    console.log("サイコロ処理が中断されました");
    return;
  }

  // この下は今のrollDice()の残りの処理をそのまま残す
  busy = true;

  try {
    // サイコロのアニメーション開始
    game = { ...game, diceRolling: true };
    renderGame();

    await new Promise(resolve => setTimeout(resolve, 1100));

    // サイコロの結果を計算
    const nextGame = takeTurn(
      { ...game, diceRolling: false },
      clientId
    );

    // イベントを一時的に保留
    const pendingEvent = nextGame.pendingEvent;

    // 出目と移動結果を先に表示
    const resultGame = {
      ...nextGame,
      pendingEvent: null,
      diceRolling: false
    };

    await saveGame(resultGame);

    // 出目を確認する時間を2.5秒確保
    const moveDistance = Math.abs(
      (resultGame.moveAnimation?.to ?? 0) -
      (resultGame.moveAnimation?.from ?? 0)
    );

    // 1マス300ms + 移動終了後1.5秒
    await new Promise(resolve =>
      setTimeout(resolve, moveDistance * 300 + 1500)
    );

    // イベントを表示
    if (pendingEvent) {
      await saveGame({
        ...resultGame,
        pendingEvent
      });
    }

  } catch (error) {
    console.error("サイコロ処理エラー:", error);
    showError(error.message);
  } finally {
    busy = false;
  }
}

async function dismissEvent() {
  const event = visibleEvent;

  if (!event || dismissedEventIds.has(event.id)) return;

  if (event.choices?.length) {
    return;
  }

  dismissedEventIds.add(event.id);
  render();

  // イベントを受けた本人だけが全体のイベントを終了する
  if (
    event.playerId === clientId &&
    game?.pendingEvent?.id === event.id &&
    !busy
  ) {
    busy = true;

    try {
      await saveGame(closeEvent(game));
    } finally {
      busy = false;
    }
  }
}

async function resolveEventChoice(choiceIndex) {
  const event = visibleEvent;
  if (!event || !event.choices?.length || !Number.isInteger(choiceIndex)) return;

  const choice = event.choices[choiceIndex];
  if (!choice) return;

  const next = structuredClone(game);
  const player = next.players.find(p => p.id === event.playerId);
  if (!player) return;

  applyChoiceEffect(player, choice);

  next.lastMessage = `${player.name} は「${choice.label}」を選び、人生の方向を決めた。`;
  next.pendingEvent = null;
  dismissedEventIds.add(event.id);
  visibleEvent = null;
  advanceTurn(next);

  await saveGame(next);
}

// 表彰式の状態を全員で同期する
async function updateCeremony(patch) {
  if (busy) return;

  busy = true;

  try {
    // 最新のゲーム状態を取得
    const { data, error: readError } = await supabase
      .from("game_rooms")
      .select("game_state")
      .eq("code", room.code)
      .single();

    if (readError) throw readError;

    const latestGame = data.game_state;

    const next = {
      ...latestGame,
      ...patch
    };

    const { error } = await supabase
      .from("game_rooms")
      .update({ game_state: next })
      .eq("code", room.code);

    if (error) throw error;

    game = next;
    render();

  } catch (error) {
    showError(error.message);
  } finally {
    busy = false;
  }
}

// 次の順位を全員で発表する
async function advanceCeremony() {
  const { data, error } = await supabase
    .from("game_rooms")
    .select("game_state")
    .eq("code", room.code)
    .single();

  if (error) return showError(error.message);

  const latestGame = data.game_state;
  const currentCount = Number(latestGame.revealCount || 0);
  const total = ranking(latestGame.players).length;

  if (currentCount < total) {
    await updateCeremony({
      revealCount: currentCount + 1
    });
  } else {
    leaveRoom();
  }
}

async function saveGame(next) {
  const { error } = await supabase
    .from("game_rooms")
    .update({
      game_state: next,
      status: next.status
    })
    .eq("code", room.code);

  if (error) {
    showError(error.message);
    throw error;
  }

  game = next;
  syncMoveAnimation();
  syncPendingEvent();
  render();
}

async function leaveRoom() {
  if (lobbySyncTimer) {
  clearInterval(lobbySyncTimer);
  lobbySyncTimer = null;
  }

  if (channel) {
    await supabase.removeChannel(channel);
    channel = null;
  }

  if (ceremonyTimer) {
    clearTimeout(ceremonyTimer);
    ceremonyTimer = null;
  }

  if (room && myPlayer) {
    await supabase
      .from("game_players")
      .delete()
      .eq("id", clientId)
      .eq("room_code", room.code);
  }

  room = null;
  players = [];
  game = null;
  myPlayer = null;
  screen = "home";

  ceremonyGameKey = null;

  visibleEvent = null;
  dismissedEventIds.clear();
  seenEventIds.clear();
  animatedEventIds.clear();

  render();
}

function showError(message) {
  alert(message || "エラーが発生しました。");
  busy = false;
}

render();

// 招待URLからルームコードを取得
const inviteCode = new URLSearchParams(
  window.location.search
).get("room");

// 正しい6桁のコードなら自動参加処理へ
if (inviteCode && /^[A-Z0-9]{6}$/i.test(inviteCode)) {
  const normalizedCode = inviteCode.toUpperCase();

  const joinInput = document.querySelector("#join-code");

  if (joinInput) {
    joinInput.value = normalizedCode;
  }

  joinRoom(normalizedCode);
}
