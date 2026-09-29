(function(global){
"use strict";
const STORE_KEY="gsj_learning_v1";
const STUDIO_STORE_KEY="gsj_store_v2";
const CLIENT_KEY="gsj_client_id_v1";
const MAX_RECENT=12;

function now(){return new Date().toISOString()}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function load(){
  let data=null;try{data=JSON.parse(localStorage.getItem(STORE_KEY)||"null")}catch(e){}
  if(!data||typeof data!=="object")data={version:1,profiles:{}};
  data.profiles=data.profiles||{};
  return data;
}
function save(data){localStorage.setItem(STORE_KEY,JSON.stringify(data))}
function studioProfile(){
  try{
    const store=JSON.parse(localStorage.getItem(STUDIO_STORE_KEY)||"null");
    const active=store?.profiles?.find(p=>p.id===store.activeProfileId)||store?.profiles?.[0];
    if(active)return {id:String(active.id||"default"),name:String(active.name||"Player"),avatar:active.avatar||"🎮"};
  }catch(e){}
  return {id:"default",name:"Player",avatar:"🎮"};
}
function clientId(){
  let id=localStorage.getItem(CLIENT_KEY);
  if(!id){
    id=(crypto.randomUUID?crypto.randomUUID():"client_"+Date.now()+"_"+Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g,"");
    localStorage.setItem(CLIENT_KEY,id);
  }
  return id;
}
function profileData(data){
  const p=studioProfile();
  data.profiles[p.id]=data.profiles[p.id]||{subjects:{},outcomes:{},createdAt:now(),updatedAt:now()};
  return data.profiles[p.id];
}
function stateFor(outcomeId){
  const data=load(),p=profileData(data);
  p.outcomes[outcomeId]=p.outcomes[outcomeId]||{
    attempts:0,correct:0,incorrect:0,recent:[],score:0,streak:0,bestStreak:0,
    stage:"Learning",band:"Support",lastSeen:null,lastCorrect:null,nextReview:null
  };
  if(p.outcomes[outcomeId].stage==="Flight Ready")p.outcomes[outcomeId].stage="Ready";
  save(data);
  return p.outcomes[outcomeId];
}
function ratio(rows){
  if(!rows.length)return 0;
  return rows.reduce((n,x)=>n+(x.correct?1:0),0)/rows.length;
}
function computeBand(skill){
  const recent=skill.recent.slice(-6),r=ratio(recent);
  if(skill.attempts<3)return "Support";
  if(skill.attempts>=6&&r>=.84&&skill.score>=.78)return "Challenge";
  if(r<.56||skill.score<.5)return "Support";
  return "Core";
}
function computeStage(skill){
  const r5=ratio(skill.recent.slice(-5));
  if(skill.attempts>=7&&skill.score>=.84&&r5>=.8)return "Mastered";
  if(skill.attempts>=4&&skill.score>=.68)return "Ready";
  if(skill.attempts>=2&&skill.score>=.48)return "Practising";
  return "Learning";
}
function reviewDate(stage,correct){
  const d=new Date();
  const days=!correct?0:stage==="Mastered"?4:stage==="Ready"?2:1;
  d.setDate(d.getDate()+days);
  return d.toISOString();
}
function postProgress(payload){
  fetch("/api/learning/progress",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload),keepalive:true
  }).catch(()=>{});
}
function usage(event,meta){
  meta=meta||{};const p=studioProfile();
  fetch("/api/usage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    clientId:clientId(),profileId:p.id,nickname:p.name,event,
    titleId:String(meta.gameId||"").slice(0,60),title:String(meta.title||meta.gameId||"Learning Game").slice(0,80),
    kind:"game",seconds:Number(meta.seconds)||0,score:Number(meta.score)||0
  }),keepalive:true}).catch(()=>{});
}
function record(outcomeId,correct,meta){
  meta=meta||{};
  if(!outcomeId)return null;
  const data=load(),p=profileData(data);
  const skill=p.outcomes[outcomeId]||{
    attempts:0,correct:0,incorrect:0,recent:[],score:0,streak:0,bestStreak:0,
    stage:"Learning",band:"Support",lastSeen:null,lastCorrect:null,nextReview:null
  };
  if(skill.stage==="Flight Ready")skill.stage="Ready";
  const ok=!!correct,weight=skill.attempts<3?.34:.22;
  skill.attempts+=1;
  if(ok){skill.correct+=1;skill.streak+=1;skill.bestStreak=Math.max(skill.bestStreak,skill.streak)}
  else{skill.incorrect+=1;skill.streak=0}
  skill.score=clamp(skill.attempts===1?(ok?1:0):skill.score*(1-weight)+(ok?1:0)*weight,0,1);
  skill.recent.push({correct:ok,at:now(),activity:String(meta.activity||"practice").slice(0,40)});
  skill.recent=skill.recent.slice(-MAX_RECENT);
  skill.band=computeBand(skill);
  skill.stage=computeStage(skill);
  skill.lastSeen=now();
  if(ok)skill.lastCorrect=skill.lastSeen;
  skill.nextReview=reviewDate(skill.stage,ok);
  p.outcomes[outcomeId]=skill;
  p.updatedAt=now();
  const subject=String(meta.subject||"").slice(0,40);
  if(subject){
    p.subjects[subject]=p.subjects[subject]||{attempts:0,correct:0,lastSeen:null};
    p.subjects[subject].attempts+=1;if(ok)p.subjects[subject].correct+=1;p.subjects[subject].lastSeen=skill.lastSeen;
  }
  save(data);
  const prof=studioProfile();
  postProgress({
    clientId:clientId(),profileId:prof.id,nickname:prof.name,outcomeId,
    correct:ok,subject,gameId:String(meta.gameId||"").slice(0,60),
    activity:String(meta.activity||"practice").slice(0,40),
    band:skill.band,stage:skill.stage,score:Math.round(skill.score*100)
  });
  return {...skill};
}
function summary(subject){
  const data=load(),p=profileData(data),rows=Object.entries(p.outcomes)
    .filter(([id])=>!subject||id.startsWith(subject));
  const counts={Learning:0,Practising:0,Ready:0,Mastered:0};
  let attempts=0,correct=0;
  rows.forEach(([,s])=>{const stage=s.stage==="Flight Ready"?"Ready":s.stage;counts[stage]=(counts[stage]||0)+1;attempts+=s.attempts||0;correct+=s.correct||0});
  return {outcomes:rows.length,attempts,correct,accuracy:attempts?Math.round(correct/attempts*100):0,stages:counts};
}
function due(subject){
  const data=load(),p=profileData(data),t=Date.now();
  return Object.entries(p.outcomes)
    .filter(([id,s])=>(!subject||id.startsWith(subject))&&s.nextReview&&new Date(s.nextReview).getTime()<=t)
    .map(([id,s])=>({id,...s}));
}
function band(outcomeId){return stateFor(outcomeId).band||"Support"}
function stage(outcomeId){return stateFor(outcomeId).stage||"Learning"}
function resetProfile(){
  const data=load(),p=studioProfile();delete data.profiles[p.id];save(data);
}
global.GSJLearning={record,state:stateFor,band,stage,summary,due,profile:studioProfile,usage,resetProfile,version:1};
})(window);
