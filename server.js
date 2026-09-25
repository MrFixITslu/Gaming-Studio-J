"use strict";

const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT || 80);
const ROOT = __dirname;
const RUNTIME_DIR = path.join(ROOT, "runtime");
const DATA_FILE = path.join(RUNTIME_DIR, "analytics.json");
const SPELLING_FILE = path.join(RUNTIME_DIR, "spelling-levels.json");
const OLLAMA_URL = String(process.env.OLLAMA_URL || "").trim();
const OLLAMA_MODEL = String(process.env.OLLAMA_MODEL || "qwen2.5:3b").trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "");
const ADMIN_SESSION_SECRET = String(process.env.ADMIN_SESSION_SECRET || "");
const MAX_ROOM_PLAYERS = 4;
const MAX_CHAT_HISTORY = 50;
const MAX_ACTIVITY = 250;

fs.mkdirSync(RUNTIME_DIR, { recursive: true });

const emptySpelling = () => ({ version: 1, levels: [] });

function loadSpelling() {
  try {
    const parsed = JSON.parse(fs.readFileSync(SPELLING_FILE, "utf8"));
    return {
      version: 1,
      levels: Array.isArray(parsed.levels) ? parsed.levels : []
    };
  } catch {
    return emptySpelling();
  }
}

let spelling = loadSpelling();
let spellingWriteQueue = Promise.resolve();

function writeSpelling() {
  const snapshot = JSON.stringify(spelling, null, 2);
  const tmp = SPELLING_FILE + ".tmp";
  spellingWriteQueue = spellingWriteQueue.then(async () => {
    await fs.promises.writeFile(tmp, snapshot, "utf8");
    await fs.promises.rename(tmp, SPELLING_FILE);
  }).catch(err => console.error("spelling write failed", err));
  return spellingWriteQueue;
}

const emptyDb = () => ({
  version: 1,
  createdAt: new Date().toISOString(),
  totals: {
    sessions: 0,
    portalViews: 0,
    matches: 0,
    chatMessages: 0,
    scoreSubmissions: 0,
    peakConcurrent: 0,
    totalSessionSeconds: 0
  },
  players: {},
  days: {},
  activity: []
});

function loadDb() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return {
      ...emptyDb(),
      ...parsed,
      totals: { ...emptyDb().totals, ...(parsed.totals || {}) },
      players: parsed.players || {},
      days: parsed.days || {},
      activity: Array.isArray(parsed.activity) ? parsed.activity.slice(-MAX_ACTIVITY) : []
    };
  } catch {
    return emptyDb();
  }
}

let db = loadDb();
let saveTimer = null;
let writeQueue = Promise.resolve();

function writeDb() {
  const snapshot = JSON.stringify(db, null, 2);
  const tmp = DATA_FILE + ".tmp";
  writeQueue = writeQueue.then(async () => {
    await fs.promises.writeFile(tmp, snapshot, "utf8");
    await fs.promises.rename(tmp, DATA_FILE);
  }).catch(err => console.error("analytics write failed", err));
  return writeQueue;
}

function persistSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void writeDb();
  }, 1200);
}

function dayKey(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10);
}

function dayBucket(key = dayKey()) {
  db.days[key] ||= { sessions: 0, portalViews: 0, matches: 0, chatMessages: 0, scoreSubmissions: 0, players: {} };
  return db.days[key];
}

function trimOldDays() {
  const keys = Object.keys(db.days).sort();
  while (keys.length > 90) delete db.days[keys.shift()];
}

function activity(type, details = {}) {
  db.activity.push({ ts: new Date().toISOString(), type, ...details });
  db.activity = db.activity.slice(-MAX_ACTIVITY);
}

function clampNumber(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function cleanText(value, max = 180) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanNickname(value) {
  return cleanText(value, 18) || "Player";
}

function cleanClientId(value) {
  const id = String(value || "");
  return /^[A-Za-z0-9_-]{12,80}$/.test(id) ? id : "";
}

function cleanLongText(value, max = 8000) {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, max);
}

