// 기준 사진(정리 작업 안전장치): 날짜·무작위 값을 고정하고 앱의 모든 화면 HTML과 주요 계산 결과를 찍어 둔 뒤, 코드를 고친 다음 글자 하나까지 같은지 비교
//   node tools/golden.js save /tmp/golden.json     ← 고치기 전
//   node tools/golden.js check /tmp/golden.json    ← 고친 뒤 (다르면 어느 화면 몇째 줄인지 보여 줌)
// PAGE=test/index.html(기본) · 초기 등록 앱은 같은 폴더 setup/index.html 도 함께
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const [mode, file] = process.argv.slice(2), ROOT = path.join(__dirname, ".."), PAGE = path.join(ROOT, process.env.PAGE || "test/index.html");
const GATE = fs.readFileSync(PAGE, "utf8").match(/const GATE\s*=\s*"([0-9a-f]{64})"/)[1];
const VIEWS = "home todo sows batch drug stats board tl close settings more input sow morning count cal feedset feedchk gfeed gestset barnmap bcsmap breed".split(" ");
const SETP = "main accounts backup binit bmshow bulk criteria dash guide hus labels lists reset skin statset supply sync todorank".split(" ");
async function open(b, vp, page) {
  const p = await b.newPage({ viewport: vp }); const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.route(/^https?:/, r => r.abort());   // 날씨 등 바깥 요청 막음(늘 같은 결과)
  await p.addInitScript(g => { localStorage.clear(); localStorage.setItem("farm-gate", g); localStorage.setItem("farm-dev", "gld");
    const D = Date, T = new D("2026-10-31T09:00:00+09:00").getTime();
    Date = class extends D { constructor(...a) { super(...(a.length ? a : [T])) } static now() { return T } };
    let s = 7; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; window.confirm = () => false; window.prompt = () => null; window.alert = () => {} }, GATE);
  await p.goto("file://" + page); await p.waitForTimeout(1200); p.errs = errs; return p }
