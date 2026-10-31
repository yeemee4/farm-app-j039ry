/* ================= v0.2 · 돈군 ================= */
const LOSS=FARM.stageLoss;
function isoWeek(s){const t=new Date(toUTC(s));const d=(t.getUTCDay()+6)%7;const th=new Date(t.getTime()+(3-d)*864e5);const y=th.getUTCFullYear();const j=Date.UTC(y,0,1);return {y,w:1+Math.floor((th.getTime()-j)/(7*864e5))}}
function weekStart(s){const t=new Date(toUTC(s));const wd=(t.getUTCDay()+6)%7;return addDays(s,-wd)}
function bName(k){const i=isoWeek(k),c=isoWeek(TODAY);return `${i.y!==c.y?String(i.y).slice(2)+"-":""}W${i.w} 돈군`}
function bAgo(k){const n=Math.round(diff(k,weekStart(TODAY))/7);return n<=0?t("이번 주"):n+(LANG==="ko"?"":" ")+t("주 전")}
const shipAge=()=>state.cfg.stage.reduce((s,x)=>s+x[1],0);
const bAge=b=>Math.floor(diff(b.k,REF)/7);
function stagePlan(ageW){let a=0;for(const [n,w] of state.cfg.stage){a+=w;if(ageW<a)return n}return "출하"}
function bHeads(b,ageW){let n=b.live,a=ageW;state.cfg.stage.forEach(([nm,len],i)=>{if(a<=0)return;n*=1-LOSS[i]*Math.min(a,len)/len;a-=len});return Math.round(n)}
function bVax(b,p){const due=addDays(b.k,p.day),need=bHeads(b,Math.floor(p.day/7)),recs=recsOf("돈군백신").filter(r=>r.data.batch===b.k&&r.data.vax===p.name),done=recs.reduce((s,r)=>s+r.data.n,0);
  const over=REF>addDays(due,6);
  const st=done>=need*.98?"done":done>0?(over?"part":"partnow"):over?"late":REF>=due?"due":diff(REF,due)<=7?"soon":"plan";
  return {p,due,need,done,recs,st}}
const liveBatches=()=>batches().filter(b=>bAge(b)>=0&&bAge(b)<shipAge()&&(!state.batchCut||b.k>=state.batchCut));
const VST={done:["done","완료"],part:["late","일부 · 기한 지남"],partnow:["part","일부 접종"],late:["late","누락"],due:["due","이번 주"],soon:["soon","다음 주"],plan:["","예정"]};

/* ================= v0.2 · 재고 ================= */
const CATS=["항생제","사료첨가제","소독제","비품","백신","정액","기타"];
const itemNames=cat=>state.items.filter(i=>!i.hidden&&i.cat===cat).map(i=>i.name);
const itemById=id=>state.items.find(i=>i.id===id);
const itemId=name=>(state.items.find(i=>i.name===name)||{}).id;
function stockRecs(it){return memo("sr|"+it.id,()=>stockRecs0(it))}
function stockRecs0(it){if(/^주사침/.test(it.name))return state.records.filter(r=>(r.type==="재고"&&r.data.item===it.id)||needleUse(it,r)>0).map(r=>r.type==="재고"?r:{...r,type:"_침",data:{n:needleUse(it,r)}});return memo("stc",()=>state.records.filter(r=>["재고","돈군백신","백신","교배","약품"].includes(r.type))).filter(r=>(r.type==="재고"&&r.data.item===it.id)||(r.type==="돈군백신"&&[].concat(r.data.prod).includes(it.name))||(r.type==="백신"&&vaxProds(r.data.name).includes(it.name))||(r.type==="교배"&&r.data.semen===it.name)||(r.type==="약품"&&r.data.name===it.name))}
function delta(r){if(r.type==="_침")return -r.data.n;if(r.type==="재고")return r.data.mode==="입고"?r.data.qty:r.data.mode==="사용"?-r.data.qty:0;if(r.type==="돈군백신")return -r.data.n;if(r.type==="약품")return -(r.data.qty||1);return -1}
function semenOrder(){
  const tmr=addDays(TODAY,1);let n=0;
  activeSows().forEach(s=>{const i=statusOf(s);if(i.stage==="이유"){const d=diff(i.since,tmr);if(d>=4&&d<=7)n++}else if(i.stage==="재교배")n++});
  const doses=n*state.cfg.semenPerSow,stock=state.items.filter(x=>x.cat==="정액"&&!x.hidden).reduce((s,x)=>s+(stockOf(x).qty||0),0);
  return {n,doses,stock,order:Math.max(0,doses-stock)};
}
// 정액 주문 마감 시계: 13:00 주의, 15:30 긴급, 16:00 마감
function semenClock(){const n=new Date(),hm=pad(n.getHours())+":"+pad(n.getMinutes()),S=FARM.semen;
  return hm>=S.deadline?{sev:"bad",txt:`${S.deadline} 마감 지남`}:hm>=S.alerts[1]?{sev:"bad",txt:`${S.deadline} 마감 임박`}:hm>=S.alerts[0]?{sev:"warn",txt:`${S.deadline}까지 주문`}:{sev:"ok",txt:`${S.deadline}까지 주문`}}
function extraTodos(){
  const bv=[];liveBatches().forEach(b=>state.cfg.prog.forEach(p=>{const v=bVax(b,p);if(["due","partnow","late","part"].includes(v.st))bv.push({b,v,label:`${bAge(b)}주령 · ${p.name} · ${v.done}/${v.need}두`,sev:v.st==="late"||v.st==="part"?"bad":"warn"})}));
  const low=state.items.filter(it=>!it.hidden).map(it=>({it,s:stockOf(it)})).filter(x=>x.s.qty!==null&&x.s.qty<x.it.par).map(x=>({item:x.it,label:`재고 ${x.s.qty}${x.it.unit} / 적정 ${x.it.par}${x.it.unit}`,sev:"bad"}));
  const so=semenOrder();
  return [
    {k:"bvax",t:"돈군 백신 (이번 주 · 누락)",items:bv,act:"bvax"},
    {k:"order",t:"정액 주문 (내일 교배 예정)",items:so.order>0?[{order:so,label:`${semenClock().txt} · 내일 교배 예정 ${so.n}두 × ${state.cfg.semenPerSow}${FARM.semen.unit} = ${so.doses}${FARM.semen.unit} · 재고 ${so.stock}${FARM.semen.unit} → ${so.order}${FARM.semen.unit} 주문`,sev:semenClock().sev}]:[],act:null},
    {k:"stock",t:"재고 부족",items:low,act:"stock"},...vaxTodos(),...feedTodos(),...amTodos(),...fcTodos(),...devTodos(),...gfTodos(),...closeTodos(),...mate2Todos(),...hoTodos()
  ];
}

