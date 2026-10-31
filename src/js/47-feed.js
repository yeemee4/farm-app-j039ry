/* ================= v0.4 · 사료 (빈·포대 재고, 급여 단계) ================= */
const feedKinds=()=>[...FARM.feed.bins.map(b=>b.feed),...FARM.feed.bags.map(b=>b.feed)];
const feedBag=f=>FARM.feed.bags.find(b=>b.feed===f);
const feedBin=f=>FARM.feed.bins.find(b=>b.feed===f);
function pigFeeds(day){return FARM.feed.piglet.filter(p=>day>=p.from&&day<p.to)}
// 지금 하루 사용량(kg) 추정

// 재고 = 마지막 잔량 + 이후 입고 − 추정 사용
function feedStock(f,use){const rs=recsOf("사료").filter(r=>r.data.kind===f).sort((a,b)=>a.workDate.localeCompare(b.workDate));
  const base=[...rs].reverse().find(r=>r.data.mode==="빈 잔량"||r.data.mode==="잔량");if(!base)return {kg:null,use,days:null};
  const inn=rs.filter(r=>r.data.mode==="입고"&&r.workDate>base.workDate&&r.workDate<=REF).reduce((s,r)=>s+r.data.kg,0);
  const kg=Math.max(0,Math.round(base.data.kg+inn-use*diff(base.workDate,REF)));
  return {kg,use,days:use>0?Math.floor(kg/use):null,since:base.workDate}}
function feedTable(){const u=feedUse();return feedKinds().map(f=>({f,bin:feedBin(f),bag:feedBag(f),...feedStock(f,u[f]||0)}))}
function feedTodos(){
  const T=feedTable(),ord=REF!==TODAY?[]:feedOrderToday().map(o=>{const x=T.find(r=>r.f===o.f)||{f:o.f,days:null};return {feed:x,label:`${o.bin?o.bin.name:t("포대")} · ${o.bin?o.qty.toLocaleString()+"kg":o.qtyBags+t("포")} · ${t("도착")} ${kDate(o.arrive)}${o.weekend?" · "+t("주말 전 주문"):""}`,sev:o.short||o.weekend?"bad":"warn"}});
  const chg=[];liveBatches().forEach(b=>{const d=diff(b.k,REF);FARM.feed.piglet.forEach(p=>{if(d<p.from||d>p.from+2)return;
    const key=`${b.k}|${p.feed}`,lg=tdLog(tdKey("feedchg",key));if(lg&&localDateOf(lg.at)!==TODAY)return;
    chg.push({fc:{key,b,p},label:`${d}일령 · ${p.feed}${p.note?" · "+p.note:""}`,sev:d>p.from+1?"bad":"warn"})})});
  return [{k:"feedord",t:"사료 주문",items:ord,act:null},{k:"feedchg",t:"사료 변경 (돈군 일령)",items:chg,act:null}]}
function vFeedPanel(){
  const rows=feedTable();
  return `<div class="sec-t">${t("사료 재고")} <span>${t("추정")}</span></div><div class="panel"><div class="dtbl"><table><thead><tr><th>${t("사료")}</th><th>${t("위치")}</th><th>${t("남은 양")}</th><th>${t("하루")}</th><th>${t("남은 일수")}</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${esc(x.f)}</b></td><td>${x.bin?esc(x.bin.name):t("포대")}</td><td>${x.kg===null?"—":x.kg.toLocaleString()+"kg"+(x.bag?` · ${Math.floor(x.kg/x.bag.kg)}${t("포")}`:"")}</td><td>${Math.round(x.use)}kg</td><td style="color:${x.days===null?"var(--muted)":x.days<=2?"var(--red)":x.days<=FARM.feed.orderDays?"var(--amber)":"var(--ink)"};font-weight:700">${x.days===null?(x.use?t("잔량 기록 필요"):"—"):x.days+t("일")}</td></tr>`).join("")}</tbody></table></div><div class="note">${t("남은 양 = 마지막 잔량 + 이후 입고 − 두수×하루 급여량. 빈 잔량(포대 수)을 가끔 입력하면 정확해집니다.")}</div></div>`}