// 화면 = #view·#sheetRoot HTML (빌드 시각·밀리초 측정값처럼 늘 바뀌는 글자는 지움)
const CAP = () => { const n = s => s.replace(new RegExp(BUILD_AT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "BUILD").replace(/\d+ms/g, "Nms");
  return n((document.querySelector("#view") || {}).innerHTML || "") + "\n@@sheet\n" + n((document.querySelector("#sheetRoot") || {}).innerHTML || "") };
async function shoot(p, out, key, fn, arg) { try { await p.evaluate(fn, arg); await p.waitForTimeout(30); out[key] = await p.evaluate(CAP) } catch (e) { out[key] = "ERR " + e.message.split("\n")[0] } }
(async () => {
  const b = await chromium.launch(), out = {}, errs = [];
  const login = p => p.evaluate(() => { ME = state.accounts.find(x => x.role === "admin").id; tab = "home"; render() });
  // 1. 휴대폰 5개 언어 × 모든 탭
  for (const lang of ["ko", "vi", "ne", "km", "th"]) { const p = await open(b, { width: 390, height: 844 }, PAGE); await login(p);
    await p.evaluate(l => { me().lang = l; save() }, lang);
    for (const v of VIEWS) await shoot(p, out, `phone/${lang}/${v}`, v => { $("#sheetRoot").innerHTML = ""; ui.sheet = null; tab = v; render() }, v);
    errs.push(...p.errs); await p.close() }
  // 2. PC·TV
  for (const [n, vp] of [["desk", { width: 1280, height: 860 }], ["tv", { width: 1920, height: 1080 }]]) { const p = await open(b, vp, PAGE); await login(p);
    for (const v of VIEWS) await shoot(p, out, `${n}/${v}`, v => { tab = v; render() }, v);
    if (n === "tv") { await shoot(p, out, "tv/board-tv", () => { tab = "board"; document.body.classList.add("tv"); render() }); await shoot(p, out, "tv/stats-tv", () => { tab = "stats"; render() }) }
    errs.push(...p.errs); await p.close() }
  // 3. 휴대폰: 설정 화면 · 입력 화면 · 할 일 · 모돈 92두(앱 보기·현장 카드) · 번식 단계 · 계산 결과
  { const p = await open(b, { width: 390, height: 844 }, PAGE); await login(p);
    for (const s of SETP) await shoot(p, out, `set/${s}`, s => { tab = "settings"; ui.setPage = s; render() }, s);
    for (const ty of await p.evaluate(() => Object.keys(TYPES))) await shoot(p, out, `input/${ty}`, t => { $("#sheetRoot").innerHTML = ""; tab = "home"; render(); openInput(t) }, ty);
    for (const k of await p.evaluate(() => buildTodos().map(x => x.k))) await shoot(p, out, `todo/${k}`, k => { $("#sheetRoot").innerHTML = ""; tab = "todo"; render(); openTodo(k) }, k);
    for (const id of await p.evaluate(() => state.sows.map(s => s.id))) {
      await shoot(p, out, `sow/${id}/app`, id => { $("#sheetRoot").innerHTML = ""; openSowDetail(id); A.sowView && A.sowView("app") }, id);
      await shoot(p, out, `sow/${id}/card`, () => { A.sowView && A.sowView("card") }) }
    for (const st of await p.evaluate(() => typeof BR_STAGES !== "undefined" ? BR_STAGES.map(x => x[0] || x.k || x) : [])) await shoot(p, out, `breed/${st}`, s => { tab = "breed"; ui.brStage = s; render() }, st);
    const data = await p.evaluate(() => { const J = (f) => { try { return JSON.stringify(f()) } catch (e) { return "ERR " + e.message } };
      const months = []; for (let i = 0; i < 18; i++) { const d = addDays(TODAY, -30 * i); months.push(d.slice(0, 7)) }
      return { todos: J(() => buildTodos().map(x => [x.k, x.t, x.items.length, x.items.map(i => { try { return itemShort(i) } catch (e) { return "?" } })])),
        status: J(() => state.sows.map(s => [s.id, statusOf(s)])), sowState: J(() => state.sows.map(s => sowState(s.id))),
        npd: J(() => [[addDays(TODAY, -89), TODAY], ["2026-01-01", TODAY], ["2025-06-01", "2026-03-31"]].map(([f, t]) => npdStat(f, t))),
        range: J(() => months.map(m => typeof rangeMetrics === "function" ? rangeMetrics(m + "-01", m + "-28") : null)),
        semen: J(() => semenOrder()), alarm: J(() => alarmPlan()), dash: J(() => Object.keys(DASH_P).map(k => { try { return [k, DASH_P[k]()] } catch (e) { return [k, "ERR " + e.message] } })),
        regu: J(() => reguBatches().map(b => [b.r.id, b.day, b.miss, b.off])), cal: J(() => calEvents(TODAY)), close: J(() => closeMiss(TODAY)), wx: J(() => [wxAlerts(0), wxAlerts(1)]) } });
    Object.entries(data).forEach(([k, v]) => out[`data/${k}`] = v); errs.push(...p.errs); await p.close() }
  // 4. 초기 등록 앱
  const SU = path.join(path.dirname(PAGE), "setup/index.html");
  if (fs.existsSync(SU)) { const p = await open(b, { width: 390, height: 844 }, SU); await login(p);
    for (const v of ["setup", "suwalk", "sureview"]) await shoot(p, out, `setup/${v}`, v => { tab = v; render() }, v); errs.push(...p.errs); await p.close() }
  out._errors = [...new Set(errs)].sort().join("\n");
  await b.close();
  if (mode === "save") { fs.writeFileSync(file, JSON.stringify(out)); console.log("저장", Object.keys(out).length, "개 ·", (fs.statSync(file).size / 1e6).toFixed(1) + "MB", out._errors ? "· 페이지 오류 있음:\n" + out._errors : ""); return }
  const base = JSON.parse(fs.readFileSync(file, "utf8")), keys = [...new Set([...Object.keys(base), ...Object.keys(out)])], diff = keys.filter(k => base[k] !== out[k]);
  console.log(diff.length ? `다름 ${diff.length}/${keys.length}` : `모두 같음 ${keys.length}개`);
  for (const k of diff.slice(0, 8)) { const x = String(base[k] || "(없음)"), y = String(out[k] || "(없음)"); let i = 0; while (i < x.length && x[i] === y[i]) i++;
    console.log(`- ${k} @${i}\n   전: ${x.slice(Math.max(0, i - 60), i + 120)}\n   후: ${y.slice(Math.max(0, i - 60), i + 120)}`) }
  process.exit(diff.length ? 1 : 0);
})();
