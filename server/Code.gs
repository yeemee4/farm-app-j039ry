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
    // from 이 있으면(처음 받기) 그 날짜 전 매일 기록은 빼고 보냄 — 모돈 번식 기록은 항상 보냄(현장 카드 8산)
    var from = q.from ? String(q.from) : "";
    var L = dataRows().filter(function (r) { return r[0] === farm && Number(r[4]) > since && !(from && r[1] === "rec" && oldDaily(r[3], from)); })
      .map(function (r) { return { k: r[1], id: String(r[2]), j: r[3], u: Number(r[4]), del: Number(r[5]) === 1, by: r[6] }; });
    var acc = accList().map(pubAcc);
    return { ok: true, rows: L, cursor: Number(props().getProperty("SEQ") || 0), accounts: acc, discord: !!props().getProperty("DISCORD"), gen: props().getProperty("GEN|" + farm) || "" };
  },

  // 예전 기간 보기(보기 전용): f~t 사이 기록 전부 (내 농장만)
  range: function (q) {
    var S = session(q.token); if (!S) return { ok: false, err: "auth" };
    if (!canFarm(S, q.farm) || !q.f || !q.t) return { ok: false, err: "farm" };
    var L = [];
    dataRows().forEach(function (r) {
      if (r[0] !== q.farm || r[1] !== "rec" || Number(r[5]) === 1) return;
      var o; try { o = JSON.parse(String(r[3])); } catch (e) { return; }
      if (o && o.workDate >= q.f && o.workDate <= q.t) L.push(o);
    });
    return { ok: true, recs: L };
  },

  // 대표: 서버 새로 시작 — 이 농장 기록을 지우지 않고 '보관 …' 시트로 옮김(드라이브 백업 먼저) · 계정·PIN 은 그대로
  fresh: function (q) {
    var S = session(q.token); if (!S || S.role !== "admin") return { ok: false, err: "admin only" };
    if (!q.farm || q.yes !== q.farm) return { ok: false, err: "confirm" };
    backupNow(new Date(), "새로 시작 전 ");
    var name = farmSwap(q.farm, null);
    logA(S.acc, "fresh", name); return { ok: true, archived: name };
  },
  // 대표: 되돌리기 — 가장 최근 보관(또는 q.name)을 제자리로, 지금 기록은 다시 보관(아무것도 안 지움)
  rollback: function (q) {
    var S = session(q.token); if (!S || S.role !== "admin") return { ok: false, err: "admin only" };
    var L = archives(q.farm); if (!L.length) return { ok: false, err: "보관된 기록이 없습니다" };
    var pick = q.name && L.indexOf(q.name) >= 0 ? q.name : L[L.length - 1];
    backupNow(new Date(), "되돌리기 전 ");
    var name = farmSwap(q.farm, pick);
    logA(S.acc, "rollback", pick); return { ok: true, restored: pick, archived: name };
  },
  archives: function (q) {
    var S = session(q.token); if (!S || S.role !== "admin") return { ok: false, err: "admin only" };
    return { ok: true, list: archives(q.farm) };
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
  ScriptApp.getProjectTriggers().forEach(function (t) { if (["reguTick", "alarmTick", "backupTick"].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("reguTick").timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger("alarmTick").timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger("backupTick").timeBased().everyDays(1).atHour(3).inTimezone("Asia/Seoul").create();
}

// 휴대폰에 남기는 기록: 모돈 번식(모돈 번호가 붙은 기록·아래 종류)은 기간과 상관없이 항상. 앱 90-sync 의 keepAlways 와 같은 규칙
var KEEP_T = ["교배", "임신확인", "분만", "이유", "양자", "도태", "도입", "BCS", "동기화", "레규급여"];
function oldDaily(j, from) {
  var o; try { o = JSON.parse(String(j)); } catch (e) { return false; }
  if (!o || !o.workDate || o.workDate >= from) return false;
  return !(KEEP_T.indexOf(o.type) >= 0 || (o.data && o.data.sow));
}

// ---------- 드라이브 백업: 매일 새벽 3시 '비담농장 백업' 폴더에 시트 전체를 파일 하나로 · 최근 30일 + 그 전은 매월 1일 것만 남김 ----------
var BK_DIR = "비담농장 백업";
function backupTick() { backupNow(new Date()); }
function backupFolder() { var it = DriveApp.getFoldersByName(BK_DIR); return it.hasNext() ? it.next() : DriveApp.createFolder(BK_DIR); }
function backupNow(now, why) {
  var day = Utilities.formatDate(now, "Asia/Seoul", "yyyy-MM-dd"), dir = backupFolder(), pre = SS().getName() + " 백업 ", name = why ? SS().getName() + " " + why + Utilities.formatDate(now, "Asia/Seoul", "yyyy-MM-dd HHmmss") + ".json" : pre + day + ".json";
  if (dir.getFilesByName(name).hasNext()) return name;
  var all = {}; ["data", "accounts"].forEach(function (n) { var x = sh(n); all[n] = x.getLastRow() ? x.getRange(1, 1, x.getLastRow(), Math.max(1, x.getLastColumn())).getValues() : []; });
  dir.createFile(name, JSON.stringify({ at: nowIso(), seq: Number(props().getProperty("SEQ") || 0), sheets: all }), "application/json");
  var keep = Utilities.formatDate(new Date(now.getTime() - 30 * 86400000), "Asia/Seoul", "yyyy-MM-dd"), files = dir.getFiles();
  while (files.hasNext()) { var f = files.next(), n = f.getName(); if (n.indexOf(pre) !== 0) continue; var d = n.slice(pre.length, pre.length + 10); if (d < keep && d.slice(8) !== "01") f.setTrashed(true); }
  return name;
}
// 농장 기록 갈아 끼우기: 이 농장 행을 '보관 농장 날짜' 시트로 옮기고, back 시트가 있으면 그 행을 data 로 되돌림. 다른 농장 행·계정은 그대로
function archives(farm) { return SS().getSheets().map(function (x) { return x.getName(); }).filter(function (n) { return n.indexOf("보관 " + farm + " ") === 0; }).sort(); }
function farmSwap(farm, back) {
  var s = sh("data"), n = s.getLastRow(), w = Math.max(8, s.getLastColumn()), all = n > 1 ? s.getRange(2, 1, n - 1, w).getValues() : [];
  // 기록·모돈만 옮김(설정 key 는 그대로 둠)
  var moved = function (r) { return r[0] === farm && (r[1] === "rec" || r[1] === "sow"); };
  var mine = all.filter(moved), rest = all.filter(function (r) { return !moved(r); });
  var name = "보관 " + farm + " " + Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss"), base = name, k = 2;
  while (SS().getSheetByName(name)) name = base + " (" + (k++) + ")";
  var a = SS().insertSheet(name); a.getRange(1, 1, 1, w).setValues([HEAD.data.concat(new Array(w - 8).fill(""))]);
  if (mine.length) a.getRange(2, 1, mine.length, w).setValues(mine);
  if (back) { var b = SS().getSheetByName(back), bn = b.getLastRow(), bw = Math.max(8, b.getLastColumn()); if (bn > 1) {
    var BR = b.getRange(2, 1, bn - 1, bw).getValues(), W = Math.max(w, bw); rest = rest.concat(BR); w = W; } SS().deleteSheet(b); }
  rest = rest.map(function (r) { r = r.slice(); while (r.length < w) r.push(""); return r; });
  if (w > s.getMaxColumns()) s.insertColumnsAfter(s.getMaxColumns(), w - s.getMaxColumns());
  if (n > 1) s.getRange(2, 1, n - 1, Math.max(8, s.getLastColumn())).clearContent();
  if (rest.length) s.getRange(2, 1, rest.length, w).setValues(rest);
  var p = props(); p.setProperty("GEN|" + farm, name); p.setProperty("SEQ", String(Number(p.getProperty("SEQ") || 0) + 1));   // 휴대폰들이 바뀐 걸 알고 전부 다시 받게
  return name;
}

// 복원(편집기에서 직접 실행, 비상용): 가장 최근 백업 파일 → data·accounts 시트를 그 내용으로 바꿈. 끝나면 휴대폰마다 '전부 다시 받기'
function restoreBackup() {
  var dir = backupFolder(), pre = SS().getName() + " 백업 ", files = dir.getFiles(), best = null;
  while (files.hasNext()) { var f = files.next(); if (f.getName().indexOf(pre) === 0 && (!best || f.getName() > best.getName())) best = f; }
  if (!best) throw new Error("백업 파일이 없습니다");
  var B = JSON.parse(best.getBlob().getDataAsString());
  ["data", "accounts"].forEach(function (n) { var x = sh(n), v = B.sheets[n] || []; x.clearContents(); if (v.length) x.getRange(1, 1, v.length, v[0].length).setValues(v); });
  var p = props(); if (Number(p.getProperty("SEQ") || 0) < B.seq) p.setProperty("SEQ", String(B.seq));
  p.setProperty("SEQ", String(Number(p.getProperty("SEQ")) + 1));   // 휴대폰들이 '바뀜'을 알아채게
  return best.getName();
}

// ---------- 시간 알림: 앱이 만든 계획(key alarm§plan = [{id,at:"yyyy-MM-dd HH:mm",msg}]) 중 시각이 된 것을 한 번씩 보냄 ----------
function alarmTick() { alarmCheck(new Date()); }
function alarmCheck(now) {
  if (!props().getProperty("DISCORD")) return;   // 디스코드 주소가 없으면 '보냄' 표시도 하지 않음(주소 넣은 뒤 보내지게)
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
  if (!props().getProperty("DISCORD")) return;
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
