/* ===== 사료 계획: 주수별 섭취량 → 8주 필요량 → 빈마다 주문일·주문량·구매 주기 =====
   모돈 주기: 임신 115 → 포유 28 → 공태 5 (148일). 임신 중 모돈은 분만 예정일에 새 돈군(최근 평균 실산) 생김 */
const FP_H=56,FP_CYC=148;
// 안전 재고·도착·신선도 일수: 대표 설정(state.feedOpt)이 있으면 그 값
["orderDays","leadDays","freshDays","arriveBuf","orderCut","truckCap","truckMin","bagMin","bagAim","bagMax","bagFresh"].forEach(k=>{const d=FARM.feed[k];Object.defineProperty(FARM.feed,k,{get(){const v=(state.feedOpt||{})[k];return v!=null?v:d},configurable:true})});
function fIntake(){const I=FARM.feed.intake,o=state.intake||{};return {...I,...o,pig:I.pig.map((v,i)=>o.pig&&o.pig[i]!=null?o.pig[i]:v),lact:I.lact.map((v,i)=>o.lact&&o.lact[i]!=null?o.lact[i]:v)}}
function sowAnchor(s){const st=sowState(s.id),i=statusOf(s);if(i.key==="도태됨")return null;
  if(st.stage==="포유")return {pos0:115,at:st.farrow};
  if(st.stage==="이유")return {pos0:143,at:st.since};
  if((st.stage==="임신"||st.stage==="교배")&&st.mate)return {pos0:0,at:st.mate};
  return {gilt:st.stage==="후보",open:true}}
function sowNeed(a,day,I){if(a.open)return a.gilt?I.gilt:I.open;const p=((a.pos0+diff(a.at,day))%FP_CYC+FP_CYC)%FP_CYC;
  if(p<115)return [p<I.gestLateFrom?I.gestEarly:I.gestLate,"임신모돈"];if(p<143)return [I.lact[Math.min(3,Math.floor((p-115)/7))],"포유모돈"];return [I.open,"임신모돈"]}
function avgLive(){const m=rangeMetrics(addDays(TODAY,-180),TODAY);return m&&okv(m.live)?m.live:11}
// 날짜별 사료 종류별 필요량 {feed:kg}
let FPD={};
function feedPlanDays(H=FP_H,S0=TODAY){const ck=[H,S0,state.records.length,state.sows.length,JSON.stringify(state.intake||{}),JSON.stringify(state.mbatches||[])].join("|");if(FPD.k===ck)return FPD.v;FPD={k:ck,v:feedPlanDays0(H,S0)};return FPD.v}
function feedPlanDays0(H,S0){const I=fIntake(),days=[],sows=activeSows().map(s=>[s,sowAnchor(s)]).filter(x=>x[1]);
  const bs=batches().map(b=>({k:b.k,b})),lv=avgLive(),born={};
  sows.forEach(([s,a])=>{if(a.open||a.pos0!==0)return;const F=addDays(a.at,115);if(F>=S0&&diff(S0,F)<=H){const k=weekStart(F);born[k]=(born[k]||0)+lv}});
  Object.entries(born).forEach(([k,n])=>{const ex=bs.find(x=>x.k===k);if(ex)ex.extra=n;else bs.push({k,b:{k,live:0,f:[]},extra:n})});
  for(let i=0;i<H;i++){const d=addDays(S0,i),u={},add=(f,n)=>{if(n>0)u[f]=(u[f]||0)+n};
    sows.forEach(([s,a])=>{const r=sowNeed(a,d,I);if(Array.isArray(r))add(r[1],r[0]);else add("임신모돈",r)});
    bs.forEach(({k,b,extra})=>{const age=diff(k,d);if(age<0||age>=shipAge()*7)return;const w=Math.floor(age/7),n=bHeads({...b,live:(b.live||0)+(extra||0)},w),kg=I.pig[Math.min(I.pig.length-1,w)]||0,fs=pigFeeds(age);fs.forEach(p=>add(p.feed,n*kg/fs.length))});
    days.push({d,u})}
  return days}
