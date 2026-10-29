/* ===== 그래프 상세 (성적·성적 TV·현황판에서 그래프를 누르면) =====
   위: 기간을 늘린 큰 그래프 · 아래: 쌓인 기록 표. 기간 칩으로 길이 바꿈 */
const CD_KEYS=["psy","litter","week","dead","cause","feed","grade","count","parity","npd","fcr"];   // chartCards() 순서
const CD_T={psy:"PSY · MSY 추이",litter:"복당 실산 · 이유두수",week:"주간 번식 달성률",dead:"폐사 현황",cause:"폐사 원인 비중",feed:"사료 남은 일수",count:"재고두수 장부 vs 실사",parity:"산차 구성",npd:"NPD 비생산일수",fcr:"사료효율 (FCR)",trend:"월별 추이"};
const CD_M=["psy","litter","trend","npd"],CD_W=["week","dead","cause"];   // 월 단위 · 주 단위
function cdMonths(n){let [y,m]=TODAY.slice(0,7).split("-").map(Number);const a=[];for(let i=n-1;i>=0;i--){let yy=y,mm=m-i;while(mm<1){mm+=12;yy--}a.push([yy,mm])}return a}
function cdWeeks(n){const w=weekStart(TODAY);return Array.from({length:n},(_,i)=>addDays(w,-7*(n-1-i)))}
const f1=(v,dp=1)=>okv(v)?(+v).toFixed(dp):"-";
function cdTable(head,rows,cls=""){return `<div class="dtab-w"><table class="dtab ${cls}"><thead><tr>${head.map(x=>`<th>${t(x)}</th>`).join("")}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${head.length}" class="empty">${t("기록이 없습니다.")}</td></tr>`}</tbody></table></div>`}
// 묶음 막대 (주간 건수)
function barsSvg(labels,series,goal){const W=360,H=190,P={l:26,r:8,t:12,b:24},mx=Math.max(1,...series.flatMap(s=>s.v),...(goal?Object.values(goal):[])),n=labels.length,gw=(W-P.l-P.r)/n,bw=Math.max(2,gw*.8/series.length),y=v=>P.t+(1-v/mx)*(H-P.t-P.b);
  let g=`<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">`;[0,mx/2,mx].forEach(v=>g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)"/><text x="${P.l-4}" y="${y(v)+4}" text-anchor="end">${Math.round(v)}</text>`);
  series.forEach((s,si)=>s.v.forEach((v,i)=>{const x=P.l+i*gw+gw*.1+si*bw;g+=`<rect x="${x}" y="${y(v)}" width="${bw-1}" height="${Math.max(0,H-P.b-y(v))}" rx="1.5" fill="${s.c}"><title>${labels[i]} · ${esc(s.l)} ${v}</title></rect>`}));
  const step=Math.ceil(n/9);labels.forEach((l,i)=>{if(i%step===0||i===n-1)g+=`<text x="${P.l+i*gw+gw/2}" y="${H-7}" text-anchor="middle">${l}</text>`});return g+`</svg>`}
function cdBody(k,n){const G=sGoal();
  if(k==="npd")return npdDetail(n);
  if(k==="fcr")return fcrDetail();
  if(CD_M.includes(k)){const M=cdMonths(n),lab=M.map(([y,m])=>(n>12?String(y).slice(2)+".":"")+m+t("월")),mm=M.map(([y,m])=>rangeMetrics(...monthRange(y,m))),pick=q=>mm.map(v=>v?v[q]:null);
    if(k==="psy")return linesSvg({title:"PSY MSY",labels:lab,dp:1,series:[{l:"PSY",v:pick("psy"),c:CC.a},{l:"MSY",v:pick("msy"),c:CC.b}],goals:[{l:t("목표")+" "+G.psy,v:G.psy,c:CC.a},{l:t("목표")+" "+G.msy,v:G.msy,c:CC.b}]})+legendH([[CC.a,"PSY"],[CC.b,"MSY"],["var(--muted)",t("목표"),1]])+
      cdTable(["월","분만복수","복당 이유","PSY","MSY","PSY 목표 대비"],M.map(([y,m],i)=>{const v=mm[i]||{};return [`${y}.${pad(m)}`,v.far??"-",f1(v.wean),f1(v.psy),f1(v.msy),okv(v.psy)?`<span class="dlt ${v.psy>=G.psy?"up":"down"}">${v.psy>=G.psy?"▲":"▼"} ${Math.abs(v.psy-G.psy).toFixed(1)}</span>`:"-"]}).reverse());
    if(k==="litter")return linesSvg({title:"실산 이유",labels:lab,dp:1,band:t("포유 중 손실"),series:[{l:t("실산"),v:pick("live"),c:CC.a},{l:t("이유"),v:pick("wean"),c:CC.b}]})+legendH([[CC.a,t("복당 실산")],[CC.b,t("복당 이유")]])+
      cdTable(["월","분만복수","복당 총산","복당 실산","복당 이유","포유 손실","포유 육성률"],M.map(([y,m],i)=>{const v=mm[i]||{};return [`${y}.${pad(m)}`,v.far??"-",f1(v.tot),f1(v.live),f1(v.wean),okv(v.live)&&okv(v.wean)?f1(v.live-v.wean):"-",okv(v.surv)?f1(v.surv)+"%":"-"]}).reverse());
    const md=MET.find(m=>m[0]===ui.st.metric)||MET[7];
    return lineSvg(M.map(([y,m],i)=>({y,m,v:mm[i]?mm[i][md[0]]:null,src:mm[i]?mm[i].src:null})),md)+cdTable(["월",...MET.map(m=>m[1])],M.map(([y,m],i)=>{const v=mm[i]||{};return [`${y}.${pad(m)}`,...MET.map(q=>v[q[0]]!=null?fmtV(v[q[0]],q[3]):"-")]}).reverse(),"wide")}
  if(CD_W.includes(k)){const W=cdWeeks(n),lab=W.map(w=>"W"+isoWeek(w).w),f=W[0];
    if(k==="week"){const goal=dashCfg().goal,R=(q,a)=>{const b=addDays(a,6),L=state.records.filter(r=>r.type===q&&r.workDate>=a&&r.workDate<=b);return q==="교배"?L.filter(r=>r.data.round==="1차").length:L.length};
      const S=["교배","분만","이유"].map((q,i)=>({l:t(q),v:W.map(w=>R(q,w)),c:[CC.a,CC.b,"var(--good)"][i]}));
      return barsSvg(lab,S,goal)+legendH(S.map(s=>[s.c,s.l]))+cdTable(["주","시작일","교배","분만","이유","임신 확인"],W.map((w,i)=>[lab[i],kDate(w),...S.map((s,j)=>{const g=goal[["교배","분만","이유"][j]]||1;return `${s.v[i]} <small class="${s.v[i]>=g?"ok":"lo"}">${Math.round(s.v[i]/g*100)}%</small>`}),R("임신확인",w)]).reverse())}
    const D=state.records.filter(r=>r.type==="폐사"&&r.workDate>=f).sort((a,b)=>b.workDate.localeCompare(a.workDate));
    if(k==="dead"){const cell={};let mx=1;D.forEach(r=>{const q=r.data.barn+"|"+weekStart(r.workDate);cell[q]=(cell[q]||0)+r.data.n;mx=Math.max(mx,cell[q])});const B=BARNS.filter(b=>W.some(w=>cell[b+"|"+w]));
      const tot=W.map(w=>D.filter(r=>weekStart(r.workDate)===w).reduce((s,r)=>s+r.data.n,0));
      return barsSvg(lab,[{l:t("폐사"),v:tot,c:"var(--red)"}])+(B.length?`<div class="hm" style="--hc:${W.length}"><span></span>${W.map((w,i)=>`<span class="hm-h">${n>12&&i%2?"":lab[i]}</span>`).join("")}${B.map(b=>`<span class="hm-l">${esc(t(b))}</span>${W.map(w=>{const v=cell[b+"|"+w]||0;return `<span class="hm-c" style="background:${v?`color-mix(in srgb, var(--red) ${Math.round(18+v/mx*82)}%, var(--surface))`:"var(--bg)"};color:${v/mx>.55?"#fff":"var(--ink)"}">${v||""}</span>`}).join("")}`).join("")}</div>`:"")+cdDeadTable(D)}
    const cz={};D.forEach(r=>cz[r.data.cause]=(cz[r.data.cause]||0)+r.data.n);const tot=Object.values(cz).reduce((a,b)=>a+b,0);
    const bs={};D.forEach(r=>{const q=r.data.cause+"|"+r.data.barn;bs[q]=(bs[q]||0)+r.data.n});
    return (tot?hbarsH(Object.entries(cz).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({l:t(l),v,txt:`${v}${t("두")} · ${Math.round(v/tot*100)}%`,c:"var(--red)"}))):"")+
      cdTable(["원인","돈사","두수"],Object.entries(bs).sort((a,b)=>b[1]-a[1]).map(([q,v])=>{const [c,b]=q.split("|");return [esc(t(c)),esc(t(b)),v]}))+cdDeadTable(D)}
  if(k==="feed"){const fr=feedTable(),od=FARM.feed.orderDays,R=state.records.filter(r=>r.type==="사료").sort((a,b)=>b.workDate.localeCompare(a.workDate)).slice(0,n*4);
    return hbarsH(fr.filter(x=>x.use>0&&x.days!==null).sort((a,b)=>a.days-b.days).map(x=>({l:x.f,v:x.days,txt:`${x.days}${t("일")}`,c:x.days<=2?"var(--red)":x.days<=od?"var(--amber)":"var(--good)"})))+
      cdTable(["사료","보관","잔량 kg","하루 사용 kg","남은 일수"],fr.map(x=>[esc(x.f),x.bin?esc(x.bin.name):t("포대"),(x.kg||0).toLocaleString(),Math.round(x.use||0),x.days??"-"]))+
      vFeedPlan()+`<div class="sec-t">${t("최근 사료 기록")}</div>`+cdTable(["날짜","사료","구분","kg"],R.map(r=>[kDate(r.workDate),esc(r.data.kind),t(r.data.mode),(+r.data.kg||0).toLocaleString()]))}
  if(k==="parity")return parityDetail();
  if(k==="count"){const R=state.records.filter(r=>r.type==="실사").sort((a,b)=>b.workDate.localeCompare(a.workDate)).slice(0,n*4);
    return (countChart()||"")+cdTable(["날짜","돈사","실사","장부","차이"],R.map(r=>{const d=r.data.n-r.data.est;return [kDate(r.workDate),esc(t(r.data.barn)),r.data.n,r.data.est,`<span class="dlt ${d<0?"down":d>0?"up":""}">${d>0?"+":""}${d}</span>`]}))}
  return `<div class="empty">${t("출하 후 도축장 성적 파일을 넣으면 표시합니다.")}</div>`}
