(function(){
"use strict";

var API="../../api/spelling";
var STORE_KEY="gsj_spelling_bee_v1";
var STUDIO_STORE_KEY="gsj_store_v2";
var ACTIVE_PROFILE_KEY="gsj_active_profile_id";
var ANALYTICS_CLIENT_KEY="gsj_client_id_v1";
var EVENT_KEY="gsj_game_events_v1";
var state={levels:[],level:null,wordIndex:0,save:null,buildLetters:[],buildChosen:[],flight:null,raf:0};

function $(id){return document.getElementById(id)}
function qsa(sel){return Array.prototype.slice.call(document.querySelectorAll(sel))}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function escapeHtml(s){return String(s||"").replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]})}
function escapeRegExp(s){return String(s||"").replace(/[.*+?^$()|[\]\\{}]/g,"\\$&")}
function normalWord(s){return String(s||"").trim().toLowerCase()}
function lettersOf(s){return Array.from(String(s||"").trim().toUpperCase()).filter(function(ch){return /[A-Z'-]/.test(ch)})}
function shuffle(arr){arr=arr.slice();for(var i=arr.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=arr[i];arr[i]=arr[j];arr[j]=t}return arr}
function toast(msg){var el=document.createElement("div");el.className="toast";el.textContent=msg;$("toastArea").appendChild(el);setTimeout(function(){el.remove()},2600)}
function showScreen(id){qsa(".screen").forEach(function(x){x.classList.toggle("active",x.id===id)});window.scrollTo(0,0)}
function studioProfile(){
  var store=null;try{store=JSON.parse(localStorage.getItem(STUDIO_STORE_KEY)||"null")}catch(e){}
  if(!store||!Array.isArray(store.profiles)||!store.profiles.length)return {id:"local-player",name:"Player",avatar:"✈"};
  var active=store.activeProfileId||localStorage.getItem(ACTIVE_PROFILE_KEY);
  return store.profiles.find(function(p){return p.id===active})||store.profiles[0];
}
function clientId(){
  var id=localStorage.getItem(ANALYTICS_CLIENT_KEY);
  if(!id){id=(crypto.randomUUID?crypto.randomUUID():"client_"+Date.now()+"_"+Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g,"");localStorage.setItem(ANALYTICS_CLIENT_KEY,id)}
  return id;
}
function loadSave(){var data=null;try{data=JSON.parse(localStorage.getItem(STORE_KEY)||"null")}catch(e){}if(!data||typeof data!=="object")data={version:1,profiles:{}};data.profiles=data.profiles||{};state.save=data}
function saveAll(){localStorage.setItem(STORE_KEY,JSON.stringify(state.save))}
function profileSave(){var p=studioProfile();state.save.profiles[p.id]=state.save.profiles[p.id]||{levels:{}};state.save.profiles[p.id].levels=state.save.profiles[p.id].levels||{};return state.save.profiles[p.id]}
function levelSave(levelId){var p=profileSave();p.levels[levelId]=p.levels[levelId]||{words:{},storyRead:false,attempts:0,bestAccuracy:0,completions:0};p.levels[levelId].words=p.levels[levelId].words||{};return p.levels[levelId]}
function wordSave(word){var ls=levelSave(state.level.id),key=normalWord(word);ls.words[key]=ls.words[key]||{build:false,spell:false,sentence:false};return ls.words[key]}
function isMastered(word){var w=wordSave(word);return !!(w.build&&w.spell&&w.sentence)}
function masteredCount(level){
  if(!level)return 0;var saved=levelSave(level.id);
  return level.words.filter(function(w){var x=saved.words[normalWord(w)]||{};return x.build&&x.spell&&x.sentence}).length;
}
function storyExampleFor(word){
  var story=String(state.level&&state.level.story||"");
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
    function(w){return "Maya used "+w+" naturally while telling her family about her day.";},
    function(w){return "Jordan chose "+w+" because it clearly expressed what he wanted to say.";},
    function(w){return "Kai read a sentence with "+w+" and understood how it was being used.";},
    function(w){return "Amara added "+w+" to her paragraph where it matched the meaning perfectly.";},
    function(w){return "Leo heard "+w+" in a story and used it correctly in his own sentence.";},
    function(w){return "Nia included "+w+" when she described what happened during the adventure.";},
    function(w){return "Eli used "+w+" in his journal so the sentence said exactly what he meant.";},
    function(w){return "Sofia found a natural place for "+w+" while writing her short story.";},
    function(w){return "Malik used "+w+" correctly when he explained his idea to the group.";},
    function(w){return "Zoe included "+w+" in a sentence that made the meaning clear.";},
    function(w){return "Noah used "+w+" while describing the scene in his reading activity.";},
    function(w){return "Ava placed "+w+" in her sentence because it suited the situation best.";}
  ];
  return templates[index%templates.length](word);
}
function supportFor(word){
  var c=(state.level.content||[]).find(function(x){return normalWord(x.word)===normalWord(word)})||{};
  return {word:word,definition:c.definition||"A spelling word for this week's learning mission.",example:c.example||localExampleFor(word),hint:c.hint||("It starts with "+String(word).charAt(0).toUpperCase()+" and has "+lettersOf(word).length+" letters."),syllables:c.syllables||String(word).split("").join(" · ")};
}
function speak(text){
  if(!("speechSynthesis" in window)){toast("Speech is not available in this browser.");return}
  speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(String(text||""));u.rate=.82;u.pitch=1.05;u.lang="en-US";speechSynthesis.speak(u);
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
    var m=masteredCount(level),total=level.words.length,pct=Math.round(m/Math.max(1,total)*100),ls=levelSave(level.id),status=ls.completions>0?"Fly again":m===total?"Ready to fly":"Start training";
    return '<article class="mission-card"><span class="eyebrow">'+escapeHtml(level.week||"WEEKLY MISSION")+'</span><div class="route">HOME ✈ '+escapeHtml(level.destination||"Adventure Island")+'</div><h3>'+escapeHtml(level.title)+'</h3><p>'+total+' spelling words • '+escapeHtml(level.theme||"Sky Adventure")+'</p><div class="card-bottom"><div class="progress-ring" style="--p:'+pct+'%"><b>'+m+'/'+total+'</b></div><button class="flight-btn" data-level="'+escapeHtml(level.id)+'">'+status+' →</button></div></article>';
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
  var sup=supportFor(word),example=sup.example||"",blank=example,re=new RegExp("\\b"+escapeRegExp(word)+"\\b","i");
  if(re.test(blank))blank=blank.replace(re,"_____");else blank="Choose the spelling word that belongs here: _____";
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
  if(done)postProgress("word_mastered",{word:word});renderWordList();updateReady();
}
function checkSpelling(){
  var word=state.level.words[state.wordIndex],answer=normalWord($("spellInput").value);
  if(answer===normalWord(word)){wordSave(word).spell=true;saveAll();$("spellResult").textContent="✓ Correct spelling!";toast("Correct: "+word);renderPracticeState()}
  else{$("spellResult").textContent="Almost. Listen and try again.";speak(word);$("spellInput").select()}
}
function updateReady(){
  if(!state.level)return;var m=masteredCount(state.level),total=state.level.words.length,ready=m===total;
  $("startFlightBtn").disabled=!ready;$("readyHeading").textContent=ready?"Cleared for takeoff!":"Keep training";$("readyMessage").textContent=ready?"You mastered all "+total+" words. Your aircraft is ready.":"Master every weekly word to unlock your flight mission. "+m+" of "+total+" are Flight Ready.";
}
function renderStory(){
  if(!state.level)return;var story=String(state.level.story||"No story has been added for this week yet."),words=state.level.words.slice().sort(function(a,b){return b.length-a.length});
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
function setFlightPhase(phase){
  var world=$("flightWorld");if(!world)return;
  world.classList.remove("takeoff","cruise","landing");
  if(phase)world.classList.add(phase);
}
function flightFuel(){
  var f=state.flight;if(!f)return 0;if(f.mistakes>f.allowance)return 0;var gain=f.correct*(40/Math.max(1,f.totalLetters)),loss=f.mistakes*(60/Math.max(1,f.allowance));return Math.round(clamp(60+gain-loss,5,100));
}
function updateFlightHud(){
  var f=state.flight;if(!f)return;var fuel=flightFuel(),decisions=f.correct+f.mistakes,accuracy=decisions?Math.round(f.correct/decisions*100):100;
  $("fuelFill").style.width=fuel+"%";$("fuelText").textContent=fuel+"%";$("accuracyText").textContent=accuracy+"%";$("mistakeText").textContent=f.mistakes+" / "+f.allowance+" fuel mistakes";$("flightWordCount").textContent="WORD "+(f.wordIndex+1)+" / "+state.level.words.length;$("flightPattern").textContent=f.wordLetters.map(function(ch,i){return i<f.letterIndex?ch:"_"}).join(" ");
  var pct=Math.round(f.correct/Math.max(1,f.totalLetters)*100);$("routeFill").style.width=pct+"%";$("routePlane").style.left=pct+"%";
}
function clearGates(){if(!state.flight)return;state.flight.gates.forEach(function(g){if(g.el&&g.el.parentNode)g.el.remove()});state.flight.gates=[]}
function spawnGates(){
  var f=state.flight;if(!f||!f.active||f.transitioning)return;clearGates();var correct=f.wordLetters[f.letterIndex];if(!correct){finishWord();return}
  var chars=shuffle([correct].concat(distractors(correct))),lanes=[-1,0,1];
  f.gates=lanes.map(function(lane,i){var el=document.createElement("div");el.className="letter-gate";el.textContent=chars[i];$("scene3d").appendChild(el);return {el:el,lane:lane,letter:chars[i],z:-1450}});
}
function evaluateGate(){
  var f=state.flight;if(!f||!f.gates.length)return;var gate=f.gates.find(function(g){return g.lane===f.lane})||f.gates[1],correct=f.wordLetters[f.letterIndex];clearGates();
  if(gate.letter===correct){f.correct++;f.streak++;f.bestStreak=Math.max(f.bestStreak,f.streak);f.letterIndex++;message("✓ "+gate.letter+" — fuel boost!",650);updateFlightHud();if(f.letterIndex>=f.wordLetters.length)setTimeout(finishWord,450);else setTimeout(spawnGates,420)}
  else{f.mistakes++;f.streak=0;f.difficult[f.word]=(f.difficult[f.word]||0)+1;updateFlightHud();if(f.mistakes>f.allowance){message("Fuel is empty — diverting safely.",1700);setTimeout(function(){endFlight(false)},1700)}else{message("That isn't the next letter. Find "+correct+".",950);speak("Try again. Find "+correct);setTimeout(spawnGates,850)}}
}
function finishWord(){
  var f=state.flight;if(!f||f.transitioning)return;f.transitioning=true;clearGates();var sup=supportFor(f.word);message("★ "+f.word.toUpperCase()+" — "+sup.example,1450);f.wordIndex++;
  if(f.wordIndex>=state.level.words.length){setTimeout(function(){endFlight(true)},1600);return}
  setTimeout(function(){f.word=state.level.words[f.wordIndex];f.wordLetters=lettersOf(f.word);f.letterIndex=0;f.transitioning=false;updateFlightHud();speak("Spell "+f.word);spawnGates()},1600);
}
function flightLoop(ts){
  var f=state.flight;if(!f){state.raf=0;return}if(!f.last)f.last=ts;var dt=Math.min(.05,(ts-f.last)/1000);f.last=ts;
  if(f.active&&!f.transitioning&&f.gates.length){var hit=false;f.gates.forEach(function(g){g.z+=560*dt;var y=Math.sin((g.z+g.lane*100)/260)*10;g.el.style.transform="translate3d("+(g.lane*220)+"px,"+y+"px,"+g.z+"px)";if(g.z>=-35&&!hit)hit=true});if(hit)evaluateGate()}
  state.raf=requestAnimationFrame(flightLoop);
}
function startFlight(){
  if(!state.level||masteredCount(state.level)!==state.level.words.length)return;
  var total=state.level.words.reduce(function(n,w){return n+lettersOf(w).length},0),p=studioProfile(),ls=levelSave(state.level.id);
  ls.attempts=(ls.attempts||0)+1;saveAll();
  state.flight={active:false,transitioning:false,ending:false,landing:false,lane:0,gates:[],wordIndex:0,word:state.level.words[0],wordLetters:lettersOf(state.level.words[0]),letterIndex:0,totalLetters:total,allowance:Math.floor(total*.2),correct:0,mistakes:0,streak:0,bestStreak:0,difficult:{},last:0};
  $("originLabel").textContent="TAKEOFF";
  $("destinationLabel").textContent=(state.level.destination||"DESTINATION").toUpperCase();
  $("welcomeSign").textContent=(state.level.destination||"WELCOME").toUpperCase();
  $("runway").style.opacity="";
  $("playerPlane").classList.remove("landing","bank-left","bank-right");
  seedClouds();setPlaneLane(0);setFlightPhase("takeoff");updateFlightHud();showScreen("flightScreen");
  postProgress("attempt",{totalLetters:total});
  message("Tower: "+p.name+", cleared for takeoff!",1800);
  speak("Cleared for takeoff. First word: "+state.flight.word);
  if(!state.raf)state.raf=requestAnimationFrame(flightLoop);
  setTimeout(function(){
    if(!state.flight||state.flight.ending)return;
    setFlightPhase("cruise");
    state.flight.active=true;
    message("Cruise altitude reached. Spell "+state.flight.word,1300);
    spawnGates();
  },2800);
}
function endFlight(success){
  var f=state.flight;if(!f||f.ending)return;
  f.ending=true;f.active=false;f.transitioning=true;clearGates();
  var decisions=f.correct+f.mistakes,accuracy=decisions?Math.round(f.correct/decisions*100):0,fuel=flightFuel(),completedWords=success?state.level.words.length:f.wordIndex,ls=levelSave(state.level.id);
  ls.bestAccuracy=Math.max(Number(ls.bestAccuracy)||0,accuracy);if(success)ls.completions=(ls.completions||0)+1;saveAll();
  var difficult=Object.keys(f.difficult).sort(function(a,b){return f.difficult[b]-f.difficult[a]});
  beginLanding(success,function(){
    $("resultsIcon").textContent=success?"🛬":"🛟";
    $("resultsEyebrow").textContent=success?"MISSION COMPLETE":"SAFE DIVERSION";
    $("resultsTitle").textContent=success?"Welcome to "+(state.level.destination||"your destination")+"!":"Practice Airfield";
    $("resultsMessage").textContent=success?"You landed safely after keeping the aircraft fuelled by spelling the weekly words in the correct sequence.":"More than 20% of the mission letters were missed, so the tower diverted you to the Practice Airfield. Review the difficult words and try again.";
    $("resultAccuracy").textContent=accuracy+"%";$("resultWords").textContent=completedWords+"/"+state.level.words.length;$("resultFuel").textContent=fuel+"%";$("resultStreak").textContent=f.bestStreak;
    $("reviewBox").innerHTML=difficult.length?"<b>Words to practise</b><p>"+difficult.map(escapeHtml).join(" • ")+"</p>":"<b>Excellent control!</b><p>No words caused a wrong-letter fuel loss.</p>";
    showScreen("resultsScreen");
    postProgress(success?"complete":"divert",{accuracy:accuracy,mistakes:f.mistakes,totalLetters:f.totalLetters,difficultWords:difficult.slice(0,12)});
    if(success)addAchievement("first-flight","First Landing","Complete a Spelling Bee weekly flight mission.","🛬",45);
    if(success&&accuracy===100)addAchievement("perfect-flight","Perfect Flight","Complete a Spelling Bee flight with 100% spelling accuracy.","⭐",70);
  });
}
function beginLanding(success,done){
  var f=state.flight;if(!f)return done&&done();
  f.landing=true;f.active=false;clearGates();setPlaneLane(0);
  $("playerPlane").classList.remove("bank-left","bank-right");
  $("playerPlane").classList.add("landing");
  $("originLabel").textContent=success?"APPROACH":"DIVERSION";
  var destination=success?(state.level.destination||"DESTINATION"):"PRACTICE AIRFIELD";
  $("destinationLabel").textContent=destination.toUpperCase();
  $("welcomeSign").textContent=destination.toUpperCase();
  setFlightPhase("landing");
  message(success?"Approach clear — landing gear down.":"Low fuel — landing at the Practice Airfield.",1900);
  speak(success?"Approach clear. Prepare for landing.":"We are diverting safely to the Practice Airfield.");
  setTimeout(function(){
    if(!state.flight)return;
    message("Touchdown! Great flying.",900);
    speak("Touchdown.");
    setTimeout(function(){if(done)done()},950);
  },3300);
}
function backToPractice(){state.flight=null;renderWordList();renderPracticeWord();showScreen("practiceScreen")}
function initBindings(){
  $("homeBtn").addEventListener("click",function(){location.href="../../"});$("refreshLevels").addEventListener("click",loadLevels);$("backToMissions").addEventListener("click",function(){state.level=null;showScreen("missionsScreen");renderMissionGrid()});
  qsa(".practice-tabs button").forEach(function(b){b.addEventListener("click",function(){setTab(b.dataset.tab)})});
  $("speakWord").addEventListener("click",function(){speak(state.level.words[state.wordIndex])});$("hearSentence").addEventListener("click",function(){speak(supportFor(state.level.words[state.wordIndex]).example)});$("spellHear").addEventListener("click",function(){speak(state.level.words[state.wordIndex])});$("resetBuild").addEventListener("click",resetBuild);$("checkSpelling").addEventListener("click",checkSpelling);$("spellInput").addEventListener("keydown",function(e){if(e.key==="Enter")checkSpelling()});$("nextWordBtn").addEventListener("click",function(){state.wordIndex=(state.wordIndex+1)%state.level.words.length;renderWordList();renderPracticeWord()});$("readStory").addEventListener("click",function(){speak(state.level.story||"")});$("storyReadCheck").addEventListener("change",function(){levelSave(state.level.id).storyRead=this.checked;saveAll();if(this.checked)postProgress("story_read",{})});$("startFlightBtn").addEventListener("click",startFlight);$("flightSpeak").addEventListener("click",function(){if(state.flight)speak("Spell "+state.flight.word)});
  qsa("[data-steer]").forEach(function(b){b.addEventListener("pointerdown",function(e){e.preventDefault();steer(Number(b.dataset.steer))})});$("retryFlight").addEventListener("click",startFlight);$("reviewWords").addEventListener("click",backToPractice);$("resultMissions").addEventListener("click",function(){state.flight=null;state.level=null;showScreen("missionsScreen");renderMissionGrid()});
  window.addEventListener("keydown",function(e){if(!$("flightScreen").classList.contains("active"))return;if(e.key==="ArrowLeft"||e.key==="a"||e.key==="A"){e.preventDefault();steer(-1)}if(e.key==="ArrowRight"||e.key==="d"||e.key==="D"){e.preventDefault();steer(1)}if(e.key===" "){e.preventDefault();if(state.flight)speak("Spell "+state.flight.word)}});
}
function init(){loadSave();initBindings();loadLevels()}
init();
})();