// 오늘 하루 사용량 (기존 feedUse 대체 · 남은 일수 계산에 씀)
function feedUse(){return REF===TODAY?feedPlanDays()[0].u:feedPlanDays(1,REF)[0].u}
// ---- 배송 달력 ----
const dow=d=>new Date(toUTC(d)).getUTCDay();   // 0 = 일요일
const feedHoli=()=>state.feedHoli||[];
const noDeliv=d=>dow(d)===0||feedHoli().includes(d);
const canOrder=d=>dow(d)!==0&&!feedHoli().includes(d);
// d에 주문하면 도착하는 날. pm = 오전 주문 시각이 지남 → 다음 날 오전 주문과 같음
function arriveOf(d,pm){let o=d;if(pm){o=addDays(o,1);while(!canOrder(o))o=addDays(o,1)}let a=addDays(o,1);while(noDeliv(a))a=addDays(a,1);return a}
// 사료마다: 주문 마감일(도착 아침까지 안 떨어지는 가장 늦은 주문일) · 도착일 · 권장량
function feedPlan(){const D=feedPlanDays(),F=feedKinds(),buf=FARM.feed.arriveBuf,pmNow=nowHM()>=FARM.feed.orderCut;
  return F.map(f=>{const need=D.map(x=>x.u[f]||0),bin=feedBin(f),bag=feedBag(f),st=feedStock(f,need[0]),wk=[0,1,2,3,4,5,6,7].map(w=>need.slice(w*7,w*7+7).reduce((a,b)=>a+b,0)),avg4=wk.slice(0,4).reduce((a,b)=>a+b,0)/28;
    const o={f,bin,bag,kg:st.kg,need,wk,avg4,d0:need[0]};if(st.kg==null||avg4<=0)return o;
    const morn=k=>st.kg-need.slice(0,k).reduce((a,b)=>a+b,0);   // k일 뒤 아침 잔량
    let by=null,arr=null;for(let k=0;k<need.length-3;k++){const d=addDays(TODAY,k);if(!canOrder(d))continue;const a=arriveOf(d,k===0&&pmNow),j=diff(TODAY,a);if(morn(j)>=buf*avg4){by=d;arr=a}else break}
    if(!by){by=TODAY;let d=TODAY;while(!canOrder(d))d=addDays(d,1);arr=arriveOf(d,d===TODAY&&pmNow);o.short=Math.max(0,diff(TODAY,arr)-Math.floor(st.kg/avg4))}   // 지금 주문해도 늦음
    o.orderBy=by;o.arrive=arr;o.orderOn=by;o.weekend=[5,6].includes(dow(by))||diff(by,arr)>1;const atArr=Math.max(0,morn(diff(TODAY,arr)));o.atArr=atArr;
    if(bin){const fresh=FARM.feed.freshDays,hold=Math.min(bin.cap,fresh*avg4);o.qty=Math.max(500,Math.floor((hold-atArr)/500)*500);o.cycle=Math.max(1,Math.round(o.qty/avg4));o.full=Math.round(bin.cap/avg4);o.small=o.full<4;o.limit=bin.cap<fresh*avg4?"cap":"fresh"}
    if(bag){o.bagsWk=Math.ceil(avg4*7/bag.kg);o.qtyBags=Math.max(1,Math.ceil((avg4*7-atArr)/bag.kg))}
    return o})}
