// 알림 로봇: 보이지 않는 브라우저로 앱을 열어 서버 기록을 받고, 디스코드 알림 계획(alarm§plan)을 새로 만들어 올림
// 깃허브 자동 실행(.github/workflows/robot.yml)이 매시간 돌림 → 사람이 앱을 안 열어도 알림 계획이 최신
// ROBOT_URL=<서버 주소> ROBOT_PIN=<로봇 PIN> [ROBOT_NAME=알림 로봇] [PAGE=test/index.html] node tools/robot.js
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const PAGE = path.join(__dirname, "..", process.env.PAGE || "test/index.html");
const { ROBOT_URL: URL, ROBOT_PIN: PIN, ROBOT_NAME: NAME = "알림 로봇" } = process.env;
if (!URL || !PIN) { console.log("ROBOT_URL·ROBOT_PIN 없음 → 건너뜀"); process.exit(0); }
const GATE = fs.readFileSync(PAGE, "utf8").match(/const GATE\s*=\s*"([0-9a-f]{64})"/)[1];
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ timezoneId: "Asia/Seoul", locale: "ko-KR" }), p = await ctx.newPage();
  await p.addInitScript(g => { localStorage.setItem("farm-gate", g); window.confirm = () => true; }, GATE);
  await p.goto("file://" + PAGE); await p.waitForTimeout(1500);
  const r = await p.evaluate(async ({ URL, PIN, NAME }) => {
    SY.url = URL; sySave();
    await A.syJoin();                                   // 서버 계정 받기 (이 브라우저 예시 데이터는 버림)
    const a = state.accounts.find(x => x.name === NAME); if (!a) return { err: "계정 없음: " + NAME };
    const L = await syCall({ a: "login", acc: a.id, ph: pinHash(a.id, PIN), farm: syFarm() }); if (!L.ok) return { err: "로그인 실패: " + L.err };
    SY.token = L.token; SY.acc = a.id; ME = a.id; sySave();
    await syPull();                                     // 서버 기록 전부 받기
    for (let i = 0; i < 30 && !WX; i++) { try { wxLoad(); } catch (e) {} await new Promise(r => setTimeout(r, 500)); }   // 날씨 예보 받기(경고에 필요)
    state.alarm = state.alarm || {}; state.alarm.plan = alarmPlan(); state.alarm.robot = new Date().toISOString(); save();
    syDiff(); await syFlush();
    return { wx: !!WX, recs: state.records.length, plan: state.alarm.plan.length, left: syPending(), err: SYST.err || "" };
  }, { URL, PIN, NAME });
  console.log(JSON.stringify(r)); await b.close(); process.exit(r.err ? 1 : 0);
})();
