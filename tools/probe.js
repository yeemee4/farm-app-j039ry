// 앱 안에서 식 하나를 평가해 출력: node tools/probe.js '<JS 식>'
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), GATE = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/const GATE="([0-9a-f]{64})"/)[1];
(async () => { const b = await chromium.launch(), p = await b.newPage(), errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.addInitScript(g => { localStorage.clear(); localStorage.setItem("farm-gate", g) }, GATE);
  await p.goto("file://" + ROOT + "/index.html"); await p.waitForTimeout(1200);
  for (const ex of process.argv.slice(2)) console.log(JSON.stringify(await p.evaluate(ex)));
  if (errs.length) console.log("ERR", errs); await b.close() })();
