// 핵심 계산 정답 시험: node tools/test-calc.js
// 작은 예제를 손으로 계산한 정답(주석)과 앱 계산을 비교한다. 오늘 = 2026-11-02(월) 09:00 한국 시각으로 고정.
// 다루는 것: 사료 배송 달력 · 벌크 이송차 · 포대 주문 · PSY·분만율·복당 실산 · NPD · 도태 후보
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), PAGE = path.join(ROOT, process.env.PAGE || "test/index.html");
const GATE = fs.readFileSync(PAGE, "utf8").match(/const GATE\s*=\s*"([0-9a-f]{64})"/)[1];
const T = [];
const t = (name, fn, want) => T.push([name, fn, want]);

// ---------- 1. 사료 배송 달력 (CLAUDE.md: 다음 날 오전 도착 · 일요일 주문·배송 없음 · 토 → 월 · 금 오전 → 토 · 오전 마감 12:00 · 공휴일) ----------
// 11/2 월 · 11/6 금 · 11/7 토 · 11/8 일
t("배송: 월 오전 → 화", () => arriveOf("2026-11-02", false), "2026-11-03");
t("배송: 금 오전 → 토", () => arriveOf("2026-11-06", false), "2026-11-07");
t("배송: 토 오전 → 월", () => arriveOf("2026-11-07", false), "2026-11-09");
t("배송: 금 오후(마감 뒤) = 토 주문 → 월", () => arriveOf("2026-11-06", true), "2026-11-09");
t("배송: 토 오후 = 월 주문 → 화", () => arriveOf("2026-11-07", true), "2026-11-10");
t("배송: 수요일 공휴일이면 화 주문 → 목, 수는 주문 불가", () => {
  state.feedHoli = ["2026-11-04"];
  const r = [arriveOf("2026-11-03", false), canOrder("2026-11-04")];
  state.feedHoli = [];
  return r;
}, ["2026-11-05", false]);

// ---------- 2. 벌크 이송차 (도착 아침에 0.5일치 남아야 · 가장 급한 빈 마감일에 한 차 · 빈마다 min(빈 용량, 14일분) · 500kg 단위 · 최소 6t) ----------
// 빈 A: 용량 4,200 · 하루 300 · 지금 900 → j일 아침 900−300j ≥ 150 → j ≤ 2 → 화(11/3) 주문·수 도착이 마감
// 빈 B: 용량 8,500 · 하루 400 · 지금 4,000 → j ≤ 9 → 다음 주 화(11/10) 주문이 마감
// 차 1대: 화 주문 · 수 도착(2일 뒤). A 도착 때 300 남음 → min(4200, 14×300=4200) − 300 = 3,900 → 3,500
//         B 도착 때 3,200 → min(8500, 14×400=5600) − 3,200 = 2,400 → 2,000 · 합계 5,500 → 최소 6t 미달 표시
const P = (f, cap, use, kg) => ({ f, bin: { cap }, kg, avg4: use, need: Array(56).fill(use) });
t("벌크: 가장 급한 빈 마감일에 한 차, 빈별 양", () => {
  const T0 = bulkTrucks([P("A", 4200, 300, 900), P("B", 8500, 400, 4000)])[0];
  return [T0.order, T0.arrive, T0.items.map(x => x.o.f + " " + x.q), T0.tot, T0.under];
}, ["2026-11-03", "2026-11-04", ["A 3500", "B 2000"], 5500, true]);
// 빈 A 하나: 지금 2,400 → 토(11/7) 주문 → 월(11/9, 7일 뒤) 아침 300 ≥ 150 OK, 월 주문 → 화 아침 0 → 마감 = 토, 주말 표시
t("벌크: 마감이 토요일이면 월 도착·주말 표시", () => {
  const T0 = bulkTrucks([P("A", 4200, 300, 2400)])[0];
  return [T0.order, T0.arrive, T0.weekend, T0.items[0].q];
}, ["2026-11-07", "2026-11-09", true, 3500]);

