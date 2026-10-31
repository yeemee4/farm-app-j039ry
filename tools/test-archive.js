// 보관 기간·예전 기간 보기·드라이브 백업 안전 시험: node tools/test-archive.js
// ① 처음 받기는 1년 지난 매일 기록을 빼고 받음(번식 기록은 받음) ② 오래된 기록을 휴대폰에서 빼도 서버는 그대로
// ③ 아직 안 보낸·고친 기록은 안 뺌 ④ 불러온 예전 기록은 휴대폰·서버에 다시 저장 안 됨 ⑤ 드라이브 백업·보관·복원
const { chromium } = require("playwright"), fs = require("fs"), path = require("path"), http = require("http");
const { makeGas } = require("./gas-mock.js");
const ROOT = path.join(__dirname, ".."), PAGE = path.join(ROOT, "test/index.html"), GATE = fs.readFileSync(PAGE, "utf8").match(/const GATE="([0-9a-f]{64})"/)[1];
let fail = 0; const ok = (name, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want), p = g === w; if (!p) fail++; console.log((p ? "PASS " : "FAIL ") + name + (p ? "" : "\n  기대 " + w + "\n  실제 " + g)) };
const kday = (n) => new Date(Date.now() + 9 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
(async () => {
  // ⑤ 드라이브 백업 (서버만)
  { const g = makeGas(), C = g.ctx, D = d => new Date(d + "T03:00:00+09:00");
    C.sh("data").appendRow(["bidam", "rec", "x1", JSON.stringify({ id: "x1", type: "폐사", workDate: "2026-10-01", data: {} }), 1, 0, "a1", ""]);
    C.sh("accounts").appendRow(["a1", "대표", "admin", "bidam", "ko", true, "h".repeat(64), 4]);
    for (let i = 0; i < 70; i++) C.backupNow(new Date(D("2026-08-01").getTime() + i * 864e5));
    C.backupNow(D("2026-10-09"));   // 같은 날 두 번 → 하나만
    const F = Object.keys(g.drive["비담농장 백업"]).sort(), days = F.map(n => n.slice(-15, -5));
    ok("⑤ 백업 보관: 최근 30일 + 그 전은 매월 1일", [F.length, days.filter(d => d < "2026-09-09").sort()], [31 + 2, ["2026-08-01", "2026-09-01"]]);
    C.sh("data").clearContents(); C.sh("data").appendRow(["망가짐"]);
    const name = C.restoreBackup();
    ok("⑤ 복원: 최근 백업으로 시트 되돌림", [name.slice(-15, -5), C.sh("data").d.length, C.sh("data").d[1][2]], ["2026-10-09", 2, "x1"]) }

  // 휴대폰 시험용 가짜 서버
  const g = makeGas(), C = g.ctx, srv = http.createServer((q, s) => { let b = ""; q.on("data", c => b += c); q.on("end", () => { s.writeHead(200, { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }); s.end(q.method === "POST" ? C.doPost({ postData: { contents: b } }).s : "{}") }) }).listen(8791);
  const post = q => JSON.parse(C.doPost({ postData: { contents: JSON.stringify(q) } }).s);
  const b = await chromium.launch(), p = await b.newPage(); p.on("pageerror", e => console.log("페이지 오류", e.message));
  await p.addInitScript(g => { localStorage.clear(); localStorage.setItem("farm-gate", g); window.confirm = () => true }, GATE);
  await p.goto("file://" + PAGE); await p.waitForTimeout(1200);
  const [h1, h2] = await p.evaluate(() => [pinHash("a1", "5678"), pinHash("w1", "8642")]);
  post({ a: "init", farm: "bidam", accounts: [{ id: "a1", name: "대표", role: "admin", ph: h1, pinLen: 4 }, { id: "w1", name: "팀장", role: "lead", ph: h2, pinLen: 4 }] });
  const tk = post({ a: "login", acc: "a1", ph: h1, farm: "bidam" }).token, old = kday(-400), now = kday(-3);
  const R = (id, type, workDate, data) => ({ farm: "bidam", k: "rec", id, j: JSON.stringify({ id, type, workDate, data }) });
  post({ a: "push", token: tk, rows: [R("d1", "폐사", old, { barn: "자돈사", n: 1 }), R("d2", "사료", old, { mode: "입고" }), R("b1", "분만", old, { sow: "6-001", live: 12 }), R("r1", "폐사", now, { barn: "자돈사", n: 2 })] });
  await p.evaluate(async () => { SY.url = "http://localhost:8791"; sySave(); await A.syJoin(null, true);
    const L = await syCall({ a: "login", acc: "w1", ph: pinHash("w1", "8642"), farm: syFarm() }); SY.token = L.token; SY.acc = "w1"; ME = "w1"; sySave(); await syPull() });
  ok("① 처음 받기: 1년 지난 매일 기록 빼고(번식·최근은 받음)", await p.evaluate(() => state.records.map(r => r.id).sort()), ["b1", "r1"]);

  // ② 휴대폰에서 기록한 오래된 매일 기록 → 서버에 보낸 뒤 휴대폰에서만 빠짐
  await p.evaluate(async () => { const r = addRecord("폐사", addDays(TODAY, -380), { barn: "분만사", n: 1 }); r.id = "L1"; save(); syDiff(); await syQ(() => {}); });
  const n2 = await p.evaluate(() => { const n = syPrune(); syDiff(); return [n, state.records.some(r => r.id === "L1"), !!SY.out["rec|L1"]] });
  await p.evaluate(async () => { await syFlush() });
  const row = g.sheets.data.d.find(r => r[2] === "L1");
  ok("② 휴대폰에서만 빠지고 서버엔 그대로(삭제 안 보냄)", [n2, !!row, row && row[5]], [[1, false, false], true, 0]);

  // ③ 안 보낸 기록·고친 기록은 안 뺌
  const n3 = await p.evaluate(() => { const off = SY.url; SY.url = "http://localhost:1"; const a = addRecord("약품", addDays(TODAY, -390), { name: "x" }); a.id = "U1"; save(); syDiff();
    const pre = state.records.find(r => r.id === "b1"); const keep = syPrune(); SY.url = off; return [keep, state.records.some(r => r.id === "U1"), !!SY.out["rec|U1"]] });
  ok("③ 아직 안 보낸 오래된 기록은 안 뺌", n3, [0, true, true]);
  const n3b = await p.evaluate(async () => { await syFlush(); const r = state.records.find(r => r.id === "U1"); r.data.name = "고침"; return [syPrune(), state.records.some(r => r.id === "U1")] });
  ok("③ 고친 뒤 아직 안 보낸 기록도 안 뺌", n3b, [0, true]);
  ok("③ 모돈 번식 기록은 오래돼도 남음", await p.evaluate(() => state.records.some(r => r.id === "b1")), true);

  // ④ 예전 기간 보기: 불러와 보이고, 휴대폰 저장·서버 보내기 안 됨, 닫으면 사라짐
  const r4 = await p.evaluate(async () => { await syFlush(); const n = await oldLoad(addDays(TODAY, -420), addDays(TODAY, -366)); const ids = state.records.filter(r => r._old).map(r => r.id).sort();
    save(); const ls = JSON.parse(localStorage.getItem(KEY)).records.filter(r => r._old || ["d1", "d2"].includes(r.id)).length; syDiff(); const out = Object.keys(SY.out).filter(k => /d1|d2/.test(k)).length;
    oldClear(); return [n, ids, ls, out, state.records.some(r => r._old)] });
  ok("④ 예전 기록 불러오기: 보이고 · 저장 0 · 보내기 0 · 닫으면 사라짐", r4, [3, ["L1", "d1", "d2"], 0, 0, false]);
  ok("④ 서버 기록 수 그대로", g.sheets.data.d.filter(r => r[1] === "rec" && Number(r[5]) !== 1).length, 6);
  await b.close(); srv.close(); console.log(fail ? `${fail}개 실패` : "모두 통과"); process.exit(fail ? 1 : 0);
})();
