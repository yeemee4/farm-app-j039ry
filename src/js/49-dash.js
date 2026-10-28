/* ================= v0.5 · 현황판 대시보드 (16:9 · 칸 켜기/끄기는 대표 설정) ================= */
// 칸 목록: [키, 이름, 기본 켜짐]. 칸을 더하려면 여기에 한 줄 + DASH_P 에 그리는 함수 하나.
const DASH_LIST=[["sows","모돈 상태",1],["breed","이번 주 번식",1],["dead","폐사 추이",1],["flow","돈군 흐름",1],["feed","사료 남은 일수",1],["am","아침 점검",1],["barn","돈사 현황표",0],["todo","오늘 할 일",1],["kpi","지난달 성적",1],["memo","회의 메모",1]];
const DASH_SIDE=["todo","memo"],DASH_STRIP=["kpi"];   // 오른쪽 열 · 맨 아래 띠
const DASH_GOAL0={교배:5,분만:4,이유:4,임신확인:5};      // 주간 목표 기본값 (주 4복 기준)
function dashCfg(){const d=state.dash=state.dash||{};d.order=d.order||DASH_LIST.map(x=>x[0]);DASH_LIST.forEach(x=>{if(!d.order.includes(x[0]))d.order.push(x[0])});
  d.on=d.on||Object.fromEntries(DASH_LIST.map(x=>[x[0],!!x[2]]));d.goal={...DASH_GOAL0,...(d.goal||{})};return d}
const DCOL=["#3987e5","#d95926","#199e70","#c98500","#d55181","#9085e9"];   // 검증한 색 순서 (어두운 배경)
const DST={good:"#0ca30c",warn:"#fab219",crit:"#d03b3b"};

// 날씨 그림 (임시 · 그림 파일이 오면 ICON_IMG["날씨-맑음"] 등으로 바꿔 끼움)
function wxPic(code){const k=code===0?"맑음":code<=2?"구름조금":code===3?"흐림":code<=48?"안개":code<=67?"비":code<=77?"눈":code<=82?"소나기":code<=86?"눈":"천둥";
  if(ICON_IMG["날씨-"+k])return `<img src="${ICON_IMG["날씨-"+k]}" alt="${t(k)}">`;
  const O='stroke="#6b4a2b" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';
  const sun=(x,y,r)=>`<g ${O}><path stroke="#e8a92c" d="M${x} ${y-r-7}v4M${x} ${y+r+3}v4M${x-r-7} ${y}h4M${x+r+3} ${y}h4M${x-r-3} ${y-r-3}l3 3M${x+r} ${y+r}l3 3M${x-r-3} ${y+r+3}l3-3M${x+r+3} ${y-r-3}l-3 3"/><circle cx="${x}" cy="${y}" r="${r}" fill="#ffd25e"/></g>`;
  const cloud=(dx,dy,f="#fff",k2=1)=>`<path transform="translate(${dx} ${dy}) scale(${k2})" ${O} fill="${f}" d="M14 44a10 10 0 0 1 2-19.8 13 13 0 0 1 24.6 3.4A8.2 8.2 0 0 1 40 44z"/>`;
  const drops=c=>`<g ${O} stroke="${c}"><path d="M22 50l-2 6M31 50l-2 6M40 50l-2 6"/></g>`;
  const P={맑음:sun(32,32,13),구름조금:sun(24,22,10)+cloud(8,6),흐림:cloud(-2,-4,"#e3e8ee",.85)+cloud(10,6),비:cloud(4,0)+drops("#4a90d9"),소나기:sun(46,16,8)+cloud(2,2)+drops("#4a90d9"),
    눈:cloud(4,0)+`<g fill="#fff" ${O} stroke-width="1.6"><circle cx="22" cy="54" r="3"/><circle cx="32" cy="57" r="3"/><circle cx="42" cy="54" r="3"/></g>`,
    천둥:cloud(4,0,"#d9dee5")+`<path ${O} fill="#ffd25e" d="M32 42l-6 10h6l-3 9 10-13h-6l3-6z"/>`,안개:`<g ${O} stroke="#9DB0A5" stroke-width="3"><path d="M12 24h40M8 34h44M14 44h36"/></g>`};
  return `<svg viewBox="0 0 64 64" aria-label="${t(k)}">${P[k]}</svg>`}

