(function(){
"use strict";

var API="../../api/spelling";
var STORE_KEY="gsj_spelling_bee_v1";
var STUDIO_STORE_KEY="gsj_store_v2";
var ACTIVE_PROFILE_KEY="gsj_active_profile_id";
var ANALYTICS_CLIENT_KEY="gsj_client_id_v1";
var EVENT_KEY="gsj_game_events_v1";
var TITLE_ID="spelling-bee",TITLE_NAME="Spelling Bee";
var FLIGHT_AUDIO_KEY="gsj_spelling_flight_audio_v1";
var state={levels:[],level:null,wordIndex:0,save:null,buildLetters:[],buildChosen:[],flight:null,raf:0};
var flightAudio={enabled:localStorage.getItem(FLIGHT_AUDIO_KEY)!=="off",ctx:null,master:null,engine1:null,engine2:null,engineGain:null,wind:null,windGain:null,windFilter:null,wingLfo:null,wingLfoGain:null,wingPitchLfo:null,wingPitchGain1:null,wingPitchGain2:null,buzzFilter:null};

function $(id){return document.getElementById(id)}
function qsa(sel){return Array.prototype.slice.call(document.querySelectorAll(sel))}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function escapeHtml(s){return String(s||"").replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]})}
function escapeRegExp(s){return String(s||"").replace(/[.*+?^$()|[\]\\{}]/g,"\\$&")}
function normalWord(s){
  return String(s||"").normalize("NFKC").replace(/[’‘]/g,"'").replace(/[‐‑‒–—]/g,"-").trim().toLowerCase().replace(/\s+/g," ");
}
function plainStoryText(value){
  return String(value||"")
    .replace(/\*\*([^*]+)\*\*/g,"$1")
    .replace(/__([^_]+)__/g,"$1")
    .replace(/^\s*[-*]\s+/gm,"")
    .trim();
}
function lettersOf(s){
  return Array.from(String(s||"").normalize("NFKC").replace(/[’‘]/g,"'").replace(/[‐‑‒–—]/g,"-").trim().toUpperCase()).filter(function(ch){return /[A-Z'-]/.test(ch)});
}
function shuffle(arr){arr=arr.slice();for(var i=arr.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=arr[i];arr[i]=arr[j];arr[j]=t}return arr}
function toast(msg){var el=document.createElement("div");el.className="toast";el.textContent=msg;$("toastArea").appendChild(el);setTimeout(function(){el.remove()},2600)}
function showScreen(id){qsa(".screen").forEach(function(x){x.classList.toggle("active",x.id===id)});document.body.classList.toggle("flight-active",id==="flightScreen");window.scrollTo(0,0)}
function studioProfile(){
  var store=null;try{store=JSON.parse(localStorage.getItem(STUDIO_STORE_KEY)||"null")}catch(e){}
  if(!store||!Array.isArray(store.profiles)||!store.profiles.length)return {id:"local-player",name:"Player",avatar:"🐝"};
  var active=store.activeProfileId||localStorage.getItem(ACTIVE_PROFILE_KEY);
  return store.profiles.find(function(p){return p.id===active})||store.profiles[0];
}
function clientId(){
  var id=localStorage.getItem(ANALYTICS_CLIENT_KEY);
  if(!id){id=(crypto.randomUUID?crypto.randomUUID():"client_"+Date.now()+"_"+Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g,"");localStorage.setItem(ANALYTICS_CLIENT_KEY,id)}
  return id;
}
var titleSessionStarted=Date.now(),titleSessionEnded=false;
function reportUsage(event,extra){
  var p=studioProfile(),payload=Object.assign({clientId:clientId(),profileId:p.id||"default",nickname:p.name||"Player",titleId:TITLE_ID,title:TITLE_NAME,kind:"game",event:event},extra||{});
  fetch("../../api/usage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),keepalive:true}).catch(function(){});
}
function endUsageSession(){
  if(titleSessionEnded)return;titleSessionEnded=true;
  reportUsage("session_end",{seconds:Math.max(0,Math.round((Date.now()-titleSessionStarted)/1000))});
}
function loadSave(){var data=null;try{data=JSON.parse(localStorage.getItem(STORE_KEY)||"null")}catch(e){}if(!data||typeof data!=="object")data={version:1,profiles:{}};data.profiles=data.profiles||{};state.save=data}
function saveAll(){localStorage.setItem(STORE_KEY,JSON.stringify(state.save))}
function profileSave(){var p=studioProfile();state.save.profiles[p.id]=state.save.profiles[p.id]||{levels:{}};state.save.profiles[p.id].levels=state.save.profiles[p.id].levels||{};return state.save.profiles[p.id]}
function levelSave(levelId){var p=profileSave();p.levels[levelId]=p.levels[levelId]||{words:{},storyRead:false,attempts:0,bestAccuracy:0,completions:0};p.levels[levelId].words=p.levels[levelId].words||{};return p.levels[levelId]}
function wordSave(word){var ls=levelSave(state.level.id),key=normalWord(word);ls.words[key]=ls.words[key]||{build:false,spell:false,sentence:false,reported:false};return ls.words[key]}
function isMastered(word){var w=wordSave(word);return !!(w.build&&w.spell&&w.sentence)}
function masteredCount(level){
  if(!level)return 0;var saved=levelSave(level.id);
  return level.words.filter(function(w){var x=saved.words[normalWord(w)]||{};return x.build&&x.spell&&x.sentence}).length;
}
function masteredWords(level){
  if(!level||!Array.isArray(level.words))return [];
  return level.words.filter(function(w){return isMastered(w)});
}
function storyExampleFor(word){
  var story=plainStoryText(state.level&&state.level.story||"");
  if(!story)return "";
  var re=new RegExp("(^|[^A-Za-z])"+escapeRegExp(word)+"([^A-Za-z]|$)","i");
  var parts=story.split(/(?<=[.!?])\s+|\n+/).map(function(x){return x.trim()}).filter(Boolean);
  return parts.find(function(x){return re.test(x)})||"";
}
function localExampleFor(word){
  var storyExample=storyExampleFor(word);
  if(storyExample)return storyExample;
  var index=Math.max(0,(state.level&&state.level.words||[]).indexOf(word));
  var templates=[
    function(w){return "Maya wrote “"+w+"” in her notebook and checked the spelling carefully.";},
    function(w){return "Jordan read “"+w+"” aloud before copying it neatly onto his page.";},
    function(w){return "Kai highlighted “"+w+"” when he found it during his reading activity.";},
    function(w){return "Amara practised “"+w+"” once more before moving to the next activity.";},
    function(w){return "Leo circled “"+w+"” after finding it in the weekly reading passage.";},
    function(w){return "Nia listened carefully to “"+w+"” before writing it from memory.";},
    function(w){return "Eli checked every letter in “"+w+"” before showing his work.";},
    function(w){return "Sofia found “"+w+"” in the passage and read the whole line aloud.";},
    function(w){return "Malik copied “"+w+"” carefully, paying attention to each letter.";},
    function(w){return "Zoe listened for “"+w+"” while the weekly words were read aloud.";},
    function(w){return "Noah wrote “"+w+"” on his practice card and reviewed it later.";},
    function(w){return "Ava recognised “"+w+"” when it appeared in the reading exercise.";}
  ];
  return templates[index%templates.length](word);
}
function weakExample(word,example){
  var s=String(example||"").trim(),lower=s.toLowerCase(),w=normalWord(word);
  if(!s)return true;
  if(lower.indexOf("spelling word")>=0||lower.indexOf("spelling list")>=0)return true;
  if(lower.indexOf("the word "+w+" ")===0)return true;
  if(lower.indexOf("what it means")>=0)return true;
  if(lower.indexOf("use "+w+" in a sentence")>=0)return true;
  return false;
}
function supportFor(word){
  var c=(state.level.content||[]).find(function(x){return normalWord(x.word)===normalWord(word)})||{};
  var example=weakExample(word,c.example)?localExampleFor(word):c.example;
  return {word:word,definition:c.definition||"A spelling word for this week's learning mission.",example:example,hint:c.hint||("It starts with "+String(word).charAt(0).toUpperCase()+" and has "+lettersOf(word).length+" letters."),syllables:c.syllables||String(word).split("").join(" · ")};
}
function speak(text,options){
  options=options||{};
  var doneCalled=false;
  function done(){
    if(doneCalled)return;doneCalled=true;
    if(typeof options.onDone==="function")options.onDone();
  }
  if(!("speechSynthesis" in window)){
    toast("Speech is not available in this browser.");
    setTimeout(done,350);return null;
  }
  if(options.interrupt!==false)speechSynthesis.cancel();
  var u=new SpeechSynthesisUtterance(String(text||""));
  u.rate=options.rate||.82;u.pitch=options.pitch||1.05;u.lang=options.lang||"en-US";
  u.onend=done;u.onerror=done;
  speechSynthesis.speak(u);
  if(typeof options.onDone==="function"){
    var words=String(text||"").trim().split(/\s+/).filter(Boolean).length;
    setTimeout(done,Math.min(14000,Math.max(4500,words*720+1800)));
  }
  return u;
}
function updateFlightSoundButton(){
  var b=$("flightSoundBtn");if(!b)return;
  b.textContent=flightAudio.enabled?"🔊":"🔇";
  b.title=flightAudio.enabled?"Buzzing sounds on":"Buzzing sounds off";
  b.setAttribute("aria-label",flightAudio.enabled?"Mute buzzing sounds":"Turn on buzzing sounds");
}
function ensureFlightAudio(){
  if(!flightAudio.enabled)return null;
  try{
    if(!flightAudio.ctx){
      var Ctx=window.AudioContext||window.webkitAudioContext;
      if(!Ctx)return null;
      var ctx=new Ctx(),master=ctx.createGain();master.gain.value=.58;master.connect(ctx.destination);
      flightAudio.ctx=ctx;flightAudio.master=master;
    }
    if(flightAudio.ctx.state==="suspended")flightAudio.ctx.resume().catch(function(){});
    return flightAudio.ctx;
  }catch(e){return null}
}
function makeNoiseSource(ctx){
  var seconds=1.5,buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*seconds),ctx.sampleRate),data=buffer.getChannelData(0);
  for(var i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.65;
  var src=ctx.createBufferSource();src.buffer=buffer;src.loop=true;return src;
}
function stopPlaneAudio(){
  var a=flightAudio,ctx=a.ctx;if(!ctx)return;
  try{
    var now=ctx.currentTime;
    if(a.engineGain){a.engineGain.gain.cancelScheduledValues(now);a.engineGain.gain.setTargetAtTime(.0001,now,.10)}
    if(a.windGain){a.windGain.gain.cancelScheduledValues(now);a.windGain.gain.setTargetAtTime(.0001,now,.10)}
    var nodes=[a.engine1,a.engine2,a.wind,a.wingLfo,a.wingPitchLfo];
    setTimeout(function(){nodes.forEach(function(n){try{n&&n.stop()}catch(e){}})},420);
  }catch(e){}
  a.engine1=a.engine2=a.wind=a.wingLfo=a.wingPitchLfo=null;
  a.engineGain=a.windGain=a.windFilter=a.wingLfoGain=a.wingPitchGain1=a.wingPitchGain2=a.buzzFilter=null;
}
function startPlaneAudio(phase){
  if(!flightAudio.enabled)return;
  var ctx=ensureFlightAudio();if(!ctx)return;
  stopPlaneAudio();

  // A bee-like wing buzz: fast fundamental + softer harmonic, with a gentle organic flutter.
  var e1=ctx.createOscillator(),e2=ctx.createOscillator(),eg=ctx.createGain(),buzzFilter=ctx.createBiquadFilter();
  e1.type="sawtooth";e2.type="triangle";e1.frequency.value=185;e2.frequency.value=370;eg.gain.value=.0001;
  buzzFilter.type="lowpass";buzzFilter.frequency.value=1450;buzzFilter.Q.value=.55;
  e1.connect(eg);e2.connect(eg);eg.connect(buzzFilter);buzzFilter.connect(flightAudio.master);

  var lfo=ctx.createOscillator(),lfoGain=ctx.createGain();
  lfo.type="sine";lfo.frequency.value=7.2;lfoGain.gain.value=.0045;
  lfo.connect(lfoGain);lfoGain.connect(eg.gain);

  // A slower pitch wobble prevents the buzz from sounding like a perfectly tuned electric motor.
  var pitchLfo=ctx.createOscillator(),pitchGain1=ctx.createGain(),pitchGain2=ctx.createGain();
  pitchLfo.type="sine";pitchLfo.frequency.value=4.6;pitchGain1.gain.value=6.5;pitchGain2.gain.value=13;
  pitchLfo.connect(pitchGain1);pitchLfo.connect(pitchGain2);
  pitchGain1.connect(e1.frequency);pitchGain2.connect(e2.frequency);

  // Very light air noise keeps motion audible without turning the bee into an aircraft.
  var wind=makeNoiseSource(ctx),filter=ctx.createBiquadFilter(),wg=ctx.createGain();
  filter.type="highpass";filter.frequency.value=1250;filter.Q.value=.45;wg.gain.value=.0001;
  wind.connect(filter);filter.connect(wg);wg.connect(flightAudio.master);

  e1.start();e2.start();lfo.start();pitchLfo.start();wind.start();
  flightAudio.engine1=e1;flightAudio.engine2=e2;flightAudio.engineGain=eg;
  flightAudio.wingLfo=lfo;flightAudio.wingLfoGain=lfoGain;flightAudio.wingPitchLfo=pitchLfo;flightAudio.wingPitchGain1=pitchGain1;flightAudio.wingPitchGain2=pitchGain2;flightAudio.buzzFilter=buzzFilter;
  flightAudio.wind=wind;flightAudio.windGain=wg;flightAudio.windFilter=filter;
  setPlaneAudioPhase(phase||"cruise");
}
function setPlaneAudioPhase(phase){
  if(!flightAudio.enabled)return;
  var a=flightAudio,ctx=a.ctx;if(!ctx||!a.engine1||!a.engine2)return;
  var now=ctx.currentTime;
  [a.engine1.frequency,a.engine2.frequency,a.engineGain.gain,a.windGain.gain].forEach(function(p){p.cancelScheduledValues(now)});
  if(phase==="takeoff"){
    a.engine1.frequency.setValueAtTime(155,now);a.engine1.frequency.exponentialRampToValueAtTime(218,now+2.45);
    a.engine2.frequency.setValueAtTime(310,now);a.engine2.frequency.exponentialRampToValueAtTime(436,now+2.45);
    a.engineGain.gain.setValueAtTime(.006,now);a.engineGain.gain.linearRampToValueAtTime(.034,now+1.0);a.engineGain.gain.linearRampToValueAtTime(.028,now+2.5);
    a.windGain.gain.setValueAtTime(.0015,now);a.windGain.gain.linearRampToValueAtTime(.009,now+2.5);
  }else if(phase==="landing"){
    a.engine1.frequency.setValueAtTime(Math.max(175,a.engine1.frequency.value||205),now);a.engine1.frequency.exponentialRampToValueAtTime(145,now+3.4);
    a.engine2.frequency.setValueAtTime(Math.max(350,a.engine2.frequency.value||410),now);a.engine2.frequency.exponentialRampToValueAtTime(290,now+3.4);
    a.engineGain.gain.setValueAtTime(.026,now);a.engineGain.gain.linearRampToValueAtTime(.005,now+3.5);
    a.windGain.gain.setValueAtTime(.008,now);a.windGain.gain.linearRampToValueAtTime(.001,now+3.5);
  }else{
    a.engine1.frequency.setTargetAtTime(205,now,.16);a.engine2.frequency.setTargetAtTime(410,now,.16);
    a.engineGain.gain.setTargetAtTime(.026,now,.12);a.windGain.gain.setTargetAtTime(.007,now,.15);
  }
}
function playFlightTone(freq,dur,type,vol){
  if(!flightAudio.enabled)return;var ctx=ensureFlightAudio();if(!ctx)return;
  var o=ctx.createOscillator(),g=ctx.createGain();o.type=type||"sine";o.frequency.value=freq;g.gain.value=vol||.03;o.connect(g);g.connect(flightAudio.master);o.start();g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+(dur||.15));o.stop(ctx.currentTime+(dur||.15));
}
function flightSfx(name){
  if(!flightAudio.enabled)return;
  if(name==="correct"){playFlightTone(760,.10,"triangle",.035);setTimeout(function(){playFlightTone(1040,.13,"triangle",.028)},75)}
  else if(name==="wrong"){playFlightTone(180,.22,"square",.025)}
  else if(name==="touchdown"){
    var ctx=ensureFlightAudio();if(!ctx)return;
    var src=makeNoiseSource(ctx),filter=ctx.createBiquadFilter(),g=ctx.createGain();filter.type="lowpass";filter.frequency.value=220;g.gain.value=.08;src.connect(filter);filter.connect(g);g.connect(flightAudio.master);src.start();g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.72);src.stop(ctx.currentTime+.75);
    playFlightTone(74,.55,"sawtooth",.025);
  }
}
function toggleFlightAudio(){
  flightAudio.enabled=!flightAudio.enabled;localStorage.setItem(FLIGHT_AUDIO_KEY,flightAudio.enabled?"on":"off");updateFlightSoundButton();
  if(!flightAudio.enabled)stopPlaneAudio();else if(state.flight){startPlaneAudio(state.flight.landing?"landing":state.flight.active?"cruise":"takeoff")}
}
async function fetchJson(url,opts){
  var r=await fetch(url,opts||{});if(!r.ok){var j={};try{j=await r.json()}catch(e){}throw new Error(j.error||("Request failed: "+r.status))}return r.json();
}
async function loadLevels(){
  $("missionGrid").innerHTML='<div class="loading">Checking the flight board…</div>';
  try{var data=await fetchJson(API+"/levels",{cache:"no-store"});state.levels=Array.isArray(data.levels)?data.levels:[];renderMissionGrid()}
  catch(e){$("missionGrid").innerHTML='<div class="empty-state"><b>Flight board unavailable.</b><br>'+escapeHtml(e.message)+'</div>'}
}
function renderMissionGrid(){
  var grid=$("missionGrid");
  if(!state.levels.length){grid.innerHTML='<div class="empty-state"><b>No weekly spelling mission has been published yet.</b><br>An adult can add the 10–12 weekly words and story from Spelling Bee Admin.</div>';return}
  grid.innerHTML=state.levels.map(function(level){
    var m=masteredCount(level),total=level.words.length,pct=Math.round(m/Math.max(1,total)*100),ls=levelSave(level.id),status=ls.completions>0?"Fly again":m===total?"Full flight ready":m>=Math.min(3,total)?"Warm-up ready":"Start training";
    return '<article class="mission-card"><span class="eyebrow">'+escapeHtml(level.week||"WEEKLY MISSION")+'</span><div class="route">HOME 🌸 '+escapeHtml(level.destination||"Adventure Island")+'</div><h3>'+escapeHtml(level.title)+'</h3><p>'+total+' spelling words • '+escapeHtml(level.theme||"Sky Adventure")+'</p><div class="card-bottom"><div class="progress-ring" style="--p:'+pct+'%"><b>'+m+'/'+total+'</b></div><button class="flight-btn" data-level="'+escapeHtml(level.id)+'">'+status+' →</button></div></article>';
  }).join("");
  qsa("[data-level]").forEach(function(b){b.addEventListener("click",function(){openLevel(b.dataset.level)})});
}
async function openLevel(id){
  var base=state.levels.find(function(x){return x.id===id});if(!base)return;
  try{var data=await fetchJson(API+"/levels/"+encodeURIComponent(id),{cache:"no-store"});state.level=data.level||base}catch(e){state.level=base}
  state.wordIndex=0;$("topMission").textContent=state.level.title;$("levelWeek").textContent=state.level.week||"WEEKLY MISSION";$("levelTitle").textContent=state.level.title;$("levelRoute").textContent="HOME → "+(state.level.destination||"Adventure Island");$("storyTitle").textContent=state.level.title+" Story";
  var ls=levelSave(state.level.id);$("storyReadCheck").checked=!!ls.storyRead;renderStory();renderWordList();renderPracticeWord();updateReady();showScreen("practiceScreen");postProgress("practice_open",{});
}
function renderWordList(){
  if(!state.level)return;
  $("wordList").innerHTML=state.level.words.map(function(w,i){return '<button class="word-item '+(i===state.wordIndex?"active ":"")+(isMastered(w)?"done":"")+'" data-word-index="'+i+'"><span>'+(i+1)+'.</span><b>'+escapeHtml(w)+'</b></button>'}).join("");
  qsa("[data-word-index]").forEach(function(b){b.addEventListener("click",function(){state.wordIndex=Number(b.dataset.wordIndex)||0;renderWordList();renderPracticeWord()})});
  var m=masteredCount(state.level);$("wordProgress").textContent=m+" mastered";$("masteredCount").textContent=m+"/"+state.level.words.length;
}
function resetBuild(){var word=state.level.words[state.wordIndex];state.buildLetters=shuffle(lettersOf(word).map(function(ch,i){return {ch:ch,id:i}}));state.buildChosen=[];renderBuild();$("buildResult").textContent=""}
function renderBuild(){
  $("buildAnswer").textContent=state.buildChosen.map(function(x){return x.ch}).join(" ");
  $("letterBank").innerHTML=state.buildLetters.map(function(x,i){var used=state.buildChosen.some(function(c){return c.id===x.id});return '<button class="letter-chip" data-letter-index="'+i+'" '+(used?"disabled":"")+'>'+escapeHtml(x.ch)+'</button>'}).join("");
  qsa("[data-letter-index]").forEach(function(b){b.addEventListener("click",function(){
    var item=state.buildLetters[Number(b.dataset.letterIndex)];if(!item)return;state.buildChosen.push(item);renderBuild();
    var target=lettersOf(state.level.words[state.wordIndex]).join(""),built=state.buildChosen.map(function(x){return x.ch}).join("");
    if(built.length===target.length){if(built===target){wordSave(state.level.words[state.wordIndex]).build=true;saveAll();$("buildResult").textContent="✓ Nice build!";toast("Great! You built "+state.level.words[state.wordIndex]+".");renderPracticeState()}else{$("buildResult").textContent="Try again.";setTimeout(resetBuild,700)}}
  })});
}
function sentenceChoices(word){
  var sup=supportFor(word),example=sup.example||"",blank=example,re=new RegExp("(^|[^A-Za-z])("+escapeRegExp(word)+")(?=$|[^A-Za-z])","i");
  if(re.test(blank))blank=blank.replace(re,function(match,prefix){return prefix+"_____"});else blank="Choose the spelling word that belongs here: _____";
  var others=shuffle(state.level.words.filter(function(w){return normalWord(w)!==normalWord(word)})).slice(0,2);
  return {prompt:blank,choices:shuffle([word].concat(others))};
}
function renderPracticeWord(){
  if(!state.level)return;
  var word=state.level.words[state.wordIndex],sup=supportFor(word),ws=wordSave(word);
  $("wordNumber").textContent="WORD "+(state.wordIndex+1)+" OF "+state.level.words.length;$("practiceWord").textContent=word;$("syllables").textContent=sup.syllables;$("definition").textContent=sup.definition;$("exampleSentence").textContent=sup.example;$("wordHint").textContent="Hint: "+sup.hint;$("spellInput").value="";$("spellResult").textContent="";resetBuild();
  var sc=sentenceChoices(word);
  $("sentenceOptions").innerHTML='<p style="margin:0 0 8px;color:#cce0ed">'+escapeHtml(sc.prompt)+'</p>'+sc.choices.map(function(x){return '<button class="sentence-option" data-sentence-word="'+escapeHtml(x)+'">'+escapeHtml(x)+'</button>'}).join("");
  qsa("[data-sentence-word]").forEach(function(b){b.addEventListener("click",function(){
    qsa("[data-sentence-word]").forEach(function(x){x.disabled=true});
    if(normalWord(b.dataset.sentenceWord)===normalWord(word)){b.classList.add("correct");ws.sentence=true;saveAll();$("sentenceResult").textContent="✓ Correct. Read the full sentence aloud.";speak(sup.example);renderPracticeState()}
    else{b.classList.add("wrong");$("sentenceResult").textContent="Not that one. The correct word is "+word+".";setTimeout(renderPracticeWord,950)}
  })});
  $("sentenceResult").textContent=ws.sentence?"✓ Sentence practice complete.":"";renderPracticeState();
}
function renderPracticeState(){
  var word=state.level.words[state.wordIndex],ws=wordSave(word),done=isMastered(word);
  $("buildStep").classList.toggle("done",!!ws.build);$("spellStep").classList.toggle("done",!!ws.spell);$("sentenceStep").classList.toggle("done",!!ws.sentence);$("masteryState").textContent=done?"FLIGHT READY":"LEARNING";$("wordReadyText").textContent=done?"✓ This word is Flight Ready!":"Complete all three activities.";
  if(done&&!ws.reported){ws.reported=true;saveAll();postProgress("word_mastered",{word:word})}
  renderWordList();updateReady();
}
function checkSpelling(){
  var word=state.level.words[state.wordIndex],answer=normalWord($("spellInput").value);
  if(answer===normalWord(word)){wordSave(word).spell=true;saveAll();$("spellResult").textContent="✓ Correct spelling!";toast("Correct: "+word);renderPracticeState()}
  else{$("spellResult").textContent="Almost. Listen and try again.";speak(word);$("spellInput").select()}
}
function updateReady(){
  if(!state.level)return;
  var m=masteredCount(state.level),total=state.level.words.length,ready=m===total,warm=m>=Math.min(3,total);
  $("startFlightBtn").disabled=!warm;
  $("startFlightBtn").textContent=ready?"🐝 Fly Full Mission":warm?"🐝 Warm-up Flight ("+m+" words)":"🐝 Master 3 Words to Fly";
  $("readyHeading").textContent=ready?"Full mission unlocked!":warm?"Warm-up flight unlocked!":"Train 3 words to start flying";
  $("readyMessage").textContent=ready
    ?"You mastered all "+total+" words. Fly the full route to "+(state.level.destination||"your destination")+"."
    :warm
      ?"You can fly a short warm-up using the "+m+" words you already mastered. Keep training to unlock the full mission."
      :"Master any "+Math.min(3,total)+" words, then take a short warm-up flight. "+m+" of "+total+" are Flight Ready.";
}
function renderStory(){
  if(!state.level)return;var story=plainStoryText(state.level.story||"No story has been added for this week yet."),words=state.level.words.slice().sort(function(a,b){return b.length-a.length});
  if(words.length){var escaped=words.map(escapeRegExp),re=new RegExp("\\b("+escaped.join("|")+")\\b","gi");story=escapeHtml(story).replace(re,function(match){return '<button class="story-word" data-story-word="'+escapeHtml(match.toLowerCase())+'">'+escapeHtml(match)+'</button>'})}else story=escapeHtml(story);
  $("storyCopy").innerHTML=story.replace(/\n/g,"<br>");$("storyWordCount").textContent=state.level.words.length+" spelling words in this mission";
  qsa("[data-story-word]").forEach(function(b){b.addEventListener("click",function(){var word=b.dataset.storyWord,sup=supportFor(word);speak(word+". "+sup.definition);toast(sup.definition)})});
}
function setTab(id){qsa(".practice-tabs button").forEach(function(b){b.classList.toggle("active",b.dataset.tab===id)});qsa(".practice-panel").forEach(function(p){p.classList.toggle("active",p.id===id)})}
function postProgress(event,extra){
  if(!state.level)return;var p=studioProfile(),payload=Object.assign({clientId:clientId(),profileId:p.id,nickname:p.name,levelId:state.level.id,event:event},extra||{});
  fetch(API+"/progress",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),keepalive:true}).catch(function(){});
}
function addAchievement(id,title,description,icon,xp){
  var p=studioProfile(),events=[];try{events=JSON.parse(localStorage.getItem(EVENT_KEY)||"[]")}catch(e){}if(!Array.isArray(events))events=[];
  if(events.some(function(x){return x.profileId===p.id&&x.gameId==="spelling-bee"&&x.achievementId===id}))return;
  events.push({profileId:p.id,gameId:"spelling-bee",gameTitle:"Spelling Bee",achievementId:id,title:title,description:description,icon:icon,xp:xp||40,ts:new Date().toISOString()});localStorage.setItem(EVENT_KEY,JSON.stringify(events.slice(-120)));
}
function distractors(correct){
  var pool="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter(function(x){return x!==correct}),wordLetters=lettersOf(state.flight.word).filter(function(x){return x!==correct});
  var choices=shuffle(wordLetters.concat(pool)).filter(function(x,i,a){return a.indexOf(x)===i}).slice(0,2);while(choices.length<2)choices.push(pool[Math.floor(Math.random()*pool.length)]);return choices;
}
function setPlaneLane(lane){
  if(!state.flight)return;state.flight.lane=clamp(lane,-1,1);var left=state.flight.lane===-1?34:state.flight.lane===1?66:50;$("playerPlane").style.left=left+"%";$("playerPlane").classList.remove("bank-left","bank-right");if(state.flight.lane<0)$("playerPlane").classList.add("bank-left");if(state.flight.lane>0)$("playerPlane").classList.add("bank-right");setTimeout(function(){$("playerPlane").classList.remove("bank-left","bank-right")},230);
}
function steer(delta){if(state.flight&&state.flight.active)setPlaneLane(state.flight.lane+delta)}
function message(text,duration){$("flightMessage").textContent=text;$("flightMessage").classList.add("show");clearTimeout(state.flight&&state.flight.messageTimer);if(state.flight)state.flight.messageTimer=setTimeout(function(){$("flightMessage").classList.remove("show")},duration||1300)}
function seedCloudLayer(layerId,count,back){
  var layer=$(layerId);if(!layer)return;layer.innerHTML="";
  for(var i=0;i<count;i++){
    var c=document.createElement("div");c.className="flight-cloud";
    var scale=back?.75:1;
    c.style.width=((35+Math.random()*60)*scale)+"px";
    c.style.height=((18+Math.random()*28)*scale)+"px";
    c.style.left=(-8+Math.random()*108)+"%";
    c.style.top=((back?8:14)+Math.random()*(back?38:48))+"%";
    c.style.opacity=(back?.18:.28)+Math.random()*(back?.28:.5);
    c.style.animationDuration=((back?24:14)+Math.random()*(back?20:18))+"s";
    c.style.animationDelay=(-Math.random()*14)+"s";
    layer.appendChild(c);
  }
}
function seedClouds(){
  seedCloudLayer("cloudLayerBack",9,true);
  seedCloudLayer("cloudLayer",14,false);
}
function seedCruiseIslands(){
  var layer=$("cruiseIslands");if(!layer)return;layer.innerHTML="";
  for(var i=0;i<6;i++){
    var island=document.createElement("i");island.className="cruise-island";
    var left=5+Math.random()*90,side=left<50?-1:1;
    island.style.setProperty("--x",left+"%");
    island.style.setProperty("--y",(6+Math.random()*52)+"%");
    island.style.setProperty("--w",(80+Math.random()*120)+"px");
    island.style.setProperty("--s",(.55+Math.random()*.55).toFixed(2));
    island.style.setProperty("--o",(.28+Math.random()*.34).toFixed(2));
    island.style.setProperty("--dur",(12+Math.random()*8)+"s");
    island.style.setProperty("--delay",(-Math.random()*12)+"s");
    island.style.setProperty("--drift",(side*(20+Math.random()*55))+"px");
    layer.appendChild(island);
  }
}
function seedVegetation(){
  var layer=$("vegetationStream");if(!layer)return;layer.innerHTML="";
  for(var i=0;i<10;i++){
    var v=document.createElement("i");v.className="veg";
    var left=3+Math.random()*94,side=left<50?-1:1;
    v.style.setProperty("--x",left+"%");
    v.style.setProperty("--size",(18+Math.random()*22)+"px");
    v.style.setProperty("--dur",(1.8+Math.random()*1.6)+"s");
    v.style.setProperty("--delay",(-Math.random()*3)+"s");
    v.style.setProperty("--drift",(side*(18+Math.random()*48))+"px");
    layer.appendChild(v);
  }
}
function setFlightPhase(phase){
  var world=$("flightWorld");if(!world)return;
  world.classList.remove("takeoff","cruise","landing");
  if(phase)world.classList.add(phase);
}
function flightFuel(){
  var f=state.flight;if(!f)return 0;if(f.mistakes>f.allowance)return 0;
  var gain=f.correct*(40/Math.max(1,f.totalLetters))+(f.bonusFuel||0),loss=f.mistakes*(60/Math.max(1,f.allowance));
  return Math.round(clamp(60+gain-loss,5,100));
}
function flowerGateSvg(){
  var petals="";
  [0,60,120,180,240,300].forEach(function(a){petals+='<ellipse cx="60" cy="27" rx="18" ry="29" fill="currentColor" transform="rotate('+a+' 60 60)"/>'});
  return '<svg class="gate-flower" viewBox="0 0 120 120" aria-hidden="true"><g>'+petals+'</g><circle cx="60" cy="60" r="24" fill="#FFFBEA" stroke="currentColor" stroke-width="4"/></svg>';
}
function gateSpeed(f){
  if(!f)return 390;
  var ramp=Math.min(150,f.wordIndex*18),comboKick=(f.combo||0)>=6?20:0,help=(f.mistakes||0)>=2?-45:0;
  return clamp(390+ramp+comboKick+help,340,610);
}
function updateFlightHud(){
  var f=state.flight;if(!f)return;var fuel=flightFuel(),decisions=f.correct+f.mistakes,accuracy=decisions?Math.round(f.correct/decisions*100):100;
  $("fuelFill").style.width=fuel+"%";$("fuelText").textContent=fuel+"%";$("accuracyText").textContent=accuracy+"%";
  $("mistakeText").textContent=f.mistakes>f.allowance?"Nectar empty":"Wrong letters: "+f.mistakes+" / "+f.allowance;
  $("flightWordCount").textContent=(f.warmup?"WARM-UP • ":"")+"WORD "+(f.wordIndex+1)+" / "+f.words.length;
  $("flightPattern").textContent=f.wordLetters.map(function(ch,i){return i<f.letterIndex?ch:"_"}).join(" ");
  var pct=Math.round(f.correct/Math.max(1,f.totalLetters)*100);$("routeFill").style.width=pct+"%";$("routePlane").style.left=pct+"%";if($("routePercent"))$("routePercent").textContent=pct+"%";
  var comboEl=$("comboText");if(comboEl)comboEl.textContent=(f.combo||0)+"x combo"+(f.shield?" · 🛡 shield":"");
  var pp=$("playerPlane");if(pp)pp.classList.toggle("shielded",!!f.shield);
  var speedEl=$("speedText"),speed=gateSpeed(f);if(speedEl)speedEl.textContent=speed<430?"Gentle pace":speed<525?"Steady pace":"Fast buzz";
}
function clearGates(){if(!state.flight)return;state.flight.gates.forEach(function(g){if(g.el&&g.el.parentNode)g.el.remove()});state.flight.gates=[]}
function spawnGates(){
  var f=state.flight;if(!f||!f.active||f.transitioning)return;clearGates();var correct=f.wordLetters[f.letterIndex];if(!correct){finishWord();return}
  var chars=shuffle([correct].concat(distractors(correct))),lanes=[-1,0,1];
  f.gates=lanes.map(function(lane,i){
    var el=document.createElement("div");el.className="letter-gate";el.innerHTML=flowerGateSvg()+'<span class="gate-letter">'+escapeHtml(chars[i])+"</span>";$("scene3d").appendChild(el);
    return {el:el,lane:lane,letter:chars[i],z:-1500,resolved:false};
  });
}
function gateTouchesPlane(gate,progress){
  var f=state.flight;if(!gate||!f)return false;
  if(gate.lane!==f.lane)return false;
  if(Number.isFinite(progress))return progress>=.84&&progress<=1.05;
  if(!gate.el||!$("planeHitPoint"))return false;
  var gr=gate.el.getBoundingClientRect(),pr=$("planeHitPoint").getBoundingClientRect();
  if(!gr.width||!gr.height)return false;
  var px=pr.left+pr.width/2,py=pr.top+pr.height/2,gx=gr.left+gr.width/2,gy=gr.top+gr.height/2;
  var rx=gr.width*.34,ry=gr.height*.34;
  return Math.pow((px-gx)/Math.max(1,rx),2)+Math.pow((py-gy)/Math.max(1,ry),2)<=1;
}
function removeOtherGates(keep){
  var f=state.flight;if(!f)return;
  f.gates.forEach(function(g){if(g!==keep&&g.el&&g.el.parentNode)g.el.remove()});
  f.gates=keep?[keep]:[];
}
function burstPetals(){
  var world=$("flightWorld");if(!world)return;
  var colors=["#FFC93C","#FF6FA5","#A77BFF","#8FD36A","#FFFFFF"];
  for(var i=0;i<14;i++){
    var petal=document.createElement("i");petal.className="petal-pop";
    petal.style.setProperty("--dx",(-110+Math.random()*220).toFixed(0)+"px");
    petal.style.setProperty("--dy",(-70-Math.random()*150).toFixed(0)+"px");
    petal.style.setProperty("--rot",(-180+Math.random()*360).toFixed(0)+"deg");
    petal.style.background=colors[i%colors.length];
    world.appendChild(petal);
    setTimeout((function(el){return function(){el.remove()}})(petal),1050);
  }
}
function evaluateGate(gate,missed){
  var f=state.flight;if(!f||f.transitioning||f.ending)return;
  var correct=f.wordLetters[f.letterIndex];
  if(gate&&gate.resolved)return;
  if(gate)gate.resolved=true;
  removeOtherGates(gate||null);
  if(gate&&gate.el){gate.el.classList.add("hit");setTimeout(function(){if(gate.el&&gate.el.parentNode)gate.el.remove()},330)}
  if(!missed&&gate&&gate.letter===correct){
    f.correct++;f.streak++;f.bestStreak=Math.max(f.bestStreak,f.streak);f.letterIndex++;
    f.combo=(f.combo||0)+1;f.bestCombo=Math.max(f.bestCombo||0,f.combo);
    var bonusMsg="";
    if(f.combo%6===0){f.shield=true;bonusMsg=" · 🛡 Shield earned!"}
    if(f.combo%4===0&&f.combo%6!==0){f.bonusFuel=(f.bonusFuel||0)+7;bonusMsg=" · 🍯 Honey boost!"}
    flightSfx("correct");message("✓ "+gate.letter+" — direct hit!"+bonusMsg,750);updateFlightHud();
    if(f.letterIndex>=f.wordLetters.length)setTimeout(finishWord,480);else setTimeout(spawnGates,Math.max(300,470-f.wordIndex*8));
  }else{
    if(missed){
      f.flightMisses=(f.flightMisses||0)+1;f.combo=0;updateFlightHud();
      message("Almost! Steer into a flower next time — no nectar lost.",850);
      setTimeout(spawnGates,650);return;
    }
    if(f.shield){
      f.shield=false;f.combo=0;updateFlightHud();
      flightSfx("correct");message("🛡 Shield absorbed the miss — keep going!",950);
      setTimeout(spawnGates,900);return;
    }
    f.mistakes++;f.streak=0;f.combo=0;f.difficult[f.word]=(f.difficult[f.word]||0)+1;updateFlightHud();
    flightSfx("wrong");var msg=missed?"Missed the flowers — line up with "+correct+".":"Wrong petal. Find "+correct+".";
    if(f.mistakes>f.allowance){message("Nectar is empty — heading home safely.",1700);setTimeout(function(){endFlight(false)},1700)}
    else{message(msg,950);speak("Try again. Find "+correct);setTimeout(spawnGates,900)}
  }
}
function finishWord(){
  var f=state.flight;if(!f||f.transitioning)return;
  f.transitioning=true;clearGates();var completedWord=f.word,sup=supportFor(completedWord);
  f.bonusFuel=Math.min(28,(f.bonusFuel||0)+4);burstPetals();flightSfx("correct");
  message("🌼 "+completedWord.toUpperCase()+" complete! Listen to the sentence.",2200);

  // Do not advance on a fixed timer: wait for the spoken word + sentence to finish.
  speak(completedWord+". "+sup.example,{onDone:function(){
    if(!state.flight||state.flight!==f||f.ending)return;
    f.wordIndex++;
    if(f.wordIndex>=f.words.length){endFlight(true);return}
    f.word=f.words[f.wordIndex];f.wordLetters=lettersOf(f.word);f.letterIndex=0;f.transitioning=false;
    updateFlightHud();message("Next word: "+f.word,1050);
    speak("Spell "+f.word);
    setTimeout(function(){if(state.flight===f&&!f.transitioning&&!f.ending)spawnGates()},420);
  }});
}
function flightLoop(ts){
  var f=state.flight;if(!f){state.raf=0;return}if(!f.last)f.last=ts;var dt=Math.min(.05,(ts-f.last)/1000);f.last=ts;
  if(f.active&&!f.transitioning&&f.gates.length){
    var world=$("flightWorld"),hitGate=null,allPassed=true;
    var speed=gateSpeed(f);
    f.gates.forEach(function(g){
      if(g.resolved)return;
      g.z+=speed*dt;
      var t=clamp((g.z+1500)/1480,0,1.12),ease=t*t*(3-2*t);
      var ww=world?world.clientWidth:1000,wh=world?world.clientHeight:700;
      var lanePx=ww*(.045+.115*ease)*g.lane;
      var approachY=wh*(.015+.245*ease)+Math.sin((g.z+g.lane*110)/310)*4;
      g.el.style.transform="translate3d("+lanePx+"px,"+approachY+"px,"+g.z+"px)";
      g.el.style.opacity=t>1.015?Math.max(0,1-(t-1.015)*11):1;
      if(gateTouchesPlane(g,t)&&!hitGate)hitGate=g;
      if(t<1.045)allPassed=false;
    });
    if(hitGate)evaluateGate(hitGate,false);
    else if(allPassed)evaluateGate(null,true);
  }
  state.raf=requestAnimationFrame(flightLoop);
}
function startFlight(){
  if(!state.level||!Array.isArray(state.level.words)||!state.level.words.length)return;
  var learned=masteredWords(state.level),minWarm=Math.min(3,state.level.words.length);
  if(learned.length<minWarm)return;
  var fullMission=learned.length===state.level.words.length,flightWords=fullMission?state.level.words.slice():learned.slice();
  var total=flightWords.reduce(function(n,w){return n+lettersOf(w).length},0),p=studioProfile(),ls=levelSave(state.level.id);
  ls.attempts=(ls.attempts||0)+1;saveAll();
  state.flight={
    active:false,transitioning:false,ending:false,landing:false,lane:0,gates:[],words:flightWords,warmup:!fullMission,
    wordIndex:0,word:flightWords[0],wordLetters:lettersOf(flightWords[0]),letterIndex:0,totalLetters:total,
    allowance:fullMission?Math.max(1,Math.floor(total*.2)):Math.max(3,Math.floor(total*.2)),
    correct:0,mistakes:0,flightMisses:0,streak:0,bestStreak:0,combo:0,bestCombo:0,shield:true,bonusFuel:0,difficult:{},last:0
  };
  $("originLabel").textContent="HIVE";
  $("destinationLabel").textContent=(fullMission?(state.level.destination||"DESTINATION"):"WARM-UP GARDEN").toUpperCase();
  $("welcomeSign").textContent=(fullMission?(state.level.destination||"WELCOME"):"WARM-UP GARDEN").toUpperCase();
  $("playerPlane").classList.remove("landing","bank-left","bank-right");
  $("touchdownSmoke").classList.remove("active");
  seedClouds();seedCruiseIslands();seedVegetation();setPlaneLane(0);setFlightPhase("takeoff");updateFlightHud();showScreen("flightScreen");
  startPlaneAudio("takeoff");
  postProgress("attempt",{totalLetters:total,warmup:!fullMission});
  message(fullMission?"🐝 Full mission! Tap/drag or use ← → to match the next letter.":"🐝 Warm-up flight! Missed flowers are free retries.",2400);
  speak((fullMission?"Full mission. ":"Warm up flight. ")+"First word: "+state.flight.word);
  if(!state.raf)state.raf=requestAnimationFrame(flightLoop);
  setTimeout(function(){
    if(!state.flight||state.flight.ending)return;
    setFlightPhase("cruise");setPlaneAudioPhase("cruise");state.flight.active=true;
    message("Find the next letter. Tap or drag to steer.",1300);spawnGates();
  },3300);
}
function endFlight(success){
  var f=state.flight;if(!f||f.ending)return;
  f.ending=true;f.active=false;f.transitioning=true;clearGates();
  var decisions=f.correct+f.mistakes,accuracy=decisions?Math.round(f.correct/decisions*100):0,fuel=flightFuel(),completedWords=success?f.words.length:f.wordIndex,ls=levelSave(state.level.id),fullMission=!f.warmup;
  ls.bestAccuracy=Math.max(Number(ls.bestAccuracy)||0,accuracy);if(success&&fullMission)ls.completions=(ls.completions||0)+1;saveAll();
  var difficult=Object.keys(f.difficult).sort(function(a,b){return f.difficult[b]-f.difficult[a]});
  beginLanding(success,function(){
    $("resultsIcon").textContent=success?"🌼":"🌸";
    $("resultsEyebrow").textContent=success?(f.warmup?"WARM-UP COMPLETE":"MISSION COMPLETE"):"SAFE DIVERSION";
    $("resultsTitle").textContent=success?(f.warmup?"Great warm-up flight!":"Welcome to "+(state.level.destination||"your destination")+"!"):"Practice Garden";
    $("resultsMessage").textContent=success
      ?(f.warmup?"You flew the "+f.words.length+" words you have mastered. Train more words to unlock the full mission.":"You landed safely by spelling the weekly words in the correct order.")
      :"Too many wrong-letter choices emptied the nectar. Missed flowers do not count, so practise the difficult words and try again.";
    $("resultAccuracy").textContent=accuracy+"%";$("resultWords").textContent=completedWords+"/"+f.words.length;$("resultFuel").textContent=fuel+"%";$("resultStreak").textContent=f.bestCombo||f.bestStreak;
    $("reviewBox").innerHTML=difficult.length?"<b>Words to practise</b><p>"+difficult.map(escapeHtml).join(" • ")+"</p>":"<b>Excellent spelling!</b><p>You did not choose any wrong-letter flowers.</p>";
    stopPlaneAudio();showScreen("resultsScreen");reportUsage("score",{score:accuracy});
    if(success&&fullMission)reportUsage("complete",{score:accuracy});
    if(fullMission)postProgress(success?"complete":"divert",{accuracy:accuracy,mistakes:f.mistakes,totalLetters:f.totalLetters,difficultWords:difficult.slice(0,12)});
    if(success&&fullMission)addAchievement("first-flight","First Flower Landing","Complete a Spelling Bee weekly flight mission.","🌼",45);
    if(success&&fullMission&&accuracy===100)addAchievement("perfect-flight","Perfect Flight","Complete a Spelling Bee flight with 100% spelling accuracy.","⭐",70);
  });
}
function beginLanding(success,done){
  var f=state.flight;if(!f)return done&&done();
  f.landing=true;f.active=false;clearGates();setPlaneLane(0);
  $("playerPlane").classList.remove("bank-left","bank-right");
  $("playerPlane").classList.add("landing");
  $("originLabel").textContent=success?"APPROACH":"DIVERSION";
  var destination=success?(f.warmup?"WARM-UP GARDEN":(state.level.destination||"DESTINATION")):"PRACTICE GARDEN";
  $("destinationLabel").textContent=destination.toUpperCase();
  $("welcomeSign").textContent=destination.toUpperCase();
  setFlightPhase("landing");
  setPlaneAudioPhase("landing");
  message(success?"Destination garden ahead — choose a flower to land.":"Low nectar — landing at the Practice Garden.",1900);
  speak(success?"Destination garden ahead. Prepare to land on a flower.":"We are heading safely to the Practice Garden.");
  setTimeout(function(){
    if(!state.flight)return;
    $("touchdownSmoke").classList.remove("active");void $("touchdownSmoke").offsetWidth;$("touchdownSmoke").classList.add("active");
    flightSfx("touchdown");
    message("Gentle flower landing — great flying!",1250);
    speak("Landed safely. Welcome to "+destination+".");
    setTimeout(function(){if(done)done()},1450);
  },3600);
}
function backToPractice(){stopPlaneAudio();state.flight=null;renderWordList();renderPracticeWord();showScreen("practiceScreen")}
function bindFlightPointerControls(){
  var world=$("flightWorld");if(!world)return;var steering=false;
  function laneForEvent(e){
    var r=world.getBoundingClientRect(),x=(e.clientX-r.left)/Math.max(1,r.width);
    return x<.39?-1:x>.61?1:0;
  }
  world.addEventListener("pointerdown",function(e){
    if(!state.flight||!state.flight.active)return;
    steering=true;try{world.setPointerCapture(e.pointerId)}catch(err){}
    setPlaneLane(laneForEvent(e));
  });
  world.addEventListener("pointermove",function(e){
    if(!steering||!state.flight||!state.flight.active)return;
    setPlaneLane(laneForEvent(e));
  });
  world.addEventListener("pointerup",function(){steering=false});
  world.addEventListener("pointercancel",function(){steering=false});
}
function initBindings(){
  $("homeBtn").addEventListener("click",function(){stopPlaneAudio();location.href="../../"});$("refreshLevels").addEventListener("click",loadLevels);$("backToMissions").addEventListener("click",function(){state.level=null;showScreen("missionsScreen");renderMissionGrid()});
  qsa(".practice-tabs button").forEach(function(b){b.addEventListener("click",function(){setTab(b.dataset.tab)})});
  $("speakWord").addEventListener("click",function(){speak(state.level.words[state.wordIndex])});$("hearSentence").addEventListener("click",function(){speak(supportFor(state.level.words[state.wordIndex]).example)});$("spellHear").addEventListener("click",function(){speak(state.level.words[state.wordIndex])});$("resetBuild").addEventListener("click",resetBuild);$("checkSpelling").addEventListener("click",checkSpelling);$("spellInput").addEventListener("keydown",function(e){if(e.key==="Enter")checkSpelling()});$("nextWordBtn").addEventListener("click",function(){state.wordIndex=(state.wordIndex+1)%state.level.words.length;renderWordList();renderPracticeWord()});$("readStory").addEventListener("click",function(){speak(state.level.story||"")});$("storyReadCheck").addEventListener("change",function(){levelSave(state.level.id).storyRead=this.checked;saveAll();if(this.checked)postProgress("story_read",{})});$("startFlightBtn").addEventListener("click",startFlight);$("flightSpeak").addEventListener("click",function(){if(state.flight)speak("Spell "+state.flight.word)});
  qsa("[data-steer]").forEach(function(b){b.addEventListener("pointerdown",function(e){e.preventDefault();steer(Number(b.dataset.steer))})});bindFlightPointerControls();$("flightSoundBtn").addEventListener("click",toggleFlightAudio);$("retryFlight").addEventListener("click",startFlight);$("reviewWords").addEventListener("click",backToPractice);$("resultMissions").addEventListener("click",function(){stopPlaneAudio();state.flight=null;state.level=null;showScreen("missionsScreen");renderMissionGrid()});
  window.addEventListener("keydown",function(e){if(!$("flightScreen").classList.contains("active"))return;if(e.key==="ArrowLeft"||e.key==="a"||e.key==="A"){e.preventDefault();steer(-1)}if(e.key==="ArrowRight"||e.key==="d"||e.key==="D"){e.preventDefault();steer(1)}if(e.key===" "){e.preventDefault();if(state.flight)speak("Spell "+state.flight.word)}});
}
function init(){
  loadSave();initBindings();updateFlightSoundButton();
  reportUsage("session_start");
  window.addEventListener("pagehide",function(){stopPlaneAudio();endUsageSession()},{once:true});
  loadLevels();
}
init();
})();