function cleanSpellingWord(value) {
  return String(value || "")
    .trim()
    .replace(/[^A-Za-z'-]/g, "")
    .slice(0, 32);
}

function slugify(value) {
  return cleanText(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54) || "mission";
}

function cleanSpellingWords(value) {
  const list = Array.isArray(value) ? value : [];
  const out = [];
  for (const raw of list) {
    const word = cleanSpellingWord(raw);
    if (!word) continue;
    if (!out.some(x => x.toLowerCase() === word.toLowerCase())) out.push(word);
    if (out.length >= 12) break;
  }
  return out;
}

function storySentence(story, word) {
  const source = cleanLongText(story, 8000);
  if (source) {
    const parts = source.split(/(?<=[.!?])\s+|\n+/).map(x => x.trim()).filter(Boolean);
    const lower = word.toLowerCase();
    const match = parts.find(x => x.toLowerCase().includes(lower));
    if (match) return cleanText(match, 260);
  }
  return "The word " + word + " is one of this week's spelling words.";
}

function roughSyllables(word) {
  const w = String(word || "").toLowerCase();
  const groups = w.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]|$)*/g);
  if (!groups || groups.length < 2) return w.split("").join(" · ");
  return groups.map(x => x.replace(/[^a-z'-]/g, "")).filter(Boolean).join(" · ");
}

function fallbackSpellingContent(words, story) {
  return words.map(word => ({
    word,
    definition: "A word from this week's spelling list. Learn its meaning from the story and practise using it correctly.",
    example: storySentence(story, word),
    hint: "It starts with " + word.charAt(0).toUpperCase() + " and has " + word.length + " letters.",
    syllables: roughSyllables(word)
  }));
}

function cleanGeneratedContent(content, words, story) {
  const rows = Array.isArray(content) ? content : [];
  const fallback = fallbackSpellingContent(words, story);
  return words.map((word, i) => {
    const found = rows.find(x => cleanSpellingWord(x?.word).toLowerCase() === word.toLowerCase()) || {};
    return {
      word,
      definition: cleanText(found.definition, 240) || fallback[i].definition,
      example: cleanText(found.example || found.exampleSentence, 280) || fallback[i].example,
      hint: cleanText(found.hint, 180) || fallback[i].hint,
      syllables: cleanText(found.syllables, 100) || fallback[i].syllables
    };
  });
}

async function generateSpellingContent(words, story) {
  const fallback = fallbackSpellingContent(words, story);
  if (!OLLAMA_URL) return { content: fallback, mode: "fallback" };
  const endpoint = OLLAMA_URL.endsWith("/api/generate")
    ? OLLAMA_URL
    : OLLAMA_URL.replace(/\/$/, "") + "/api/generate";
  const prompt = [
    "You create learning support for children practising weekly English spelling words.",
    "Return valid JSON only as an array. Each object must contain: word, definition, example, hint, syllables.",
    "Definitions must be child-friendly and accurate. Example sentences must use the word naturally.",
    "Hints must help without spelling the whole word. Syllables should be readable chunks separated by ' · '.",
    "Words: " + words.join(", "),
    story ? "Weekly story context: " + story.slice(0, 5000) : ""
  ].filter(Boolean).join("\n");
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, format: "json" }),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error("Ollama returned " + response.status);
    const payload = await response.json();
    const raw = typeof payload.response === "string" ? payload.response : "";
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.content) ? parsed.content : []);
    if (!rows.length) throw new Error("No generated rows");
    return { content: cleanGeneratedContent(rows, words, story), mode: "ollama" };
  } catch (err) {
    console.warn("spelling content generation fallback:", err.message);
    return { content: fallback, mode: "fallback" };
  }
}

function normaliseSpellingLevel(payload, existing = {}) {
  const words = cleanSpellingWords(payload?.words);
  const now = new Date().toISOString();
  return {
    id: existing.id || slugify(payload?.title) + "-" + Date.now().toString(36).slice(-5),
    week: cleanText(payload?.week, 40),
    title: cleanText(payload?.title, 80) || "Weekly Spelling Flight",
    destination: cleanText(payload?.destination, 80) || "Adventure Island",
    theme: cleanText(payload?.theme, 40) || "Caribbean Sky",
    words,
    story: cleanLongText(payload?.story, 8000),
    content: cleanGeneratedContent(payload?.content, words, payload?.story),
    published: Boolean(payload?.published),
    createdAt: existing.createdAt || now,
    updatedAt: now
  };
}

function publicSpellingLevel(level) {
  return {
    id: level.id,
    week: level.week,
    title: level.title,
    destination: level.destination,
    theme: level.theme,
    words: level.words,
    story: level.story,
    content: level.content,
    updatedAt: level.updatedAt
  };
}

function cleanHex(value, fallback) {
  const v = String(value || "");
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : fallback;
}

function cleanAppearance(value = {}) {
  const accessories = new Set(["none", "leaf", "crown", "headphones", "glasses", "star"]);
  const accessory = accessories.has(value.accessory) ? value.accessory : "leaf";
  return {
    body: cleanHex(value.body, "#61CA55"),
    accent: cleanHex(value.accent, "#1E7A39"),
    accessory
  };
}

