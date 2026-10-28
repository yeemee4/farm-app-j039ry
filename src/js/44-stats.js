/* ================= v0.2 · 성적 ================= */
const MET=[["far","분만복수","복",0,1],["mates","교배복수","복",0,1],["frate","분만율","%",1,1,1],["tot","복당 총산","두",1,1],["live","복당 실산","두",1,1],["wean","복당 이유","두",1,1],["surv","포유 육성률","%",1,1],["psy","PSY 환산","두",1,1,1],["msy","MSY 환산","두",1,1,1],["dead","폐사두수","두",0,-1],["ship","출하두수","두",0,1],["shipKg","평균 출하체중","kg",1,0]];
function monthRange(y,m){const last=new Date(Date.UTC(y,m,0)).getUTCDate();return [`${y}-${pad(m)}-01`,`${y}-${pad(m)}-${pad(last)}`]}
function shiftY(s,n){const y=+s.slice(0,4)+n;let r=`${y}${s.slice(4)}`;if(s.slice(5)==="02-29")r=`${y}-02-28`;return r}
function metrics(from,to){
  const inP=r=>r.workDate>=from&&r.workDate<=to,R=t=>state.records.filter(r=>r.type===t&&inP(r));
  const days=diff(from,to)+1,mates=R("교배").filter(r=>r.data.round==="1차"),far=R("분만"),wn=R("이유"),dead=R("폐사"),ship=R("출하").filter(r=>!r.data.bulk);
  const avg=(a,f)=>a.length?a.reduce((s,x)=>s+f(x),0)/a.length:null;
  const mb=state.records.filter(r=>r.type==="교배"&&r.data.round==="1차"&&r.workDate>=addDays(from,-CFG.gest)&&r.workDate<=addDays(to,-CFG.gest));
  const fr=mb.filter(m=>state.records.some(f=>f.type==="분만"&&f.data.sow===m.data.sow&&diff(m.workDate,f.workDate)>=105&&diff(m.workDate,f.workDate)<=125)).length;
  const liveOf=w=>{const f=state.records.filter(x=>x.type==="분만"&&x.data.sow===w.data.sow&&x.workDate<w.workDate).sort((a,b)=>b.workDate.localeCompare(a.workDate))[0];return f?f.data.live:null};
  const pairs=wn.map(w=>[w.data.n,liveOf(w)]).filter(p=>p[1]);
  const sows=activeSows().filter(s=>!statusOf(s).gilt).length||1;
  const shipN=ship.reduce((s,r)=>s+r.data.n,0);
  return {days,far:far.length,mates:mates.length,frate:mb.length?fr/mb.length*100:null,tot:avg(far,r=>r.data.live+r.data.still+r.data.mum),live:avg(far,r=>r.data.live),wean:avg(wn,r=>r.data.n),
    surv:pairs.length?pairs.reduce((s,p)=>s+p[0],0)/pairs.reduce((s,p)=>s+p[1],0)*100:null,psy:wn.reduce((s,r)=>s+r.data.n,0)/sows*365/days,msy:shipN/sows*365/days,
    dead:dead.reduce((s,r)=>s+r.data.n,0),ship:shipN,shipKg:shipN?ship.reduce((s,r)=>s+r.data.n*r.data.kg,0)/shipN:null,src:"rec"};
}
function hasRec(from,to){return state.records.some(r=>["분만","교배","이유","출하"].includes(r.type)&&r.workDate>=from&&r.workDate<=to)}
function mergeM(a,b){if(!a)return b;if(!b)return a;const d=a.days+b.days,w=(k,ka,kb)=>{const x=a[k],y=b[k],wa=ka,wb=kb;if(x==null)return y;if(y==null)return x;return (x*wa+y*wb)/((wa+wb)||1)};
  return {days:d,far:a.far+b.far,mates:a.mates+b.mates,dead:a.dead+b.dead,ship:a.ship+b.ship,frate:w("frate",a.mates,b.mates),tot:w("tot",a.far,b.far),live:w("live",a.far,b.far),wean:w("wean",a.far,b.far),surv:w("surv",a.far,b.far),psy:w("psy",a.days,b.days),msy:w("msy",a.days,b.days),shipKg:w("shipKg",a.ship,b.ship),src:"mix"}}
