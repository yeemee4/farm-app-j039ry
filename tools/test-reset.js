// 초기화 안전 시험: node tools/test-reset.js
// ① 연결된 휴대폰 초기화 = 그 휴대폰만(서버 그대로) ② 못 보낸 기록 있으면 다시 받기 멈춤 ③ 서버 새로 시작 = 보관 시트로 옮김(안 지움)·드라이브 백업·계정 그대로·다른 휴대폰도 비워짐
// ④ 되돌리기 = 원래 기록 복귀·새로 시작 뒤 기록은 다시 보관 ⑤ 대표 아니면 못 함 ⑥ 다른 농장 기록은 그대로
const { chromium } = require("playwright"), fs = require("fs"), path = require("path"), http = require("http");
const { makeGas } = require("./gas-mock.js");
const PAGE = path.join(__dirname, "../test/index.html"), GATE = fs.readFileSync(PAGE, "utf8").match(/const GATE\s*=\s*"([0-9a-f]{64})"/)[1];
let fail = 0; const ok = (name, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want), p = g === w; if (!p) fail++; console.log((p ? "PASS " : "FAIL ") + name + (p ? "" : "\n  기대 " + w + "\n  실제 " + g)) };
(async () => {
  const g = makeGas(), C = g.ctx, post = q => JSON.parse(C.doPost({ postData: { contents: JSON.stringify(q) } }).s);
  const srv = http.createServer((q, s) => { let b = ""; q.on("data", c => b += c); q.on("end", () => { s.writeHead(200, { "Access-Control-Allow-Origin": "*" }); s.end(C.doPost({ postData: { contents: b } }).s) }) }).listen(8793);
  const b = await chromium.launch();
  const phone = async (acc, pin) => { const p = await b.newPage(); p.on("pageerror", e => console.log("페이지 오류", e.message));
    await p.addInitScript(g => { localStorage.clear(); localStorage.setItem("farm-gate", g); window.confirm = () => true }, GATE);
    await p.goto("file://" + PAGE); await p.waitForTimeout(1200); return p };
  const join = (p, acc, pin) => p.evaluate(async ([acc, pin]) => { SY.url = "http://localhost:8793"; sySave(); await A.syJoin(null, true);
    const L = await syCall({ a: "login", acc, ph: pinHash(acc, pin), farm: syFarm() }); SY.token = L.token; SY.acc = acc; ME = acc; sySave(); await syPull() }, [acc, pin]);
  const p1 = await phone(); const [h1, h2] = await p1.evaluate(() => [pinHash("a1", "5678"), pinHash("w1", "8642")]);
  post({ a: "init", farm: "bidam", accounts: [{ id: "a1", name: "대표", role: "admin", ph: h1, pinLen: 4 }, { id: "w1", name: "팀장", role: "lead", farm: "bidam", ph: h2, pinLen: 4 }] });
  const tk = post({ a: "login", acc: "a1", ph: h1, farm: "bidam" }).token, R = (farm, id) => ({ farm, k: "rec", id, j: JSON.stringify({ id, type: "폐사", workDate: "2026-10-20", data: { barn: "자돈사", n: 1 } }) });
  post({ a: "push", token: tk, rows: [R("bidam", "o1"), R("bidam", "o2"), R("bidam", "o3"), R("daesung", "x1")] });
  const live = farm => g.sheets.data.d.filter(r => r[0] === farm && r[1] === "rec" && Number(r[5]) !== 1).length;
  await join(p1, "a1", "5678"); const p2 = await phone(); await join(p2, "w1", "8642");
  const recs = p => p.evaluate(() => state.records.map(r => r.id).filter(i => /^[oxun][0-9]/.test(i)).sort());

  // ① 초기화 버튼은 연결 중엔 막히고, 다시 받기는 이 휴대폰만
  await p2.evaluate(async () => { A.resetDo("empty"); state.records = state.records.filter(r => r.id !== "o1"); SYNC_MUTE = true; save(); SYNC_MUTE = false; SY.snap.rec = {}; await A.syReDown() });
  ok("① 휴대폰 다시 받기: 이 휴대폰만, 서버 그대로", [await recs(p2), live("bidam")], [["o1", "o2", "o3"], 3]);
  // ② 못 보낸 기록이 있으면 멈춤
  const r2 = await p2.evaluate(async () => { const off = SY.url; SY.url = "http://localhost:1"; const r = addRecord("폐사", TODAY, { barn: "자돈사", n: 1 }); r.id = "u1"; save(); syDiff(); await A.syReDown(); SY.url = off; return state.records.some(x => x.id === "u1") });
  ok("② 못 보낸 기록이 있으면 다시 받기 안 함(기록 그대로)", r2, true);
  await p2.evaluate(async () => { await syFlush() });
  // ⑤ 대표 아니면 못 함
  const t2 = post({ a: "login", acc: "w1", ph: h2, farm: "bidam" }).token;
  ok("⑤ 팀장은 서버 새로 시작·되돌리기 못 함", [post({ a: "fresh", token: t2, farm: "bidam", yes: "bidam" }).err, post({ a: "rollback", token: t2, farm: "bidam" }).err], ["admin only", "admin only"]);
  ok("③ 확인 글자 틀리면 안 함", post({ a: "fresh", token: tk, farm: "bidam", yes: "x" }).err, "confirm");
  // ③ 서버 새로 시작
  const acc0 = JSON.stringify(g.sheets.accounts.d);
  await p1.evaluate(async () => { await syFlush(); const r = await syCall({ a: "fresh", token: SY.token, farm: syFarm(), yes: syFarm() }); if (!r.ok) throw new Error(r.err); await syAfterSwap("x") });
  const arc = Object.keys(g.sheets).filter(n => n.startsWith("보관 bidam "));
  ok("③ 새로 시작: 서버 이 농장 0 · 보관 시트에 기록 4건(설정은 그대로) · 다른 농장 그대로 · 계정 그대로 · 드라이브 백업", [live("bidam"), arc.length, g.sheets[arc[0]].d.length - 1, live("daesung"), JSON.stringify(g.sheets.accounts.d) === acc0, Object.keys(g.drive["비담농장 백업"] || {}).some(n => n.includes("새로 시작 전"))], [0, 1, 4, 1, true, true]);
  ok("③ 대표 휴대폰 비워짐", await recs(p1), []);
  await p2.evaluate(async () => { await syPull() });
  ok("③ 다른 휴대폰도 다음 받기 때 자동으로 비워짐", await recs(p2), []);
  // 새로 시작 뒤 새 기록 하나
  await p1.evaluate(async () => { const r = addRecord("폐사", TODAY, { barn: "분만사", n: 1 }); r.id = "n1"; save(); syDiff(); await syQ(() => {}) });
  // ④ 되돌리기
  await p1.evaluate(async () => { const L = await syCall({ a: "archives", token: SY.token, farm: syFarm() }); const r = await syCall({ a: "rollback", token: SY.token, farm: syFarm(), name: L.list[0] }); if (!r.ok) throw new Error(r.err); await syAfterSwap("x") });
  await p2.evaluate(async () => { await syPull() });
  const arc2 = Object.keys(g.sheets).filter(n => n.startsWith("보관 bidam "));
  ok("④ 되돌리기: 원래 4건 복귀 · 새로 시작 뒤 기록(n1)은 보관 시트로 · 두 휴대폰 모두", [live("bidam"), arc2.length, g.sheets[arc2[0]].d.some(r => r[2] === "n1"), await recs(p1), await recs(p2)], [4, 1, true, ["o1", "o2", "o3", "u1"], ["o1", "o2", "o3", "u1"]]);
  ok("⑥ 다른 농장 기록 끝까지 그대로", live("daesung"), 1);
  ok("⑦ 기록·모돈 전체 덩어리(records·sows)는 서버에 안 올라감", g.sheets.data.d.filter(r => r[1] === "key" && ["records", "sows"].includes(String(r[2])) && Number(r[5]) !== 1).length, 0);
  await b.close(); srv.close(); console.log(fail ? `${fail}개 실패` : "모두 통과"); process.exit(fail ? 1 : 0);
})();
