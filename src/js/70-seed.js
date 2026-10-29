/* ================= v0.3 · 우리 농장 초기값 ================= */
function baseState(){
  return {accounts:[{id:"a1",name:"대표",role:"admin",pin:"9368",lang:"ko",active:true},{id:"a2",name:"조성훈 팀장",role:"leader",pin:"1234",lang:"ko",active:true},{id:"a3",name:"Nguyen",role:"worker",pin:"1111",lang:"vi",active:true},{id:"a4",name:"Ram",role:"worker",pin:"2222",lang:"ne",active:true},{id:"a5",name:"Sokha",role:"worker",pin:"3333",lang:"km",active:true},{id:"a6",name:"Somchai",role:"worker",pin:"4444",lang:"th",active:true}],
    labels:{nav:{},quick:{},hide:{}},dayDec:{},mbatches:[],
    cfg:{stage:FARM.stage.map(x=>x.slice()),prog:FARM.vax.piglet.map(p=>({...p})),semenPerSow:FARM.semen.perSow,deadOne:3,deadDay:3}};
}
const ITEM_DEF=()=>FARM.items.map(([name,cat,unit,par,withdraw],i)=>({id:"i"+(i+1),name,cat,unit,par,withdraw}));
const FARM_LISTS=()=>({barns:mkList(FARM.barns),causes:mkList(["압사","설사·소화기","호흡기","허약","외상","원인불명","기타"]),actions:mkList(["보온 확인","환기 점검","전해질 급여","초유·젖 확인","격리","소독","분만틀·보온등 점검","수의사 연락","부검·시료 채취","투약","재확인"]),semens:mkList(["듀록 정액","요크셔 정액","랜드레이스 정액","자연교배"]),dests:mkList(["○○도축장","△△공판장"]),cull:mkList(["번식장애(재발·공태)","산자수 저조","지제·다리 불량","노산","질병","기타"])});
function seedFarm(){
  let r=5;const rnd=()=>(r=(r*16807)%2147483647)/2147483647,ri=(a,b)=>a+Math.floor(rnd()*(b-a+1)),pick=a=>a[ri(0,a.length-1)];
  const H0=addDays(TODAY,-548),TAKE=addDays(TODAY,-14),G=CFG.gest,wk0=weekStart(TODAY),recs=[],sows=[];
  const USERS=["대표","조성훈 팀장","Nguyen","Ram","Sokha","Somchai"];
  const at=wd=>{const t0=new Date(toUTC(wd));const t=new Date(t0.getUTCFullYear(),t0.getUTCMonth(),t0.getUTCDate(),ri(7,17),ri(0,59));const now=new Date();return (t>now?new Date(now.getTime()-ri(5,90)*60e3):t).toISOString()};
  const add=(type,wd,data)=>{if(wd<H0||wd>TODAY)return null;const x={id:newId(),type,workDate:wd,createdAt:at(wd),user:pick(USERS),data};recs.push(x);return x};
  const fBarn=d=>"분만사";
  const deaths={};                       // "날짜|돈사|단계|원인" → 두수
  const dead=(wd,barn,stage,cause,n=1)=>{if(wd<H0||wd>TODAY)return;const k=`${wd}|${barn}|${stage}|${cause}`;deaths[k]=(deaths[k]||0)+n};
  const litterDeaths=(F,lost,days)=>{for(let i=0;i<lost;i++){const d=Math.min(days,Math.floor(rnd()*rnd()*days));const c=rnd();dead(addDays(F,d),fBarn(F),"포유자돈",c<.4?"압사":c<.65?"허약":c<.9?"설사·소화기":"원인불명")}};
  const farrow=(id,F,weanDays)=>{const live=ri(10,14);add("분만",F,{sow:id,live,still:rnd()<.45?ri(1,2):0,mum:rnd()<.15?1:0});
    const lost=Math.max(0,Math.round(live*(.06+rnd()*.06)));
    if(weanDays!==null){const W=addDays(F,weanDays);litterDeaths(F,lost,weanDays-1);add("이유",W,{sow:id,n:live-lost,days:weanDays});add("BCS",W,{sow:id,score:pick(["2.5","2.5","3","3","3.5"]),when:"이유 시"})}
    else{const sofar=diff(F,TODAY);litterDeaths(F,Math.round(lost*Math.min(1,sofar/26)),Math.max(0,sofar))}
    return live};
  const mate=(id,M,ok=true)=>{add("교배",M,{sow:id,round:"1차",semen:"듀록 정액"});add("교배",addDays(M,1),{sow:id,round:"2차",semen:"듀록 정액"});
    if(ok){if(diff(M,TODAY)>=28)add("임신확인",addDays(M,28),{sow:id,result:"임신"});FARM.vax.late.forEach(v=>add("백신",addDays(M,G-v.wk*7+ri(-1,1)),{sow:id,kind:"백신",name:v.name}));if(diff(M,TODAY)>=60)add("BCS",addDays(M,60),{sow:id,score:pick(["3","3","3.5","3.5","4"]),when:"임신 중"})}};
  // 이전 생산 주기를 거꾸로 만든다 (M = 이번 주기 교배일)
  const cycleBack=(id,M)=>{let m=M;for(let n=0;n<6;n++){
    const W=addDays(m,-ri(4,8)),wd=ri(26,28),F=addDays(W,-wd);if(F<addDays(H0,-40))break;
    farrow(id,F,wd);let Mp=addDays(F,-G);
    if(rnd()<.12){mate(id,addDays(Mp,-21),false);add("임신확인",Mp,{sow:id,result:"재발"});Mp=addDays(Mp,-21)}else if(rnd()<.05){mate(id,addDays(Mp,-40),false);add("임신확인",addDays(Mp,-12),{sow:id,result:"공태"});Mp=addDays(Mp,-40)}
    mate(id,Mp,true);m=Mp;if(Mp<H0)break}};
  let no=1;const mk=loc=>{const bp=ri(0,5),id=FARM.sowPrefix+String(no++).padStart(3,"0");sows.push({id,baseParity:bp,loc,breed:FARM.breed});return id};
  // 분만사 30 = 분만 대기 8 + 포유 16 + 이유 직후 2 + 분만사에서 교배 4
  for(let k=0;k<8;k++){const id=mk("분만사"),M=addDays(TODAY,-(100+Math.round(k*13/7)+ri(0,1)));mate(id,M);cycleBack(id,M)}
  for(let w=0;w<4;w++)for(let k=0;k<4;k++){const back=diff(wk0,TODAY);const F=addDays(wk0,-7*w+(w===0?ri(0,back):ri(0,6)));if(F>TODAY)continue;
    const id=mk("분만사"),M=addDays(F,-G);mate(id,M);farrow(id,F,null);cycleBack(id,M)}
  for(let k=0;k<2;k++){const id=mk("분만사"),W=addDays(TODAY,-ri(0,2)),F=addDays(W,-28),M=addDays(F,-G);mate(id,M);farrow(id,F,28);cycleBack(id,M)}
  for(let k=0;k<4;k++){const id=mk("분만사"),M=addDays(TODAY,-(3+k*5+ri(0,2)));mate(id,M,false);cycleBack(id,M)}
  // 임신사 40 (교배 30~99일)
  for(let w=0;w<10;w++)for(let k=0;k<4;k++){const id=mk(w<5?"임신사 1동":"임신사 2동"),M=addDays(TODAY,-(30+7*w+Math.round(k*7/4)));mate(id,M);cycleBack(id,M)}
  // 교배사 22 = 이유 후 대기 3 + 교배 후 확인 전 15 + 재발 3 + 공태 1
  for(let k=0;k<3;k++){const id=mk("교배사"),W=addDays(TODAY,-(2+k)),F=addDays(W,-28),M=addDays(F,-G);mate(id,M);farrow(id,F,28);cycleBack(id,M)}
  for(let k=0;k<15;k++){const id=mk("교배사"),M=addDays(TODAY,-Math.round(k*25/15));mate(id,M,false);cycleBack(id,M)}
  for(let k=0;k<4;k++){const id=mk("교배사"),M=addDays(TODAY,-ri(26,40));mate(id,M,false);add("임신확인",addDays(M,ri(19,24)),{sow:id,result:k<3?"재발":"공태"});cycleBack(id,M)}
  // 이유 날짜가 미래가 되지 않게 · 확인 전 모돈의 미래 백신 제거
  for(let i=recs.length-1;i>=0;i--)if(recs[i].workDate>TODAY)recs.splice(i,1);
  // 돈군: 분만 주차별로 이동 · 폐사 · 출하. W33 이전 돈군은 전 주인 시절(정상 출하 → 인수 때 일괄 판매)
  const cut=addDays(wk0,-7*11),SH=26;
  const byW={};recs.filter(x=>x.type==="분만").forEach(f=>{const k=weekStart(f.workDate);(byW[k]=byW[k]||[]).push(f)});
  const bulk={};
  Object.keys(byW).sort().forEach(k=>{
    const wn=recs.filter(x=>x.type==="이유"&&byW[k].some(f=>f.data.sow===x.data.sow&&x.workDate>f.workDate&&diff(f.workDate,x.workDate)<=30));
    let n=wn.reduce((s,x)=>s+x.data.n,0);if(!n)return;
    const old=k<cut,ship=addDays(k,SH*7+ri(0,4)),end=old?(ship<=TAKE?ship:TAKE):TODAY;
    const fb="육성비육사";
    const phase=[[28,42,"인큐베이터","이유자돈",.02,["설사·소화기","설사·소화기","허약","원인불명"]],[42,70,"자돈사","이유자돈",.015,["설사·소화기","호흡기","허약","원인불명"]],[70,112,"군사방","육성돈",.015,["호흡기","호흡기","외상","원인불명"]],[112,SH*7,fb,"비육돈",.015,["호흡기","외상","원인불명","기타"]]];
    let from=fBarn(k);
    for(const [a,b,barn,stage,rate,causes] of phase){const mv=addDays(k,a+ri(0,1));if(mv>end)break;add("이동",mv,{from,to:barn,n});from=barn;
      const nl=Math.round(n*(rate*.7+rnd()*rate*.6));for(let q=0;q<nl;q++){const d=addDays(k,ri(a+1,b-1));if(d<end){dead(d,barn,stage,pick(causes));n--}}}
    if(!old)return;
    if(ship<=TAKE)add("출하",ship,{barn:fb,n,kg:ri(113,119),dest:rnd()<.8?"○○도축장":"△△공판장"});
    else{const age=diff(k,TAKE),bb=age<42?"인큐베이터":age<70?"자돈사":age<112?"군사방":fb;(bulk[bb]=bulk[bb]||{n:0,w:0});bulk[bb].n+=n;bulk[bb].w+=n*Math.max(25,Math.round(age*.62))}
  });
  Object.entries(bulk).forEach(([barn,v])=>add("출하",TAKE,{barn,n:v.n,kg:Math.round(v.w/v.n),dest:"△△공판장 (인수 시 일괄 판매)",bulk:true}));
  add("특이사항",TAKE,{barn:"육성비육사",text:"농장 인수 · 전 주인이 육성·비육돈 일괄 판매. 육성비육사 비어 있음"});
  // 폐사 기록 (같은 날·돈사·단계·원인은 한 건으로)
  Object.entries(deaths).forEach(([k,n])=>{const [wd,barn,stage,cause]=k.split("|");add("폐사",wd,{barn,stage,n,cause})});
  // 사료 입고 · 약품
  const FK=[...FARM.feed.bins.map(b=>[b.feed,3000,7000]),...FARM.feed.bags.map(b=>[b.feed,200,600])];
  for(let d=548;d>=11;d-=ri(2,4)){const f=pick(FK);add("사료",addDays(TODAY,-d),{kind:f[0],mode:"입고",kg:Math.round(ri(f[1],f[2])/100)*100})}
  [[60,"설사 항생제","분만사"],[38,"호흡기 항생제","자돈사"],[17,"설사 항생제","인큐베이터"]].forEach(([d,name,barn])=>add("약품",addDays(TODAY,-d),{kind:"항생제",name,barn,qty:ri(1,2),withdraw:addDays(TODAY,-d+21)}));
  const B=baseState();
  const prevYear={};for(let y=+H0.slice(0,4)-1;y<=+H0.slice(0,4);y++)for(let m=1;m<=12;m++){if(`${y}-${pad(m)}`>=H0.slice(0,7))break;const far=ri(16,18);
    prevYear[`${y}-${pad(m)}`]={far,mates:ri(18,20),frate:ri(84,89),tot:+(13.2+rnd()*.8).toFixed(1),live:+(12+rnd()*.8).toFixed(1),wean:+(10.9+rnd()*.7).toFixed(1),surv:ri(89,92),psy:+(24+rnd()*2).toFixed(1),msy:+(21+rnd()*2).toFixed(1),dead:ri(60,90),ship:ri(160,190),shipKg:ri(115,118)}}
  return {v:7,user:"대표",sows,records:recs,zero:{},todoLog:{},tasks:[],cfgSt:{...CFG.st},items:ITEM_DEF(),prevYear,memo:{},assign:{},lists:FARM_LISTS(),startDate:H0,batchCut:cut,takeover:TAKE,...B,mbatches:[4,5,6,7,8,9,10,11].map(w=>({k:addDays(wk0,-7*w),age:w,n:50,litters:4,note:"인수 시 실사"}))};
}
function seedFarmPost(){
  const USERS=["대표","조성훈 팀장","Nguyen","Ram"];let u=0;
  const at=wd=>new Date(toUTC(wd)+(9+(u%6))*36e5).toISOString();
  // 지난 돈군 백신 (이번 주 예정분은 남겨 둠)
  batches().filter(b=>b.k>=addDays(state.startDate,-40)).forEach(b=>state.cfg.prog.forEach(p=>{const due=addDays(b.k,p.day),end=b.k<state.batchCut?state.takeover:TODAY;if(due>=weekStart(TODAY)||due>end||due<state.startDate)return;const wd=addDays(due,2);
    state.records.push({id:newId(),type:"돈군백신",workDate:wd,createdAt:at(wd),user:USERS[u++%4],data:{batch:b.k,vax:p.name,prod:p.prod,n:bVax(b,p).need}})}));
  // 복별 처치: 어제까지 할 것은 체크 완료로
  activeSows().forEach(s=>{const i=statusOf(s);if(i.stage!=="포유")return;FARM.vax.litter.forEach(v=>{const on=addDays(i.farrow,v.day);if(on<TODAY)state.todoLog[tdKey("lit",`${s.id}|${i.farrow}|${v.day}`)]={memo:"",user:USERS[u++%4],at:at(on),rec:null}})});
  // 지난 폐사는 판단 완료로
  state.records.forEach(x=>{if(x.type==="폐사"&&x.workDate<TODAY&&x.data.n>=state.cfg.deadOne)x.data.decision="none"});
  const g={};state.records.filter(x=>x.type==="폐사"&&x.workDate<TODAY).forEach(x=>{const k=x.workDate+"|"+x.data.barn;g[k]=(g[k]||0)+x.data.n});
  Object.entries(g).forEach(([k,n])=>{if(n>=state.cfg.deadDay)state.dayDec[k]={decision:"none",total:n,at:new Date().toISOString(),user:"조성훈 팀장"}});
  // 매일 마감: 기록 없는 항목은 ‘오늘 없음’
  const has=new Set(state.records.map(x=>x.type+"|"+x.workDate));
  for(let d=addDays(TODAY,-1);d>=state.startDate;d=addDays(d,-1)){DAILY.forEach(t2=>{if(!has.has(t2+"|"+d))(state.zero[d]=state.zero[d]||{})[t2]=true})}
  // 재고: 30일 전 실사 + 입고
  const q={},d30=addDays(TODAY,-30),d12=addDays(TODAY,-12);
  state.items.forEach((it,i)=>{q[it.id]=Math.round(it.par*(i%5===3?.9:1.6+(i%3)*.4))+(it.cat==="백신"?it.par:0);state.records.push({id:newId(),type:"재고",workDate:d30,createdAt:at(d30),user:"대표",data:{item:it.id,mode:"실사",qty:q[it.id]}})});
  [[itemId("FMD(구제역)"),200],[itemId("마이코·글레서"),200],[itemId("듀록 정액"),40],[itemId("대장균+TR"),40]].forEach(([id,qty])=>state.records.push({id:newId(),type:"재고",workDate:d12,createdAt:at(d12),user:"조성훈 팀장",data:{item:id,mode:"입고",qty}}));
  // 사료: 10일 전 잔량 + 이후 입고 (2호·임신모돈은 주문 시점이 되게)
  const fu=feedUse(),d10=addDays(TODAY,-10),d5=addDays(TODAY,-5);
  feedKinds().forEach((f,i)=>{const use=fu[f]||0;if(!use)return;const low=f==="2호"||f==="임신모돈";
    state.records.push({id:newId(),type:"사료",workDate:d10,createdAt:at(d10),user:"조성훈 팀장",data:{kind:f,mode:"빈 잔량",kg:Math.max(100,Math.round(use*(low?13:9+i%4)/10)*10)}});
    if(!low)state.records.push({id:newId(),type:"사료",workDate:d5,createdAt:at(d5),user:"조성훈 팀장",data:{kind:f,mode:"입고",kg:Math.max(200,Math.round(use*10/100)*100)}})});
  // 오늘 아침 점검: 앞의 5곳 완료, 분만사 보온등 이상
  state.am={[TODAY]:{}};
  // 지난 7일 아침 점검 (급수량 평균용)
  for(let i=1;i<=7;i++){const d=addDays(TODAY,-i);state.am[d]={};FARM.morning.route.forEach((r,n)=>{state.am[d][r.barn]={time:"07:20",temp:String((r.temp[0]+r.temp[1])/2),water:String((2+n*.6+((i*7+n)%5)*.1).toFixed(1)),bad:[],memo:"",user:"조성훈 팀장",at:at(d)}})}FARM.morning.route.slice(0,5).forEach((r,n)=>{state.am[TODAY][r.barn]={time:`07:${pad(10+n*9)}`,temp:String((r.temp[0]+r.temp[1])/2+(n===3?-3:0)),bad:n===3?["보온등"]:[],memo:n===3?"보온등 1개 나감 → 교체 예정":"",user:"조성훈 팀장",at:at(TODAY)}});
  // 육성비육사 첫 입식 준비 할 일
  const oldest=liveBatches().slice(-1)[0],now=new Date().toISOString();
  if(oldest){const fin=addDays(oldest.k,state.cfg.stage.slice(0,-1).reduce((a,x)=>a+x[1],0)*7);
    state.tasks.push({id:newId(),src:null,title:"육성비육사 청소·소독·급이·급수 점검 (첫 입식 준비)",acts:["소독","환기 점검"],due:addDays(fin,-3),who:"조성훈 팀장",memo:`첫 입식 ${kDate(fin)} 주 · 육성비육사 비어 있음`,createdAt:now,user:"대표"})}
}
function upgradeDemo(st){const B=baseState();Object.assign(st,{v:7,lists:{barns:mkList(["교배사","임신사 1동","임신사 2동","분만사 1동","분만사 2동","자돈사 1동","자돈사 2동","육성사","비육사 1동","비육사 2동","비육사 3동"]),causes:FARM_LISTS().causes,actions:FARM_LISTS().actions,semens:FARM_LISTS().semens,dests:FARM_LISTS().dests,cull:FARM_LISTS().cull},startDate:addDays(TODAY,-60),accounts:B.accounts,labels:B.labels,dayDec:{},mbatches:[]});st.cfg.deadOne=3;st.cfg.deadDay=3;return st}
function makeState(kind,keep){
  if(kind==="farm"){state=seedFarm();syncLists();seedFarmPost()}
  else if(kind==="demo"){const L0=BARNS.slice();BARNS.length=0;["교배사","임신사 1동","임신사 2동","분만사 1동","분만사 2동","자돈사 1동","자돈사 2동","육성사","비육사 1동","비육사 2동","비육사 3동"].forEach(x=>BARNS.push(x));state=upgradeDemo(seed());seedPost()}
  else{const k=keep;state={v:7,user:k.user,sows:[],records:[],zero:{},todoLog:{},tasks:[],cfgSt:k.cfgSt,items:k.items,prevYear:{},memo:{},assign:{},lists:k.lists,startDate:TODAY,accounts:k.accounts,labels:k.labels,dayDec:{},mbatches:[],cfg:k.cfg}}
  syncLists();save();
}