// ---- 벌크 이송차 계획: 빈 여러 개를 한 차(탱크 10t)로. 가장 급한 빈의 주문 마감일에 차를 부르고, 급한 빈부터 채울 수 있는 만큼(빈 용량·신선도) 싣는다 ----
function bulkTrucks(P){const B=P.filter(o=>o.bin&&o.kg!=null&&o.avg4>0);if(!B.length)return [];const H=B[0].need.length,buf=FARM.feed.arriveBuf,pmNow=nowHM()>=FARM.feed.orderCut,cap=FARM.feed.truckCap,fresh=FARM.feed.freshDays;
  const add=B.map(()=>Array(H+1).fill(0)),morn=(bi,k)=>{const o=B[bi];let s2=o.kg;for(let x=0;x<k;x++)s2+=add[bi][x]-o.need[x];return s2+add[bi][k]*0};
  const stockAt=(bi,k)=>{const o=B[bi];let s2=o.kg;for(let x=0;x<k&&x<H;x++)s2+=add[bi][x]-o.need[x];return s2+(k<H?add[bi][k]:0)};   // k일 아침(그날 도착분 포함)
  let lastJ=-1;const deadline=(bi,from)=>{let by=null;for(let k=from;k<H-3;k++){const d=addDays(TODAY,k);if(!canOrder(d))continue;const a=arriveOf(d,k===0&&pmNow),j=diff(TODAY,a);if(j>=H)break;if(j<=lastJ)continue;if(stockAt(bi,j)-add[bi][j]>=buf*B[bi].avg4)by=k;else break}return by};
  const T=[];let from=0;
  for(let n=0;n<8;n++){const dl=B.map((o,bi)=>({bi,k:deadline(bi,from)}));const cand=dl.filter(x=>x.k!=null);
    const late=dl.filter(x=>x.k==null);const k0=late.length?from:cand.length?Math.min(...cand.map(x=>x.k)):null;if(k0==null)break;
    let od=addDays(TODAY,k0);while(!canOrder(od))od=addDays(od,1);const ar=arriveOf(od,od===TODAY&&pmNow),j=diff(TODAY,ar);if(j>=H)break;
    const order=[...dl].sort((x,y)=>(x.k??-1)-(y.k??-1));let left=cap;const items=[];
    order.forEach(({bi})=>{const o=B[bi],s2=Math.max(0,stockAt(bi,j)),room=Math.floor((Math.min(o.bin.cap,fresh*o.avg4)-s2)/500)*500,q=Math.min(room,Math.floor(left/500)*500);if(q>=500){items.push({o,q,atArr:Math.round(s2)});add[bi][j]+=q;left-=q}});
    const tot=cap-left;if(!items.length)break;lastJ=j;T.push({order:od,arrive:ar,items,tot,under:tot<FARM.feed.truckMin,weekend:[5,6].includes(dow(od))||diff(od,ar)>1,short:late.length?late.map(x=>B[x.bi].f):null});
    from=diff(TODAY,od)+1}
  return T}
// ---- 포대 주문: 4종을 한 번에. 가장 급한 포대 마감일에, 합계 최소~최대 포(목표 포)로 · 사료마다 신선도 상한 ----
function bagOrders(P){const G=P.filter(o=>o.bag&&o.kg!=null&&o.avg4>0);if(!G.length)return [];const H=G[0].need.length,F=FARM.feed,buf=F.arriveBuf,pmNow=nowHM()>=F.orderCut;
  const add=G.map(()=>Array(H+1).fill(0)),stock=(gi,k)=>{const o=G[gi];let s2=o.kg;for(let x=0;x<k&&x<H;x++)s2+=add[gi][x]-o.need[x];return s2};   // k일 아침, 그날 도착 전
  const O=[];let from=0,lastJ=-1;
  for(let n=0;n<4;n++){const dl=G.map((o,gi)=>{let by=null;for(let k=from;k<H-3;k++){const d=addDays(TODAY,k);if(!canOrder(d))continue;const j=diff(TODAY,arriveOf(d,k===0&&pmNow));if(j>=H)break;if(j<=lastJ)continue;if(stock(gi,j)>=buf*o.avg4)by=k;else break}return by});
    const late=dl.some(k=>k==null),k0=late?from:Math.min(...dl);if(k0==null||!isFinite(k0))break;let od=addDays(TODAY,k0);while(!canOrder(od))od=addDays(od,1);const ar=arriveOf(od,od===TODAY&&pmNow),j=diff(TODAY,ar);if(j>=H)break;
    // 기본: 도착 후 14일 필요 − 도착 때 남은 양 · 그다음 합계가 최소에 못 미치면 쓰는 양 비례로 늘림(사료마다 bagFresh일분 상한)
    const fut=(gi,days)=>G[gi].need.slice(j,j+days).reduce((a,b)=>a+b,0)||G[gi].avg4*days;
    let q=G.map((o,gi)=>Math.max(0,Math.ceil((fut(gi,14)-Math.max(0,stock(gi,j)))/o.bag.kg))),cap=G.map((o,gi)=>Math.max(0,Math.floor((fut(gi,F.bagFresh)-Math.max(0,stock(gi,j)))/o.bag.kg)));
    q=q.map((v,i)=>Math.min(v,Math.max(cap[i],v)));let tot=q.reduce((a,b)=>a+b,0);
    for(let g=0;tot<F.bagAim&&g<200;g++){const i=G.map((o,gi)=>({gi,r:(q[gi]*o.bag.kg+Math.max(0,stock(gi,j)))/(o.avg4||1)})).filter(x=>q[x.gi]<cap[x.gi]).sort((a,b)=>a.r-b.r)[0];if(!i)break;q[i.gi]++;tot++}
    // 신선도 상한까지 채워도 최소 포 수에 못 미치면, 최소량이 우선(사료회사 조건) → 많이 쓰는 사료에 더 얹음
    let over=false;for(let g=0;tot<F.bagMin&&g<300;g++){const i=G.map((o,gi)=>({gi,r:(q[gi]*o.bag.kg+Math.max(0,stock(gi,j)))/(o.avg4||1)})).sort((a,b)=>a.r-b.r)[0];q[i.gi]++;tot++;over=true}
    while(tot>F.bagMax){const i=q.indexOf(Math.max(...q));q[i]--;tot--}
    const items=G.map((o,gi)=>({o,q:q[gi]})).filter(x=>x.q>0);if(!items.length)break;items.forEach(x=>add[G.indexOf(x.o)][j]+=x.q*x.o.bag.kg);
    if(j+14>H)break;O.push({order:od,arrive:ar,items,tot,over,under:tot<F.bagMin,weekend:[5,6].includes(dow(od))||diff(od,ar)>1,short:late?G.filter((o,gi)=>dl[gi]==null).map(o=>o.f):null});lastJ=j;from=diff(TODAY,od)+1}
  return O}
