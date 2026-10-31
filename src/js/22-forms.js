/* ================= 입력 양식 ================= */
// 번호 검색: 숫자 일부만 맞아도 찾음. 반환 null=불일치, 0=정확 일치, 1=일부 일치
function sowMatch(id,q){if(!q)return 1;const num=(String(id).match(/(\d+)$/)||[0,""])[1];if(+num===+q)return 0;return num.includes(q)||String(+num).includes(q)?1:null}
// 다음 모돈 번호: 올해 끝자리-(올해 번호 중 가장 큰 수 + 1). 2026년 → 6-093, 2027년 → 7-001
function nextSowId(){const p=TODAY.slice(3,4)+"-",n=Math.max(0,...state.sows.filter(s=>String(s.id).startsWith(p)).map(s=>+String(s.id).slice(p.length)||0));return p+String(n+1).padStart(3,"0")}
const feedNames=()=>[...new Set(recsOf("사료").slice().map(r=>r.data.kind))].sort();
const FORMS={
  폐사:{f:[{k:"barn",l:"돈사",t:"chips",o:BARNS,def:"분만사"},{k:"stage",l:"단계",t:"chips",o:PIG_STAGES,def:"포유자돈"},{k:"n",l:"두수",t:"step",def:1,min:1},{k:"cause",l:"원인",t:"chips",o:CAUSES,def:"원인불명"},{k:"photo",l:"사진 (선택)",t:"photo",opt:true},{k:"sow",l:"어느 복 (포유자돈 · 선택)",t:"chips",opt:true,o:()=>ui.in&&ui.in.fv.stage==="포유자돈"?activeSows().filter(s=>sowState(s.id).stage==="포유").map(s=>s.id):[]}],
    warn:(d,wd)=>{const dup=state.records.find(r=>r.id!==EXCL&&r.type==="폐사"&&r.workDate===wd&&r.data.barn===d.barn&&r.data.cause===d.cause&&r.data.stage===d.stage&&(Date.now()-new Date(r.createdAt))<10*60e3);return dup?`10분 안에 같은 돈사·단계·원인으로 입력한 기록이 있습니다 (${kTime(dup.createdAt)}, ${dup.data.n}두). 중복 입력이 아닌지 확인해 주세요.`:null}},
  교배:{sow:{multi:true,target:true,filter:(i,wd)=>i.key==="후보"||i.key==="발정대기"||i.key==="재발공태"||(i.gilt&&i.key==="후보")||(i.stage==="교배"&&diff(i.mate,wd)<=2)},
    f:[{k:"round",l:"회차",t:"chips",o:["1차","2차","3차"],def:"1차"},{k:"semen",l:"웅돈 / 정액",t:"chips",o:()=>SEMENS,def:"듀록 정액"}],
    warn:(d,wd,s)=>{const i=sowState(s);if(d.round==="1차"&&i.stage==="교배"&&diff(i.mate,wd)<=3)return `${s}번은 ${kDate(i.mate)}에 이미 1차 교배 기록이 있습니다. 2차·3차라면 회차를 바꿔 주세요.`;return null}},
  임신확인:{sow:{multi:true,target:true,filter:(i,wd)=>i.stage==="교배"&&diff(i.mate,wd)>=CFG.returnCheck[0]},
    f:[{k:"result",l:"결과",t:"chips",o:["임신","재발","공태","유산"],def:"임신"}]},
  분만:{sow:{multi:false,target:true,filter:(i,wd)=>(i.stage==="임신"||i.stage==="교배")&&diff(i.mate,wd)>=CFG.gest-10},
    f:[{k:"live",l:"실산",t:"step",def:12,min:0},{k:"still",l:"사산",t:"step",def:0,min:0},{k:"mum",l:"미라",t:"step",def:0,min:0},{k:"_t",t:"calc",l:"총산 (자동)",calc:d=>(+d.live||0)+(+d.still||0)+(+d.mum||0)},{k:"_dys",t:"calc",l:"난산 판정 (자동)",calc:d=>(+d.still||0)>=stillDys()?`⚠ ${t("사산")} ${d.still}${t("두")} → ${t("난산으로 기록")}`:`${t("사산")} ${stillDys()}${t("두 이상이면 난산")}`},{k:"ease",l:"분만 상태 (선택)",t:"chips",opt:true,o:["정상","난산","조력 분만"]},{k:"oxy",l:"옥시토신 (선택)",t:"chips",opt:true,o:["안 씀","씀"]},{k:"start",l:"분만 시작 시각 (선택)",t:"text",opt:true,ph:"예: 03:20"}],
    warn:(d,wd,s)=>{const i=sowState(s);if(i.mate){const g=diff(i.mate,wd);if(g<108||g>120)return `${s}번은 교배 후 ${g}일째입니다. 보통 ${CFG.gest}일 전후에 분만합니다.`}
      if(d.live+d.still+d.mum>22)return "총산이 22두를 넘습니다. 숫자를 확인해 주세요.";return null},
    pre:d=>{if((+d.still||0)>=stillDys()&&(!d.ease||d.ease==="정상")){d.ease="난산";d.dysAuto=true}}},   // 사산 많으면 자동 난산(기준 82 stillDys)
  이유:{sow:{multi:false,target:true,filter:(i,wd)=>i.stage==="포유"&&diff(i.farrow,wd||TODAY)>=CFG.weanDay-7},
    f:[{k:"n",l:"이유두수",t:"step",def:11,min:0},{k:"_to",l:"자돈 옮길 곳 (같이 기록)",t:"chips",o:()=>["그대로",...BARNS.filter(b=>b!=="분만사")],def:"인큐베이터"},{k:"_loc",l:"모돈 옮길 곳 (같이 기록)",t:"chips",o:()=>["그대로",...SOW_LOCS.filter(b=>b!=="분만사")],def:"교배사"},{k:"_d",t:"calc",l:"포유일수 (자동)",calc:(d,wd,s)=>{const i=s?sowState(s):null;return i&&i.farrow?diff(i.farrow,wd)+"일":"-"}}],
    warn:(d,wd,s)=>{const i=sowState(s);if(i.stage!=="포유")return `${s}번은 지금 포유 중이 아닙니다(${t(statusOf(state.sows.find(x=>x.id===s)).label)}). 그래도 이유로 기록할까요?`;if(i.live&&d.n>i.live+(i.foster||0)+2)return `${s}번은 실산 ${i.live}두인데 이유두수가 ${d.n}두입니다. 양자를 받았다면 그대로 저장하세요.`;return null},
    pre:(d,wd,s)=>{const i=sowState(s);d.days=i.farrow?diff(i.farrow,wd):0}},
  백신:{sow:{multi:true,target:false,filter:()=>true},
    f:[{k:"kind",l:"구분",t:"chips",o:["백신","투약","구충"],def:"백신"},{k:"name",l:"백신·약품",t:"chips",o:()=>[...FARM.vax.late.map(v=>v.name),...FARM.vax.gilt.map(v=>v.name),...FARM.vax.annual.map(v=>v.name),"기타"],def:FARM.vax.late[0].name},{k:"memo",l:"메모 (선택)",t:"text",opt:true,ph:"예: 2차 접종"}]},
  이동:{f:[{k:"from",l:"출발 돈사",t:"chips",o:BARNS,def:"분만사"},{k:"to",l:"도착 돈사",t:"chips",o:BARNS,def:"인큐베이터"},{k:"n",l:"두수",t:"step",def:100,min:1,big:10}],
    warn:d=>d.from===d.to?"출발과 도착 돈사가 같습니다.":null},
  출하:{f:[{k:"barn",l:"출하 돈사",t:"chips",o:()=>{const f=BARNS.filter(b=>b.includes("비육"));return f.length?f:BARNS},def:"육성비육사"},{k:"n",l:"출하두수",t:"step",def:20,min:1},{k:"kg",l:"출하 평균체중 (kg)",t:"step",def:115,min:60},{k:"dest",l:"출하처",t:"chips",o:()=>DESTS,def:"○○도축장"},{k:"carc",l:"도체중 붙여넣기 (선택 · 나중에 도축장 성적이 나오면)",t:"textarea",opt:true}],
    warn:(d,wd)=>{const w=recsOf("약품").find(r=>r.data.barn===d.barn&&r.data.withdraw&&r.data.withdraw>wd);return w?`${d.barn}은 휴약 중입니다 (종료 ${kDate(w.data.withdraw)}). 출하해도 되는지 확인해 주세요.`:null}},
  사료:{f:[{k:"kind",l:"사료",t:"chips",o:()=>feedKinds(),def:FARM.feed.bins[0].feed},{k:"mode",l:"구분",t:"chips",o:["입고","빈 잔량"],def:"입고"},{k:"_lvl",l:"눈대중 (누르면 kg 자동)",t:"chips",opt:true,o:()=>{const k=ui.in&&ui.in.fv.kind;return feedBin(k)?["¼","½","¾","가득"]:["1포","5포","10포","20포","40포"]}},{k:"kg",l:"수량 (kg)",t:"step",def:5000,min:0,big:500}]},
  약품:{f:[{k:"kind",l:"구분",t:"chips",o:()=>CATS.filter(c=>c!=="백신"&&c!=="정액"),def:"항생제"},{k:"name",l:"품목 (약품·재고 탭에서 추가)",t:"chips",o:()=>itemNames(ui.in?ui.in.fv.kind:"항생제")},{k:"barn",l:"대상 돈사",t:"chips",o:BARNS,def:"육성비육사"},{k:"qty",l:"사용량",t:"step",def:1,min:0},{k:"withdraw",l:"휴약 종료일 (항생제 · 자동 제안)",t:"date",opt:true}]},
  BCS:{sow:{multi:false,target:false,filter:()=>true},f:[{k:"score",l:"BCS 점수",t:"chips",o:["1","1.5","2","2.5","3","3.5","4","4.5","5"],def:"3"},{k:"when",l:"측정 시점",t:"chips",o:["교배 시","임신 중","분만 시","이유 시","기타"],def:"임신 중"},{k:"memo",l:"메모 (선택)",t:"text",opt:true}]},
  돈군백신:{f:[{k:"batch",l:"돈군",t:"chips",o:()=>liveBatches().map(b=>[b.k,`${bName(b.k)} · ${bAge(b)}주령`])},{k:"vax",l:"백신",t:"chips",o:()=>state.cfg.prog.map(p=>p.name)},{k:"_v",t:"calc",l:"추정 두수 / 이미 접종",calc:d=>{const b=batches().find(x=>x.k===d.batch),p=state.cfg.prog.find(x=>x.name===d.vax);if(!b||!p)return "-";const v=bVax(b,p);return `${v.need} / ${v.done}두`}},{k:"n",l:"이번에 접종한 두수",t:"step",def:0,min:0,big:10},{k:"lot",l:"제조번호 (선택)",t:"text",opt:true}],
    pre:d=>{d.prod=(state.cfg.prog.find(p=>p.name===d.vax)||{}).prod},
    warn:d=>{const b=batches().find(x=>x.k===d.batch),p=state.cfg.prog.find(x=>x.name===d.vax);if(b&&p){const v=bVax(b,p),left=Math.max(v.need-v.done,0);if(d.n>left+10)return `추정 남은 두수(${left}두)보다 많습니다. 숫자를 확인해 주세요.`;if(d.n<=0)return "접종 두수가 0입니다."}return null}},
  재고:{f:[{k:"item",l:"품목",t:"chips",o:()=>state.items.filter(i=>!i.hidden).map(i=>[i.id,i.name])},{k:"mode",l:"구분",t:"chips",o:["입고","사용","실사"],def:"입고"},{k:"qty",l:"수량 (실사는 실제로 센 수량)",t:"step",def:10,min:0},{k:"memo",l:"메모 (선택)",t:"text",opt:true}]},
  특이사항:{f:[{k:"barn",l:"돈사",t:"chips",o:BARNS,def:"분만사"},{k:"text",l:"내용",t:"textarea",ph:"예: 2번 환풍기 소음, 급수기 누수"},{k:"photo",l:"사진 (선택)",t:"photo",opt:true}]},
  도입:{f:[{k:"sowid",l:"후보돈 번호 (다음 번호 자동)",t:"text",ph:"예: 6-093",def:()=>nextSowId()},{k:"breed",l:"품종",t:"chips",o:["LY","LYD","YL","기타"],def:FARM.breed},{k:"age",l:"도입 일령",t:"step",def:180,min:30,big:10}],
    err:d=>state.sows.some(s=>s.id===String(d.sowid).trim())?`${d.sowid}번은 이미 있는 번호입니다.`:null}
};