const blockedWords = ["fuck", "shit", "bitch", "asshole", "dick", "pussy", "cunt"];

function moderateChat(text) {
  let out = cleanText(text, 180);
  for (const word of blockedWords) {
    const safeWord = word.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
    const re = new RegExp("\\b" + safeWord + "\\b", "gi");
    out = out.replace(re, "•••");
  }
  return out;
}

function getPlayer(clientId, nickname = "Player", appearance = {}) {
  const now = new Date().toISOString();
  const row = db.players[clientId] ||= {
    clientId,
    nickname: cleanNickname(nickname),
    appearance: cleanAppearance(appearance),
    firstSeen: now,
    lastSeen: now,
    sessions: 0,
    totalSeconds: 0,
    matches: 0,
    bestScore: 0,
    maxLevel: 1,
    completions: 0
  };
  row.nickname = cleanNickname(nickname || row.nickname);
  row.appearance = cleanAppearance(appearance || row.appearance);
  row.lastSeen = now;
  return row;
}

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
  next();
});

app.get("/healthz", (_req, res) => res.type("text/plain").send("ok\n"));

function cookieValue(req, name) {
  const raw = String(req.headers.cookie || "");
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function adminReady() {
  return ADMIN_PASSWORD.length >= 12 && ADMIN_SESSION_SECRET.length >= 32;
}

function adminToken(exp) {
  const body = String(exp);
  const sig = crypto.createHmac("sha256", ADMIN_SESSION_SECRET).update(body).digest("base64url");
  return body + "." + sig;
}

function adminTokenValid(token) {
  if (!adminReady()) return false;
  const [expRaw, sig = ""] = String(token || "").split(".");
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = adminToken(exp).split(".")[1];
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireAdmin(req, res, next) {
  if (!adminReady()) return res.status(503).json({ error: "Admin login is not configured on the server." });
  if (!adminTokenValid(cookieValue(req, "gsj_admin"))) return res.status(401).json({ error: "Authentication required." });
  next();
}

const loginAttempts = new Map();
app.post("/api/admin/login", (req, res) => {
  if (!adminReady()) return res.status(503).json({ error: "Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET first." });
  const ip = req.ip || "unknown";
  const now = Date.now();
  let record = loginAttempts.get(ip);
  if (!record || now - record.windowStart > 15 * 60_000) record = { windowStart: now, count: 0 };
  if (record.count >= 8) return res.status(429).json({ error: "Too many login attempts. Try again later." });

  const supplied = String(req.body?.password || "");
  const a = Buffer.from(supplied);
  const b = Buffer.from(ADMIN_PASSWORD);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!valid) {
    record.count += 1;
    loginAttempts.set(ip, record);
    return res.status(401).json({ error: "Invalid password." });
  }

  loginAttempts.delete(ip);
  const exp = Date.now() + 12 * 60 * 60_000;
  const secure = req.secure || String(req.headers["x-forwarded-proto"] || "").includes("https");
  res.cookie("gsj_admin", adminToken(exp), {
    httpOnly: true,
    sameSite: "strict",
    secure,
    maxAge: 12 * 60 * 60_000,
    path: "/"
  });
  res.json({ ok: true });
});

app.post("/api/admin/logout", (_req, res) => {
  res.clearCookie("gsj_admin", { path: "/" });
  res.json({ ok: true });
});

app.post("/api/usage", (req, res) => {
  const clientId = cleanClientId(req.body?.clientId);
  if (!clientId) return res.status(400).json({ error: "Invalid client ID." });
  const event = cleanText(req.body?.event, 24);
  if (event !== "portal_view") return res.status(400).json({ error: "Unsupported usage event." });
  const nickname = cleanNickname(req.body?.nickname);
  const existing = db.players[clientId];
  const row = getPlayer(clientId, existing?.nickname || nickname, existing?.appearance || {});
  row.lastSeen = new Date().toISOString();
  db.totals.portalViews = (db.totals.portalViews || 0) + 1;
  const today = dayBucket();
  today.portalViews = (today.portalViews || 0) + 1;
  today.players[clientId] = true;
  trimOldDays();
  persistSoon();
  res.status(202).json({ ok: true });
});

app.get("/api/leaderboard", (_req, res) => {
  const rows = Object.values(db.players)
    .filter(p => Number(p.bestScore) > 0)
    .sort((a, b) => b.bestScore - a.bestScore || b.maxLevel - a.maxLevel)
    .slice(0, 50)
    .map(p => ({
      nickname: p.nickname,
      appearance: p.appearance,
      bestScore: p.bestScore,
      maxLevel: p.maxLevel,
      completions: p.completions || 0
    }));
  res.json({ leaderboard: rows });
});

app.get("/api/spelling/levels", (_req, res) => {
  const levels = spelling.levels
    .filter(level => level.published)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .map(publicSpellingLevel);
  res.json({ levels });
});

app.get("/api/spelling/levels/:id", (req, res) => {
  const id = cleanText(req.params.id, 80);
  const level = spelling.levels.find(x => x.id === id && x.published);
  if (!level) return res.status(404).json({ error: "Spelling mission not found." });
  res.json({ level: publicSpellingLevel(level) });
});

app.post("/api/spelling/progress", (req, res) => {
  const clientId = cleanClientId(req.body?.clientId);
  if (!clientId) return res.status(400).json({ error: "Invalid client ID." });
  const levelId = cleanText(req.body?.levelId, 80);
  const level = spelling.levels.find(x => x.id === levelId);
  if (!level) return res.status(404).json({ error: "Spelling mission not found." });
  const event = cleanText(req.body?.event, 32);
  const allowed = new Set(["practice_open", "word_mastered", "story_read", "attempt", "complete", "divert"]);
  if (!allowed.has(event)) return res.status(400).json({ error: "Unsupported spelling event." });

  const row = getPlayer(clientId, cleanNickname(req.body?.nickname), db.players[clientId]?.appearance || {});
  row.spelling ||= {};
  const progress = row.spelling[levelId] ||= {
    profileId: cleanText(req.body?.profileId, 80),
    practiceOpens: 0,
    masteredWords: {},
    storyRead: false,
    attempts: 0,
    completions: 0,
    diversions: 0,
    bestAccuracy: 0,
    difficultWords: {},
    lastSeen: new Date().toISOString()
  };
  progress.lastSeen = new Date().toISOString();

  db.spelling ||= { totals: {}, levels: {} };
  const totals = db.spelling.totals;
  const levelStats = db.spelling.levels[levelId] ||= {
    practiceOpens: 0, wordsMastered: 0, storyReads: 0, attempts: 0, completions: 0, diversions: 0, difficultWords: {}
  };

  if (event === "practice_open") {
    progress.practiceOpens += 1;
    totals.practiceOpens = (totals.practiceOpens || 0) + 1;
    levelStats.practiceOpens += 1;
  } else if (event === "word_mastered") {
    const word = cleanSpellingWord(req.body?.word).toLowerCase();
    if (word && !progress.masteredWords[word]) {
      progress.masteredWords[word] = new Date().toISOString();
      totals.wordsMastered = (totals.wordsMastered || 0) + 1;
      levelStats.wordsMastered += 1;
    }
  } else if (event === "story_read") {
    if (!progress.storyRead) {
      progress.storyRead = true;
      totals.storyReads = (totals.storyReads || 0) + 1;
      levelStats.storyReads += 1;
    }
  } else if (event === "attempt") {
    progress.attempts += 1;
    totals.attempts = (totals.attempts || 0) + 1;
    levelStats.attempts += 1;
  } else if (event === "complete" || event === "divert") {
    const accuracy = Math.round(clampNumber(req.body?.accuracy, 0, 100, 0));
    progress.bestAccuracy = Math.max(progress.bestAccuracy || 0, accuracy);
    if (event === "complete") {
      progress.completions += 1;
      totals.completions = (totals.completions || 0) + 1;
      levelStats.completions += 1;
    } else {
      progress.diversions += 1;
      totals.diversions = (totals.diversions || 0) + 1;
      levelStats.diversions += 1;
    }
    const difficult = Array.isArray(req.body?.difficultWords) ? req.body.difficultWords.slice(0, 12) : [];
    for (const raw of difficult) {
      const word = cleanSpellingWord(raw).toLowerCase();
      if (!word) continue;
      progress.difficultWords[word] = (progress.difficultWords[word] || 0) + 1;
      levelStats.difficultWords[word] = (levelStats.difficultWords[word] || 0) + 1;
    }
  }

  persistSoon();
  res.status(202).json({ ok: true });
});

app.get("/api/admin/spelling/levels", requireAdmin, (_req, res) => {
  res.json({
    levels: spelling.levels.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
  });
});

app.post("/api/admin/spelling/generate", requireAdmin, async (req, res) => {
  const words = cleanSpellingWords(req.body?.words);
  if (!words.length) return res.status(400).json({ error: "Add at least one spelling word first." });
  const story = cleanLongText(req.body?.story, 8000);
  const generated = await generateSpellingContent(words, story);
  res.json(generated);
});

app.post("/api/admin/spelling/levels", requireAdmin, async (req, res) => {
  const level = normaliseSpellingLevel(req.body);
  if (level.published && (level.words.length < 10 || level.words.length > 12)) {
    return res.status(400).json({ error: "Published spelling missions must contain 10–12 words." });
  }
  if (!level.content.length && level.words.length) {
    const generated = await generateSpellingContent(level.words, level.story);
    level.content = generated.content;
  }
  spelling.levels.push(level);
  await writeSpelling();
  activity("spelling_level_created", { levelId: level.id, title: level.title, published: level.published });
  persistSoon();
  res.status(201).json({ level });
});

app.put("/api/admin/spelling/levels/:id", requireAdmin, async (req, res) => {
  const id = cleanText(req.params.id, 80);
  const index = spelling.levels.findIndex(x => x.id === id);
  if (index < 0) return res.status(404).json({ error: "Spelling mission not found." });
  const level = normaliseSpellingLevel(req.body, spelling.levels[index]);
  if (level.published && (level.words.length < 10 || level.words.length > 12)) {
    return res.status(400).json({ error: "Published spelling missions must contain 10–12 words." });
  }
  spelling.levels[index] = level;
  await writeSpelling();
  activity("spelling_level_updated", { levelId: level.id, title: level.title, published: level.published });
  persistSoon();
  res.json({ level });
});

app.delete("/api/admin/spelling/levels/:id", requireAdmin, async (req, res) => {
  const id = cleanText(req.params.id, 80);
  const index = spelling.levels.findIndex(x => x.id === id);
  if (index < 0) return res.status(404).json({ error: "Spelling mission not found." });
  const [removed] = spelling.levels.splice(index, 1);
  await writeSpelling();
  activity("spelling_level_deleted", { levelId: removed.id, title: removed.title });
  persistSoon();
  res.json({ ok: true });
});

app.get("/api/admin/spelling/summary", requireAdmin, (_req, res) => {
  const totals = db.spelling?.totals || {};
  const levels = spelling.levels.map(level => {
    const stats = db.spelling?.levels?.[level.id] || {};
    const difficultWords = Object.entries(stats.difficultWords || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));
    return {
      id: level.id,
      title: level.title,
      published: level.published,
      attempts: stats.attempts || 0,
      completions: stats.completions || 0,
      diversions: stats.diversions || 0,
      wordsMastered: stats.wordsMastered || 0,
      difficultWords
    };
  });
  res.json({
    totals: {
      practiceOpens: totals.practiceOpens || 0,
      wordsMastered: totals.wordsMastered || 0,
      storyReads: totals.storyReads || 0,
      attempts: totals.attempts || 0,
      completions: totals.completions || 0,
      diversions: totals.diversions || 0
    },
    levels
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  serveClient: true,
  transports: ["polling", "websocket"],
  maxHttpBufferSize: 32_000,
  pingInterval: 25_000,
  pingTimeout: 20_000
});

const chatHistory = [];
const rooms = new Map();
const identities = new Map();

function roomView(room) {
  return {
    code: room.code,
    state: room.state,
    level: room.level,
    players: [...room.players].map(id => {
      const ident = identities.get(id);
      return ident ? { socketId: id, nickname: ident.nickname, appearance: ident.appearance, isHost: id === room.hostSocketId } : null;
    }).filter(Boolean),
    maxPlayers: MAX_ROOM_PLAYERS,
    createdAt: room.createdAt
  };
}

function listRooms() {
  return [...rooms.values()]
    .filter(r => r.state === "waiting" && r.players.size > 0)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(roomView);
}

function presenceList() {
  return [...identities.entries()].map(([socketId, ident]) => ({
    socketId,
    nickname: ident.nickname,
    appearance: ident.appearance,
    context: ident.context,
    roomCode: ident.roomCode || ""
  }));
}

function emitLobbyState() {
  io.emit("lobby:presence", presenceList());
  io.emit("room:list", listRooms());
}

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let tries = 0; tries < 50; tries++) {
    let code = "";
    for (let i = 0; i < 5; i++) code += chars[crypto.randomInt(chars.length)];
    if (!rooms.has(code)) return code;
  }
  return crypto.randomBytes(4).toString("hex").slice(0, 5).toUpperCase();
}

