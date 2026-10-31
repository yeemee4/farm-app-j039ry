// 동기화 그룹(레규메이트) 자동 시험: node tools/test-regu.js
// 시험하는 곳(대표와 합의): 정시 교배 날짜 · 급여 늦음 알림 단계 · 끝난 그룹 성적 · 서버 디스코드 발송
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), PAGE = path.join(ROOT, process.env.PAGE || "test/index.html");
const GATE = fs.readFileSync(PAGE, "utf8").match(/const GATE\s*=\s*"([0-9a-f]{64})"/)[1];
const T = [];   // [이름, 페이지 안에서 돌릴 함수, 기대값]
const t = (name, fn, want) => T.push([name, fn, want]);

// 1. 정시 교배: 투약 끝 다음 날 = 1일, 4·5일째 오전·오후 (기본 08:00·17:00) — 11/14 끝이면 11/18·11/19
t("정시 교배 4회 날짜·시각", () => {
  const b = { start: "2026-10-28", days: 18 };   // 10/28 1일째 → 11/14 18일째
  return reguMating(b).map(x => x.n + " " + x.date + " " + x.time);
}, ["1 2026-11-18 08:00", "2 2026-11-18 17:00", "3 2026-11-19 08:00", "4 2026-11-19 17:00"]);

// 2. 급여 늦음 알림 단계: 정한 시각 기준 1·4·8·11시간 지나면 1·2·3·4 단계, 먹였으면 0
t("급여 늦음 알림 단계", () => [
  reguAlertStage("08:00", "08:59", false), reguAlertStage("08:00", "09:00", false), reguAlertStage("08:00", "12:30", false),
  reguAlertStage("08:00", "16:00", false), reguAlertStage("08:00", "19:05", false), reguAlertStage("08:00", "19:05", true),
  reguAlertStage("22:00", "23:10", false)], [0, 1, 2, 3, 4, 0, 1]);

// 3. 끝난 그룹 성적: 3두 · 18일 중 5일째 빠짐(1) · 7일째 시각 벗어남(1) · 교배 3두 · 임신 2/3 · 분만 2복(실산 12·10 → 평균 11)
t("끝난 그룹 성적", () => {
  state.records = state.records.filter(r => !["동기화", "레규급여"].includes(r.type));
  const g = addRecord("동기화", "2026-01-01", { sows: ["T-1", "T-2", "T-3"], start: "2026-01-01", ml: 5, at: "08:00", days: 18 });
  for (let k = 0; k < 18; k++) if (k !== 4) addRecord("레규급여", addDays("2026-01-01", k), { batch: g.id, day: k + 1, ml: 5, time: "08:10", n: 3, off: k === 6 });
  ["T-1", "T-2", "T-3"].forEach(s => addRecord("교배", "2026-01-22", { sow: s, round: "1차", semen: "듀록 정액" }));
  addRecord("임신확인", "2026-02-14", { sow: "T-1", result: "임신" }); addRecord("임신확인", "2026-02-14", { sow: "T-2", result: "임신" }); addRecord("임신확인", "2026-02-14", { sow: "T-3", result: "재발" });
  addRecord("분만", "2026-05-15", { sow: "T-1", live: 12, still: 0, mum: 0 }); addRecord("분만", "2026-05-15", { sow: "T-2", live: 10, still: 1, mum: 0 });
  const r = reguSummary(g); return [r.n, r.mated, r.checked, r.preg, r.farrow, r.live, r.miss, r.off];
}, [3, 3, 3, 2, 2, 11, 1, 1]);

// 4. 서버 디스코드: 정한 시각 08:00, 아직 안 먹임 → 09:05 1단계 1번, 09:35 다시 안 보냄, 12:10 2단계, 먹인 뒤 16:10 안 보냄
function serverTest() {
  const { makeGas } = require("./gas-mock.js"), g = makeGas(), C = g.ctx, kst = hm => new Date(`2026-10-31T${hm}:00+09:00`);
  g.props.DISCORD = "https://discord.com/api/webhooks/1/x";
  const S = C.sh("data"), put = (id, j) => S.appendRow(["bidam", "rec", id, JSON.stringify(j), 1, 0, "a1", ""]);
  put("g1", { id: "g1", type: "동기화", workDate: "2026-10-28", data: { sows: ["6-001", "6-002", "6-003"], start: "2026-10-28", ml: 5, at: "08:00", days: 18 } });
  const out = [];
  for (const hm of ["09:05", "09:35", "12:10"]) { C.reguCheck(kst(hm)); out.push(g.discord.length) }
  put("f1", { id: "f1", type: "레규급여", workDate: "2026-10-31", data: { batch: "g1", day: 4, ml: 5, time: "12:20", n: 3 } });
  C.reguCheck(kst("16:10")); out.push(g.discord.length);
  return [out, /1시간/.test(g.discord[0] || ""), /3두/.test(g.discord[0] || "")];
}

(async () => {
  const b = await chromium.launch(), p = await b.newPage(); let fail = 0;
  await p.addInitScript(g => { localStorage.clear(); localStorage.setItem("farm-gate", g) }, GATE);
  await p.goto("file://" + PAGE); await p.waitForTimeout(1200);
  for (const [name, fn, want] of T) {
    let got; try { got = await p.evaluate(fn) } catch (e) { got = "ERROR " + e.message.split("\n")[0] }
    const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++;
    console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "\n  기대 " + JSON.stringify(want) + "\n  실제 " + JSON.stringify(got)));
  }
  { let got; try { got = serverTest() } catch (e) { got = "ERROR " + e.message } const want = [[1, 1, 2, 2], true, true], ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++;
    console.log((ok ? "PASS " : "FAIL ") + "서버 디스코드 급여 알림" + (ok ? "" : "\n  기대 " + JSON.stringify(want) + "\n  실제 " + JSON.stringify(got))) }
  await b.close(); console.log(fail ? `${fail}개 실패` : "모두 통과"); process.exit(fail ? 1 : 0);
})();
