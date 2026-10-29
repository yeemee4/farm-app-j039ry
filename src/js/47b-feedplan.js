/* ===== 사료 계획: 주수별 섭취량 → 8주 필요량 → 빈마다 주문일·주문량·구매 주기 =====
   모돈 주기: 임신 115 → 포유 28 → 공태 5 (148일). 임신 중 모돈은 분만 예정일에 새 돈군(최근 평균 실산) 생김 */
const FP_H=56,FP_CYC=148;
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
function feedPlanDays(H=FP_H,S0=TODAY){const I=fIntake(),days=[],sows=activeSows().map(s=>[s,sowAnchor(s)]).filter(x=>x[1]);
  const bs=batches().map(b=>({k:b.k,b})),lv=avgLive(),born={};
  sows.forEach(([s,a])=>{if(a.open||a.pos0!==0)return;const F=addDays(a.at,115);if(F>=S0&&diff(S0,F)<=H){const k=weekStart(F);born[k]=(born[k]||0)+lv}});
  Object.entries(born).forEach(([k,n])=>{const ex=bs.find(x=>x.k===k);if(ex)ex.extra=n;else bs.push({k,b:{k,live:0,f:[]},extra:n})});
  for(let i=0;i<H;i++){const d=addDays(S0,i),u={},add=(f,n)=>{if(n>0)u[f]=(u[f]||0)+n};
    sows.forEach(([s,a])=>{const r=sowNeed(a,d,I);if(Array.isArray(r))add(r[1],r[0]);else add("임신모돈",r)});
    bs.forEach(({k,b,extra})=>{const age=diff(k,d);if(age<0||age>=shipAge()*7)return;const w=Math.floor(age/7),n=bHeads({...b,live:(b.live||0)+(extra||0)},w),kg=I.pig[Math.min(I.pig.length-1,w)]||0,fs=pigFeeds(age);fs.forEach(p=>add(p.feed,n*kg/fs.length))});
    days.push({d,u})}
  return days}
// 오늘 하루 사용량 (기존 feedUse 대체 · 남은 일수 계산에 씀)
function feedUse(){return feedPlanDays(1,REF)[0].u}
// 빈마다 주문 권장
function feedPlan(){const D=feedPlanDays(),F=feedKinds(),lead=FARM.feed.leadDays,safe=FARM.feed.orderDays;
  return F.map(f=>{const need=D.map(x=>x.u[f]||0),bin=feedBin(f),bag=feedBag(f),st=feedStock(f,need[0]),wk=[0,1,2,3,4,5,6,7].map(w=>need.slice(w*7,w*7+7).reduce((a,b)=>a+b,0)),avg4=wk.slice(0,4).reduce((a,b)=>a+b,0)/28;
    const o={f,bin,bag,kg:st.kg,need,wk,avg4,d0:need[0]};
    if(bin&&st.kg!=null&&avg4>0){let kg=st.kg,orderOn=null,empty=null;for(let i=0;i<need.length;i++){const guard=need.slice(i+1,i+1+lead+safe).reduce((a,b)=>a+b,0);if(orderOn===null&&kg<=guard)orderOn=addDays(TODAY,i);kg-=need[i];if(empty===null&&kg<=0)empty=addDays(TODAY,i)}
      const atArr=Math.min(safe*avg4,bin.cap*.3),qty=Math.max(500,Math.floor((bin.cap-atArr)/500)*500);o.orderOn=orderOn;o.empty=empty;o.qty=qty;o.cycle=Math.max(1,Math.round(qty/avg4));o.full=Math.round(bin.cap/avg4);o.small=o.full<lead+safe+3}
    if(bag&&avg4>0){o.bagsWk=Math.ceil(avg4*7/bag.kg)}
    return o})}
function fpBars(P){const C=["#2a78d6","#eb6834","#199e70","#c98500","#9085e9","#d55181","#4fa3b8","#6b7684"],W=8,mx=Math.max(1,...[...Array(W).keys()].map(w=>P.reduce((s,o)=>s+o.wk[w],0)));
  const H=170,BW=100/W;let g=`<svg viewBox="0 0 400 ${H+24}" class="chart" role="img" aria-label="8주 사료 필요량">`;
  for(let w=0;w<W;w++){let y=H;P.forEach((o,i)=>{const h=o.wk[w]/mx*(H-16);if(h<=0)return;y-=h;g+=`<rect x="${w*50+8}" y="${y}" width="34" height="${h}" fill="${C[i%C.length]}"><title>${t("주")} ${w+1} · ${esc(o.f)} ${Math.round(o.wk[w]).toLocaleString()}kg</title></rect>`});
    const tot=P.reduce((s,o)=>s+o.wk[w],0);g+=`<text x="${w*50+25}" y="${y-4}" text-anchor="middle">${(tot/1000).toFixed(1)}t</text><text x="${w*50+25}" y="${H+16}" text-anchor="middle">${w?`+${w}${t("주")}`:t("이번 주")}</text>`}
  return g+`</svg>`+legendH(P.map((o,i)=>[C[i%C.length],o.f]))}
