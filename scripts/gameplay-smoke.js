"use strict";

const fs = require("fs");
const vm = require("vm");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractFunction(source, name) {
  const start = source.indexOf("function " + name + "(");
  if (start < 0) throw new Error("Missing function: " + name);
  const brace = source.indexOf("{", start);
  let depth = 0, quote = null, escaped = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i], next = source[i + 1];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === "/" && next === "/") {
      const end = source.indexOf("\n", i + 2);
      i = end < 0 ? source.length : end;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end < 0 ? source.length : end + 1;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error("Unclosed function: " + name);
}

function loadFunction(source, name, sandbox = {}) {
  return vm.runInNewContext("(" + extractFunction(source, name) + ")", sandbox);
}

const beeJs = fs.readFileSync("games/spelling-bee/spelling-bee.js", "utf8");
const beeHtml = fs.readFileSync("games/spelling-bee/index.html", "utf8");
const beeCss = fs.readFileSync("games/spelling-bee/spelling-bee.css", "utf8");
const melonHtml = fs.readFileSync("games/mr-melons-adventure/index.html", "utf8");
const lobbyHtml = fs.readFileSync("lobby.html", "utf8");
const lobbyJs = fs.readFileSync("assets/lobby.js", "utf8");
const serverJs = fs.readFileSync("server.js", "utf8");

const curriculum = JSON.parse(fs.readFileSync("data/curriculum-grade2.json", "utf8"));
const scienceJs = fs.readFileSync("games/island-science-explorers/game.js", "utf8");
const socialJs = fs.readFileSync("games/caribbean-community-quest/game.js", "utf8");
const learningEngineJs = fs.readFileSync("assets/learning-engine.js", "utf8");

function outcomeIds(subjectKey) {
  return curriculum.subjects[subjectKey].strands.flatMap(strand => strand.outcomes.map(o => o.id));
}
const subjectSources = {
  languageArts: beeJs,
  mathematics: melonHtml,
  science: scienceJs,
  socialStudies: socialJs
};
for (const [subjectKey, source] of Object.entries(subjectSources)) {
  for (const outcomeId of outcomeIds(subjectKey)) {
    assert(source.includes(outcomeId), subjectKey + " has no game activity reference for " + outcomeId);
  }
}
assert(outcomeIds("languageArts").length === 7, "Language Arts ELO map must contain 7 outcomes.");
assert(outcomeIds("mathematics").length === 34, "Mathematics ELO map must contain 34 outcomes.");
assert(outcomeIds("science").length === 13, "Science ELO map must contain 13 outcomes.");
assert(outcomeIds("socialStudies").length === 24, "Social Studies ELO map must contain 24 outcomes.");
assert(scienceJs.includes("evidenceScene") && scienceJs.includes("bindEvidenceScene"), "Science must require interactive evidence collection.");
assert(socialJs.includes("communityScene") && socialJs.includes("bindCommunityScene"), "Social Studies must include interactive community exploration.");
assert(scienceJs.includes("Great repair!") && scienceJs.includes("try again"), "Science must teach and require a repair after mistakes.");
assert(socialJs.includes("Great repair!") && socialJs.includes("try again"), "Social Studies must teach and require a repair after mistakes.");
assert(melonHtml.includes("requiredMathForLevel") && melonHtml.includes("Math Gate:"), "Mr. Melon must require mathematics before opening level portals.");
assert(melonHtml.includes("levelMathSolved++"), "Mr. Melon math gate must count successfully solved challenges.");
assert(melonHtml.includes("math-repair"), "Mr. Melon must record repaired math attempts separately.");
assert(melonHtml.includes("Final Math Gate:") && melonHtml.includes("finalGate:true"), "Mr. Melon's final victory must also require the math gate.");
assert(beeJs.includes("buildLanguageChallenges") && beeJs.includes("LANG-G2-LS-ELO1"), "Bee Academy Language Arts mission missing.");
assert(learningEngineJs.includes('return "Ready"'), "Shared mastery stage must be subject-neutral.");
assert(learningEngineJs.includes("startBreakCoach"), "Shared learning engine must include the child break coach.");
assert(learningEngineJs.includes("25*60*1000"), "Break coach interval must be approximately 25 minutes.");

