/* ================= v0.4 · 날씨 (Open-Meteo · 키 없이 무료) ================= */
let WX=null,wxAt=0;
try{const c=JSON.parse(localStorage.getItem("farm-wx")||"null");if(c){WX=c.d;wxAt=c.at}}catch(e){}
function wxLoad(){if(Date.now()-wxAt<30*60e3)return;wxAt=Date.now();
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${FARM.lat}&longitude=${FARM.lon}&current=temperature_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,weather_code&timezone=Asia%2FSeoul&forecast_days=2`)
    .then(r=>r.json()).then(d=>{WX=d;try{localStorage.setItem("farm-wx",JSON.stringify({d,at:wxAt}))}catch(e){}if(tab==="board")render()}).catch(()=>{})}
const WXC=c=>c===0?"맑음":c<=3?"구름":c<=48?"안개":c<=67?"비":c<=77?"눈":c<=82?"소나기":c<=86?"눈":"뇌우";
function wxDay(i){const d=WX&&WX.daily;return d?{max:Math.round(d.temperature_2m_max[i]),min:Math.round(d.temperature_2m_min[i]),wind:Math.round(d.wind_speed_10m_max[i]),code:d.weather_code[i]}:null}
function wxLine(){wxLoad();if(!WX||!WX.current)return `<div class="bd-wx">${FARM.place} · ${t("날씨 불러오는 중")}</div>`;
  const c=WX.current,d=wxDay(0);return `<div class="bd-wx">${FARM.place} ${t(WXC(c.weather_code))} <b>${Math.round(c.temperature_2m)}℃</b> · ${d.min}~${d.max}℃ · ${t("바람")} ${Math.round(c.wind_speed_10m/3.6)}m/s</div>`}
function wxAlerts(day){const d=wxDay(day||0),W=FARM.wx;if(!d)return "";const a=[];
  if(d.max>=W.hot)a.push(`${t("폭염")} ${d.max}℃ · ${t("환기·급수·쿨링 점검")}`);
  if(d.min<=W.cold)a.push(`${t("한파")} ${d.min}℃ · ${t("보온·급수관 동파 점검")}`);
  if(d.wind>=W.wind)a.push(`${t("강풍")} ${Math.round(d.wind/3.6)}m/s · ${t("커튼·문·지붕 점검")}`);
  return a.map(x=>`<div class="bd-al wx">${x}</div>`).join("")}