function feedOrderToday(){const P=feedPlan(),T=bulkTrucks(P),out=[];const t0=T[0];
  if(t0&&t0.order<=TODAY)t0.items.forEach(it=>out.push({...it.o,qty:it.q,arrive:t0.arrive,weekend:t0.weekend,short:t0.short&&t0.short.includes(it.o.f)?1:0,truck:t0}));
  const b0=bagOrders(P)[0];if(b0&&b0.order<=TODAY)b0.items.forEach(it=>out.push({...it.o,qtyBags:it.q,arrive:b0.arrive,weekend:b0.weekend,short:b0.short&&b0.short.includes(it.o.f)?1:0}));return out}
function fpBars(P){const C=["#2a78d6","#eb6834","#199e70","#c98500","#9085e9","#d55181","#4fa3b8","#6b7684"],W=8,mx=Math.max(1,...[...Array(W).keys()].map(w=>P.reduce((s,o)=>s+o.wk[w],0)));
  const H=170,BW=100/W;let g=`<svg viewBox="0 0 400 ${H+24}" class="chart" role="img" aria-label="8주 사료 필요량">`;
  for(let w=0;w<W;w++){let y=H;P.forEach((o,i)=>{const h=o.wk[w]/mx*(H-16);if(h<=0)return;y-=h;g+=`<rect x="${w*50+8}" y="${y}" width="34" height="${h}" fill="${C[i%C.length]}"><title>${t("주")} ${w+1} · ${esc(o.f)} ${Math.round(o.wk[w]).toLocaleString()}kg</title></rect>`});
    const tot=P.reduce((s,o)=>s+o.wk[w],0);g+=`<text x="${w*50+25}" y="${y-4}" text-anchor="middle">${(tot/1000).toFixed(1)}t</text><text x="${w*50+25}" y="${H+16}" text-anchor="middle">${w?`+${w}${t("주")}`:t("이번 주")}</text>`}
  return g+`</svg>`+legendH(P.map((o,i)=>[C[i%C.length],o.f]))}