function leaveRoom(socket) {
  const ident = identities.get(socket.id);
  const code = ident?.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (room) {
    room.players.delete(socket.id);
    socket.leave("match:" + code);
    io.to("match:" + code).emit("room:peer-left", { socketId: socket.id });

    if (room.hostSocketId === socket.id) room.hostSocketId = [...room.players][0] || "";
    if (room.players.size === 0) {
      if (room.state === "playing") room.emptySince = Date.now();
      else rooms.delete(code);
    } else {
      room.emptySince = 0;
      io.to("match:" + code).emit("room:update", roomView(room));
    }
  }
  ident.roomCode = "";
}

function joinRoom(socket, codeRaw) {
  const ident = identities.get(socket.id);
  if (!ident) return { ok: false, error: "Set your player identity first." };
  const code = cleanText(codeRaw, 8).toUpperCase();
  const room = rooms.get(code);
  if (!room) return { ok: false, error: "Room not found." };
  if (room.players.size >= MAX_ROOM_PLAYERS && !room.players.has(socket.id)) return { ok: false, error: "That room is full." };

  if (ident.roomCode && ident.roomCode !== code) leaveRoom(socket);
  room.players.add(socket.id);
  room.emptySince = 0;
  if (!room.hostSocketId || !room.players.has(room.hostSocketId)) room.hostSocketId = socket.id;
  ident.roomCode = code;
  socket.join("match:" + code);
  io.to("match:" + code).emit("room:update", roomView(room));
  emitLobbyState();
  return { ok: true, room: roomView(room) };
}

