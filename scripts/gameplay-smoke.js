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

assert(!melonHtml.includes('MELONCREW'), "Mr. Melon must not require the old MELONCREW access code.");
assert(!melonHtml.includes('id="friendCode"'), "Mr. Melon must not render an access-code field.");
assert(!melonHtml.includes('id="enterBtn"'), "Mr. Melon must not render an access gate button.");
assert(!melonHtml.includes('id="gate"'), "Mr. Melon must open directly to the main menu.");
assert(melonHtml.includes('<div id="mainMenu">'), "Mr. Melon main menu must be immediately available.");

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

const makeMathProblem = loadFunction(melonHtml, "makeMathProblem", { Math });
for (let level = 0; level < 8; level++) {
  for (let i = 0; i < 120; i++) {
    const problem = makeMathProblem(level);
    assert(problem && typeof problem.q === "string" && problem.q.length > 20, "Invalid maths prompt at level " + level);
    assert(Number.isFinite(problem.ans) && problem.ans >= 0, "Invalid maths answer at level " + level);
    assert(typeof problem.why === "string" && problem.why.length > 2, "Missing maths explanation at level " + level);
  }
}

console.log("Gameplay smoke checks passed for Spelling Bee and Mr. Melon's Adventure.");
