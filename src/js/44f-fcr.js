/* ===== 사료효율 FCR (성적 카드 · 현황판 칸 · 누르면 상세) =====
   돈군 FCR = 태어나서 출하까지 먹은 사료(두수 × 주령별 섭취량 × 학습 보정) ÷ (출하 생체중 합 − 태어날 때 체중)
   농장 FCR = 기간 실제 사료(입고 − 재고 변화, 모돈 포함) ÷ (출하 생체중 + 재고 돼지 체중 변화)
   출하 체중: 도축장 평균 → 나중에 도체중 붙여넣으면 도체중 ÷ 도체율. 재고 돼지 체중은 주령 성장 곡선을 출하 체중으로 보정 */
const GROW=[1.5,2.5,4,5.8,7.5,9.5,12,14.5,17.5,21,25,29,33,37.5,42,47,52,57,62,67,72,78,84,90,96,102,108];   // 0~26주령 kg
const dress=()=>state.dress||FARM.dress;
function carcList(r){return String(r.data.carc||"").split(/[^0-9.]+/).map(Number).filter(v=>v>=40&&v<=200)}
function shipLive(r){const c=carcList(r);return c.length?{n:c.length,kg:c.reduce((a,b)=>a+b,0)/dress(),src:"carc",avgC:c.reduce((a,b)=>a+b,0)/c.length}:{n:r.data.n,kg:r.data.n*r.data.kg,src:"avg"}}
const shipsReal=()=>state.records.filter(r=>r.type==="출하"&&!r.data.bulk).sort((a,b)=>a.workDate.localeCompare(b.workDate));
// 출하 → 돈군: 그날 출하 일령 ±6주 안의 돈군 중 가장 나이 많고 아직 다 안 나간 돈군
let FCX={};
function shipMap(){const k=state.records.length;if(FCX.k===k)return FCX;const B=batches(),sa=shipAge(),left={},map={};B.forEach(b=>left[b.k]=bHeads(b,sa));
  shipsReal().forEach(r=>{const c=B.filter(b=>{const w=diff(b.k,r.workDate)/7;return w>=sa-6&&w<=sa+6&&left[b.k]>0}).sort((a,b)=>a.k.localeCompare(b.k))[0];if(!c)return;const n=shipLive(r).n;left[c.k]-=n;(map[c.k]=map[c.k]||[]).push(r)});
  FCX={k,map};return FCX}
function growCal(){const S=shipsReal().slice(-10);if(!S.length)return 1;const sa=shipAge(),avg=S.reduce((a,r)=>a+shipLive(r).kg,0)/S.reduce((a,r)=>a+shipLive(r).n,0);return Math.max(.8,Math.min(1.25,avg/GROW[Math.min(GROW.length-1,sa)]))}
const growKg=w=>{const c=growCal(),g=GROW[Math.max(0,Math.min(GROW.length-1,w))];return w>=10?g*c:g};
// 돈군이 날짜 end까지 먹은 사료 kg (출하해 나간 두수는 뺌)
function batchFeed(b,end){const I=fIntake(),F={};let kg=0;
  for(let d=b.k;d<=end;d=addDays(d,1)){const age=diff(b.k,d),w=Math.floor(age/7),n=bHeads(b,w);if(!n)continue;
    const fs=pigFeeds(age);if(!fs.length)continue;const per=(I.pig[Math.min(I.pig.length-1,w)]||0)/fs.length;fs.forEach(p=>{const f=F[p.feed]??(F[p.feed]=feedFactor(p.feed));kg+=n*per*f})}
  return kg}
function batchFCR(){const M=shipMap().map;return Object.entries(M).map(([k,R])=>{const b=batches().find(x=>x.k===k);if(!b)return null;const L=R.map(shipLive),n=L.reduce((a,x)=>a+x.n,0),live=L.reduce((a,x)=>a+x.kg,0),end=R[R.length-1].workDate,mid=addDays(b.k,Math.round(R.reduce((a,r,i)=>a+diff(b.k,r.workDate)*L[i].n,0)/n)),hs=bHeads(b,Math.floor(diff(b.k,mid)/7))||n,
    feed=batchFeed(b,mid)*n/hs,gain=live-n*FARM.birthKg;   // 출하된 두수 몫(폐사돈이 먹은 사료 포함)만
  return {k,b,n,born:b.live,live,avg:live/n,feed,perHead:feed/n,fcr:gain>0?feed/gain:null,carc:L.some(x=>x.src==="carc"),end,days:diff(k,end)}}).filter(Boolean).sort((a,b)=>b.end.localeCompare(a.end))}