function registerSession(socket, payload = {}) {
  if (socket.data.registered) return identities.get(socket.id);
  const clientId = cleanClientId(payload.clientId);
  if (!clientId) return null;

  const nickname = cleanNickname(payload.nickname);
  const appearance = cleanAppearance(payload.appearance);
  const context = payload.context === "game" ? "game" : "lobby";
  const row = getPlayer(clientId, nickname, appearance);
  row.sessions += 1;

  db.totals.sessions += 1;
  const today = dayBucket();
  today.sessions += 1;
  today.players[clientId] = true;
  trimOldDays();

  const ident = {
    clientId,
    nickname,
    appearance,
    context,
    roomCode: "",
    joinedAt: Date.now(),
    chatWindow: [],
    lastStateAt: 0
  };
  identities.set(socket.id, ident);
  socket.data.registered = true;
  socket.data.clientId = clientId;

  db.totals.peakConcurrent = Math.max(db.totals.peakConcurrent || 0, identities.size);
  activity("session_start", { nickname, context });
  persistSoon();
  emitLobbyState();
  return ident;
}

io.on("connection", socket => {
  socket.on("identity:set", (payload, ack = () => {}) => {
    let ident = identities.get(socket.id);
    if (!ident) ident = registerSession(socket, payload);
    if (!ident) return ack({ ok: false, error: "Invalid player ID." });

    ident.nickname = cleanNickname(payload?.nickname || ident.nickname);
    ident.appearance = cleanAppearance(payload?.appearance || ident.appearance);
    ident.context = payload?.context === "game" ? "game" : "lobby";
    const row = getPlayer(ident.clientId, ident.nickname, ident.appearance);
    row.nickname = ident.nickname;
    row.appearance = ident.appearance;
    row.lastSeen = new Date().toISOString();

    ack({ ok: true, socketId: socket.id, chat: chatHistory, players: presenceList(), rooms: listRooms() });
    persistSoon();
    emitLobbyState();
  });

  socket.on("profile:update", (payload, ack = () => {}) => {
    const ident = identities.get(socket.id);
    if (!ident) return ack({ ok: false, error: "Join the lobby first." });
    ident.nickname = cleanNickname(payload?.nickname || ident.nickname);
    ident.appearance = cleanAppearance(payload?.appearance || ident.appearance);
    const row = getPlayer(ident.clientId, ident.nickname, ident.appearance);
    row.nickname = ident.nickname;
    row.appearance = ident.appearance;
    row.lastSeen = new Date().toISOString();
    persistSoon();
    emitLobbyState();
    ack({ ok: true, nickname: ident.nickname, appearance: ident.appearance });
  });

  socket.on("chat:send", (payload, ack = () => {}) => {
    const ident = identities.get(socket.id);
    if (!ident) return ack({ ok: false, error: "Join the lobby first." });
    const now = Date.now();
    ident.chatWindow = ident.chatWindow.filter(ts => now - ts < 10_000);
    if (ident.chatWindow.length >= 6) return ack({ ok: false, error: "Slow down a little." });
    if (ident.chatWindow.length && now - ident.chatWindow.at(-1) < 650) return ack({ ok: false, error: "Messages are being sent too quickly." });

    const text = moderateChat(payload?.text);
    if (!text) return ack({ ok: false, error: "Type a message first." });
    ident.chatWindow.push(now);

    const msg = { id: crypto.randomUUID(), nickname: ident.nickname, appearance: ident.appearance, text, ts: new Date().toISOString() };
    chatHistory.push(msg);
    while (chatHistory.length > MAX_CHAT_HISTORY) chatHistory.shift();

    db.totals.chatMessages += 1;
    dayBucket().chatMessages += 1;
    persistSoon();
    io.emit("chat:message", msg);
    ack({ ok: true });
  });

  socket.on("room:create", (_payload, ack = () => {}) => {
    const ident = identities.get(socket.id);
    if (!ident) return ack({ ok: false, error: "Join the lobby first." });
    leaveRoom(socket);
    const code = makeRoomCode();
    const room = { code, hostSocketId: socket.id, state: "waiting", level: 0, createdAt: new Date().toISOString(), emptySince: 0, players: new Set([socket.id]) };
    rooms.set(code, room);
    ident.roomCode = code;
    socket.join("match:" + code);
    activity("room_created", { nickname: ident.nickname, roomCode: code });
    emitLobbyState();
    io.to("match:" + code).emit("room:update", roomView(room));
    ack({ ok: true, room: roomView(room) });
  });

  socket.on("room:join", (payload, ack = () => {}) => {
    const result = joinRoom(socket, payload?.code);
    if (result.ok) {
      const ident = identities.get(socket.id);
      activity("room_joined", { nickname: ident?.nickname || "Player", roomCode: result.room.code });
      persistSoon();
    }
    ack(result);
  });

  socket.on("room:leave", (_payload, ack = () => {}) => {
    leaveRoom(socket);
    emitLobbyState();
    ack({ ok: true });
  });

  socket.on("room:start", (payload, ack = () => {}) => {
    const ident = identities.get(socket.id);
    const room = rooms.get(cleanText(payload?.code, 8).toUpperCase());
    if (!ident || !room) return ack({ ok: false, error: "Room not found." });
    if (room.hostSocketId !== socket.id) return ack({ ok: false, error: "Only the room host can start the match." });
    if (room.players.size < 1) return ack({ ok: false, error: "No players in the room." });

    room.state = "playing";
    room.level = Math.floor(clampNumber(payload?.level, 0, 7, 0));
    db.totals.matches += 1;
    dayBucket().matches += 1;
    for (const sid of room.players) {
      const p = identities.get(sid);
      if (p) getPlayer(p.clientId, p.nickname, p.appearance).matches += 1;
    }
    activity("match_started", { nickname: ident.nickname, roomCode: room.code, players: room.players.size });
    persistSoon();

    const view = roomView(room);
    io.to("match:" + room.code).emit("room:started", view);
    emitLobbyState();
    ack({ ok: true, room: view });
  });

  socket.on("game:state", payload => {
    const ident = identities.get(socket.id);
    if (!ident?.roomCode) return;
    const room = rooms.get(ident.roomCode);
    if (!room || !room.players.has(socket.id) || room.state !== "playing") return;
    const now = Date.now();
    if (now - ident.lastStateAt < 45) return;
    ident.lastStateAt = now;

    const state = {
      socketId: socket.id,
      nickname: ident.nickname,
      appearance: ident.appearance,
      character: cleanText(payload?.character, 24) || "Mr. Melon",
      level: Math.floor(clampNumber(payload?.level, 0, 7, 0)),
      x: clampNumber(payload?.x, -100, 5000, 0),
      y: clampNumber(payload?.y, -200, 1000, 0),
      vx: clampNumber(payload?.vx, -30, 30, 0),
      vy: clampNumber(payload?.vy, -40, 40, 0),
      facing: clampNumber(payload?.facing, -1, 1, 1) < 0 ? -1 : 1,
      score: Math.floor(clampNumber(payload?.score, 0, 10_000_000, 0)),
      ts: now
    };
    if (state.level > room.level) {
      room.level = state.level;
      io.to("match:" + room.code).emit("game:level", { level: room.level });
    }
    socket.to("match:" + room.code).emit("game:peer-state", state);
  });

  socket.on("score:submit", (payload, ack = () => {}) => {
    const ident = identities.get(socket.id);
    if (!ident) return ack({ ok: false, error: "Player is not registered." });

    const score = Math.floor(clampNumber(payload?.score, 0, 10_000_000, 0));
    const level = Math.floor(clampNumber(payload?.level, 1, 8, 1));
    const completed = Boolean(payload?.completed);
    const row = getPlayer(ident.clientId, ident.nickname, ident.appearance);
    const improved = score > (row.bestScore || 0);
    row.bestScore = Math.max(row.bestScore || 0, score);
    row.maxLevel = Math.max(row.maxLevel || 1, level);
    if (completed && !socket.data.completedRecorded) {
      row.completions = (row.completions || 0) + 1;
      socket.data.completedRecorded = true;
    }

    db.totals.scoreSubmissions += 1;
    dayBucket().scoreSubmissions += 1;
    if (improved) activity("high_score", { nickname: ident.nickname, score, level });
    persistSoon();
    ack({ ok: true, bestScore: row.bestScore, maxLevel: row.maxLevel });
  });

  socket.on("disconnect", () => {
    const ident = identities.get(socket.id);
    if (ident) {
      const seconds = Math.max(0, Math.round((Date.now() - ident.joinedAt) / 1000));
      const row = db.players[ident.clientId];
      if (row) {
        row.totalSeconds = (row.totalSeconds || 0) + seconds;
        row.lastSeen = new Date().toISOString();
      }
      db.totals.totalSessionSeconds += seconds;
      activity("session_end", { nickname: ident.nickname, context: ident.context, seconds });
      leaveRoom(socket);
      identities.delete(socket.id);
      persistSoon();
      emitLobbyState();
    }
  });
});