function cdDeadTable(D){return `<div class="sec-t">${t("폐사 기록")} <span>${D.reduce((s,r)=>s+r.data.n,0)}${t("두")} · ${D.length}${t("건")}</span></div>`+cdTable(["날짜","돈사","단계","두수","원인","모돈"],D.map(r=>[kDate(r.workDate),esc(t(r.data.barn)),esc(t(r.data.stage||"")),r.data.n,esc(t(r.data.cause)),r.data.sow?esc(r.data.sow):""]))}
function openChartDetail(k){const c=ui.cd=ui.cd&&ui.cd.k===k?ui.cd:{k,n:CD_M.includes(k)?12:CD_W.includes(k)?12:4};
  const opts=CD_M.includes(k)?[[6,"6개월"],[12,"12개월"],[24,"24개월"]]:CD_W.includes(k)?[[8,"8주"],[12,"12주"],[26,"26주"]]:k==="feed"||k==="count"?[[4,"최근"],[12,"더 보기"]]:[];
  const ti=k==="trend"?`${t("월별 추이")} · ${t((MET.find(m=>m[0]===ui.st.metric)||MET[7])[1])}`:t(CD_T[k]||k);
  $("#sheetRoot").innerHTML=`<div class="scrim" data-a="scrim"><div class="sheet wide cdet" role="dialog" aria-modal="true" aria-label="${esc(ti)}"><div class="sh-hd"><h2>${ti}</h2><button class="x" type="button" data-a="closeSheet">${t("닫기")}</button></div><div class="sh-bd">${opts.length?`<div class="chips">${opts.map(([v,l])=>`<button type="button" class="chip ${c.n===v?"on":""}" data-a="cdN" data-v="${v}">${t(l)}</button>`).join("")}</div>`:""}<div class="card">${cdBody(k,c.n)}</div></div></div></div>`;
  if(typeof tagsApply==="function")try{tagsApply()}catch(e){}}
Object.assign(A,{chDetail:v=>openChartDetail(v),cdN:v=>{ui.cd.n=+v;openChartDetail(ui.cd.k)}});
