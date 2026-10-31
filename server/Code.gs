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
var VER = 3;
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
// 시트 칸 하나는 5만 자까지 → 긴 j 는 9번째 칸부터 이어서 저장(앞에 "~" 를 붙여 숫자·수식으로 바뀌지 않게)
var CH = 45000;
function dataRows() {
  var s = sh("data"), n = s.getLastRow(), w = Math.max(8, s.getLastColumn()); if (n < 2) return [];
  return s.getRange(2, 1, n - 1, w).getValues().map(function (r) {
    var row = r.slice(0, 8), more = r.slice(8).filter(function (x) { return x !== ""; });
    if (more.length) row[3] = String(row[3]) + more.map(function (x) { return String(x).slice(1); }).join("");
    return row;
  });
}
function cells(row, w) {
  var j = row[3], out = row.slice(0, 8);
  if (typeof j === "string" && j.length > CH) { out[3] = j.slice(0, CH); for (var i = CH; i < j.length; i += CH) out.push("~" + j.slice(i, i + CH)); }
  while (out.length < w) out.push("");
  return out;
}
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
    // PIN 대입 막기: 5번 틀리면 그 계정 15분 잠금 + 디스코드 경고
    var P = props(), fk = "fail|" + a.id, F = JSON.parse(P.getProperty(fk) || '{"n":0,"until":0}');
    if (F.until > Date.now()) return { ok: false, err: "locked", min: Math.ceil((F.until - Date.now()) / 60000) };
    if (!q.ph || a.ph !== q.ph) {
      logA(q.acc, "login-fail"); F.n++;
      if (F.n >= 5) { F = { n: 0, until: Date.now() + 15 * 60000 }; discord(["⚠ [" + (a.farm || "") + "] " + a.name + " 계정 PIN 5번 틀림 → 15분 잠금"]); }
      P.setProperty(fk, JSON.stringify(F)); return { ok: false, err: "pin" };
    }
    if (F.n) P.deleteProperty(fk);
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
    var s = sh("data"), D = dataRows(), idx = {};
    D.forEach(function (r, i) { idx[r[0] + "|" + r[1] + "|" + r[2]] = i; });
    var base = nextSeq(R.length), at = nowIso(), app = [], msgs = [];
    R.forEach(function (r, n) {
      var key = r.farm + "|" + r.k + "|" + r.id, row = [r.farm, r.k, String(r.id), r.del ? "" : r.j, base + n + 1, r.del ? 1 : 0, S.acc, at];
      if (idx[key] !== undefined) { D[idx[key]] = row; D[idx[key]].dirty = true; }
      else { idx[key] = D.length; D.push(row); app.push(row); }
      if (r.n && !r.del) msgs.push(r.n);
    });
    // 바뀐 기존 행만 다시 쓰기 · 새 행은 한 번에 붙이기
    var W = Math.max(8, s.getLastColumn());
    D.concat(app).forEach(function (r) { if (r.dirty || app.indexOf(r) >= 0) W = Math.max(W, cells(r, 0).length); });
    if (W > s.getMaxColumns()) s.insertColumnsAfter(s.getMaxColumns(), W - s.getMaxColumns());
    D.forEach(function (r, i) { if (r.dirty) s.getRange(i + 2, 1, 1, W).setValues([cells(r, W)]); });
    if (app.length) s.getRange(s.getLastRow() + 1, 1, app.length, W).setValues(app.map(function (r) { return cells(r, W); }));
    if (msgs.length) discord(msgs);
    logA(S.acc, "push", R.length);
    return { ok: true, n: R.length, cursor: base + R.length };
  },

  // since 이후 바뀐 행 보내기 (내 농장만)
  pull: function (q) {
    var S = session(q.token); if (!S) return { ok: false, err: "auth" };
    var since = Number(q.since || 0), farm = q.farm;
    if (!canFarm(S, farm)) return { ok: false, err: "farm" };
    var L = dataRows().filter(function (r) { return r[0] === farm && Number(r[4]) > since; })
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

// ---------- 레규메이트 급여 늦음 알림 (30분마다 자동 실행) ----------
// 처음 한 번: Apps Script 편집기 위쪽 함수 목록에서 setupReguTrigger 를 고르고 ▶ 실행 (권한 허용)
var REGU_STEPS = [60, 240, 480, 660];   // 정한 시각에서 1·4·8·11시간 (앱 84-breed.js 와 같은 규칙)
// 자동 실행 켜기(한 번만): 레규 급여 확인 30분마다 · 시간 알림 5분마다
function setupReguTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (["reguTick", "alarmTick"].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("reguTick").timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger("alarmTick").timeBased().everyMinutes(5).create();
}

// ---------- 시간 알림: 앱이 만든 계획(key alarm§plan = [{id,at:"yyyy-MM-dd HH:mm",msg}]) 중 시각이 된 것을 한 번씩 보냄 ----------
function alarmTick() { alarmCheck(new Date()); }
function alarmCheck(now) {
  var p = props(), fmt = function (d) { return Utilities.formatDate(d, "Asia/Seoul", "yyyy-MM-dd HH:mm"); };
  var nowS = fmt(now), lo = fmt(new Date(now.getTime() - 3 * 3600000)), old = fmt(new Date(now.getTime() - 3 * 86400000)).slice(0, 10), msgs = [];
  dataRows().forEach(function (r) {
    if (r[1] !== "key" || String(r[2]) !== "alarm\u00a7plan" || Number(r[5]) === 1) return;
    var L; try { L = JSON.parse(String(r[3])); } catch (e) { return; }
    // 안전장치: 알림 계획이 26시간 넘게 안 바뀌면(로봇·앱 모두 멈춤) 하루 한 번 경고
    var h = Math.floor((now.getTime() - new Date(r[7]).getTime()) / 3600000), sk = "al|" + r[0] + "|" + nowS.slice(0, 10) + "|stale";
    if (h >= 26 && !p.getProperty(sk)) { p.setProperty(sk, "1"); msgs.push("⚠ 알림 계획이 " + h + "시간째 갱신되지 않았습니다. 알림 로봇(깃허브)이나 앱을 확인해 주세요.\n"); }
    (L || []).forEach(function (a) {
      if (!a || !a.at || !a.msg || a.at > nowS || a.at < lo) return;   // 3시간 넘게 지난 건 안 보냄(밤새 쌓인 것 폭탄 방지)
      var k = "al|" + r[0] + "|" + a.id; if (p.getProperty(k)) return;
      p.setProperty(k, "1"); msgs.push(a.msg + "\n");
    });
  });
  p.getKeys().forEach(function (k) { if (k.indexOf("al|") === 0 && k.split("|")[2] < old) p.deleteProperty(k); });
  if (msgs.length) discord(msgs);
}
function reguTick() { reguCheck(new Date()); }
function reguCheck(now) {
  var day = Utilities.formatDate(now, "Asia/Seoul", "yyyy-MM-dd"), hm = Utilities.formatDate(now, "Asia/Seoul", "HH:mm");
  var mins = function (x) { var p = String(x).split(":"); return Number(p[0]) * 60 + Number(p[1]); };
  var recs = dataRows().filter(function (r) { return r[1] === "rec" && Number(r[5]) !== 1; })
    .map(function (r) { try { return typeof r[3] === "string" ? JSON.parse(r[3]) : null; } catch (e) { return null; } }).filter(Boolean);
  var fed = {}; recs.forEach(function (r) { if (r.type === "레규급여" && r.workDate === day) fed[r.data.batch] = 1; });
  var p = props(), msgs = [];
  recs.filter(function (r) { return r.type === "동기화"; }).forEach(function (g) {
    var d = g.data, n = Math.round((new Date(day) - new Date(d.start)) / 864e5) + 1;
    if (n < 1 || n > d.days || fed[g.id]) return;
    var late = mins(hm) - mins(d.at), stage = REGU_STEPS.filter(function (m) { return late >= m; }).length;
    if (!stage) return;
    var key = "regu|" + g.id + "|" + day + "|" + stage;
    if (p.getProperty(key)) return;
    p.setProperty(key, "1");
    var h = Math.floor(late / 60);
    msgs.push("⚠ 레규메이트 급여 시각 " + d.at + " 에서 " + h + "시간 지남 · " + d.sows.length + "두 · " + n + "/" + d.days + "일째" +
      (stage >= 3 ? " · 대표 확인 필요" : "") + (stage >= 4 ? " · 12시간까지 1시간 남음" : ""));
  });
  if (msgs.length) discord(msgs);
  return msgs.length;
}