function vFeedPlan(){const P=feedPlan().filter(o=>o.avg4>0);if(!P.length)return "";
  let h=`<div class="sec-t">${t("사료 계획")} <span>${t("주수별 섭취량 기준 · 앞으로 8주")}</span>${can("admin")?`<button type="button" data-a="tab" data-v="feedset">${t("섭취량 기준")} ›</button>`:""}</div><div class="card">${fpBars(P)}`;
  h+=cdTable(["사료","보관","하루 필요 kg","4주 후 하루","다음 주문","권장 주문량","구매 주기"],P.map(o=>{const late=o.orderOn&&o.orderOn<=TODAY;return [esc(o.f),o.bin?esc(o.bin.name)+` <small>${(o.bin.cap/1000).toFixed(0)}t</small>`:t("포대"),Math.round(o.d0).toLocaleString(),Math.round(o.wk[4]/7).toLocaleString(),
    o.bin?(o.kg==null?`<small>${t("잔량 기록 필요")}</small>`:o.orderOn?`<b style="color:${late?"var(--red)":"inherit"}">${late?t("지금"):kDate(o.orderOn)}</b>`:`<small>${t("8주 안 없음")}</small>`):"-",
    o.bin?`${o.qty.toLocaleString()}kg`:o.bagsWk?`${o.bagsWk}${t("포")}/${t("주")}`:"-",o.bin?`${t("약")} ${o.cycle}${t("일마다")}${o.small?`<br><small style="color:var(--red)">⚠ ${t("빈이 작음")} · ${t("가득")} ≈ ${o.full}${t("일분")}</small>`:""}`:o.bagsWk?t("매주"):"-"]}));
  return h+`<div class="note">${t("주문일 = 안전 재고")} ${FARM.feed.orderDays}${t("일분")} + ${t("도착")} ${FARM.feed.leadDays}${t("일 전")} · ${t("주문량 = 빈 용량까지 (500kg 단위)")}</div></div>`}
// 대표 설정: 섭취량 기준표
function vFeedSet(){const I=fIntake(),st=(k,v,i,step)=>`<div class="stepper"><button type="button" data-a="intk" data-v="${k}" data-i="${i??""}" data-k="${-step}" aria-label="−">−</button><input type="number" value="${(+v).toFixed(2)}" readonly><button type="button" data-a="intk" data-v="${k}" data-i="${i??""}" data-k="${step}" aria-label="+">+</button></div>`;
  let h=`<div class="pagehd"><button class="back" type="button" data-a="tab" data-v="drug">‹ ${t("사료")}</button><h2>${t("사료 섭취량 기준")}</h2></div><div class="note">${t("1두 하루 섭취량(kg)입니다. 사료 계획·남은 일수 계산에 쓰입니다. 실제 급여량에 맞춰 고쳐 주세요.")}</div>`;
  h+=`<div class="sec-t">${t("모돈")}</div><div class="panel">${[["gestEarly",`${t("임신")} ~${I.gestLateFrom-1}${t("일")}`],["gestLate",`${t("임신")} ${I.gestLateFrom}${t("일")}~`],["open",t("이유 후 공태")],["gilt",t("후보돈")]].map(([k,l])=>`<div class="setrow"><span>${l}</span>${st(k,I[k],null,.1)}</div>`).join("")}${I.lact.map((v,i)=>`<div class="setrow"><span>${t("포유")} ${i+1}${t("주")}</span>${st("lact",v,i,.1)}</div>`).join("")}</div>`;
  h+=`<div class="sec-t">${t("자돈·육성돈 (주령)")} <span>${t("사료 종류는 일령별 급여표를 따름")}</span></div><div class="panel">${I.pig.map((v,i)=>`<div class="setrow"><span>${i}${t("주령")} <small class="sow-meta">${pigFeeds(i*7+3).map(p=>p.feed).join("·")}</small></span>${st("pig",v,i,.05)}</div>`).join("")}</div>`;
  return h+`<div class="acts"><button class="act" type="button" data-a="intkReset">${t("기본값으로")}</button></div>`}
Object.assign(A,{intk:(v,el)=>{const o=state.intake=state.intake||{},I=fIntake(),s=Number(el.dataset.k),i=el.dataset.i;if(i!==""){o[v]=o[v]||[];o[v][+i]=Math.max(0,Math.round((I[v][+i]+s)*100)/100)}else o[v]=Math.max(0,Math.round((I[v]+s)*100)/100);NPDX=null;save();render()},
  intkReset:()=>{if(confirm(t("섭취량 기준을 기본값으로 되돌릴까요?"))){state.intake={};save();render()}}});