function rangeMetrics(from,to){
  if(to>TODAY)to=TODAY;if(from>to)return null;
  const S0=state.startDate;
  if(S0&&from<S0&&to>=S0){const a=metrics(S0,to),b=rangeMetrics(from,addDays(S0,-1));return mergeM(a,b&&b.src==="man"?b:null)}
  if(hasRec(from,to))return metrics(from,to);
  const ms=[];let y=+from.slice(0,4),m=+from.slice(5,7);
  while(`${y}-${pad(m)}`<=to.slice(0,7)){const v=(state.prevYear||{})[`${y}-${pad(m)}`];if(v)ms.push(v);m++;if(m>12){m=1;y++}}
  if(!ms.length)return null;
  const sum=k=>ms.reduce((s,v)=>s+(+v[k]||0),0),wavg=k=>{const w=sum("far")||1;return ms.reduce((s,v)=>s+(+v[k]||0)*(+v.far||0),0)/w},mean=k=>{const a=ms.filter(v=>v[k]!==undefined&&v[k]!=="");return a.length?a.reduce((s,v)=>s+(+v[k]),0)/a.length:null};
  return {days:diff(from,to)+1,far:sum("far"),mates:sum("mates"),frate:mean("frate"),tot:wavg("tot"),live:wavg("live"),wean:wavg("wean"),surv:mean("surv"),psy:mean("psy"),msy:mean("msy"),dead:sum("dead"),ship:sum("ship"),shipKg:mean("shipKg"),src:"man"};
}
function statPeriod(){
  const S=ui.st,ty=+TODAY.slice(0,4);
  if(S.mode==="월"){const [y,m]=S.ym.split("-").map(Number);const [f,t]=monthRange(y,m);const pm=m===1?[y-1,12]:[y,m-1];const [pf,pt]=monthRange(...pm);
    return {f,t,label:`${y}년 ${m}월`,cmp:S.cmp==="ly"?[shiftY(f,-1),shiftY(t,-1),`${y-1}년 ${m}월`]:[pf,pt,`${pm[0]}년 ${pm[1]}월`]}}
  if(S.mode==="분기"){const [y,q]=S.yq.split("-").map(Number);const f=monthRange(y,q*3-2)[0],t=monthRange(y,q*3)[1];const pq=q===1?[y-1,4]:[y,q-1];
    return {f,t,label:`${y}년 ${q}분기`,cmp:S.cmp==="ly"?[shiftY(f,-1),shiftY(t,-1),`${y-1}년 ${q}분기`]:[monthRange(pq[0],pq[1]*3-2)[0],monthRange(pq[0],pq[1]*3)[1],`${pq[0]}년 ${pq[1]}분기`]}}
  if(S.mode==="연간"){const f=S.yr==="cal"?`${ty}-01-01`:addDays(TODAY,-364),t=TODAY;return {f,t,label:S.yr==="cal"?`${ty}년 1월~오늘`:"최근 12개월",cmp:[shiftY(f,-1),shiftY(t,-1),"작년 같은 기간"]}}
  if(S.mode==="기간"){const f=S.from,t=S.to,len=diff(f,t)+1;
    return {f,t,label:`${kDate(f)} ~ ${kDate(t)} (${len}일)`,cmp:S.cmp==="none"?null:S.cmp==="ly"?[shiftY(f,-1),shiftY(t,-1),"작년 같은 기간"]:[addDays(f,-len),addDays(f,-1),"직전 같은 길이"]}}
  return null;
}
function fmtV(v,dp){return v===null||v===undefined||isNaN(v)?"-":(+v).toFixed(dp)}
function vStats(){
  const S=ui.st;
  const noShip=!state.records.some(r=>r.type==="출하");const ob=liveBatches().slice(-1)[0];
  let h=`<div class="pagehd"><h2>성적</h2></div>${noShip?`<div class="banner info"><b>출하 시작 전</b><span>출하 기록이 아직 없어 MSY·출하 성적은 비어 있습니다.${ob?` 첫 출하 예정: ${kDate(addDays(ob.k,shipAge()*7))} 주 (${bName(ob.k)})`:""}</span></div>`:""}<div class="chips">${["월","분기","연간","전년 비교","기간"].map(m=>`<button type="button" class="chip ${S.mode===m?"on":""}" data-a="stMode" data-v="${m}">${m==="월"?"월간":m==="기간"?"기간 설정":m}</button>`).join("")}</div>`;
  if(S.mode==="전년 비교")return h+vYoY();
  const P=statPeriod();
  // 기간 선택
  if(S.mode==="월")h+=`<div class="datebar"><button type="button" data-a="stNav" data-v="-1" aria-label="이전 달">‹</button><input type="month" id="stYm" value="${S.ym}" max="${TODAY.slice(0,7)}" aria-label="월 선택" style="width:auto;border:0;background:transparent;font-weight:700;text-align:center"><button type="button" data-a="stNav" data-v="1" aria-label="다음 달">›</button></div>`;
  if(S.mode==="분기")h+=`<div class="datebar"><button type="button" data-a="stNav" data-v="-1" aria-label="이전 분기">‹</button><b>${P.label}</b><button type="button" data-a="stNav" data-v="1" aria-label="다음 분기">›</button></div>`;
  if(S.mode==="연간")h+=`<div class="chips">${[["rolling","최근 12개월"],["cal","올해 1월~오늘"]].map(([k,l])=>`<button type="button" class="chip ${S.yr===k?"on":""}" data-a="stYr" data-v="${k}">${l}</button>`).join("")}</div>`;
  if(S.mode==="기간")h+=`<div class="panel"><div class="row2"><input type="date" id="stFrom" value="${S.from}" max="${TODAY}" aria-label="시작일"><span>~</span><input type="date" id="stTo" value="${S.to}" max="${TODAY}" aria-label="종료일"></div>
    <div class="chips">${[["4w","최근 4주"],["3m","최근 3개월"],["ty","올해"],["ly","작년"]].map(([k,l])=>`<button type="button" class="chip" data-a="stQuick" data-v="${k}">${l}</button>`).join("")}</div></div>`;
  if(S.mode!=="연간")h+=`<div class="chips"><span class="note" style="align-self:center">비교:</span>${(S.mode==="기간"?[["prev","직전 같은 길이"],["ly","작년 같은 기간"],["none","비교 안 함"]]:[["prev",S.mode==="월"?"지난달":"지난 분기"],["ly","작년 같은 기간"]]).map(([k,l])=>`<button type="button" class="chip ${S.cmp===k?"on":""}" data-a="stCmp" data-v="${k}">${l}</button>`).join("")}</div>`;
  const cur=rangeMetrics(P.f,P.t),cmp=P.cmp?rangeMetrics(P.cmp[0],P.cmp[1]):null;
  h+=`<div class="sec-t">${P.label}${P.cmp?` <span>비교: ${P.cmp[2]}${cmp&&cmp.src==="man"?" (직접 입력값)":""}</span>`:""}</div>`;
  if(!cur){h+=`<div class="empty">이 기간에는 기록이 없습니다.</div>`}
  else{
    const short=cur.days<28;
    h+=`<div class="tiles">${MET.map(([k,l,u,dp,dir,sh])=>{const v=cur[k],c=cmp?cmp[k]:null;let dl="";
      if(v!==null&&c!==null&&c!==undefined&&!isNaN(c)){const d=v-c;const good=dir===0||Math.abs(d)<1e-9?null:(d>0)===(dir>0);dl=`<span class="dlt ${good===null?"":good?"up":"down"}">${d>0?"▲":d<0?"▼":"–"} ${Math.abs(d).toFixed(dp)}${u==="%"?"%p":""} <small>(${fmtV(c,dp)})</small></span>`}
      return `<div class="tile"><span class="lab">${l}${sh&&short?` <span class="tag late" style="font-size:10px">참고용</span>`:""}</span><span class="val">${fmtV(v,dp)}<small>${u}</small></span>${dl||`<span class="sub">${cmp?"비교값 없음":""}</span>`}</div>`}).join("")}</div>`;
    if(short)h+=`<div class="note">4주보다 짧은 기간은 분만율·PSY·MSY가 크게 흔들려 ‘참고용’으로 표시합니다.</div>`;
    if(cur.src==="man")h+=`<div class="note">이 기간은 앱 기록이 없어 직접 입력한 작년 성적을 보여 줍니다.</div>`;
  }
  // 추이
  const mk=S.metric,md=MET.find(m=>m[0]===mk);
  const endYm=S.mode==="월"?S.ym:TODAY.slice(0,7);let [ey,em]=endYm.split("-").map(Number);
  const pts=[];for(let n=11;n>=0;n--){let y=ey,m=em-n;while(m<1){m+=12;y--}const [f,t]=monthRange(y,m);const v=rangeMetrics(f,t);pts.push({y,m,v:v?v[mk]:null,src:v?v.src:null})}
  h+=`<div class="card"><h3>월별 추이 · ${md[1]}</h3><div class="chips" style="margin-bottom:8px">${MET.filter(m=>m[0]!=="shipKg").map(m=>`<button type="button" class="chip ${mk===m[0]?"on":""}" data-a="stMetric" data-v="${m[0]}">${m[1]}</button>`).join("")}</div>${lineSvg(pts,md)}<div class="note">빈 점: 직접 입력한 작년 성적 · 찬 점: 앱 기록</div></div>`;
  h+=prevYearForm();
  return h;
}
function lineSvg(pts,md){
  const W=340,H=170,P={l:34,r:12,t:18,b:24},vals=pts.map(p=>p.v).filter(v=>v!==null&&v!==undefined&&!isNaN(v));
  if(!vals.length)return `<div class="empty">표시할 값이 없습니다.</div>`;
  let mn=Math.min(...vals),mx=Math.max(...vals);if(mn===mx){mn-=1;mx+=1}const pd=(mx-mn)*.15;mn=Math.max(0,mn-pd);mx+=pd;
  const x=n=>P.l+n*(W-P.l-P.r)/(pts.length-1),y=v=>P.t+(1-(v-mn)/(mx-mn))*(H-P.t-P.b);
  let g=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${md[1]} 월별 추이">`;
  [mn,(mn+mx)/2,mx].forEach(t=>g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--grid)"/><text x="${P.l-5}" y="${y(t)+4}" text-anchor="end">${t.toFixed(md[3]?1:0)}</text>`);
  let seg=[];const segs=[];pts.forEach((p,n)=>{if(p.v===null||p.v===undefined||isNaN(p.v)){if(seg.length)segs.push(seg);seg=[]}else seg.push(`${x(n)},${y(p.v)}`)});if(seg.length)segs.push(seg);
  segs.forEach(s=>g+=`<polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${s.join(" ")}"/>`);
  pts.forEach((p,n)=>{if(n%2===1||n===pts.length-1)g+=`<text x="${x(n)}" y="${H-7}" text-anchor="middle">${p.m}월</text>`;
    if(p.v!==null&&p.v!==undefined&&!isNaN(p.v))g+=`<circle cx="${x(n)}" cy="${y(p.v)}" r="4.5" fill="${p.src==="man"?"var(--surface)":"var(--accent)"}" stroke="var(--accent)" stroke-width="2"><title>${p.y}년 ${p.m}월 · ${md[1]} ${(+p.v).toFixed(md[3])}${md[2]}${p.src==="man"?" (직접 입력)":""}</title></circle>`});
  const last=[...pts].reverse().find(p=>p.v!==null&&p.v!==undefined&&!isNaN(p.v));
  if(last){const n=pts.indexOf(last);g+=`<text class="vt" x="${x(n)}" y="${y(last.v)-9}" text-anchor="${n>pts.length-3?"end":"middle"}">${(+last.v).toFixed(md[3])}</text>`}
  return g+"</svg>";
}
function vYoY(){
  const S=ui.st,y=S.yy,mk=S.metric,md=MET.find(m=>m[0]===mk);
  const rows=[];for(let m=1;m<=12;m++){const [f,t]=monthRange(y,m),[pf,pt]=monthRange(y-1,m);const a=f<=TODAY?rangeMetrics(f,t):null,b=rangeMetrics(pf,pt);rows.push({m,a:a?a[mk]:null,b:b?b[mk]:null,as:a&&a.src,bs:b&&b.src})}
  let h=`<div class="datebar"><button type="button" data-a="yyNav" data-v="-1" aria-label="이전 해">‹</button><b>${y}년 vs ${y-1}년</b><button type="button" data-a="yyNav" data-v="1" aria-label="다음 해">›</button></div>`;
  h+=`<div class="chips">${MET.filter(m=>m[0]!=="shipKg").map(m=>`<button type="button" class="chip ${mk===m[0]?"on":""}" data-a="stMetric" data-v="${m[0]}">${m[1]}</button>`).join("")}</div>`;
  const vals=rows.flatMap(r=>[r.a,r.b]).filter(v=>v!==null&&v!==undefined&&!isNaN(v));
  if(vals.length){const W=340,H=180,P={l:34,r:8,t:12,b:24},mx=Math.max(...vals)*1.1||1,y2=v=>P.t+(1-v/mx)*(H-P.t-P.b),gw=(W-P.l-P.r)/12,bw=gw*.36;
    let g=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${md[1]} 전년 비교">`;[0,mx/2,mx].forEach(t=>g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y2(t)}" y2="${y2(t)}" stroke="var(--grid)"/><text x="${P.l-5}" y="${y2(t)+4}" text-anchor="end">${t.toFixed(md[3]?1:0)}</text>`);
    rows.forEach((r,i)=>{const cx=P.l+i*gw+gw/2;
      if(r.b!==null&&r.b!==undefined&&!isNaN(r.b))g+=`<rect x="${cx-bw-1}" y="${y2(r.b)}" width="${bw}" height="${y2(0)-y2(r.b)}" rx="2" fill="var(--muted)" opacity=".55"><title>${y-1}년 ${r.m}월 ${(+r.b).toFixed(md[3])}${md[2]}</title></rect>`;
      if(r.a!==null&&r.a!==undefined&&!isNaN(r.a))g+=`<rect x="${cx+1}" y="${y2(r.a)}" width="${bw}" height="${y2(0)-y2(r.a)}" rx="2" fill="var(--accent)"><title>${y}년 ${r.m}월 ${(+r.a).toFixed(md[3])}${md[2]}</title></rect>`;
      g+=`<text x="${cx}" y="${H-7}" text-anchor="middle">${r.m}</text>`});
    h+=`<div class="card"><h3>${md[1]} · 월별 전년 비교</h3>${g}</svg><div class="legend"><span><i style="background:var(--accent)"></i>${y}년</span><span><i style="background:var(--muted);opacity:.55"></i>${y-1}년</span></div></div>`}
  h+=`<div class="dtbl"><table><thead><tr><th>월</th><th>${y}년</th><th>${y-1}년</th><th>증감</th></tr></thead><tbody>${rows.map(r=>{const ok=v=>v!==null&&v!==undefined&&!isNaN(v);const d=ok(r.a)&&ok(r.b)?r.a-r.b:null;const good=d===null||md[4]===0||Math.abs(d)<1e-9?null:(d>0)===(md[4]>0);
    return `<tr><td>${r.m}월</td><td>${fmtV(r.a,md[3])}${r.as==="man"?"*":""}</td><td>${fmtV(r.b,md[3])}${r.bs==="man"?"*":""}</td><td class="${good===null?"":good?"dup":"ddown"}">${d===null?"-":(d>0?"▲ ":d<0?"▼ ":"")+Math.abs(d).toFixed(md[3])}</td></tr>`}).join("")}</tbody></table></div><div class="note">* 직접 입력한 값</div>`;
  return h+prevYearForm();
}
function prevYearForm(){
  const F=ui.pyf,ly=+TODAY.slice(0,4)-1;
  if(!F)return `<button class="act" type="button" data-a="pyOpen" style="justify-self:start">지난 성적 직접 입력 (앱 사용 전 기록)</button>`;
  const v=(state.prevYear||{})[F.ym]||{};
  const keys=[["far","분만복수"],["mates","교배복수"],["frate","분만율(%)"],["tot","복당 총산"],["live","복당 실산"],["wean","복당 이유"],["psy","PSY"],["msy","MSY"],["dead","폐사두수"],["ship","출하두수"]];
  return `<div class="panel"><h3 style="margin:0">지난 성적 직접 입력</h3><div class="note">한돈팜스나 기존 장부의 월별 숫자를 옮겨 넣으면 앱 기록이 없는 달의 비교에 쓰입니다.</div>
    <div class="f"><label for="pyYm">월</label><input type="month" id="pyYm" value="${F.ym}" max="${TODAY.slice(0,7)}"></div>
    <div class="pyg">${keys.map(([k,l])=>`<label>${l}<input type="number" step="0.1" inputmode="decimal" data-py="${k}" value="${v[k]??""}"></label>`).join("")}</div>
    <div class="acts"><button class="act pri" type="button" data-a="pySave">저장</button><button class="act" type="button" data-a="pyClose">닫기</button></div></div>`;
}

