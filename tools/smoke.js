// 빠른 점검: FARM_PIN=대표PIN node tools/smoke.js [스크린샷폴더]  — 모든 탭·입력 화면을 열어 오류를 찾는다.
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), OUT = process.argv[2] || "/tmp", GATE = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/const GATE="([0-9a-f]{64})"/)[1];
(async () => {
  const b = await chromium.launch(), errs = [];
  for (const [name, vp] of [["phone", { width: 390, height: 844 }], ["desk", { width: 1280, height: 860 }]]) {
    const p = await b.newPage({ viewport: vp });
    p.on("pageerror", e => errs.push(name + ": " + e.message));
    await p.addInitScript(g => { try { if (!sessionStorage.getItem("x")) { localStorage.clear(); localStorage.setItem("farm-gate", g); sessionStorage.setItem("x", 1) } } catch (e) {} }, GATE);
    await p.goto("file://" + ROOT + "/index.html"); await p.waitForTimeout(1500);
    await p.click(`.accbtn:has-text("대표")`); for (const c of process.env.FARM_PIN) await p.click(`[data-a=pinKey][data-v="${c}"]`);
    await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/${name}-home.png`, fullPage: name === "phone" });
    const tabs = await p.$$eval(`#tabs${name === "phone" ? "M" : "D"} [data-v]`, a => a.map(x => x.dataset.v));
    for (const t of tabs) { await p.evaluate(v => { tab = v; render() }, t); await p.waitForTimeout(150) }
    for (const q of await p.evaluate(() => QUICK)) { await p.evaluate(v => { tab = "home"; render() }, q); if (await p.$(`.qbtn[data-v="${q}"]`)) await p.click(`.qbtn[data-v="${q}"]`); else await p.evaluate(v => openInput(v), q); await p.waitForTimeout(80) }
    await p.evaluate(() => { tab = "feedchk"; render() }); await p.waitForTimeout(80);
    const tags = await p.evaluate(() => document.querySelectorAll("[data-tag]").length);
    console.log(name, "tabs", tabs.join(","), "tags", tags, "scrollW", await p.evaluate(() => document.documentElement.scrollWidth));
  }
  console.log(errs.length ? "ERRORS\n" + errs.join("\n") : "no errors"); await b.close();
})();
