
let catalog={version:2,studio:{name:"Gaming Studio J",tagline:"Play. Create. Explore.",description:"Kash's home for games, experiments and apps."},items:[]};
const $=s=>document.querySelector(s);
async function init(){try{catalog=await (await fetch("./data/catalog.json",{cache:"no-store"})).json()}catch{};bind();render()}
function bind(){
  $("#aTitle").addEventListener("input",()=>{if(!$("#aId").dataset.touched)$("#aId").value=slug($("#aTitle").value)});
  $("#aId").addEventListener("input",()=>$("#aId").dataset.touched="1");
  $("#addBtn").onclick=addItem;$("#downloadBtn").onclick=download;
  $("#jsonPreview").addEventListener("change",()=>{try{catalog=JSON.parse($("#jsonPreview").value);render()}catch{alert("The JSON is not valid.")}});
}
function slug(s){return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
function addItem(){
  const id=slug($("#aId").value||$("#aTitle").value),title=$("#aTitle").value.trim();
  if(!id||!title){alert("Title and ID are required.");return}
  if(catalog.items.some(x=>x.id===id)){alert("That ID already exists.");return}
  const d=new Date().toISOString().slice(0,10);
  catalog.items.push({id,title,type:$("#aType").value,status:$("#aStatus").value,featured:$("#aFeatured").checked,description:$("#aDesc").value.trim(),shortDescription:$("#aDesc").value.trim().slice(0,120),url:$("#aUrl").value.trim(),thumbnail:$("#aThumb").value.trim(),icon:$("#aIcon").value.trim(),tags:$("#aTags").value.split(",").map(x=>x.trim()).filter(Boolean),players:$("#aPlayers").value.trim(),input:$("#aTouch").checked?["Touch","Keyboard"]:["Keyboard"],touchReady:$("#aTouch").checked,age:$("#aAge").value,badge:"New",creator:"Gaming Studio J",created:d,updated:d,screenshots:[$("#aThumb").value.trim()].filter(Boolean)});
  render();
}
function removeItem(id){if(confirm(`Remove ${id} from this draft catalogue?`)){catalog.items=catalog.items.filter(x=>x.id!==id);render()}}
function render(){
  $("#catalogCount").textContent=`${catalog.items.length} titles`;
  $("#catalogList").innerHTML=catalog.items.map(x=>`<div class="catalog-row">${x.icon?`<img src="${x.icon}" alt="">`:""}<div class="grow"><b>${esc(x.title)}</b><div class="meta">${esc(x.type)} • ${esc(x.status)}</div></div><button class="btn secondary danger" data-remove="${x.id}">Remove</button></div>`).join("");
  document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>removeItem(b.dataset.remove));
  $("#jsonPreview").value=JSON.stringify(catalog,null,2);
}
function download(){
  const blob=new Blob([JSON.stringify(catalog,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="catalog.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
init();