// ---------- 3. 포대 (4종 한 번에 · 가장 급한 포대 마감일 · 합계 50~70포 · 사료마다 28일분 이내 · 1포 20kg) ----------
// 하루 특호 20·1호 40·2호 60·3호 80kg, 지금 100·400·600·400kg
// 마감: 특호 100−20j ≥ 10 → j ≤ 4 · 3호 400−80j ≥ 40 → j ≤ 4 → 목(11/5) 주문 · 금(11/6, 4일 뒤) 도착
// 도착 때 남은 양 20·240·360·80 = 700kg. 최대 70포(1,400kg) → 모두 합쳐 2,100kg ÷ 하루 200kg = 10.5일
// → 같은 날 바닥나게 나누면 (10.5×쓰는 양 − 남은 양)÷20 = 9.5·9·13.5·38 → 정수로 대략 10·9·13·38 (합 70)
const G = (f, use, kg) => ({ f, bag: { kg: 20 }, kg, avg4: use, need: Array(56).fill(use) });
const BAGS = () => bagOrders([G("특호", 20, 100), G("1호", 40, 400), G("2호", 60, 600), G("3호", 80, 400)])[0];
t("포대: 주문일·도착일·합계 50~70", () => {
  const o = BAGS();
  return [o.order, o.arrive, o.tot >= 50 && o.tot <= 70];
}, ["2026-11-05", "2026-11-06", true]);
t("포대: 4종이 비슷한 날 바닥나게(가장 빨리·늦게 바닥나는 날 차이 2일 이하)", () => {
  const o = BAGS(), left = { 특호: 20, "1호": 240, "2호": 360, "3호": 80 }, use = { 특호: 20, "1호": 40, "2호": 60, "3호": 80 };
  const d = o.items.map(x => (x.q * 20 + left[x.o.f]) / use[x.o.f]);
  return Math.max(...d) - Math.min(...d) <= 2 ? "OK" : o.items.map((x, i) => x.o.f + " " + x.q + "포 " + d[i].toFixed(1) + "일").join(" · ");
}, "OK");
t("포대: 사료마다 28일분 이내", () => {
  const o = BAGS(), left = { 특호: 20, "1호": 240, "2호": 360, "3호": 80 }, use = { 특호: 20, "1호": 40, "2호": 60, "3호": 80 };
  return o.items.every(x => x.q * 20 + left[x.o.f] <= 28 * use[x.o.f]);
}, true);

// ---------- 4. 성적: 모돈 2두(경산), 2026-01-01 ~ 06-30 (181일) ----------
// T-1: 교배 1/6 → 분만 4/30(실12·사1·미0) → 이유 5/28(11두) · T-2: 교배 1/10 → 재발(분만 없음) · 이유 3/1(10두, 앞 분만 2/1 실 11)
// 기간 안 이유 = T-1 1/1(10) · T-2 3/1(10) · T-1 5/28(11) = 31두 → PSY = 31 ÷ 2두 × 365 ÷ 181 = 31.26 · 복당 실산 = (12+11)/2 = 11.5 · 총산 = (13+11)/2 = 12
// 분만율: 기간 −114일(2025-09-09 ~ 2026-03-08)의 1차 교배 = T-1 1/6, T-2 1/10, T-2 2025-10-10(→2/1 분만) = 3건 중 분만 2 → 66.7%
function setHerd() {
  state.sows = [{ id: "T-1", baseParity: 1, loc: "임신사 1동", breed: "LY" }, { id: "T-2", baseParity: 1, loc: "교배사", breed: "LY" }];
  state.records = [];
  state.startDate = "2025-01-01";
  const a = (ty, d, x) => addRecord(ty, d, x);
  a("분만", "2025-12-04", { sow: "T-1", live: 11, still: 0, mum: 0 });
  a("이유", "2026-01-01", { sow: "T-1", n: 10 });
  a("교배", "2026-01-06", { sow: "T-1", round: "1차" });
  a("분만", "2026-04-30", { sow: "T-1", live: 12, still: 1, mum: 0 });
  a("이유", "2026-05-28", { sow: "T-1", n: 11 });
  a("교배", "2025-10-10", { sow: "T-2", round: "1차" });
  a("분만", "2026-02-01", { sow: "T-2", live: 11, still: 0, mum: 0 });
  a("이유", "2026-03-01", { sow: "T-2", n: 10 });
  a("교배", "2026-03-06", { sow: "T-2", round: "1차" });
  a("임신확인", "2026-03-30", { sow: "T-2", result: "재발" });
  a("교배", "2026-04-01", { sow: "T-2", round: "1차" });
  a("분만", "2026-07-24", { sow: "T-2", live: 10, still: 0, mum: 0 });
  a("이유", "2026-08-21", { sow: "T-2", n: 9 });
  MEMO = {}; NPDX = null;
}
t("성적: PSY·복당 실산·총산·분만율", () => {
  setHerd();
  const m = metrics("2026-01-01", "2026-06-30"), r = x => Math.round(x * 100) / 100;
  return [r(m.psy), m.live, m.tot, r(m.frate)];
}, [31.26, 11.5, 12, 66.67]);
// 지난 기간 성적은 나중에 도태·입식이 있어도 바뀌면 안 됨: T-2 를 9/1 에 도태해도 1~6월에는 2두였으니 PSY 31.26 그대로
t("성적: 기간 뒤 도태해도 지난 PSY 그대로", () => {
  setHerd();
  addRecord("도태", "2026-09-01", { sow: "T-2", reason: "시험" }); MEMO = {};
  return Math.round(metrics("2026-01-01", "2026-06-30").psy * 100) / 100;
}, 31.26);

