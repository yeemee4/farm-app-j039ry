/* ================= v0.4 · 날씨 (Open-Meteo · 키 없이 무료) ================= */
let WX=null,wxAt=0;
try{const c=JSON.parse(localStorage.getItem("farm-wx")||"null");if(c){WX=c.d;wxAt=c.at}}catch(e){}
const WX_EVERY=10*60e3;   // 날씨 새로 받는 간격 (10분)
function wxLoad(){if(Date.now()-wxAt<WX_EVERY)return;wxAt=Date.now();
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${FARM.lat}&longitude=${FARM.lon}&current=temperature_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,weather_code&timezone=Asia%2FSeoul&forecast_days=2`)
    .then(r=>r.json()).then(d=>{WX=d;try{localStorage.setItem("farm-wx",JSON.stringify({d,at:wxAt}))}catch(e){}render()}).catch(()=>{})}
const WXC=c=>c===0?"맑음":c<=3?"구름":c<=48?"안개":c<=67?"비":c<=77?"눈":c<=82?"소나기":c<=86?"눈":"뇌우";
function wxDay(i){const d=WX&&WX.daily;return d?{max:Math.round(d.temperature_2m_max[i]),min:Math.round(d.temperature_2m_min[i]),wind:Math.round(d.wind_speed_10m_max[i]),code:d.weather_code[i]}:null}
// 홈 맨 위 날씨 한 줄 (+ 경고)
// 홈: 경고가 있는 날만 카드
function wxHome(){wxLoad();const al=wxAlerts(0).replace(/bd-al wx/g,"wxal");return al?`<div class="wxcard">${al}</div>`:""}
// 상단 주차 옆 짧은 날씨
function wxShort(){wxLoad();if(!WX||!WX.current)return "";const c=WX.current,d=wxDay(0);return ` · ${t(WXC(c.weather_code))} ${Math.round(c.temperature_2m)}℃ (${d.min}~${d.max}℃)`}
function wxAlerts(day){const d=wxDay(day||0),n=wxDay((day||0)+1),W=FARM.wx;if(!d)return "";const a=[];
  if(d.max>=W.hot)a.push(`${t("폭염")} ${d.max}℃ · ${t("환기·급수·쿨링 점검")}`);
  else if(n&&n.max>=W.hot)a.push(`${t("내일 폭염")} ${n.max}℃ · ${t("오늘 쿨링·급수 미리 점검")}`);
  if(n&&n.min<=W.cold&&d.min>W.cold)a.push(`${t("내일 영하 진입")} ${n.min}℃ · ${t("급수관 동파·보온 미리 점검")}`);
  if(d.min<=W.freeze)a.push(`${t("한파")} ${d.min}℃ · ${t("급수 확인·보온")}`);
  if(d.wind>=W.wind)a.push(`${t("강풍")} ${Math.round(d.wind/3.6)}m/s · ${t("커튼·문·지붕 점검")}`);
  return a.map(x=>`<div class="bd-al wx">${x}</div>`).join("")}
// 화면을 켜 두기만 해도 10분마다 새로 받기 (받으면 render)
setInterval(()=>{if(me())wxLoad()},60e3);