// 사료마다 한 줄 카드: 다음 주문일 · 하루 필요량(지금→4주 후) · 8주 흐름(사료마다 따로 눈금) · 권장 주문
function fpSpark(wk){const mx=Math.max(...wk)||1,lo=Math.min(...wk)*.7,W=8*12,flat=mx-lo<1e-6;return `<svg viewBox="0 0 ${W} 26" class="fp-sp" role="img" aria-label="${t("8주 흐름")}">${wk.map((v,i)=>{const h=flat?14:4+(v-lo)/(mx-lo)*20;return `<rect x="${i*12+1}" y="${26-h}" width="9" height="${h}" rx="1.5" fill="${i?"var(--c-a)":"var(--ink)"}" opacity="${i?.55:.9}"><title>${i?"+"+i+t("주"):t("이번 주")} ${Math.round(v).toLocaleString()}kg</title></rect>`}).join("")}</svg>`}
function fpCard(o){const lead=FARM.feed.leadDays,safe=FARM.feed.orderDays,d4=o.wk[4]/7,ch=o.d0?Math.round((d4-o.d0)/o.d0*100):0;
  const late=o.orderBy&&o.orderBy<=TODAY,when=o.kg==null?`<small>${t("잔량 기록 필요")}</small>`:o.orderBy?`<b class="${late?"late":""}">${late?t("오늘 주문"):kDate(o.orderBy)+" "+t("까지 주문")}</b>`:`<small>${t("8주 안 주문 없음")}</small>`;
  const arrive=o.arrive?`<div class="fp-4">${t("도착")} ${kDate(o.arrive)}${o.weekend?` · <b class="wkn">${t("주말 전 주문")}</b>`:""}${o.short?` · <b class="late">⚠ ${t("지금 주문해도")} ${o.short}${t("일 비게 됨")}</b>`:""}</div>`:"";
  const now=o.kg==null?"":`${t("지금")} <b>${o.kg.toLocaleString()}kg</b>${o.bag?` (${Math.floor(o.kg/o.bag.kg)}${t("포")})`:""} · ${t("약")} ${Math.floor(o.kg/o.avg4)}${t("일분")}`;
  const tk=o.bin&&(ui.trucks||[]).map((x,n)=>({x,n,it:x.items.find(i=>i.o.f===o.f)})).find(z=>z.it),rec=o.bin?(tk?`${tk.n+1}${t("차")} (${kDate(tk.x.order)} ${t("주문")})에 <b>${tk.it.q.toLocaleString()}kg</b>`:t("8주 안 주문 없음"))+` · <small>${t("한 번에 최대")} ${Math.floor(Math.min(o.bin.cap,FARM.feed.freshDays*o.avg4)/500)*500/1000}t (${o.limit==="cap"?t("빈 용량"):`${t("신선도")} ${FARM.feed.freshDays}${t("일")}`})</small>${o.small?` · <span class="warn">⚠ ${t("빈이 작음")}</span>`:""}`:(()=>{const bo=(ui.bagOrd||[]).map((x,n)=>({x,n,it:x.items.find(i=>i.o.f===o.f)})).find(z=>z.it);return `${t("주당")} <b>${o.bagsWk}${t("포")}</b> ${t("필요")}`+(bo?` · ${t("포대")} ${bo.n+1}${t("회")} (${kDate(bo.x.order)} ${t("주문")})에 <b>${bo.it.q}${t("포")}</b>`:"")})();
  return `<div class="fp ${late?"late":""}"><div class="fp-1"><b>${esc(o.f)}</b><small>${o.bin?esc(o.bin.name):t("포대")}</small><span>${when}</span></div>
    <div class="fp-2"><span>${t("하루")} <b>${Math.round(o.d0).toLocaleString()}kg</b> → ${t("4주 후")} ${Math.round(d4).toLocaleString()}kg ${ch?`<i class="${ch>0?"up":"dn"}">${ch>0?"▲":"▼"}${Math.abs(ch)}%</i>`:""}</span>${fpSpark(o.wk)}</div>
    <div class="fp-3">${now?now+"<br>":""}${rec}</div>${arrive}${learnTag(o.f)}</div>`}