setInterval(() => {
  const cutoff = Date.now() - 2 * 60_000;
  for (const [code, room] of rooms) {
    if (room.players.size === 0 && room.emptySince && room.emptySince < cutoff) rooms.delete(code);
  }
  emitLobbyState();
}, 30_000).unref();

function summaryPayload() {
  const players = Object.values(db.players);
  const days = Object.entries(db.days)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, row]) => ({
      date,
      sessions: row.sessions || 0,
      portalViews: row.portalViews || 0,
      matches: row.matches || 0,
      chatMessages: row.chatMessages || 0,
      scoreSubmissions: row.scoreSubmissions || 0,
      uniquePlayers: Object.keys(row.players || {}).length
    }));

  return {
    generatedAt: new Date().toISOString(),
    live: {
      activeNow: identities.size,
      inLobby: [...identities.values()].filter(x => x.context === "lobby").length,
      inGame: [...identities.values()].filter(x => x.context === "game").length,
      openRooms: listRooms().length,
      playingRooms: [...rooms.values()].filter(r => r.state === "playing" && r.players.size > 0).length
    },
    totals: {
      ...db.totals,
      uniquePlayers: players.length,
      averageSessionSeconds: db.totals.sessions ? Math.round(db.totals.totalSessionSeconds / db.totals.sessions) : 0
    },
    days
  };
}