assert(serverJs.includes("CURRICULUM_OUTCOME_SUBJECT.get(outcomeId)"), "Server must derive learning subject from validated curriculum outcome.");
const swJs=fs.readFileSync("sw.js","utf8");
assert(swJs.includes('gaming-studio-j-v7'), "PWA cache version must be current for Grade 2 worlds.");
assert(swJs.includes('learning-engine.js?v=3') && swJs.includes('learning-worlds.css?v=2'), "PWA cache must include current learning assets.");

assert(!lobbyHtml.includes('id="chatInput"'), "Kid-safe lobby must not expose free-text chat.");
assert(lobbyHtml.includes('id="chatPreset"'), "Kid-safe lobby quick-chat selector missing.");
assert(lobbyJs.includes('messageId'), "Lobby client must send approved quick-chat IDs.");
assert(serverJs.includes("QUICK_CHAT_MESSAGES"), "Server quick-chat allow-list missing.");

for (const [label,source] of [
  ["Spelling Bee",beeHtml],
  ["Mr. Melon",melonHtml],
  ["Science",fs.readFileSync("games/island-science-explorers/index.html","utf8")],
  ["Social Studies",fs.readFileSync("games/caribbean-community-quest/index.html","utf8")]
]) {
  assert(!/https?:\/\//i.test(source), label + " child page must not load external web resources.");
  assert(!/target=["']_blank["']/i.test(source), label + " child page must not open external/new-tab links.");
}
assert(!lobbyJs.includes("payload?.text"), "Lobby server/client must not accept arbitrary child chat text.");

assert(!melonHtml.includes('MELONCREW'), "Mr. Melon must not require the old MELONCREW access code.");
assert(!melonHtml.includes('id="friendCode"'), "Mr. Melon must not render an access-code field.");
assert(!melonHtml.includes('id="enterBtn"'), "Mr. Melon must not render an access gate button.");
assert(!melonHtml.includes('id="gate"'), "Mr. Melon must open directly to the main menu.");
assert(melonHtml.includes('<div id="mainMenu">'), "Mr. Melon main menu must be immediately available.");

// Grade 2 mathematics generators must always have one unambiguous correct option.
const mathSandbox = { Math, Set };
mathSandbox.mathRnd = loadFunction(melonHtml, "mathRnd", mathSandbox);
mathSandbox.mathPick = loadFunction(melonHtml, "mathPick", mathSandbox);
mathSandbox.mathShuffle = loadFunction(melonHtml, "mathShuffle", mathSandbox);
mathSandbox.numericOptions = loadFunction(melonHtml, "numericOptions", mathSandbox);
mathSandbox.choiceOptions = loadFunction(melonHtml, "choiceOptions", mathSandbox);
for (const name of ["mathProblemNumberSense","mathProblemOperations","mathProblemPatterns","mathProblemGeometry","mathProblemMeasurement","mathProblemData"]) {
  mathSandbox[name] = loadFunction(melonHtml, name, mathSandbox);
}
function validateMathProblem(problem, label) {
  assert(problem && typeof problem.q === "string" && problem.q.length > 8, label + " question missing.");
  assert(String(problem.outcome || "").startsWith("MATH-G2-"), label + " outcome must be Grade 2 mathematics.");
  assert(Array.isArray(problem.options) && problem.options.length === 4, label + " must have exactly 4 choices.");
  const values = problem.options.map(v => String(v));
  assert(new Set(values).size === 4, label + " choices must be unique.");
  assert(values.filter(v => v === String(problem.ans)).length === 1, label + " must contain exactly one correct answer.");
  assert(typeof problem.why === "string" && problem.why.length > 8, label + " explanation missing.");
  if (typeof problem.ans === "number") {
    assert(Number.isFinite(problem.ans) && problem.ans >= 0 && problem.ans <= 100, label + " numeric answer outside Grade 2 working range.");
  }
}
for (const band of ["Support","Core","Challenge"]) {
  for (let i=0;i<180;i++) {
    validateMathProblem(mathSandbox.mathProblemNumberSense(band), "Number Sense");
    validateMathProblem(mathSandbox.mathProblemOperations(band), "Operations");
    validateMathProblem(mathSandbox.mathProblemPatterns(band), "Patterns");
    validateMathProblem(mathSandbox.mathProblemGeometry(band), "Geometry");
    validateMathProblem(mathSandbox.mathProblemMeasurement(band), "Measurement");
    validateMathProblem(mathSandbox.mathProblemData(band), "Data");
  }
}

for (const file of [
  "games/spelling-bee/spelling-bee-hero.svg",
  "games/spelling-bee/spelling-bee-player.svg",
  "games/spelling-bee/spelling-bee-world.svg"
]) assert(fs.existsSync(file), "Missing current Spelling Bee art: " + file);

assert(!beeHtml.includes('id="runway"'), "Runway markup returned to Spelling Bee.");
assert(!beeCss.includes(".runway{"), "Runway styling returned to Spelling Bee.");
assert(beeHtml.includes("spelling-bee-player.svg"), "Flight must use the rear-view bee asset.");
assert(beeJs.includes('gate.lane!==f.lane'), "Spelling Bee collision must be lane deterministic.");
assert(beeJs.includes("PRACTICE GARDEN"), "Safe diversion must use the Practice Garden.");
assert(beeJs.includes("reported:false"), "Mastery reporting must be idempotent.");
assert(beeJs.includes("Missed flowers are free retries"), "Motor-skill misses must be non-punitive.");
assert(beeJs.includes("if(missed){"), "Missed gates need a separate no-nectar-loss branch.");
assert(beeJs.includes("masteredWords(state.level)"), "Warm-up flights must use mastered words only.");
assert(beeJs.includes("shield:true"), "Kids should start each flight with one safety shield.");
assert(beeHtml.includes("Warm-up flights after 3 words"), "Mission screen must advertise the warm-up reward loop.");

const normalWord = loadFunction(beeJs, "normalWord");
const plainStoryText = loadFunction(beeJs, "plainStoryText");
assert(plainStoryText("A **brave** bee") === "A brave bee", "Story markdown cleanup failed.");
assert(normalWord("  CAN’T  ") === "can't", "Smart apostrophe spelling normalization failed.");
assert(normalWord("ice–cream") === "ice-cream", "Dash spelling normalization failed.");
assert(normalWord("  two   words ") === "two words", "Whitespace spelling normalization failed.");

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const gateSpeed = loadFunction(beeJs, "gateSpeed", { clamp });
assert(gateSpeed({wordIndex: 0, combo: 0, mistakes: 0}) === 390, "Unexpected starting gate speed.");
assert(gateSpeed({wordIndex: 99, combo: 99, mistakes: 0}) <= 610, "Gate speed exceeds child-friendly cap.");
assert(gateSpeed({wordIndex: 0, combo: 0, mistakes: 3}) < 390, "Adaptive help should slow the gates after mistakes.");

const collisionSandbox = { state: { flight: { lane: 1 } }, Number };
const gateTouchesPlane = loadFunction(beeJs, "gateTouchesPlane", collisionSandbox);
assert(gateTouchesPlane({lane: 0}, .95) === false, "Wrong lane must not register a hit.");
assert(gateTouchesPlane({lane: 1}, .85) === true, "Correct lane should register in the wider child-friendly hit window.");
assert(gateTouchesPlane({lane: 1}, .80) === false, "A distant gate must not register early.");

const missState = {
  flight: {
    transitioning: false, ending: false, wordLetters: ["B"], letterIndex: 0,
    gates: [], shield: false, mistakes: 0, combo: 2, flightMisses: 0,
    difficult: {}, word: "bee"
  }
};
const evaluateMiss = loadFunction(beeJs, "evaluateGate", {
  state: missState,
  removeOtherGates: () => {},
  updateFlightHud: () => {},
  message: () => {},
  setTimeout: () => {},
  spawnGates: () => {},
  flightSfx: () => {},
  speak: () => {}
});
evaluateMiss(null, true);
assert(missState.flight.mistakes === 0, "Missing a flower must not count as a spelling mistake.");
assert(missState.flight.flightMisses === 1, "Motor-skill misses should still be tracked separately.");

const shieldState = {
  flight: {
    transitioning: false, ending: false, wordLetters: ["B"], letterIndex: 0,
    gates: [], shield: true, mistakes: 0, combo: 2, flightMisses: 0,
    difficult: {}, word: "bee"
  }
};
const evaluateShield = loadFunction(beeJs, "evaluateGate", {
  state: shieldState,
  removeOtherGates: () => {},
  updateFlightHud: () => {},
  message: () => {},
  setTimeout: () => {},
  spawnGates: () => {},
  flightSfx: () => {},
  speak: () => {}
});
evaluateShield({ letter: "X", resolved: false, el: null }, false);
assert(shieldState.flight.mistakes === 0 && shieldState.flight.shield === false, "Starter shield must absorb the first wrong-letter choice.");


assert(beeJs.includes('e1.frequency.value=185') && beeJs.includes('e2.frequency.value=370'), "Bee flight audio must use wing-buzz frequencies, not the old engine drone.");
assert(beeJs.includes('wingLfo') && beeJs.includes('lfo.frequency.value=7.2'), "Bee buzz should include organic wing flutter modulation.");

let spokenUtterance = null, speechDone = 0, fallbackTimer = null;
function MockUtterance(text) { this.text = text; this.rate = 1; this.pitch = 1; this.lang = ""; this.onend = null; this.onerror = null; }
const mockSpeech = {
  cancel: () => {},
  speak: u => { spokenUtterance = u; }
};
const speakFn = loadFunction(beeJs, "speak", {
  window: { speechSynthesis: mockSpeech },
  speechSynthesis: mockSpeech,
  SpeechSynthesisUtterance: MockUtterance,
  toast: () => {},
  setTimeout: fn => { fallbackTimer = fn; return 1; },
  Math
});
speakFn("bee. The bee landed on a flower.", { onDone: () => { speechDone++; } });
assert(spokenUtterance && speechDone === 0, "Speech completion callback must wait for the utterance to finish.");
spokenUtterance.onend();
assert(speechDone === 1, "Speech completion callback must fire when narration ends.");
if (fallbackTimer) fallbackTimer();
assert(speechDone === 1, "Speech completion callback must be idempotent when fallback timer fires later.");

let sentenceDone = null, spawnAfterSentence = 0, endedFlight = 0;
const wordFlight = {
  transitioning: false, ending: false, gates: [], word: "bee", wordIndex: 0,
  words: ["bee", "sun"], wordLetters: ["B", "E", "E"], bonusFuel: 0
};
const finishWordFn = loadFunction(beeJs, "finishWord", {
  state: { flight: wordFlight },
  clearGates: () => {},
  supportFor: () => ({ example: "The bee landed on a bright flower." }),
  burstPetals: () => {},
  flightSfx: () => {},
  message: () => {},
  speak: (text, options) => {
    if (options && typeof options.onDone === "function") sentenceDone = options.onDone;
  },
  updateFlightHud: () => {},
  lettersOf: word => Array.from(word.toUpperCase()),
  spawnGates: () => { spawnAfterSentence++; },
  endFlight: () => { endedFlight++; },
  setTimeout: fn => { fn(); },
  Math
});
finishWordFn();
assert(wordFlight.wordIndex === 0 && wordFlight.transitioning === true, "Word must not advance while the sentence is still speaking.");
assert(typeof sentenceDone === "function", "Completed-word narration must provide an onDone continuation.");
sentenceDone();
assert(wordFlight.wordIndex === 1 && wordFlight.word === "sun", "Next word must load only after narration finishes.");
assert(wordFlight.transitioning === false && spawnAfterSentence === 1 && endedFlight === 0, "Gameplay must resume after the completed sentence.");

assert(melonHtml.includes("levelCompleting=true;pendingLevelBuild=true"), "Mr Melon level-completion guard missing.");
assert(melonHtml.includes("player.onGround=false;player.swim=false;player.shootCd=0;player.freezeCd=0"), "Mr Melon transition state reset missing.");
assert(melonHtml.includes("function clearGameInputs()"), "Mr Melon held-input reset missing.");

const mathStart = melonHtml.indexOf("function mathRnd(");
const mathEnd = melonHtml.indexOf('let currentQuizSolution=', mathStart);
assert(mathStart >= 0 && mathEnd > mathStart, "Mr. Melon Grade 2 maths generator block missing.");
const mathSource = melonHtml.slice(mathStart, mathEnd);
for (const band of ["Support", "Core", "Challenge"]) {
  const sandbox = { Math, window: { GSJLearning: { band: () => band } } };
  const makeMathProblem = vm.runInNewContext(mathSource + "; makeMathProblem", sandbox);
  for (let level = 0; level < 8; level++) {
    for (let i = 0; i < 160; i++) {
      const problem = makeMathProblem(level);
      assert(problem && typeof problem.q === "string" && problem.q.length > 15, "Invalid maths prompt at level " + level);
      assert(/^MATH-G2-/.test(problem.outcome || ""), "Maths problem missing OECS outcome at level " + level);
      assert((typeof problem.ans === "number" && Number.isFinite(problem.ans) && problem.ans >= 0) || (typeof problem.ans === "string" && problem.ans.length > 0), "Invalid maths answer at level " + level);
      assert(Array.isArray(problem.options) && problem.options.length >= 3, "Maths choices missing at level " + level);
      assert(problem.options.some(v => String(v) === String(problem.ans)), "Correct maths answer not present in choices.");
      assert(new Set(problem.options.map(String)).size === problem.options.length, "Duplicate maths choices generated.");
      assert(typeof problem.why === "string" && problem.why.length > 5, "Missing maths explanation at level " + level);
    }
  }
}
const answerQuizSource = extractFunction(melonHtml, "answerQuiz");
assert(!answerQuizSource.includes("player.hp"), "Wrong academic answers must not damage Mr. Melon's health.");
assert(answerQuizSource.includes("GSJLearning"), "Mr. Melon maths attempts must feed the shared mastery engine.");
assert(!melonHtml.includes("square metres remain usable"), "Area questions outside the intended Grade 2 default scope returned.");
assert(!melonHtml.includes("metres each second"), "Speed-rate questions outside the intended Grade 2 default scope returned.");

for (const file of [
  "assets/learning-engine.js",
  "data/curriculum-grade2.json",
  "games/island-science-explorers/index.html",
  "games/island-science-explorers/game.js",
  "games/caribbean-community-quest/index.html",
  "games/caribbean-community-quest/game.js"
]) assert(fs.existsSync(file), "Missing Grade 2 learning platform file: " + file);

const allOutcomeIds = new Set(Object.values(curriculum.subjects).flatMap(s => s.strands.flatMap(st => st.outcomes.map(o => o.id))));
assert(allOutcomeIds.size >= 70, "Grade 2 curriculum map is unexpectedly incomplete.");
for (const [file, prefix] of [["games/island-science-explorers/game.js","SCIENCE-G2-"],["games/caribbean-community-quest/game.js","SS-G2-"]]) {
  const src=fs.readFileSync(file,"utf8"), refs=[...src.matchAll(/(?:SCIENCE|SS)-G2-[A-Z]+-ELO\d+/g)].map(m=>m[0]);
  assert(refs.length >= 8, "Too few curriculum-linked challenges in " + file);
  refs.forEach(id=>assert(allOutcomeIds.has(id), "Unknown curriculum outcome " + id + " in " + file));
}
const learningEngine = fs.readFileSync("assets/learning-engine.js","utf8");
assert(learningEngine.includes('stage:"Mastered"') || learningEngine.includes('return "Mastered"'), "Shared learning engine mastery state missing.");
assert(learningEngine.includes('return "Support"') && learningEngine.includes('return "Challenge"'), "Adaptive Support/Core/Challenge logic missing.");

console.log("Gameplay smoke checks passed for all Grade 2 learning worlds.");