// 주문일이 2일 안쪽인 빈끼리 한 번에 주문
function fpGroups(B){const L=B.filter(o=>o.orderBy&&o.kg!=null).sort((a,b)=>a.orderBy.localeCompare(b.orderBy)),g=[];L.forEach(o=>{const last=g[g.length-1],d=o.orderBy<TODAY?TODAY:o.orderBy;if(last&&diff(last.d,d)<=2)last.L.push(o);else g.push({d,L:[o]})});return g}
function vFeedPlan(){const P=feedPlan().filter(o=>o.avg4>0);if(!P.length)return "";const B=P.filter(o=>o.bin),G=P.filter(o=>!o.bin),lead=FARM.feed.leadDays,safe=FARM.feed.orderDays;
  let h=`<div class="sec-t">${t("벌크 사료 (빈)")} <span>${t("새 사료는")} ${FARM.feed.freshDays}${t("일 안에 소진")}</span>${can("admin")?`<button type="button" data-a="tab" data-v="feedset">${t("기준")} ›</button>`:""}</div>`;
  const TR2=bulkTrucks(P);ui.trucks=TR2;
  if(TR2.length)h+=`<div class="trucks">${TR2.slice(0,4).map((x,n)=>`<div class="truck ${x.order<=TODAY?"now":""} ${x.under?"under":""}"><div class="tk-1"><b>${n+1}${t("차")}</b><span>${x.order<=TODAY?t("오늘 주문"):kDate(x.order)+" "+t("주문")} → ${kDate(x.arrive)} ${t("도착")}</span><em>${(x.tot/1000).toFixed(1)}t</em></div><div class="tk-bar">${x.items.map(it=>`<i style="width:${it.q/FARM.feed.truckCap*100}%" title="${esc(it.o.f)} ${it.q.toLocaleString()}kg">${it.q>=1000?esc(it.o.f)+" "+(it.q/1000).toFixed(1):""}</i>`).join("")}</div><div class="tk-2">${x.items.map(it=>`${esc(it.o.f)} ${it.q.toLocaleString()}kg`).join(" + ")}${x.weekend?` · <b class="wkn">${t("주말 전 주문")}</b>`:""}${x.under?` · <b class="late">⚠ ${FARM.feed.truckMin/1000}t ${t("미만")}</b>`:""}${x.short?` · <b class="late">⚠ ${x.short.join(", ")} ${t("도착 전 바닥")}</b>`:""}</div></div>`).join("")}</div>`;
  h+=`<div class="fplist">${B.map(fpCard).join("")}</div>`;
  if(G.length){const BO=bagOrders(P);ui.bagOrd=BO;h+=`<div class="sec-t">${t("포대 사료")} <span>${t("한 번에")} ${FARM.feed.bagMin}~${FARM.feed.bagMax}${t("포")} · ${t("사료마다")} ${FARM.feed.bagFresh}${t("일분 이내")}</span></div>`;
    if(BO.length)h+=`<div class="trucks">${BO.slice(0,3).map((x,n)=>`<div class="truck ${x.order<=TODAY?"now":""} ${x.under?"under":""}"><div class="tk-1"><b>${t("포대")} ${n+1}${t("회")}</b><span>${x.order<=TODAY?t("오늘 주문"):kDate(x.order)+" "+t("주문")} → ${kDate(x.arrive)} ${t("도착")}</span><em>${x.tot}${t("포")}</em></div><div class="tk-bar">${x.items.map(it=>`<i style="width:${it.q/FARM.feed.bagMax*100}%" title="${esc(it.o.f)} ${it.q}${t("포")}">${it.q>=6?esc(it.o.f)+" "+it.q:""}</i>`).join("")}</div><div class="tk-2">${x.items.map(it=>`${esc(it.o.f)} ${it.q}${t("포")}`).join(" + ")}${x.weekend?` · <b class="wkn">${t("주말 전 주문")}</b>`:""}${x.under?` · <b class="late">⚠ ${FARM.feed.bagMin}${t("포")} ${t("미만")}</b>`:""}${x.over?` · <b class="wkn">${t("최소 주문량 때문에")} ${FARM.feed.bagFresh}${t("일분 넘음")}</b>`:""}${x.short?` · <b class="late">⚠ ${x.short.join(", ")} ${t("도착 전 바닥")}</b>`:""}</div></div>`).join("")}</div>`;
    h+=`<div class="fplist">${G.map(fpCard).join("")}</div>`}
  return h+`<div class="note">${t("주문 마감일 = 도착하는 날 아침에")} ${FARM.feed.arriveBuf}${t("일치 이상 남는 가장 늦은 주문일")} · ${t("월~목 주문 → 다음 날, 금 오전 → 토, 토 → 월, 일요일·공휴일 없음")} · ${t("벌크 주문량 = 빈 용량과")} ${FARM.feed.freshDays}${t("일분 중 작은 쪽까지 (500kg 단위)")}</div>`}