app.get("/api/admin/summary", requireAdmin, (_req, res) => res.json(summaryPayload()));
app.get("/api/admin/leaderboard", requireAdmin, (_req, res) => {
  const leaderboard = Object.values(db.players)
    .sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0) || (b.maxLevel || 0) - (a.maxLevel || 0))
    .slice(0, 100)
    .map(p => ({
      nickname: p.nickname,
      appearance: p.appearance,
      bestScore: p.bestScore || 0,
      maxLevel: p.maxLevel || 1,
      completions: p.completions || 0,
      sessions: p.sessions || 0,
      matches: p.matches || 0,
      totalSeconds: p.totalSeconds || 0,
      firstSeen: p.firstSeen,
      lastSeen: p.lastSeen
    }));
  res.json({ leaderboard });
});
app.get("/api/admin/activity", requireAdmin, (_req, res) => res.json({ activity: db.activity.slice(-100).reverse() }));

app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (
    p === "/server.js" ||
    p === "/package.json" ||
    p === "/package-lock.json" ||
    p === "/dockerfile" ||
    p === "/docker-compose.yml" ||
    p === "/nginx.conf" ||
    p === "/readme.md" ||
    p.startsWith("/runtime/") ||
    p.startsWith("/.env") ||
    p.startsWith("/.git")
  ) return res.status(404).end();
  next();
});

app.use(express.static(ROOT, {
  index: "index.html",
  dotfiles: "deny",
  fallthrough: true,
  etag: true,
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
}));

app.use((_req, res) => res.status(404).send("Not found"));

server.listen(PORT, "0.0.0.0", () => {
  console.log("Gaming Studio J multiplayer server listening on :" + PORT);
  if (!adminReady()) console.warn("Admin dashboard login is disabled until ADMIN_PASSWORD and ADMIN_SESSION_SECRET are configured.");
});

async function shutdown(signal) {
  console.log(signal + ": saving analytics and shutting down");
  if (saveTimer) clearTimeout(saveTimer);
  try { await writeDb(); } catch {}
  io.close(() => server.close(() => process.exit(0)));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
