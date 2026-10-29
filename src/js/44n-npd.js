/* ===== NPD 비생산일수 (성적 카드 · 현황판 칸 · 누르면 상세) =====
   생산일 = 임신(분만으로 이어진 1차 교배 → 분만) + 포유(분만 → 이유). 나머지 = 비생산일.
   모돈 일수는 후보돈은 첫 교배부터, 도태되면 도태일까지. 연환산 = 비생산일 ÷ 모돈 일수 × 365
   원인: 이유 후(→재교배) · 재발·공태(분만으로 안 이어진 교배 후) · 그 밖 */
const NPD_R=[["wei","이유 → 재교배"],["fail","재발·공태"],["other","그 밖"]];
let NPDX=null;
function npdSegs(){const key=state.records.length+"|"+state.sows.length+"|"+TODAY;if(NPDX&&NPDX.key===key)return NPDX.m;const m={};
  state.sows.forEach(s=>{const asc=state.records.filter(r=>r.data&&r.data.sow===s.id).sort((a,b)=>a.workDate.localeCompare(b.workDate)),cyc=sowCycles(s.id),cull=culledRec(s.id);
    const prod=[];cyc.forEach(c=>{prod.push([c.m?c.m.workDate:addDays(c.f.workDate,-115),c.f.workDate]);prod.push([c.f.workDate,c.w?c.w.workDate:"9999"])});
    const lastF=cyc.length?cyc[cyc.length-1].f.workDate:"",mates=asc.filter(r=>r.type==="교배"&&r.data.round==="1차"),cur=[...mates].reverse().find(r=>r.workDate>lastF);
    const st=statusOf(s);if(cur&&["임신","분만임박","확인전"].includes(st.key))prod.push([cur.workDate,"9999"]);
    const okM=new Set(cyc.map(c=>c.m&&c.m.id).filter(Boolean));
    const ev=[...cyc.filter(c=>c.w).map(c=>[c.w.workDate,"wei"]),...mates.filter(r=>!okM.has(r.id)&&!(cur&&r.id===cur.id&&prod.length&&prod[prod.length-1][0]===cur.workDate)).map(r=>[r.workDate,"fail"])].sort((a,b)=>a[0].localeCompare(b[0]));
    const start=s.baseParity>0||(asc[0]&&asc[0].type!=="교배")?"0000":mates[0]?mates[0].workDate:null;
    if(start)m[s.id]={start,end:cull?cull.workDate:"9999",prod,ev}});
  NPDX={key,m};return m}
function npdStat(f,t){const M=npdSegs(),R={wei:0,fail:0,other:0},per=[];let npd=0,sd=0;
  Object.entries(M).forEach(([id,o])=>{const a=o.start>f?o.start:f,b=o.end<t?o.end:t;if(a>b)return;let n=0;const rs={wei:0,fail:0,other:0};
    for(let d=a;d<=b;d=addDays(d,1)){sd++;if(o.prod.some(([x,y])=>d>=x&&d<y))continue;let why="other";for(const [ed,k] of o.ev){if(ed<=d)why=k;else break}n++;rs[why]++}
    npd+=n;NPD_R.forEach(([k])=>R[k]+=rs[k]);if(n)per.push({id,n,...rs})});
  return sd?{npd:npd/sd*365,days:npd,sd,R,per:per.sort((x,y)=>y.n-x.n),sows:sd/(diff(f,t)+1)}:null}
const npdCol=(v,g)=>!okv(v)?"var(--muted)":v<=g?"var(--good)":v<=g*1.25?"var(--amber)":"var(--red)";
function npdBars(S){const tot=S.days||1,C={wei:"var(--c-a)",fail:"var(--red)",other:"var(--amber)"};return hbarsH(NPD_R.map(([k,l])=>({l:t(l),v:S.R[k],txt:`${(S.R[k]/S.sd*365).toFixed(1)}${t("일")} · ${Math.round(S.R[k]/tot*100)}%`,c:C[k]})))}
function npdCard(){const P=statPeriod(),S=npdStat(P.f,P.t>TODAY?TODAY:P.t),C=P.cmp?npdStat(P.cmp[0],P.cmp[1]):null,g=sGoal().npd;
  if(!S)return `<div class="card"><h3>${t("NPD 비생산일수")}</h3><div class="empty">${t("이 기간에는 기록이 없습니다.")}</div></div>`;
  const d=C?S.npd-C.npd:null;
  return `<div class="card"><h3>${t("NPD 비생산일수")}<small>${t("모돈당 연환산 · 낮을수록 좋음")}</small></h3><div class="hero"><b style="color:${npdCol(S.npd,g)}">${S.npd.toFixed(1)}<i>${t("일")}</i></b><span>${t("목표")} ${g}${t("일")}${okv(d)?` · <span class="dlt ${d<=0?"up":"down"}">${d>0?"▲":"▼"} ${Math.abs(d).toFixed(1)}</span> <small>(${C.npd.toFixed(1)})</small>`:""}</span></div>${npdBars(S)}</div>`}
function npdDetail(n){const M=cdMonths(n),g=sGoal().npd,rows=M.map(([y,m])=>{const [f,t2]=monthRange(y,m);return [y,m,t2>TODAY?npdStat(f,TODAY):npdStat(f,t2)]}),P=statPeriod(),S=npdStat(P.f,P.t>TODAY?TODAY:P.t);
  return linesSvg({title:"NPD",labels:M.map(([y,m])=>(n>12?String(y).slice(2)+".":"")+m+t("월")),dp:1,series:[{l:"NPD",v:rows.map(r=>r[2]?r[2].npd:null),c:CC.a}],goals:[{l:t("목표")+" "+g,v:g,c:"var(--good)"}]})+
    cdTable(["월","NPD (연환산)","비생산일 합","이유 → 재교배","재발·공태","그 밖","모돈 수"],rows.map(([y,m,s])=>[`${y}.${pad(m)}`,s?`<b style="color:${npdCol(s.npd,g)}">${s.npd.toFixed(1)}</b>`:"-",s?s.days:"-",s?s.R.wei:"-",s?s.R.fail:"-",s?s.R.other:"-",s?Math.round(s.sows):"-"]).reverse())+
    (S?`<div class="sec-t">${t("비생산일이 많은 모돈")} <span>${esc(P.label)}</span></div>`+cdTable(["모돈","비생산일","이유 → 재교배","재발·공태","그 밖","현재 상태"],S.per.slice(0,20).map(p=>{const s=state.sows.find(x=>x.id===p.id);return [`<button type="button" class="sow-no" data-a="sowd" data-v="${p.id}">${p.id}</button>`,p.n,p.wei,p.fail,p.other,s?esc(statusOf(s).label):""]})):"")}