function fOptSet(){const H=feedHoli().filter(d=>d>=TODAY).sort();
  return `<div class="sec-t">${t("사료 주문 기준")}</div><div class="panel">
  <div class="setrow"><span>${t("벌크 신선도 최대 일수")} <small class="sow-meta">${t("새로 넣은 사료를 다 먹기까지")}</small></span><div class="stepper"><button type="button" data-a="fOpt" data-v="freshDays" data-k="-1" aria-label="−">−</button><input type="number" value="${FARM.feed.freshDays}" readonly><button type="button" data-a="fOpt" data-v="freshDays" data-k="1" aria-label="+">+</button></div></div>
  <div class="setrow"><span>${t("벌크 이송차 탱크")} <small class="sow-meta">t</small></span><div class="stepper"><button type="button" data-a="fOpt" data-v="truckCap" data-k="-500" aria-label="−">−</button><input type="number" value="${FARM.feed.truckCap/1000}" readonly><button type="button" data-a="fOpt" data-v="truckCap" data-k="500" aria-label="+">+</button></div></div>
  <div class="setrow"><span>${t("한 차 최소 주문")} <small class="sow-meta">t</small></span><div class="stepper"><button type="button" data-a="fOpt" data-v="truckMin" data-k="-500" aria-label="−">−</button><input type="number" value="${FARM.feed.truckMin/1000}" readonly><button type="button" data-a="fOpt" data-v="truckMin" data-k="500" aria-label="+">+</button></div></div>
  <div class="setrow"><span>${t("포대 한 번 주문")} <small class="sow-meta">${t("최소·목표·최대 (포)")}</small></span><div class="row2" style="gap:4px;flex:none">${["bagMin","bagAim","bagMax"].map(k=>`<div class="stepper sm"><button type="button" data-a="fOpt" data-v="${k}" data-k="-5" aria-label="−">−</button><input type="number" value="${FARM.feed[k]}" readonly><button type="button" data-a="fOpt" data-v="${k}" data-k="5" aria-label="+">+</button></div>`).join("")}</div></div>
  <div class="setrow"><span>${t("포대 신선도 최대 일수")} <small class="sow-meta">${t("사료 하나가 이 일수분을 넘지 않게")}</small></span><div class="stepper"><button type="button" data-a="fOpt" data-v="bagFresh" data-k="-1" aria-label="−">−</button><input type="number" value="${FARM.feed.bagFresh}" readonly><button type="button" data-a="fOpt" data-v="bagFresh" data-k="1" aria-label="+">+</button></div></div>
  <div class="setrow"><span>${t("도착 때 남을 양 (일치)")} <small class="sow-meta">${t("원칙: 1일치 남으면 주문 → 다음 날 오전 도착")}</small></span><div class="stepper"><button type="button" data-a="fOpt" data-v="arriveBuf" data-k="-0.5" aria-label="−">−</button><input type="number" value="${FARM.feed.arriveBuf}" readonly><button type="button" data-a="fOpt" data-v="arriveBuf" data-k="0.5" aria-label="+">+</button></div></div>
  <div class="setrow" style="flex-wrap:wrap"><span>${t("오전 주문 마감")} <small class="sow-meta">${t("이후 주문은 하루 늦게 도착")}</small></span><div class="chipwrap">${["10:00","11:00","12:00","13:00"].map(v=>`<button type="button" class="chip ${FARM.feed.orderCut===v?"on":""}" data-a="fCut" data-v="${v}">${v}</button>`).join("")}</div></div>
  <div class="setrow" style="flex-wrap:wrap"><span>${t("배송 없는 공휴일")} <small class="sow-meta">${t("사료회사 공지대로 추가")}</small></span><div class="row2"><input type="date" id="holiIn" min="${TODAY}" aria-label="${t("공휴일")}"><button class="act" type="button" data-a="holiAdd">${t("추가")}</button></div><div class="chipwrap" style="width:100%">${H.map(d=>`<button type="button" class="chip" data-a="holiDel" data-v="${d}">${kDate(d)} ✕</button>`).join("")||`<small class="sow-meta">${t("없음")}</small>`}</div></div></div>`}