// ---- 칸 그리기 ----
const dWeek=()=>weekStart(TODAY);
const DASH_P={
  sows:()=>{const c=statusCounts(),L=[["임신","임신"],["확인전","확인 전"],["포유","포유"],["발정대기","발정 대기"],["재발공태","재발·공태"],["분만임박","분만 임박"]].map(([k,l],i)=>({l,n:c[k]||0,c:DCOL[i]})),
      tot=L.reduce((s,x)=>s+x.n,0)||1,C=2*Math.PI*46;let off=0;
    const arcs=L.filter(x=>x.n).map(x=>{const len=x.n/tot*C,a=`<circle cx="60" cy="60" r="46" stroke="${x.c}" stroke-dasharray="${Math.max(0,len-2)} ${C}" stroke-dashoffset="${-off}"><title>${t(x.l)} ${x.n}</title></circle>`;off+=len;return a}).join("");
    return [`${t("모돈 상태")}`,`${activeSows().length}${t("두")}`,`<div class="d-donut"><svg viewBox="0 0 120 120"><g transform="rotate(-90 60 60)" fill="none" stroke-width="20">${arcs}</g><text x="60" y="62" text-anchor="middle" class="d-big">${activeSows().length}</text><text x="60" y="78" text-anchor="middle" class="d-mu">${t("두")}</text></svg><div class="d-legend">${L.map(x=>`<span><i style="background:${x.c}"></i>${t(x.l)}<b>${x.n}</b></span>`).join("")}</div></div>`]},
  breed:()=>{const w=dWeek(),G=dashCfg().goal,R=k=>state.records.filter(r=>r.type===k&&r.workDate>=w&&r.workDate<=TODAY);
    const rows=[["교배",R("교배").filter(r=>r.data.round==="1차").length,DCOL[0]],["분만",R("분만").length,DCOL[2]],["이유",R("이유").length,DCOL[3]],["임신확인",R("임신확인").filter(r=>r.data.result==="임신").length,DCOL[5]]];
    return [t("이번 주 번식"),t("목표 대비 · 흰 선 = 목표"),`<div class="d-bars">${rows.map(([k,n,c])=>{const g=G[k]||1,mx=Math.max(g,n);return `<div class="d-bar"><span>${t(LABEL[k]||k)}</span><div class="d-track"><div class="d-fill" style="width:${n/mx*100}%;background:${c}"></div><div class="d-tick" style="left:calc(${g/mx*100}% - 3px)"></div></div><span class="d-v"><b>${n}</b> / ${g}</span></div>`}).join("")}</div>`]},
  dead:()=>{const w=dWeek(),W=[3,2,1,0].map(i=>{const a=addDays(w,-7*i),b=addDays(a,6);return {k:isoWeek(a).w,now:i===0,n:state.records.filter(r=>r.type==="폐사"&&r.workDate>=a&&r.workDate<=b).reduce((s,r)=>s+r.data.n,0)}}),mx=Math.max(1,...W.map(x=>x.n));
    return [t("폐사 추이"),t("최근 4주 · 두"),`<div class="d-cols">${W.map(x=>`<div class="d-col ${x.now?"now":""}"><b>${x.n}</b><div class="d-c" style="height:${Math.max(2,x.n/mx*100)}%" title="W${x.k} ${x.n}"></div><span>W${x.k}${x.now?" "+t("진행"):""}</span></div>`).join("")}</div>`]},
  flow:()=>{const L2=liveBatches(),S=state.cfg.stage.map(([n],i)=>{const inS=L2.filter(b=>stagePlan(bAge(b))===n);return {n,g:inS.length,h:inS.reduce((s,b)=>s+bHeads(b,bAge(b)),0),c:DCOL[[2,0,5,3,1][i]||0]}}),tot=S.reduce((s,x)=>s+x.h,0)||1;
    return [t("돈군 흐름"),t("돈사별 두수"),`<div class="d-flow">${S.map(x=>`<div style="flex:${Math.max(x.h,tot*.06)};background:${x.h?x.c:"#3a4640"}" title="${t(x.n)} ${x.h}">${x.h.toLocaleString()}</div>`).join("")}</div><div class="d-flowlab">${S.map(x=>`<div style="flex:${Math.max(x.h,tot*.06)}">${t(x.n)}<br><small>${x.g}${t("군")}</small></div>`).join("")}</div>`]},
  feed:()=>{const R=feedTable().filter(x=>x.use>0&&x.days!==null).sort((a,b)=>a.days-b.days),mx=Math.max(14,...R.map(x=>x.days)),o=FARM.feed.orderDays;
    return [t("사료 남은 일수"),`${o}${t("일")} ${t("이하 주문")}`,`<div class="d-bars">${R.slice(0,6).map(x=>{const c=x.days<=2?DST.crit:x.days<=o?DST.warn:DST.good;return `<div class="d-bar"><span>${esc(x.f)}</span><div class="d-track"><div class="d-fill" style="width:${Math.min(100,x.days/mx*100)}%;background:${c}"></div></div><span class="d-v"><b>${x.days}${t("일")}</b>${x.days<=o?" ⚠":""}</span></div>`}).join("")||`<div class="d-mu">${t("잔량 기록 필요")}</div>`}</div>`]},
  am:()=>{const D=amDay(TODAY),P=amProg();
    return [t("아침 점검"),`${P.done}/${P.all} · ${FARM.morning.due}${t("까지")}`,`<div class="d-am">${FARM.morning.route.map(r=>{const x=D[r.barn],iss=x?amIssues(r,x):[];return `<div class="${!x?"no":iss.length?"bad":"ok"}"><b>${esc(t(r.barn))}</b>${!x?t("미점검"):`${x.temp!==""?x.temp+"℃ ":""}${iss.length?"✕ "+esc(iss.join(" · ")):"✓"}`}</div>`}).join("")}</div>`]},
  barn:()=>{const L2=liveBatches(),sl={};activeSows().forEach(s=>sl[s.loc]=(sl[s.loc]||0)+1);
    const rows=[...SOW_LOCS.filter(x=>x!=="분만사").map(x=>[x,sl[x]||0,"–","–"]),...state.cfg.stage.map(([n],i)=>{const inS=L2.filter(b=>stagePlan(bAge(b))===n);return [n,i===0?(sl["분만사"]||0):"–",inS.length,inS.reduce((s,b)=>s+bHeads(b,bAge(b)),0).toLocaleString()]})];
    return [t("돈사 현황"),"",`<table class="d-tbl"><thead><tr><th></th><th>${t("모돈")}</th><th>${t("돈군")}</th><th>${t("두수")}</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${t(r[0])}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("")}</tbody></table>`]},
  todo:()=>{const D=boardDate();REF=D;const g=buildTodos().filter(x=>!["pending"].includes(x.k));REF=TODAY;g.splice(0,g.length,...sortTodos(g));
    const left=g.reduce((s,x)=>s+leftOf(x),0);
    return [t(D===TODAY?"오늘 할 일":"내일 할 일"),`${t("남은")} ${left}`,`<div class="d-todo">${g.map(x=>{const who=(state.assign||{})[`${D}|${x.k}`];return `<div><i style="background:${x.sev==="bad"?DST.crit:x.sev==="warn"?DST.warn:"#6BB892"}"></i><span>${esc(t(x.t).replace(/ \(.*\)/,""))}<small>${who?t("담당")+" "+esc(who)+" · ":""}${esc(x.items.map(itemShort).slice(0,3).join(" · "))}</small></span><b>${x.items.length}</b></div>`}).join("")||`<div class="d-mu">${t("오늘 할 일이 없습니다.")}</div>`}</div>`]},
  kpi:()=>{const y=+TODAY.slice(0,4),m=+TODAY.slice(5,7),pm=m===1?[y-1,12]:[y,m-1],ppm=pm[1]===1?[pm[0]-1,12]:[pm[0],pm[1]-1];
    const A=rangeMetrics(...monthRange(...pm)),B=rangeMetrics(...monthRange(...ppm));
    const K=[["frate","분만율","%",0],["live","복당 실산","",1],["wean","복당 이유","",1],["psy","PSY","",1],["msy","MSY","",1]];
    return [`${t("지난달 성적")} (${pm[1]}${t("월")})`,"",`<div class="d-kpis">${K.map(([k,l,u,dp])=>{const a=A&&A[k],b=B&&B[k],d=a!=null&&b!=null?a-b:null;return `<div><small>${t(l)}</small><b>${fmtV(a,dp)}${u}</b>${d===null?"":`<i class="${d>=0?"up":"dn"}">${d>=0?"▲":"▼"} ${Math.abs(d).toFixed(dp)}${u?"%p":""}</i>`}</div>`}).join("")}</div>`]},
  memo:()=>{const D=boardDate(),memo=(state.memo||{})[D]||"";
    return [t("회의 메모"),`<button type="button" class="d-edit" data-a="memoEdit">${ui.memoEdit?t("닫기"):t("쓰기")}</button>`,ui.memoEdit?`<textarea id="memoEdit" aria-label="${t("회의 메모")}">${esc(memo)}</textarea><button type="button" class="d-edit" data-a="memoSave">${t("저장")}</button>`:`<div class="d-memo">${memo?esc(memo).replace(/\n/g,"<br>"):`<span class="d-mu">${t("메모가 없습니다. ‘쓰기’를 눌러 회의 내용을 남기세요.")}</span>`}</div>`]}
};
function dashCard(k){const [ti,sub,body]=DASH_P[k]();return `<section class="d-card dk-${k}"><h3>${ti}<small>${sub}</small></h3>${body}</section>`}

function vDash(){
  const d=dashCfg(),on=d.order.filter(k=>d.on[k]&&DASH_P[k]),main=on.filter(k=>!DASH_SIDE.includes(k)&&!DASH_STRIP.includes(k)),side=on.filter(k=>DASH_SIDE.includes(k)),strip=on.filter(k=>DASH_STRIP.includes(k));
  const tv=document.body.classList.contains("tv"),D=boardDate(),tmr=addDays(TODAY,1),now=new Date();
  const cols=main.length<=2?Math.max(1,main.length):main.length===4?2:3,rows=Math.max(1,Math.ceil(main.length/cols));
  wxLoad();const wc=WX&&WX.current,wd=wxDay(D===TODAY?0:1),al=wxAlerts(D===TODAY?0:1);
  let h=`<div class="dash ${side.length?"has-side":""} ${strip.length?"has-strip":""}" style="--dc:${cols};--dr:${rows}">`;
  h+=`<header class="d-top"><div class="d-brand">${esc(FARM.name)} · ${t(D===TODAY?"오늘":"내일")}<small>${kDate(D)} · W${isoWeek(D).w}</small></div><div class="d-warns">${al.replace(/bd-al wx/g,"d-warn")}</div>`;
  h+=wc?`<div class="d-wx">${wxPic(D===TODAY?wc.weather_code:wd.code)}<b>${D===TODAY?Math.round(wc.temperature_2m)+"℃":""}</b><span>${FARM.place} · ${t(WXC(D===TODAY?wc.weather_code:wd.code))}<br>${wd.min} ~ ${wd.max}℃ · ${t("바람")} ${Math.round((D===TODAY?wc.wind_speed_10m:wd.wind)/3.6)}m/s</span></div>`:`<div class="d-wx"><span>${FARM.place} · ${t("날씨 불러오는 중")}</span></div>`;
  h+=`<div class="d-right"><div class="d-clock">${pad(now.getHours())}:${pad(now.getMinutes())}</div><div class="d-ctl"><button type="button" class="${D===TODAY?"on":""}" data-a="bDay" data-v="today">${t("오늘")}</button><button type="button" class="${D===tmr?"on":""}" data-a="bDay" data-v="tmr">${t("내일")}</button><button type="button" data-a="tvMode">${tv?t("TV 끄기"):t("TV 전체 화면")}</button></div></div></header>`;
  h+=`<div class="d-main">${main.map(dashCard).join("")}</div>`;
  if(side.length)h+=`<div class="d-side">${side.map(dashCard).join("")}</div>`;
  if(strip.length)h+=`<div class="d-strip">${strip.map(dashCard).join("")}</div>`;
  h+=`</div>`;
  if(!tv&&can("admin"))h+=`<div class="note" style="margin-top:10px">${t("보이는 칸은 설정 › 현황판 항목에서 바꿀 수 있습니다.")}</div>`;
  return h}

// ---- 대표 설정: 칸 켜기/끄기 · 순서 · 주간 목표 ----
function vDashSet(){const d=dashCfg(),nm=Object.fromEntries(DASH_LIST.map(x=>[x[0],x[1]]));
  let h=`<div class="pagehd"><h2>${t("현황판 항목")}</h2></div><div class="note">${t("켜진 칸만 현황판에 나옵니다. TV에서는 켜진 칸 개수에 맞춰 한 화면에 자동 배치됩니다. ‘오늘 할 일·회의 메모’는 오른쪽 열, ‘지난달 성적’은 맨 아래 띠에 놓입니다.")}</div><div class="panel">`;
  h+=d.order.map((k,i)=>`<div class="setrow"><span><b>${t(nm[k]||k)}</b></span><span class="row2" style="gap:6px;flex:none"><button class="sbtn" type="button" data-a="dashMove" data-v="${k}" data-k="-1" ${i===0?"disabled":""} aria-label="위로">▲</button><button class="sbtn" type="button" data-a="dashMove" data-v="${k}" data-k="1" ${i===d.order.length-1?"disabled":""} aria-label="아래로">▼</button><button class="act ${d.on[k]?"pri":""}" type="button" data-a="dashTog" data-v="${k}">${d.on[k]?t("켜짐"):t("꺼짐")}</button></span></div>`).join("");
  h+=`</div><div class="sec-t">${t("이번 주 번식 목표")} <span>${t("주 4복 기준 기본값")}</span></div><div class="panel">`;
  h+=Object.keys(DASH_GOAL0).map(k=>`<div class="setrow"><span>${t(LABEL[k]||k)}</span><div class="stepper"><button type="button" data-a="dashGoal" data-v="${k}" data-k="-1" aria-label="줄이기">−</button><input type="number" value="${d.goal[k]}" readonly aria-label="${t(LABEL[k]||k)}"><button type="button" data-a="dashGoal" data-v="${k}" data-k="1" aria-label="늘리기">+</button></div></div>`).join("");
  const SG=sGoal();h+=`</div><div class="sec-t">${t("성적 목표")} <span>${t("성적 그래프의 점선")}</span></div><div class="panel">${[["psy","PSY"],["msy","MSY"]].map(([k,l])=>`<div class="setrow"><span>${l}</span><div class="stepper"><button type="button" data-a="sgoal" data-v="${k}" data-k="-0.5" aria-label="줄이기">−</button><input type="number" value="${SG[k]}" readonly aria-label="${l}"><button type="button" data-a="sgoal" data-v="${k}" data-k="0.5" aria-label="늘리기">+</button></div></div>`).join("")}`;
  return h+`</div><div class="acts"><button class="act" type="button" data-a="tab" data-v="board">${t("현황판 보기")} ›</button></div>`}
Object.assign(A,{
  dashTog:v=>{const d=dashCfg();d.on[v]=!d.on[v];save();render()},
  dashMove:(v,el)=>{const d=dashCfg(),i=d.order.indexOf(v),j=i+Number(el.dataset.k);if(j<0||j>=d.order.length)return;[d.order[i],d.order[j]]=[d.order[j],d.order[i]];save();render()},
  sgoal:(v,el)=>{const g=state.sgoal=state.sgoal||{};g[v]=Math.max(0,sGoal()[v]+Number(el.dataset.k));save();render()},
  dashGoal:(v,el)=>{const d=dashCfg();d.goal[v]=Math.max(0,d.goal[v]+Number(el.dataset.k));save();render()}
});
