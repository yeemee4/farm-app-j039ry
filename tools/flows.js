// 누르는 흐름 비교(정리·리팩터링 안전장치): 두 빌드에서 같은 버튼을 같은 순서로 눌러 매번 화면·저장 기록이 같은지 비교
//   node tools/flows.js <전 빌드 html> [후 빌드 html=test/index.html] [걷기 수=30] [걸음 수=40]
// 버튼은 씨앗값 고정 무작위로 고름(화면이 같으면 두 빌드가 같은 버튼을 누름) · 확인 창은 '예', 숫자 묻는 창은 5
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const [A0, B0 = "test/index.html", W = "30", N = "40"] = process.argv.slice(2), ROOT = path.join(__dirname, "..");
const abs = p => path.isAbsolute(p) ? p : path.join(ROOT, p), PA = abs(A0), PB = abs(B0);
const SKIP = /^(logout|syHello|syInit|syJoin|syNow|syFull|syOff|syDc|syDcOff|syInvite|syInvCopy|syReDown|srvFresh|srvBack|oldGo|oldOpen|photo|mic|voice|bkCopy|bkLive|restoreOk|tvMode|alTest|pcMode|skin|icostyle|labelToggle|tags?)$/i;
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0).toString(36) };
// 의도한 차이: 설정 첫 화면 '데이터 상태' 칸(정리 때 버그 고침)
const norm = s => s.replace(/<div class="sec-t"[^>]*>데이터 상태<\/div><div class="panel"[^>]*>.*?<\/p><\/div>/gs, "");
async function walk(b, page, seed, steps) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }), errs = [];
  p.on("pageerror", e => errs.push(e.message.split("\n")[0]));
  await p.route(/^https?:/, r => r.abort());
  const G = fs.readFileSync(page, "utf8").match(/const GATE\s*=\s*"([0-9a-f]{64})"/)[1];
  await p.addInitScript(([g, seed]) => { localStorage.clear(); localStorage.setItem("farm-gate", g); localStorage.setItem("farm-dev", "flw");
    const D = Date, T = new D("2026-10-31T09:00:00+09:00").getTime(); Date = class extends D { constructor(...a) { super(...(a.length ? a : [T])) } static now() { return T } };
    let s = 7; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; window.confirm = () => true; window.prompt = () => "5"; window.alert = () => {}; window.open = () => null;
    window.__r = seed }, [G, seed]);
  await p.goto("file://" + page); await p.waitForTimeout(1000);
  await p.evaluate(() => { ME = state.accounts.find(x => x.role === "admin").id; tab = "home"; render() });
  const trace = [];
  for (let i = 0; i < steps; i++) {
    const r = await p.evaluate(skip => {
      const rnd = () => (window.__r = (window.__r * 48271) % 2147483647) / 2147483647;
      const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.disabled };
      const L = [...document.querySelectorAll("#sheetRoot [data-a], #view [data-a], nav [data-a]")].filter(el => vis(el) && !new RegExp(skip, "i").test(el.dataset.a));
      // 숫자·글자 칸이 있으면 가끔 채움
      const inp = [...document.querySelectorAll("#sheetRoot input:not([type=file]):not([type=checkbox]), #view input:not([type=file]):not([type=checkbox]), #view textarea")].filter(vis);
      if (inp.length && rnd() < .25) { const el = inp[Math.floor(rnd() * inp.length)]; const v = el.type === "number" ? String(1 + Math.floor(rnd() * 20)) : el.type === "date" ? "2026-10-2" + Math.floor(rnd() * 9) : el.type === "time" ? "08:30" : "시험" + Math.floor(rnd() * 99);
        el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return "fill " + (el.id || el.name || el.type) + "=" + v }
      if (!L.length) { tab = "home"; render(); return "home(빈 화면)" }
      const el = L[Math.floor(rnd() * L.length)], d = el.dataset.a + ":" + (el.dataset.v || ""); el.click(); return "click " + d }, SKIP.source);
    await p.waitForTimeout(40);
    const cap = await p.evaluate(() => { const B = typeof BUILD_AT !== "undefined" ? BUILD_AT : "";
      const n = s => (B ? s.split(B).join("BUILD") : s).replace(/\d+ms/g, "Nms").replace(/ data-tag="[^"]*"/g, "");
      const st = JSON.stringify({ r: state.records, s: state.sows, t: state.todoLog, a: state.am, z: state.zero, rg: state.regu, d: state.dash, m: state.todoMust, ui: { tab, sp: ui.setPage } });
      return [n((document.querySelector("#view") || {}).innerHTML || "") + "@@" + n((document.querySelector("#sheetRoot") || {}).innerHTML || ""), st] });
    trace.push([r, fnv(norm(cap[0])), fnv(cap[1]), norm(cap[0]), cap[1]]);
  }
  await p.close(); return { trace, errs };
}
(async () => {
  const b = await chromium.launch(); let bad = 0, steps = 0, saved = 0; const errA = new Set(), errB = new Set(), acts = {};
  for (let w = 0; w < +W; w++) {
    const seed = 1000 + w * 7919, a = await walk(b, PA, seed, +N), c = await walk(b, PB, seed, +N);
    a.errs.forEach(e => errA.add(e)); c.errs.forEach(e => errB.add(e));
    c.trace.forEach((t, i) => { const k = t[0].split(":")[0]; acts[k] = (acts[k] || 0) + 1; if (i && t[2] !== c.trace[i - 1][2]) saved++ });
    for (let i = 0; i < +N; i++) { steps++; const x = a.trace[i], y = c.trace[i];
      if (x[0] !== y[0] || x[1] !== y[1] || x[2] !== y[2]) { bad++;
        const what = x[0] !== y[0] ? "누른 것" : x[1] !== y[1] ? "화면" : "저장 기록";
        console.log(`✗ 걷기 ${w + 1} · ${i + 1}번째 (${what} 다름)\n  전: ${x[0]}\n  후: ${y[0]}`);
        const [s1, s2] = what === "저장 기록" ? [x[4], y[4]] : [x[3], y[3]]; let k = 0; while (k < s1.length && s1[k] === s2[k]) k++;
        console.log(`  전: …${s1.slice(Math.max(0, k - 80), k + 120)}\n  후: …${s2.slice(Math.max(0, k - 80), k + 120)}`);
        console.log("  그 전 걸음:", a.trace.slice(Math.max(0, i - 4), i).map(t => t[0]).join(" → "));
        break } } }
  console.log(`\n${W}번 걷기 · 비교한 걸음 ${steps}개 · 기록이 바뀐 걸음 ${saved}개 · 누른 동작 ${Object.keys(acts).length}종 · 다른 곳 ${bad}개`);
  if (process.env.FLOWLOG) console.log(Object.entries(acts).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + v).join(" · "));
  const onlyB = [...errB].filter(e => !errA.has(e)); if (onlyB.length) console.log("새 빌드에만 난 오류:\n  " + onlyB.join("\n  ")); else console.log("새 빌드에만 난 오류: 없음");
  await b.close(); process.exit(bad || onlyB.length ? 1 : 0);
})();
