// ---- 디스코드 시간 알림: 앱이 오늘 알림 계획(state.alarm.plan)을 만들어 서버로 동기화 → 서버 alarmTick(5분마다)이 시각이 되면 보냄 ----
// 앱이 계산(할 일·일정·날씨 등 기존 로직 그대로) · 서버는 시각만 봄. 시험: state.alarm.test={day,at} → 그날 모든 알림을 그 시각에 + 기록 알림 예시
const ALARM_T = { todo: "07:30", wx: "07:30", semen1: "13:00", semen2: "15:30", eve: "18:00", close: "21:00" };
function alarmPlan() {
  const A = state.alarm || {},
    T0 = A.test && A.test.day === TODAY ? A.test.at : null,
    F = `[${FARM.name || "비담농장"}]`,
    P = [];
  const add = (id, at, msg, ex) => {
    if (msg) P.push({ id, at, msg: `${F} ${msg}` });
    else if (T0 && ex) P.push({ id, at, msg: `${F} ${ex} (예시 · 오늘은 해당 없음)` });
  };
  const sh = it => {
      try {
        return itemShort(it);
      } catch (e) {
        return "";
      }
    },
    list = (a, n = 6) => a.slice(0, n).join(", ") + (a.length > n ? ` 외 ${a.length - n}` : "");
  // 1 아침: 오늘 할 일 묶음
  let T = [];
  try {
    T = buildTodos().filter(x => x.items && x.items.length);
  } catch (e) {}
  add(
    "todo",
    ALARM_T.todo,
    T.length
      ? "📋 오늘 할 일\n" +
          T.map(x => `• ${t(x.t)} ${x.items.length}건: ${list(x.items.map(sh).filter(Boolean))}`).join("\n")
      : "",
    "📋 오늘 할 일\n• 교배 대상 2건: 6-001, 6-002"
  );
  // 2 아침: 날씨 경고 (오늘·내일)
  let w0 = "",
    w1 = "";
  try {
    w0 = wxAlerts(0);
    w1 = wxAlerts(1);
  } catch (e) {}
  const w = [w0, w1].filter(Boolean).join(" / ");
  add("wx", ALARM_T.wx, w ? "🌡 날씨 경고: " + w : "", "🌡 날씨 경고: 내일 최저 −2℃ 영하 진입 · 물 얼지 않게 점검");
  // 3 정액 주문 (마감 16:00)
  let so = {};
  try {
    so = semenOrder();
  } catch (e) {}
  const sm =
    so.order > 0 ? `🧪 정액 주문 ${so.order}팩 필요 (교배 예정 ${so.n}두 · 재고 ${so.stock}팩) · 마감 16:00` : "";
  add("semen1", ALARM_T.semen1, sm, "🧪 정액 주문 4팩 필요 (교배 예정 2두 · 재고 0팩) · 마감 16:00");
  add("semen2", ALARM_T.semen2, sm && "⏰ 30분 남음 · " + sm);
  // 4 저녁: 내일 일정 (분만·이유·교배·임신확인·백신·입식)
  const tm = addDays(TODAY, 1);
  let ev = [];
  try {
    ev = (calEvents(tm).ev || {})[tm] || [];
  } catch (e) {}
  const g = {};
  ev.forEach(([k, v]) => (g[k] = g[k] || []).push(v));
  add(
    "eve",
    ALARM_T.eve,
    ev.length || w1
      ? "📅 내일 일정" +
          (w1 ? "\n🌡 " + w1 : "") +
          "\n" +
          Object.keys(g)
            .map(k => `• ${L(k)} ${g[k].length}: ${list(g[k])}`)
            .join("\n")
      : "",
    "📅 내일 일정\n• 분만 1: 6-004"
  );
  // 5 마감: 오늘 기록 누락
  let cm = [];
  try {
    cm = closeMiss(TODAY);
  } catch (e) {}
  add(
    "close",
    closeBy(),
    cm.length ? `📝 ${closeBy()} 기록 마감 · 빠진 기록: ${cm.map(L).join(", ")}` : "",
    `📝 ${closeBy()} 기록 마감 · 빠진 기록: 사료`
  );
  // 6 같은 돈사 하루 폐사 3두 이상 (지금 바로)
  const dd = {};
  recsOf("폐사")
    .filter(r => r.workDate === TODAY)
    .forEach(r => {
      const b = r.data.barn || "?";
      dd[b] = (dd[b] || 0) + (+r.data.n || 1);
    });
  const hot = Object.keys(dd).filter(b => dd[b] >= 3);
  add(
    "dead",
    nowHM().slice(0, 3) + "00",
    hot.length ? "⚠ 폐사 많음: " + hot.map(b => `${b} ${dd[b]}두`).join(", ") : "",
    "⚠ 폐사 많음: 자돈사 4두"
  );
  // 시험: 모든 알림을 시험 시각에 + 기록 알림 예시(최근 기록, 켜진 종류마다 1건)
  if (T0) {
    P.forEach(x => (x.at = T0));
    const ex = NOTIF_ON.map(k => {
      const r = state.records.filter(x => x.type === k).slice(-1)[0];
      try {
        return r ? `• ${L(k)} · ${summary(r)}` : `• ${L(k)} · (기록 없음)`;
      } catch (e) {
        return "";
      }
    }).filter(Boolean);
    P.unshift({ id: "head", at: T0, msg: `${F} 🔔 알림 시험 ${T0} — 아래는 모든 알림 예시입니다` });
    P.push({ id: "rec", at: T0, msg: `${F} 기록 알림 예시 (입력하면 바로 오는 알림)\n` + ex.join("\n") });
  }
  return P.map(x => ({ id: TODAY + "|" + (T0 ? "test" + T0 + "|" : "") + x.id, at: TODAY + " " + x.at, msg: x.msg }));
}
let alT = null;
function alarmSync() {
  if (typeof syOn !== "function" || !syOn() || (typeof MODE !== "undefined" && MODE === "setup")) return;
  clearTimeout(alT);
  alT = setTimeout(() => {
    try {
      const P = alarmPlan(),
        A = (state.alarm = state.alarm || {});
      if (JSON.stringify(A.plan) !== JSON.stringify(P)) {
        A.plan = P;
        save();
      }
    } catch (e) {}
  }, 2500);
}
AFTER_RENDER.push(alarmSync);
setInterval(alarmSync, 5 * 60000);
Object.assign(A, {
  alTest: () => {
    const at = ($("#alAt") || {}).value || "11:45";
    state.alarm = state.alarm || {};
    state.alarm.test = { day: TODAY, at };
    save();
    alarmSync();
    toast(t("오늘") + " " + at + " " + t("에 모든 알림을 시험으로 보냅니다"));
    render();
  },
  alTestOff: () => {
    if (state.alarm) delete state.alarm.test;
    save();
    alarmSync();
    render();
  }
});
function alarmTestBox() {
  const T = (state.alarm || {}).test,
    on = T && T.day === TODAY;
  return `<div class="sec-t">${t("알림 시험")}</div><div class="panel"><p class="sow-meta">${t("정한 시각에 오늘의 모든 디스코드 알림(할 일·날씨·정액·내일 일정·마감·폐사·기록 알림 예시)을 한꺼번에 보냅니다. 서버가 5분마다 확인하므로 최대 5분 늦을 수 있습니다.")}</p>
  <div class="setrow"><span>${t("보낼 시각")}</span><input id="alAt" type="time" value="${on ? T.at : "11:45"}"></div>
  <button class="act pri" type="button" data-a="alTest">${on ? t("다시 예약") : t("시험 예약")}</button> ${on ? `<button class="act" type="button" data-a="alTestOff">${t("시험 끄기")}</button> <b>${t("예약됨")} ${T.at}</b>` : ""}</div>`;
}