// 농장 전체
function invKg(d){return batches().reduce((a,b)=>{const age=diff(b.k,d);if(age<0||age>=shipAge()*7+42)return a;const w=Math.floor(age/7),out=(shipMap().map[b.k]||[]).filter(r=>r.workDate<=d).reduce((x,r)=>x+shipLive(r).n,0);return a+Math.max(0,bHeads(b,w)-out)*growKg(w)},0)}
function stockAt(f,d){const R=state.records.filter(r=>r.type==="사료"&&r.data.kind===f&&r.workDate<=d&&(r.data.mode==="빈 잔량"||r.data.mode==="잔량")).sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""))[0];if(!R)return null;
  const inn=state.records.filter(r=>r.type==="사료"&&r.data.kind===f&&r.data.mode==="입고"&&r.createdAt>R.createdAt&&r.workDate<=d).reduce((a,r)=>a+r.data.kg,0);let use=0;const M=rawPast();for(let x=R.workDate;x<d;x=addDays(x,1))use+=((M[x]||{})[f]||0)*feedFactor(f);return Math.max(0,R.data.kg+inn-use)}
function farmFCR(f,t2){const F=feedKinds();let feed=0;for(const k of F){const inn=state.records.filter(r=>r.type==="사료"&&r.data.kind===k&&r.data.mode==="입고"&&r.workDate>f&&r.workDate<=t2).reduce((a,r)=>a+r.data.kg,0),s0=stockAt(k,f),s1=stockAt(k,t2);feed+=inn+(s0!=null&&s1!=null?s0-s1:0)}
  const live=shipsReal().filter(r=>r.workDate>f&&r.workDate<=t2).reduce((a,r)=>a+shipLive(r).kg,0),dInv=invKg(t2)-invKg(f),gain=live+dInv;return gain>0?{fcr:feed/gain,feed,live,dInv}:null}
function fcrCard(){const P=statPeriod(),t2=P.t>TODAY?TODAY:P.t,f=diff(P.f,t2)<55?addDays(t2,-55):P.f,F=farmFCR(f,t2),B=batchFCR().filter(x=>x.fcr),g=sGoal(),b5=B.slice(0,5),bAvg=b5.length?b5.reduce((a,x)=>a+x.feed,0)/b5.reduce((a,x)=>a+x.live-x.n*FARM.birthKg,0):null;
  const col=(v,gl)=>!okv(v)?"var(--muted)":v<=gl?"var(--good)":v<=gl*1.08?"var(--amber)":"var(--red)";
  return `<div class="card"><h3>${t("사료효율 (FCR)")}<small>${t("사료 kg ÷ 늘어난 체중 kg · 낮을수록 좋음")}</small></h3><div class="fcr2"><div><small>${t("농장 전체")} <i>${t("모돈 포함")}</i></small><b style="color:${col(F&&F.fcr,g.fcr)}">${F?F.fcr.toFixed(2):"—"}</b><span>${t("목표")} ${g.fcr} · ${kDate(f)}~</span></div><div><small>${t("돈군 (태어나서 출하까지)")}</small><b style="color:${col(bAvg,g.fcrB)}">${bAvg?bAvg.toFixed(2):"—"}</b><span>${t("목표")} ${g.fcrB} · ${t("최근")} ${b5.length}${t("개 돈군")}</span></div></div>
  ${b5.length?hbarsH(b5.map(x=>({l:bName(x.k).replace(" 돈군",""),v:x.fcr,txt:`${x.fcr.toFixed(2)} · ${Math.round(x.avg)}kg${x.carc?" ✓":""}`,c:col(x.fcr,g.fcrB)}))):`<div class="empty">${t("출하 기록이 쌓이면 표시합니다.")}</div>`}</div>`}
function fcrDetail(){const B=batchFCR(),g=sGoal(),M=cdMonths(12),pts=M.map(([y,m])=>{const [f,t2]=monthRange(y,m);if(t2>TODAY)return null;const r=farmFCR(addDays(t2,-90),t2);return r?r.fcr:null});   // 점마다 그 달 말까지 최근 90일 (입고 시기에 따른 출렁임 줄임)
  return linesSvg({title:"FCR",labels:M.map(([y,m])=>m+t("월")),dp:2,series:[{l:t("농장 전체 (90일)"),v:pts,c:CC.a}],goals:[{l:t("목표")+" "+g.fcr,v:g.fcr,c:"var(--good)"}]})+
    `<div class="sec-t">${t("돈군별")} <span>${t("✓ = 도체중으로 계산")}</span></div>`+cdTable(["돈군","출하 마친 날","출하 두수","평균 생체중","두당 사료","FCR","일령"],B.map(x=>[esc(bName(x.k)),kDate(x.end),`${x.n} / ${x.born}`,`${x.avg.toFixed(1)}kg${x.carc?" ✓":""}`,`${Math.round(x.perHead)}kg`,x.fcr?`<b>${x.fcr.toFixed(2)}</b>`:"-",x.days+t("일")]))+
    `<div class="note">${t("두당 사료는 학습 보정이 곱해진 예측 사용량입니다. 매일 사료 잔량을 기록할수록 정확해집니다. 출하 기록에 도체중을 붙여넣으면 생체중 = 도체중 ÷ 도체율")} ${Math.round(dress()*100)}%.</div>`}