// ---------- 5. NPD (생산일 = 1차 교배→분만 + 분만→이유, 나머지 비생산) ----------
// T-1, 2026-01-01 ~ 05-31 (151일): 비생산 = 1/1~1/5(5일, 이유→재교배) + 5/28~5/31(4일) = 9일 → 9 ÷ 151 × 365 = 21.75
t("NPD: 모돈 1두 151일 중 9일", () => {
  setHerd();
  state.records = state.records.filter(r => r.data.sow === "T-1"); state.sows = state.sows.slice(0, 1); MEMO = {}; NPDX = null;
  const n = npdStat0("2026-01-01", "2026-05-31");
  return [n.days, n.sd, Math.round(n.npd * 100) / 100, n.R.wei];
}, [9, 151, 21.75, 9]);
// T-2, 2026-03-01 ~ 04-30 (61일): 이유 3/1 → 교배 3/6(재발) → 교배 4/1 → 분만 7/24
// 비생산 = 3/1~3/5(5일, 이유 후) + 3/6~3/31(26일, 재발·공태) = 31일
t("NPD: 재발 기간은 '재발·공태'로", () => {
  setHerd();
  const n = npdStat0("2026-03-01", "2026-04-30"), p = n.per.find(x => x.id === "T-2");
  return [p.n, p.wei, p.fail];
}, [31, 5, 26]);

// ---------- 6. 도태 후보 (최근 2산 총산 ≤ 9 · 난산 ≥ 30% · 무발정 21일 · 비생산 60일 · 재발·공태 2회 · 9산) ----------
t("도태: 최근 2산 총산 9·8 → 후보, 9·10 → 아님", () => {
  state.sows = [{ id: "C-1", baseParity: 1, loc: "임신사 1동" }, { id: "C-2", baseParity: 1, loc: "임신사 1동" }];
  state.records = [];
  [["C-1", "2026-01-10", 9], ["C-1", "2026-06-10", 8], ["C-2", "2026-01-10", 9], ["C-2", "2026-06-10", 10]].forEach(([s, d, n]) => {
    addRecord("분만", d, { sow: s, live: n, still: 0, mum: 0 });
    addRecord("이유", addDays(d, 28), { sow: s, n: n - 1 });
    addRecord("교배", addDays(d, 33), { sow: s, round: "1차" });
  });
  MEMO = {};
  return [/총산 8·9/.test(cullWhy(state.sows[0]) || ""), /총산/.test(cullWhy(state.sows[1]) || "")];
}, [true, false]);
t("도태: 이유 뒤 21일 넘게 교배 없음 → 무발정", () => {
  state.sows = [{ id: "C-3", baseParity: 2, loc: "교배사" }];
  state.records = [];
  addRecord("분만", "2026-09-10", { sow: "C-3", live: 12, still: 0, mum: 0 });
  addRecord("이유", "2026-10-08", { sow: "C-3", n: 11 });   // 11/2 까지 25일
  MEMO = {};
  return /무발정 25/.test(cullWhy(state.sows[0]) || "") ? "OK" : cullWhy(state.sows[0]);
}, "OK");

(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ timezoneId: "Asia/Seoul", locale: "ko-KR" }), p = await ctx.newPage();
  let fail = 0;
  await p.addInitScript(g => {
    localStorage.clear(); localStorage.setItem("farm-gate", g);
    const D = Date, T0 = new D("2026-11-02T09:00:00+09:00").getTime();
    Date = class extends D { constructor(...a) { super(...(a.length ? a : [T0])) } static now() { return T0 } };
  }, GATE);
  await p.goto("file://" + PAGE); await p.waitForTimeout(1200);
  await p.addScriptTag({ content: Object.entries({ P, G, BAGS, setHerd }).map(([k, f]) => `window.${k} = ${f.toString()};`).join("\n") });
  const today = await p.evaluate(() => TODAY);
  if (today !== "2026-11-02") { console.log("오늘 날짜 고정 실패: " + today); process.exit(1); }
  for (const [name, fn, want] of T) {
    let got; try { got = await p.evaluate(fn) } catch (e) { got = "ERROR " + e.message.split("\n")[0] }
    const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++;
    console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "\n  기대 " + JSON.stringify(want) + "\n  실제 " + JSON.stringify(got)));
  }
  await b.close(); console.log(fail ? `${fail}개 실패` : "모두 통과"); process.exit(fail ? 1 : 0);
})();