Object.assign(A,{fOpt:(v,el)=>{const o=state.feedOpt=state.feedOpt||{},lim={freshDays:[7,30],arriveBuf:[0,3],truckCap:[3000,30000],truckMin:[0,30000],bagMin:[0,200],bagAim:[5,200],bagMax:[5,300],bagFresh:[7,60]}[v];o[v]=Math.max(lim[0],Math.min(lim[1],FARM.feed[v]+Number(el.dataset.k)));FPD={};save();render()},
  fCut:v=>{(state.feedOpt=state.feedOpt||{}).orderCut=v;save();render()},
  holiAdd:()=>{const v=$("#holiIn").value;if(!v)return;const L=state.feedHoli=state.feedHoli||[];if(!L.includes(v))L.push(v);save();render()},
  holiDel:v=>{state.feedHoli=(state.feedHoli||[]).filter(d=>d!==v);save();render()}});
// 대표 설정: 섭취량 기준표
function vFeedSet(){const I=fIntake(),st=(k,v,i,step)=>`<div class="stepper"><button type="button" data-a="intk" data-v="${k}" data-i="${i??""}" data-k="${-step}" aria-label="−">−</button><input type="number" value="${(+v).toFixed(2)}" readonly><button type="button" data-a="intk" data-v="${k}" data-i="${i??""}" data-k="${step}" aria-label="+">+</button></div>`;
  let h=`<div class="pagehd"><button class="back" type="button" data-a="tab" data-v="drug">‹ ${t("사료")}</button><h2>${t("사료 섭취량 기준")}</h2></div><div class="note">${t("1두 하루 섭취량(kg)입니다. 사료 계획·남은 일수 계산에 쓰입니다. 실제 급여량에 맞춰 고쳐 주세요.")}</div>`;
  h+=fcBySet()+fOptSet()+binSet()+learnSet();
  h+=`<div class="sec-t">${t("모돈")}</div><div class="panel">${[["gestEarly",`${t("임신")} ~${I.gestLateFrom-1}${t("일")}`],["gestLate",`${t("임신")} ${I.gestLateFrom}${t("일")}~`],["open",t("이유 후 공태")],["gilt",t("후보돈")]].map(([k,l])=>`<div class="setrow"><span>${l}</span>${st(k,I[k],null,.1)}</div>`).join("")}${I.lact.map((v,i)=>`<div class="setrow"><span>${t("포유")} ${i+1}${t("주")}</span>${st("lact",v,i,.1)}</div>`).join("")}</div>`;
  h+=`<div class="sec-t">${t("자돈·육성돈 (주령)")} <span>${t("사료 종류는 일령별 급여표를 따름")}</span></div><div class="panel">${I.pig.map((v,i)=>`<div class="setrow"><span>${i}${t("주령")} <small class="sow-meta">${pigFeeds(i*7+3).map(p=>p.feed).join("·")}</small></span>${st("pig",v,i,.05)}</div>`).join("")}</div>`;
  return h+`<div class="acts"><button class="act" type="button" data-a="intkReset">${t("기본값으로")}</button></div>`}
Object.assign(A,{intk:(v,el)=>{const o=state.intake=state.intake||{},I=fIntake(),s=Number(el.dataset.k),i=el.dataset.i;if(i!==""){o[v]=o[v]||[];o[v][+i]=Math.max(0,Math.round((I[v][+i]+s)*100)/100)}else o[v]=Math.max(0,Math.round((I[v]+s)*100)/100);NPDX=null;save();render()},
  intkReset:()=>{if(confirm(t("섭취량 기준을 기본값으로 되돌릴까요?"))){state.intake={};save();render()}}});
