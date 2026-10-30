/**
 * 비담농장 앱 서버 (Google Apps Script 웹 앱)
 * 설치: 구글 시트 › 확장 프로그램 › Apps Script › 이 파일 내용을 붙여 넣기 › 배포 › 새 배포 › 웹 앱
 *       (실행: 나 · 액세스: 모든 사용자) → 나온 주소를 앱 설정 › 서버 연결에 붙여 넣기.
 * 이 파일에는 비밀값이 없습니다. PIN 은 앱에서 해시로만 오고, 디스코드 주소는 스크립트 속성에만 저장됩니다.
 *
 * 시트 탭 (없으면 자동 생성)
 *   data     : farm | k(rec·sow·key) | id | j(JSON) | u(변경 번호) | del | by | at
 *   accounts : id | name | role | farm | lang | active | ph(PIN 해시) | pinLen
 *   sessions : token | acc | farm | role | at
 *   log      : at | acc | action | n
 */
var VER = 1;
var SS = function () { return SpreadsheetApp.getActive(); };
var HEAD = {
  data: ["farm", "k", "id", "j", "u", "del", "by", "at"],
  accounts: ["id", "name", "role", "farm", "lang", "active", "ph", "pinLen"],
  sessions: ["token", "acc", "farm", "role", "at"],
  log: ["at", "acc", "action", "n"]
};
function sh(name) {
  var s = SS().getSheetByName(name);
  if (!s) { s = SS().insertSheet(name); s.getRange(1, 1, 1, HEAD[name].length).setValues([HEAD[name]]); s.setFrozenRows(1); }
  return s;
}
function rows(name) { var s = sh(name), n = s.getLastRow(); return n < 2 ? [] : s.getRange(2, 1, n - 1, HEAD[name].length).getValues(); }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function nowIso() { return new Date().toISOString(); }
function props() { return PropertiesService.getScriptProperties(); }
function nextSeq(n) { var p = props(), s = Number(p.getProperty("SEQ") || 0); p.setProperty("SEQ", String(s + n)); return s; }
function logA(acc, action, n) { try { sh("log").appendRow([nowIso(), acc, action, n || ""]); } catch (e) {} }

function doGet() { return out({ ok: true, app: "bidam-farm", ver: VER }); }
function doPost(e) {
  var q;
  try { q = JSON.parse(e.postData.contents); } catch (x) { return out({ ok: false, err: "bad json" }); }
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var f = API[q.a];
    if (!f) return out({ ok: false, err: "unknown action" });
    return out(f(q));
  } catch (x) {
    return out({ ok: false, err: String(x && x.message || x) });
  } finally { try { lock.releaseLock(); } catch (x) {} }
}

// ---------- 계정 · 세션 ----------
function accList() { return rows("accounts").map(function (r) { return { id: String(r[0]), name: r[1], role: r[2], farm: r[3], lang: r[4], active: r[5] === true || r[5] === "TRUE" || r[5] === 1, ph: String(r[6] || ""), pinLen: Number(r[7] || 4) }; }); }
function pubAcc(a) { return { id: a.id, name: a.name, role: a.role, farm: a.farm, lang: a.lang, active: a.active, pinLen: a.pinLen }; }
function session(token) {
  if (!token) return null;
  var R = rows("sessions");
  for (var i = 0; i < R.length; i++) if (R[i][0] === token) return { acc: String(R[i][1]), farm: R[i][2], role: R[i][3] };
  return null;
}
function newToken() { return Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, ""); }
function canFarm(S, farm) { return S.role === "admin" || S.farm === farm || S.farm === "*"; }

