// 계정 삭제·정지 시험: node tools/test-accounts.js
// ④ 지운 계정이 쓴 기록·작성자 이름은 그대로 · ① 대표가 지운 계정은 서버에서도 지워지고 다시 받아도 안 살아남 ② 지운·정지한 계정은 이미 로그인한 휴대폰도 서버를 못 씀 ③ 내 계정·마지막 대표는 못 지움
const { chromium } = require("playwright"), fs = require("fs"), path = require("path"), http = require("http");
const { makeGas } = require("./gas-mock.js");
const PAGE = path.join(__dirname, "../test/index.html"), GATE = fs.readFileSync(PAGE, "utf8").match(/const GATE\s*=\s*"([0-9a-f]{64})"/)[1];
let fail = 0; const ok = (n, g, w) => { const a = JSON.stringify(g), b = JSON.stringify(w), p = a === b; if (!p) fail++; console.log((p ? "PASS " : "FAIL ") + n + (p ? "" : "\n  기대 " + b + "\n  실제 " + a)) };
(async () => {
  const g = makeGas(), C = g.ctx, post = q => JSON.parse(C.doPost({ postData: { contents: JSON.stringify(q) } }).s);
  const srv = http.createServer((q, s) => { let b = ""; q.on("data", c => b += c); q.on("end", () => { s.writeHead(200, { "Access-Control-Allow-Origin": "*" }); s.end(C.doPost({ postData: { contents: b } }).s) }) }).listen(8794);
  const b = await chromium.launch(), p = await b.newPage(); p.on("pageerror", e => console.log("페이지 오류", e.message));
  await p.addInitScript(g => { localStorage.clear(); localStorage.setItem("farm-gate", g); window.confirm = () => true }, GATE);
  await p.goto("file://" + PAGE); await p.waitForTimeout(1200);
  const H = await p.evaluate(() => ["a1", "w1", "w2"].map(i => pinHash(i, "5791")));
  post({ a: "init", farm: "bidam", accounts: [{ id: "a1", name: "대표", role: "admin", ph: H[0], pinLen: 4 }, { id: "w1", name: "팀장", role: "leader", farm: "bidam", ph: H[1], pinLen: 4 }, { id: "w2", name: "Ram", role: "worker", farm: "bidam", ph: H[2], pinLen: 4 }] });
  const tw1 = post({ a: "login", acc: "w1", ph: H[1], farm: "bidam" }).token, tw2 = post({ a: "login", acc: "w2", ph: H[2], farm: "bidam" }).token;
  await p.evaluate(async () => { SY.url = "http://localhost:8794"; sySave(); await A.syJoin(null, true); const L = await syCall({ a: "login", acc: "a1", ph: pinHash("a1", "5791"), farm: syFarm() }); SY.token = L.token; SY.acc = "a1"; ME = "a1"; sySave(); await syPull() });
  const r3 = await p.evaluate(() => { const n0 = state.accounts.length; A.accDel("a1"); const n1 = state.accounts.length; return [n0, n1] });
  ok("③ 내 계정은 못 지움", r3[0] === r3[1], true);
  post({ a: "push", token: tw2, rows: [{ farm: "bidam", k: "rec", id: "rw2", j: JSON.stringify({ id: "rw2", type: "폐사", workDate: "2026-10-30", user: "Ram", data: { barn: "자돈사", n: 1 } }) }] });
  await p.evaluate(async () => { await syPull() });
  await p.evaluate(async () => { A.accDel("w2"); const w1 = state.accounts.find(a => a.id === "w1"); w1.active = false; save(); syDiff(); await syFlush(); await syPull() });
  const ids = g.sheets.accounts.d.slice(1).map(r => r[0]).filter(Boolean).sort(), phone = await p.evaluate(() => state.accounts.map(a => a.id).sort());
  ok("① 지운 계정은 서버·휴대폰 모두 없음(다시 받아도)", [ids, phone], [["a1", "w1"], ["a1", "w1"]]);
  ok("④ 지운 계정이 쓴 기록은 작성자 이름과 함께 그대로", [await p.evaluate(() => (state.records.find(r => r.id === "rw2") || {}).user), g.sheets.data.d.some(r => r[2] === "rw2" && Number(r[5]) !== 1)], ["Ram", true]);
  ok("② 지운 계정(이미 로그인)은 서버 못 씀", post({ a: "pull", token: tw2, farm: "bidam", since: 0 }).err, "auth");
  ok("② 정지한 계정(이미 로그인)은 서버 못 씀", post({ a: "push", token: tw1, rows: [] }).err, "auth");
  ok("② 정지한 계정은 새로 로그인도 못 함", post({ a: "login", acc: "w1", ph: H[1], farm: "bidam" }).err, "no account");
  await b.close(); srv.close(); console.log(fail ? `${fail}개 실패` : "모두 통과"); process.exit(fail ? 1 : 0);
})();
