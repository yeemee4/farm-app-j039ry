// 번역 빠진 문구 찾기: node tools/missing-tr.js  (베트남어로 모든 화면을 돌며 TR에 없는 t() 문구를 모음)
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), GATE = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/const GATE\s*=\s*"([0-9a-f]{64})"/)[1];
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.addInitScript(g => { localStorage.clear(); localStorage.setItem("farm-gate", g) }, GATE);
  await p.goto("file://" + ROOT + "/index.html"); await p.waitForTimeout(1200);
  const out = await p.evaluate(() => { const miss = new Set(), t0 = t;
    window.t = s => { if (s != null && typeof s === "string" && /[가-힣]/.test(s) && !TR[s]) miss.add(s); return t0(s) };
    ME = "a1"; state.accounts.find(a => a.id === "a1").lang = "vi";
    for (const v of ["home","todo","sows","batch","drug","stats","board","tl","close","morning"]) { tab = v; try { render() } catch (e) {} }
    ui.drugCat = "사료"; tab = "drug"; render();
    buildTodos().forEach(x => { try { openTodo(x.k) } catch (e) {} });
    const s = state.sows.find(x => statusOf(x).stage === "포유"); ui.sowId = s.id; tab = "sow"; render();
    ui.am = { barn: "분만사", time: "07:00", temp: "", bad: [], memo: "" }; tab = "morning"; render();
    return [...miss] });
  console.log(out.join("\n")); await b.close() })();