var API = {
  // 서버 상태: 처음 설치인지(계정 없음) 알려 줌
  hello: function (q) { return { ok: true, ver: VER, empty: accList().length === 0 }; },

  // 처음 한 번: 계정이 하나도 없을 때만. 대표 휴대폰의 계정 목록(PIN 해시)으로 시작
  init: function (q) {
    if (accList().length) return { ok: false, err: "already initialized" };
    var A = (q.accounts || []).filter(function (a) { return a.id && a.ph && /^[0-9a-f]{64}$/.test(a.ph); });
    if (!A.some(function (a) { return a.role === "admin"; })) return { ok: false, err: "admin account required" };
    sh("accounts").getRange(2, 1, A.length, 8).setValues(A.map(function (a) { return [a.id, a.name, a.role, a.farm || q.farm, a.lang || "ko", a.active !== false, a.ph, a.pinLen || 4]; }));
    logA("-", "init", A.length);
    return { ok: true, n: A.length };
  },

  login: function (q) {
    var a = accList().filter(function (x) { return x.id === q.acc; })[0];
    if (!a || !a.active) return { ok: false, err: "no account" };
    if (!q.ph || a.ph !== q.ph) { logA(q.acc, "login-fail"); return { ok: false, err: "pin" }; }
    var tk = newToken(), farm = a.role === "admin" ? "*" : (a.farm || q.farm);
    sh("sessions").appendRow([tk, a.id, farm, a.role, nowIso()]);
    logA(a.id, "login");
    return { ok: true, token: tk, acc: pubAcc(a), farm: farm };
  },

  // 로그인 화면용 공개 계정 목록 (PIN 해시 없음)
  accounts: function (q) { return { ok: true, accounts: accList().map(pubAcc) }; },

  // 계정 저장: 대표는 전체, 작업자는 자기 PIN 만
  saveAccounts: function (q) {
    var S = session(q.token); if (!S) return { ok: false, err: "auth" };
    var cur = accList(), byId = {};
    cur.forEach(function (a) { byId[a.id] = a; });
    (q.accounts || []).forEach(function (a) {
      if (S.role !== "admin" && a.id !== S.acc) return;
      var o = byId[a.id] || { id: a.id, ph: "", pinLen: 4 };
      if (S.role === "admin") { o.name = a.name; o.role = a.role; o.farm = a.farm || o.farm || q.farm; o.lang = a.lang; o.active = a.active !== false; }
      if (a.ph) { o.ph = a.ph; o.pinLen = a.pinLen || o.pinLen; }
      byId[a.id] = o;
    });
    var L = Object.keys(byId).map(function (k) { return byId[k]; }), s = sh("accounts");
    if (s.getLastRow() > 1) s.getRange(2, 1, s.getLastRow() - 1, 8).clearContent();
    s.getRange(2, 1, L.length, 8).setValues(L.map(function (a) { return [a.id, a.name, a.role, a.farm, a.lang, a.active, a.ph, a.pinLen]; }));
    logA(S.acc, "accounts", L.length);
    return { ok: true, accounts: L.map(pubAcc) };
  },

  // 바뀐 행 받기: rows = [{farm,k,id,j,del,n?}] — n 은 디스코드 알림 문구(앱이 켠 항목만 붙임)
  push: function (q) {
    var S = session(q.token); if (!S) return { ok: false, err: "auth" };
    var R = (q.rows || []).filter(function (r) { return r.k && r.id && canFarm(S, r.farm); });
    if (!R.length) return { ok: true, n: 0, cursor: Number(props().getProperty("SEQ") || 0) };
    var s = sh("data"), D = rows("data"), idx = {};
    D.forEach(function (r, i) { idx[r[0] + "|" + r[1] + "|" + r[2]] = i; });
    var base = nextSeq(R.length), at = nowIso(), app = [], msgs = [];
    R.forEach(function (r, n) {
      var key = r.farm + "|" + r.k + "|" + r.id, row = [r.farm, r.k, String(r.id), r.del ? "" : r.j, base + n + 1, r.del ? 1 : 0, S.acc, at];
      if (idx[key] !== undefined) { D[idx[key]] = row; D[idx[key]].dirty = true; }
      else { idx[key] = D.length; D.push(row); app.push(row); }
      if (r.n && !r.del) msgs.push(r.n);
    });
    // 바뀐 기존 행만 다시 쓰기 · 새 행은 한 번에 붙이기
    D.forEach(function (r, i) { if (r.dirty) s.getRange(i + 2, 1, 1, 8).setValues([r.slice(0, 8)]); });
    if (app.length) s.getRange(s.getLastRow() + 1, 1, app.length, 8).setValues(app);
    if (msgs.length) discord(msgs);
    logA(S.acc, "push", R.length);
    return { ok: true, n: R.length, cursor: base + R.length };
  },

  // since 이후 바뀐 행 보내기 (내 농장만)
  pull: function (q) {
    var S = session(q.token); if (!S) return { ok: false, err: "auth" };
    var since = Number(q.since || 0), farm = q.farm;
    if (!canFarm(S, farm)) return { ok: false, err: "farm" };
    var L = rows("data").filter(function (r) { return r[0] === farm && Number(r[4]) > since; })
      .map(function (r) { return { k: r[1], id: String(r[2]), j: r[3], u: Number(r[4]), del: Number(r[5]) === 1, by: r[6] }; });
    var acc = accList().map(pubAcc);
    return { ok: true, rows: L, cursor: Number(props().getProperty("SEQ") || 0), accounts: acc, discord: !!props().getProperty("DISCORD") };
  },

  // 대표: 디스코드 웹훅 주소 저장 (스크립트 속성에만, 시트·앱 저장소에는 없음)
  setDiscord: function (q) {
    var S = session(q.token); if (!S || S.role !== "admin") return { ok: false, err: "admin only" };
    if (q.url && !/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(q.url)) return { ok: false, err: "not a discord webhook" };
    if (q.url) props().setProperty("DISCORD", q.url); else props().deleteProperty("DISCORD");
    if (q.url) discord(["✅ 비담농장 앱 알림이 연결되었습니다."]);
    return { ok: true };
  }
};

function discord(msgs) {
  var url = props().getProperty("DISCORD"); if (!url) return;
  var text = msgs.join("\n");
  for (var i = 0; i < text.length; i += 1900) {
    try { UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify({ content: text.slice(i, i + 1900) }), muteHttpExceptions: true }); } catch (e) {}
  }
}
