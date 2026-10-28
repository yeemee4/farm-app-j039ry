/* ================= 시작 ================= */
state=load();
if(!state||state.v!==7){makeState("farm")}
try{ME=localStorage.getItem(SKEY)}catch(e){}
{const ad=(state.accounts||[]).find(a=>a.id==="a1");if(ad&&ad.pin==="0000"){ad.pin="9368";save()}}
// 새로 생긴 재고 품목(주사침 등) 채우기
{const have=new Set(state.items.map(x=>x.name));let n=state.items.length;FARM.items.forEach(([name,cat,unit,par,withdraw])=>{if(!have.has(name))state.items.push({id:"i"+(++n)+"x",name,cat,unit,par,withdraw})})}
syncLists();
state.cfgSt=state.cfgSt||{...CFG.st};state.tasks=state.tasks||[];state.todoLog=state.todoLog||{};
gateOK().then(ok=>ok?render():renderGate());
window.addEventListener("hashchange",()=>{if(/key=/.test(location.hash))gateOK().then(ok=>ok?render():renderGate(true))});
