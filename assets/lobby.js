(()=>{
"use strict";
const $=s=>document.querySelector(s);
const socket=io({transports:["websocket","polling"]});
const PROFILE_KEY="gsj_multiplayer_profile_v1";
const CLIENT_KEY="gsj_client_id_v1";
let mySocketId="";
let currentRoom=null;
let players=[];
let rooms=[];

function getClientId(){
  let id=localStorage.getItem(CLIENT_KEY);
  if(!id){
    id=(crypto.randomUUID?crypto.randomUUID():"client_"+Date.now()+"_"+Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g,"");
    localStorage.setItem(CLIENT_KEY,id);
  }
  return id;
}
function studioProfile(){
  try{
    const store=JSON.parse(localStorage.getItem("gsj_store_v2")||"null");
    return store?.profiles?.find(p=>p.id===store.activeProfileId)||store?.profiles?.[0]||null;
  }catch{return null}
}
function loadProfile(){
  const fallback=studioProfile();
  try{
    const p=JSON.parse(localStorage.getItem(PROFILE_KEY)||"null");
    if(p)return normalizeProfile(p);
  }catch{}
  return normalizeProfile({nickname:fallback?.name||"Player 1",body:"#61CA55",accent:"#1E7A39",accessory:"leaf"});
}
function normalizeProfile(p){
  return {
    nickname:String(p?.nickname||"Player 1").trim().slice(0,18)||"Player 1",
    body:/^#[0-9a-f]{6}$/i.test(p?.body)?p.body:"#61CA55",
    accent:/^#[0-9a-f]{6}$/i.test(p?.accent)?p.accent:"#1E7A39",
    accessory:["none","leaf","crown","headphones","glasses","star"].includes(p?.accessory)?p.accessory:"leaf"
  };
}
let profile=loadProfile();

function accessoryIcon(name){
  return {none:"",leaf:"🍃",crown:"👑",headphones:"🎧",glasses:"🕶️",star:"⭐"}[name]||"";
}
function toast(msg){
  const el=$("#lobbyToast");el.textContent=msg;el.classList.add("show");
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2600);
}
function applyProfileForm(){
  $("#nicknameInput").value=profile.nickname;
  $("#bodyColor").value=profile.body;
  $("#accentColor").value=profile.accent;
  $("#accessoryInput").value=profile.accessory;
  renderPreview();
}
function renderPreview(){
  const body=$("#avatarPreview .melon-body");
  body.style.setProperty("--body",$("#bodyColor").value);
  body.style.setProperty("--accent-color",$("#accentColor").value);
  $("#previewAccessory").textContent=accessoryIcon($("#accessoryInput").value);
}
function identityPayload(){
  return {clientId:getClientId(),nickname:profile.nickname,appearance:{body:profile.body,accent:profile.accent,accessory:profile.accessory},context:"lobby"};
}
function connectIdentity(){
  socket.emit("identity:set",identityPayload(),res=>{
    if(!res?.ok){toast(res?.error||"Could not join lobby.");return}
    mySocketId=res.socketId||socket.id;
    players=res.players||[];rooms=res.rooms||[];
    (res.chat||[]).forEach(addChat);
    renderPresence();renderRooms();
  });
}
function playerAvatar(appearance){
  const span=document.createElement("span");span.className="online-avatar";
  span.style.background=`linear-gradient(145deg,${appearance?.body||"#61CA55"},${appearance?.accent||"#1E7A39"})`;
  span.textContent=accessoryIcon(appearance?.accessory)||"🍈";
  return span;
}
function renderPresence(){
  $("#onlineCount").textContent=players.length+" online";
  const box=$("#onlinePlayers");box.textContent="";
  if(!players.length){box.innerHTML='<div class="empty-state">Nobody else is online yet.</div>';return}
  for(const p of players){
    const row=document.createElement("div");row.className="online-player";
    row.appendChild(playerAvatar(p.appearance));
    const copy=document.createElement("div");
    const b=document.createElement("b");b.textContent=p.nickname+(p.socketId===mySocketId?" (you)":"");
    const small=document.createElement("small");small.textContent=p.context==="game"?"Playing Mr. Melon":p.roomCode?"Waiting in room "+p.roomCode:"Chilling in lobby";
    copy.append(b,small);row.append(copy);box.append(row);
  }
}
function addChat(msg){
  const log=$("#chatLog");
  if(msg.id&&log.querySelector('[data-msg="'+CSS.escape(msg.id)+'"]'))return;
  const row=document.createElement("div");row.className="chat-message";if(msg.id)row.dataset.msg=msg.id;
  row.appendChild(playerAvatar(msg.appearance));
  const bubble=document.createElement("div");bubble.className="chat-bubble";
  const b=document.createElement("b");b.textContent=msg.nickname||"Player";
  const time=document.createElement("time");time.textContent=new Date(msg.ts||Date.now()).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  const p=document.createElement("p");p.textContent=msg.text||"";
  bubble.append(b,time,p);row.append(bubble);log.append(row);
  while(log.children.length>50)log.firstElementChild.remove();
  log.scrollTop=log.scrollHeight;
}
function renderRooms(){
  const list=$("#roomList");list.textContent="";
  const available=rooms.filter(r=>!currentRoom||r.code!==currentRoom.code);
  if(!available.length)list.innerHTML='<div class="empty-state">No open rooms. Create one and invite the crew.</div>';
  for(const room of available){
    const card=document.createElement("div");card.className="room-card";
    const copy=document.createElement("div");
    const code=document.createElement("div");code.className="room-code";code.textContent=room.code;
    const meta=document.createElement("div");meta.className="room-meta";meta.textContent=room.players.length+"/"+room.maxPlayers+" players";
    copy.append(code,meta);
    const btn=document.createElement("button");btn.className="btn secondary";btn.type="button";btn.textContent="Join";btn.onclick=()=>joinRoom(room.code);
    card.append(copy,btn);list.append(card);
  }
  renderCurrentRoom();
}
function renderCurrentRoom(){
  const el=$("#currentRoom");
  if(!currentRoom){el.hidden=true;el.textContent="";return}
  el.hidden=false;el.textContent="";
  const head=document.createElement("div");head.className="current-room-head";
  const label=document.createElement("span");label.textContent="YOUR ROOM";
  const code=document.createElement("b");code.textContent=currentRoom.code;
  head.append(label,code);
  const members=document.createElement("div");members.className="room-members";
  for(const p of currentRoom.players){
    const s=document.createElement("span");s.className="room-member";s.textContent=(p.isHost?"👑 ":"")+p.nickname;members.append(s);
  }
  const actions=document.createElement("div");actions.className="room-actions";
  const me=currentRoom.players.find(p=>p.socketId===mySocketId);
  if(me?.isHost){
    const start=document.createElement("button");start.className="btn primary";start.type="button";start.textContent="▶ Start multiplayer";start.onclick=startRoom;actions.append(start);
  }
  const leave=document.createElement("button");leave.className="btn secondary";leave.type="button";leave.textContent="Leave room";leave.onclick=leaveRoom;actions.append(leave);
  const hint=document.createElement("p");hint.className="room-meta";hint.textContent="Share code "+currentRoom.code+" with up to 3 friends.";
  el.append(head,members,actions,hint);
}
function joinRoom(code){
  socket.emit("room:join",{code},res=>{
    if(!res?.ok){toast(res?.error||"Could not join room.");return}
    currentRoom=res.room;$("#roomCodeInput").value="";renderRooms();toast("Joined room "+currentRoom.code);
  });
}
function leaveRoom(){
  socket.emit("room:leave",{},()=>{currentRoom=null;renderRooms();toast("Left room.");});
}
function startRoom(){
  if(!currentRoom)return;
  socket.emit("room:start",{code:currentRoom.code,level:0},res=>{
    if(!res?.ok)toast(res?.error||"Could not start match.");
  });
}
function enterGame(room){
  const url="./games/mr-melons-adventure/index.html?multi=1&room="+encodeURIComponent(room.code);
  location.href=url;
}
async function loadLeaderboard(){
  try{
    const r=await fetch("./api/leaderboard",{cache:"no-store"});
    const data=await r.json();
    const box=$("#leaderboard");box.textContent="";
    const rows=data.leaderboard||[];
    if(!rows.length){box.innerHTML='<div class="empty-state">No online scores yet. Be the first.</div>';return}
    rows.slice(0,12).forEach((p,i)=>{
      const row=document.createElement("div");row.className="score-row";
      const rank=document.createElement("div");rank.className="score-rank";rank.textContent=i===0?"👑":String(i+1);
      const copy=document.createElement("div");const b=document.createElement("b");b.textContent=p.nickname;const small=document.createElement("small");small.textContent="Level "+p.maxLevel+"/8"+(p.completions?" • "+p.completions+" completions":"");copy.append(b,small);
      const score=document.createElement("div");score.className="score-points";score.textContent=Number(p.bestScore||0).toLocaleString();
      row.append(rank,copy,score);box.append(row);
    });
  }catch{$("#leaderboard").innerHTML='<div class="empty-state">Scores are unavailable right now.</div>'}
}

$("#profileForm").addEventListener("submit",e=>{
  e.preventDefault();
  profile=normalizeProfile({nickname:$("#nicknameInput").value,body:$("#bodyColor").value,accent:$("#accentColor").value,accessory:$("#accessoryInput").value});
  localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
  socket.emit("profile:update",{nickname:profile.nickname,appearance:{body:profile.body,accent:profile.accent,accessory:profile.accessory}},res=>{
    if(res?.ok)toast("Player customisation saved.");else toast(res?.error||"Could not save player.");
  });
  renderPreview();
});
["#bodyColor","#accentColor","#accessoryInput"].forEach(sel=>$(sel).addEventListener("input",renderPreview));
$("#chatForm").addEventListener("submit",e=>{
  e.preventDefault();const input=$("#chatInput"),text=input.value.trim();if(!text)return;
  socket.emit("chat:send",{text},res=>{if(res?.ok)input.value="";else toast(res?.error||"Message not sent.");});
});
$("#createRoomBtn").onclick=()=>socket.emit("room:create",{},res=>{
  if(!res?.ok){toast(res?.error||"Could not create room.");return}
  currentRoom=res.room;renderRooms();toast("Room "+currentRoom.code+" created.");
});
$("#joinRoomBtn").onclick=()=>joinRoom($("#roomCodeInput").value);
$("#refreshScoresBtn").onclick=loadLeaderboard;

socket.on("connect",()=>{$("#connectionDot").classList.add("online");$("#connectionText").textContent="Connected";connectIdentity();});
socket.on("disconnect",()=>{$("#connectionDot").classList.remove("online");$("#connectionText").textContent="Reconnecting…";});
socket.on("lobby:presence",data=>{players=Array.isArray(data)?data:[];renderPresence();});
socket.on("room:list",data=>{rooms=Array.isArray(data)?data:[];renderRooms();});
socket.on("room:update",room=>{if(currentRoom?.code===room.code||room.players.some(p=>p.socketId===mySocketId)){currentRoom=room;renderRooms();}});
socket.on("room:peer-left",()=>{});
socket.on("room:started",room=>{if(currentRoom?.code===room.code||room.players.some(p=>p.socketId===mySocketId))enterGame(room);});
socket.on("chat:message",addChat);

applyProfileForm();
loadLeaderboard();
})();
