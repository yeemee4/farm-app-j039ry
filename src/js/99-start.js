/* ================= 시작 ================= */
state=load();
if(!state||state.v!==7){makeState("farm")}
try{ME=localStorage.getItem(SKEY)}catch(e){}
{const ad=(state.accounts||[]).find(a=>a.id==="a1");if(ad&&ad.pin==="0000"){ad.pin="9368";save()}}
syncLists();
state.cfgSt=state.cfgSt||{...CFG.st};state.tasks=state.tasks||[];state.todoLog=state.todoLog||{};
gateOK().then(ok=>ok?render():renderGate());
window.addEventListener("hashchange",()=>{if(/key=/.test(location.hash))gateOK().then(ok=>ok?render():renderGate(true))});
