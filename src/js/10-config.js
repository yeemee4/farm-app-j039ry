/* ================= 기본 설정 ================= */
const CFG = {
  gest: FARM.gest,
  weanMateLimit: 4,
  returnCheck: FARM.checkDays,
  pregCheck: FARM.pregDays[0],
  farrowIn: FARM.farrowIn,
  weanDay: FARM.weanDay,
  st: { weanNoMate: 14, farrowNoWean: 42, mateNoCheck: 35, gestOver: 117, giltNoMate: 60 }
};
const ST_LABEL = {
  weanNoMate: "이유 후 교배 기록 없음",
  farrowNoWean: "분만 후 이유 기록 없음",
  mateNoCheck: "교배 후 임신 확인 없음",
  gestOver: "교배 후 분만 기록 없음",
  giltNoMate: "후보돈 도입 후 교배 없음"
};
const BARNS = FARM.barns.slice();
const SOW_LOCS = FARM.sowLocs.slice();
const PIG_STAGES = ["포유자돈", "이유자돈", "육성돈", "비육돈", "모돈", "웅돈"];
const CAUSES = ["압사", "설사·소화기", "호흡기", "허약", "외상", "원인불명", "기타"];
const WORKERS = ["김OO", "이OO", "박OO", "Nguyen"];
const ACTIONS = [
  "보온 확인",
  "환기 점검",
  "전해질 급여",
  "초유·젖 확인",
  "격리",
  "소독",
  "분만틀·보온등 점검",
  "수의사 연락",
  "부검·시료 채취",
  "투약",
  "재확인"
];
const REC = {
  "설사·소화기": ["보온 확인", "전해질 급여", "격리", "재확인"],
  호흡기: ["환기 점검", "격리", "수의사 연락", "재확인"],
  압사: ["분만틀·보온등 점검", "재확인"],
  허약: ["보온 확인", "초유·젖 확인", "재확인"],
  외상: ["격리", "소독", "재확인"],
  원인불명: ["수의사 연락", "부검·시료 채취", "재확인"],
  기타: ["재확인"]
};
const CULL_REASONS = ["번식장애(재발·공태)", "산자수 저조", "지제·다리 불량", "노산", "질병", "기타"];
const TYPES = {
  폐사: { c: "var(--red)", s: "폐" },
  교배: { c: "var(--blue)", s: "교" },
  임신확인: { c: "var(--accent)", s: "진" },
  분만: { c: "var(--accent)", s: "분" },
  이유: { c: "var(--amber)", s: "이" },
  백신: { c: "var(--blue)", s: "백" },
  이동: { c: "var(--muted)", s: "동" },
  출하: { c: "var(--accent)", s: "출" },
  사료: { c: "var(--amber)", s: "사" },
  약품: { c: "var(--blue)", s: "약" },
  특이사항: { c: "var(--muted)", s: "특" },
  도입: { c: "var(--muted)", s: "후" },
  조치: { c: "var(--accent)", s: "✓" },
  도태: { c: "var(--ink)", s: "도" },
  BCS: { c: "var(--muted)", s: "B" },
  돈군백신: { c: "var(--blue)", s: "군" },
  재고: { c: "var(--amber)", s: "재" },
  양자: { c: "var(--accent)", s: "양" },
  실사: { c: "var(--muted)", s: "실" }
};
const LABEL = {
  임신확인: "임신 확인",
  백신: "모돈 백신",
  약품: "돈군 약품",
  도입: "후보돈 도입",
  돈군백신: "돈군 백신",
  재고: "재고 입출고"
};
const L = x => (state && state.labels && state.labels.quick && state.labels.quick[x]) || t(LABEL[x] || x);
const QUICK = [
  "폐사",
  "교배",
  "임신확인",
  "분만",
  "이유",
  "백신",
  "돈군백신",
  "이동",
  "출하",
  "사료",
  "약품",
  "재고",
  "특이사항",
  "도입",
  "BCS"
];
const DAILY = ["폐사", "교배", "분만", "이유", "이동", "사료"];

/* ================= 날짜 ================= */
const pad = n => String(n).padStart(2, "0");
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TODAY = fmt(new Date());
let REF = TODAY;
const toUTC = s => {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const addDays = (s, n) => {
  const t = new Date(toUTC(s) + n * 864e5);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};
const diff = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 864e5);
const WD = "일월화수목금토";
const kDate = s => {
  const t = new Date(toUTC(s));
  return `${t.getUTCMonth() + 1}/${t.getUTCDate()} (${WD[t.getUTCDay()]})`;
};
const kTime = iso => {
  const t = new Date(iso);
  return `${pad(t.getHours())}:${pad(t.getMinutes())}`;
};
const localDateOf = iso => fmt(new Date(iso));

/* ================= 저장 ================= */
const KEY = ENV === "test" ? "farm-test-v3" : "farm-proto-v3"; // 시험용(test/)은 저장 공간 따로
let state,
  storageOK = true;
function load() {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return JSON.parse(s);
  } catch (e) {
    storageOK = false;
  }
  return null;
}
// 같은 화면·같은 데이터 안에서 무거운 계산 한 번만(저사양 기기) — 저장·화면 그리기·기록 수 변화 때 비움
let MEMO = {};
function memo(k, f) {
  k += "|" + state.records.length + "|" + state.sows.length;
  return k in MEMO ? MEMO[k] : (MEMO[k] = f());
}
// 기록 종류별 묶음(순서 그대로) — state.records 전체를 매번 훑지 않게
const recsOf = ty =>
  memo("ty", () => {
    const m = {};
    state.records.forEach(r => (m[r.type] = m[r.type] || []).push(r));
    return m;
  })[ty] || [];
const AFTER_SAVE = []; // 저장 뒤 할 일(90 동기화 등) — save 를 감싸지 말고 여기에 등록
function save() {
  SIDX = null;
  MEMO = {};
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(state, (k, v) => (k === "records" && Array.isArray(v) ? v.filter(r => !r._old) : v))
    );
  } catch (e) {
    storageOK = false;
  }
  AFTER_SAVE.forEach(f => f());
}
let uid = Date.now();
const DEVID = (() => {
  try {
    let d = localStorage.getItem("farm-dev");
    if (!d) {
      d = Math.random().toString(36).slice(2, 5);
      localStorage.setItem("farm-dev", d);
    }
    return d;
  } catch (e) {
    return Math.random().toString(36).slice(2, 5);
  }
})();
const newId = () => (uid++).toString(36) + DEVID; // 기기 표시를 붙여 여러 휴대폰에서 겹치지 않게
const $ = s => document.querySelector(s);
const esc = s =>
  String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
