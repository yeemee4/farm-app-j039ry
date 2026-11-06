/* ===== 모돈 탭 › + 모돈 추가 (대표 그림 2026-11-01) =====
   돈사 고르기 → 배치도(확대·축소)에서 지금 칸 누르기 → 모돈 번호(6-0 은 미리, 숫자만) → 부국사료 모돈현황판 모양 표에 바로 입력 → 저장.
   카드는 초기 등록과 같은 저장 공간(state.setup.cards, suCard 83)에 넣고 suApplyAll 로 교배·재발·임신확인·분만·양자·이유 기록 + 모돈을 만든다.
   카드에 없는 칸(미라·두 번째 재발·정액)도 표에 있음. 저장 안 하고 나가면 저장할지 묻는다. 사 온 후보돈 = 산차 칸을 비우고 구입일·구입처만. */
const SA_ROWS = [
  ["m1", "교배일", "md"],
  ["s1", "정액·웅돈", "txt"],
  ["r1", "재발일", "md"],
  ["m2", "재발 후 교배일", "md"],
  ["s2", "정액(재교배)", "txt"],
  ["r2", "재발일 2", "md"],
  ["f", "분만일", "md"],
  ["tot", "총산자수", "n"],
  ["still", "사산", "n"],
  ["mum", "미라", "n"],
  ["nurse", "포유개시두수", "n"],
  ["w", "이유일", "md"],
  ["wn", "이유두수", "n"],
  ["note", "특이사항", "txt"]
];
const ps0 = n => [1, 2, 3, 4].map(k => (n - 1) * 4 + k);
const SA_TOP = [
  ["birth", "생년월일"],
  ["intro", "구입일"],
  ["firstMate", "초교배예정일"]
];
// ‘1/2’·‘1.2’·‘1-2’·‘0102’·‘102’ → "0102"(MMDD) · 알아볼 수 없으면 ""
function saMD(v) {
  const s2 = String(v || "").trim();
  let m, d;
  const a = /^(\d{1,2})[/.\- ]+(\d{1,2})$/.exec(s2);
  if (a) [m, d] = [+a[1], +a[2]];
  else if (/^\d{4}$/.test(s2)) [m, d] = [+s2.slice(0, 2), +s2.slice(2)];
  else if (/^\d{3}$/.test(s2)) [m, d] = [+s2[0], +s2.slice(1)];
  else return "";
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? String(m).padStart(2, "0") + String(d).padStart(2, "0") : "";
}
const saLocs = () => [...BM_BARNS(), ...SOW_LOCS.filter(l => !BM_BARNS().includes(l))];
// 모돈 번호 = 연도 끝자리-001~999 (2026년 6-001~6-999, 2027년 7-001~7-999). 칸에는 ‘6-0’이 미리 들어 있고 지울 수 있음
const saYr = () => TODAY.slice(3, 4);
function saFmt(v) {
  const d = String(v || "").replace(/\D/g, "");
  if (d.length < 2) return d;
  let r = d.slice(1);
  if (r.length > 3) r = r.replace(/^0+(?=\d{3})/, "").slice(0, 3);
  return d[0] + "-" + r;
}
function saNo(v) {
  const m = /^(\d)-(\d{1,3})$/.exec(saFmt(v));
  return m && +m[2] > 0 ? `${m[1]}-${m[2].padStart(3, "0")}` : "";
}
// 지금 칸에 있는 모돈(초기 등록 카드 또는 앱 모돈)
function saAt(b, st) {
  const c = Object.values(suS().cards).find(x => x.barn === b && x.stall === st);
  if (c) return c.id;
  const s = activeSows().find(x => x.loc === b && x.stall === st);
  return s ? s.id : "";
}
// 카드 표: 열 = 산차, 줄 = SA_ROWS. 날짜는 카드처럼 ‘1023’ 네 자리(연도는 산차 순서로 자동, suDates)
function saGrid() {
  const W = ui.sa,
    c = W.d,
    pg = W.pg || 1,
    ps = [1, 2, 3, 4].map(k => (pg - 1) * 4 + k), // 한 장에 4산(대표 요청): 1~4산 · 5~8산 · 9산~
    D = suDates(c),
    gc = p => (((p - 1) >> 2) % 2 ? " vi" : "");
  // 날짜 칸: ‘1/2’·‘1.2’·‘0102’ 로 넣으면 1월 2일(저장은 MMDD), 칸에는 ‘1월 2일’ 두 줄로 보임(누르면 1/2 로 고침)
  const cell = (p, k, typ) => {
    const v = (c.cols[p] || {})[k] ?? "",
      md = typ === "md" && /^\d{4}$/.test(v) ? [+v.slice(0, 2), +v.slice(2)] : null,
      yr = md && D[p + "|" + k] ? D[p + "|" + k].slice(2, 4) : "";
    if (typ === "md")
      return `<td class="${gc(p).trim()} sa-dt"><span class="sa-md">${md ? `${md[0]}${t("월")} ${md[1]}${t("일")}` : ""}</span><input class="sa-in" size="1" data-sac="${p}|${k}" value="${md ? md.join("/") : esc(v)}" type="text" inputmode="none" data-numpad="1" maxlength="5" placeholder="${t("월/일")}" aria-label="${p}${t("산")} ${t(SA_ROWS.find(x => x[0] === k)[1])}">${yr ? `<small>'${yr}</small>` : ""}</td>`;
    return `<td class="${gc(p).trim()}"><input class="sa-in" size="1" data-sac="${p}|${k}" value="${esc(v)}" ${k === "note" ? 'type="text"' : 'type="text" inputmode="none" data-numpad="1"'} aria-label="${p}${t("산")} ${t(SA_ROWS.find(x => x[0] === k)[1])}"></td>`;
  };
  return `<div class="sa-wrap"><table class="sc-tb sa-tb"><thead><tr><th class="sc-l">${t("항목")} ╱ ${t("산차")}</th>${ps.map(p => `<th class="${gc(p).trim()}">${p}${t("산")}</th>`).join("")}</tr></thead><tbody>${SA_ROWS.map(([k, l, typ]) => `<tr><th class="sc-l">${t(l)}</th>${ps.map(p => cell(p, k, typ)).join("")}</tr>`).join("")}</tbody></table></div><div class="sc-nav">${[
    [1, "1~4"],
    [2, "5~8"],
    [3, "9~12"]
  ]
    .map(
      ([n, l]) =>
        `<button type="button" class="chip ${n === pg ? "on" : ""} ${ps0(n).some(p => c.cols[p] && Object.keys(c.cols[p]).length) ? "has" : ""}" data-a="saPg" data-v="${n}">${l}${t("산")}</button>`
    )
    .join("")}</div>`;
}
function vSowAdd() {
  const W = ui.sa,
    hd = (back, ti) =>
      `<div class="pagehd"><button class="back" type="button" data-a="saBack" data-v="${back}">‹ ${t(back === "x" ? "모돈" : "이전")}</button><h2>${ti}</h2></div>`;
  if (W.step === "barn")
    return (
      hd("x", t("모돈 추가")) +
      `<div class="su-q">${t("어느 돈사에 있나요?")}</div><div class="sa-barns">${saLocs()
        .map(b => `<button type="button" class="act" data-a="saBarn" data-v="${esc(b)}">${esc(t(b))}</button>`)
        .join("")}</div>`
    );
  if (W.step === "stall") {
    const z = fitZ(barnLayout(W.b)) * (ui.saK || 1);
    return (
      hd("barn", esc(t(W.b))) +
      `<div class="su-q">${t("이 모돈의 칸을 누르세요")}</div><div class="bm-head"><span>${t("모돈이 있는 칸은 번호가 보입니다 · 누르면 그 카드를 고칩니다")}</span><span class="bm-z"><button type="button" class="sbtn" data-a="saZoom" data-v="-15" style="min-width:48px;min-height:40px;font-size:20px" aria-label="${t("축소")}">－</button><button type="button" class="sbtn" data-a="saZoom" data-v="15" style="min-width:48px;min-height:40px;font-size:20px" aria-label="${t("확대")}">＋</button></span></div><div class="bm-wrap">${vBarnSvg(W.b, z, 0, "iniStall")}</div>`
    );
  }
  if (W.step === "no")
    return (
      hd(BM_BARNS().includes(W.b) ? "stall" : "barn", `${esc(t(W.b))}${W.st ? " " + esc(W.st) : ""}`) +
      `<div class="su-q">${t("모돈 번호는?")}</div><div class="sa-no"><input id="saNo" type="text" inputmode="numeric" maxlength="6" value="${esc(W.no || saYr() + "-0")}" aria-label="${t("모돈 번호")}"></div><div class="note">${t("이어서 숫자만 · 예: 6-0 다음 85 → 6-085 · 6-001 ~ 6-999")}</div><button class="act pri" type="button" data-a="saNoOk" style="width:100%;padding:14px">${t("다음")} ›</button>`
    );
  // 카드
  const c = W.d,
    bad = suBad(c);
  let h = hd("no", `${esc(c.id)} · ${esc(t(W.b))}${W.st ? " " + esc(W.st) : ""}`);
  h += `<div class="sowcard"><div class="sc-hd"><div class="sc-t">${t("모돈현황판")}</div><div class="sc-info"><div><small>${t("모돈번호")}</small><b>${esc(c.id)}</b></div><div><small>${t("품종")}</small><select data-sat="breed">${["LY", "LYD", "YL", "기타"].map(x => `<option ${c.breed === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>${SA_TOP.map(([k, l]) => `<div><small>${t(l)}</small><input type="date" data-sat="${k}" value="${esc(c[k] || "")}"></div>`).join("")}<div><small>${t("구입처")}</small><input type="text" data-sat="src" value="${esc(c.src || "")}"></div></div></div>${saGrid()}<div class="sc-foot">${t("날짜는 1/2 처럼(= 1월 2일) · 연도는 산차 순서로 자동 · 사 온 후보돈은 산차 칸을 비워 두세요")}</div></div>`;
  if (bad.length) h += `<div class="warnbox" style="display:block">${bad.map(esc).join("<br>")}</div>`;
  h += `<div class="acts sa-save"><button class="act pri" type="button" data-a="saSave" style="flex:1;padding:14px">${t("저장")}</button></div>`;
  // 앱 숫자판(대표 요청): 특이사항 말고는 휴대폰 키보드 대신 0~9 · - / + 만
  h += saPadHtml();
  return h;
}
// 앱 숫자판 html (모돈 추가 61a · 돈군 추가 61b 함께 씀)
function saPadHtml() {
  return `<div class="sa-pad" id="saPad" hidden>${[
    "1",
    "2",
    "3",
    "/",
    "4",
    "5",
    "6",
    "-",
    "7",
    "8",
    "9",
    "+",
    "⌫",
    "0",
    "다음",
    "완료"
  ]
    .map(
      k =>
        `<button type="button" data-kp="${k}" class="${k === "완료" ? "go" : k === "다음" ? "nx" : ""}">${k === "다음" || k === "완료" ? t(k) : k}</button>`
    )
    .join("")}</div>`;
}
// 저장: 카드 → state.setup.cards → 기록·모돈 만들기
function saCommit() {
  const W = ui.sa,
    c = suCard(W.d.id);
  Object.assign(c, JSON.parse(JSON.stringify(W.d)), { barn: W.b, stall: W.st || undefined });
  Object.keys(c.cols).forEach(p => {
    Object.keys(c.cols[p]).forEach(k => c.cols[p][k] === "" && delete c.cols[p][k]);
    if (!Object.keys(c.cols[p]).length) delete c.cols[p];
  });
  c.done = true;
  const ev = W.evict && W.evict !== c.id ? W.evict : null;
  if (ev && suS().cards[ev]) delete suS().cards[ev].stall;
  suApplyAll();
  if (ev) {
    const s2 = state.sows.find(x => x.id === ev);
    if (s2) delete s2.stall;
    W.evict = null;
  }
  save();
  W.dirty = false;
  toast(`${c.id} ${t("저장했습니다")}`);
}
// 나가기 전에: 저장 안 한 것이 있으면 묻기
function saLeave(go) {
  const W = ui.sa;
  if (W && W.dirty) {
    if (confirm(t("저장하지 않은 내용이 있습니다. 저장할까요?"))) saCommit();
    else W.dirty = false;
  }
  go();
  render();
  window.scrollTo(0, 0);
}
// 모돈 탭을 떠나면(아래 메뉴 등) 저장 안 한 것 묻고 닫기
BEFORE_RENDER.push(() => {
  if (ui.sa && tab !== "sows") {
    if (ui.sa.dirty && confirm(t("저장하지 않은 내용이 있습니다. 저장할까요?"))) saCommit();
    ui.sa = null;
  }
});
// ---- 앱 숫자판: 칸을 누르면 아래에 뜸, 누른 글자를 칸 끝에 붙임 · 다음 = 같은 산차 아래 칸 · 완료 = 닫기 ----
function saPadShow(on) {
  const P = $("#saPad");
  if (!P) return;
  P.hidden = !on;
  document.body.classList.toggle("sa-padon", on);
}
document.addEventListener("focusin", e => {
  if (e.target.dataset && e.target.dataset.numpad) {
    saPadShow(true);
    setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
  }
});
document.addEventListener("focusout", () =>
  setTimeout(() => {
    const a = document.activeElement;
    if (!(a && a.dataset && a.dataset.numpad)) saPadShow(false);
  }, 0)
);
document.addEventListener("pointerdown", e => {
  const b = e.target.closest && e.target.closest("#saPad button");
  if (!b) return;
  e.preventDefault(); // 칸에서 초점이 빠지지 않게
  const x = document.activeElement;
  if (!(x && x.dataset && x.dataset.numpad)) return;
  const k = b.dataset.kp;
  if (k === "완료") return x.blur();
  if (k === "다음") {
    x.dispatchEvent(new Event("change", { bubbles: true }));
    const L = [...document.querySelectorAll("[data-numpad]")],
      col = y => (y.dataset.sac || "").split("|")[0], // 모돈 카드: 같은 산차 아래 칸 먼저
      same = x.dataset.sac ? L.filter(y => col(y) === col(x)) : L,
      nx = same[same.indexOf(x) + 1] || L[L.indexOf(x) + 1];
    return nx ? nx.focus() : x.blur();
  }
  x.value = k === "⌫" ? x.value.slice(0, -1) : x.value + k;
  x.dispatchEvent(new Event("input", { bubbles: true }));
});
// 번호 칸을 누르면 글자 끝에 커서(‘6-0’ 뒤에 바로 이어서 입력)
document.addEventListener("focusin", e => {
  const x = e.target;
  if (x.id === "saNo") setTimeout(() => x.setSelectionRange(x.value.length, x.value.length), 0);
});
document.addEventListener("input", e => {
  const x = e.target;
  if (!ui.sa || !x.dataset) return;
  if (x.dataset.sac) {
    const [p, k] = x.dataset.sac.split("|"),
      typ = (SA_ROWS.find(r => r[0] === k) || [])[2];
    if (typ === "n") x.value = x.value.replace(/\D/g, "");
    if (typ === "md") x.value = x.value.replace(/[^0-9/.\- ]/g, "");
    const C = ui.sa.d.cols;
    (C[p] = C[p] || {})[k] = typ === "md" ? saMD(x.value) || x.value : x.value;
    ui.sa.dirty = true;
  } else if (x.dataset.sat) {
    ui.sa.d[x.dataset.sat] = x.value;
    ui.sa.dirty = true;
  } else if (x.id === "saNo") x.value = saFmt(x.value);
});
document.addEventListener("change", e => {
  const x = e.target;
  // 날짜 칸을 다 쓰고 나가면 ‘1월 2일’로 보이기
  if (ui.sa && x.dataset && x.dataset.sac && x.parentNode.classList.contains("sa-dt")) {
    const v = saMD(x.value),
      sp = x.parentNode.querySelector(".sa-md");
    if (v) x.value = +v.slice(0, 2) + "/" + +v.slice(2);
    if (sp) sp.innerHTML = v ? `${+v.slice(0, 2)}${t("월")} ${+v.slice(2)}${t("일")}` : "";
    x.parentNode.classList.toggle("bad", !!x.value && !v);
  }
  if (ui.sa && x.dataset && x.dataset.sat) {
    ui.sa.d[x.dataset.sat] = x.value;
    ui.sa.dirty = true;
  }
});
Object.assign(A, {
  sowAdd: () => {
    ui.sa = { step: "barn" };
    render();
    window.scrollTo(0, 0);
  },
  saBack: v =>
    saLeave(() => {
      if (v === "x") ui.sa = null;
      else ui.sa.step = v;
    }),
  saBarn: v => {
    ui.sa.b = v;
    ui.sa.st = "";
    ui.sa.step = BM_BARNS().includes(v) ? "stall" : "no";
    render();
    window.scrollTo(0, 0);
  },
  saZoom: v => {
    ui.saK = Math.max(1, Math.min(4, (ui.saK || 1) + (+v > 0 ? 0.5 : -0.5)));
    render();
  },
  iniStall: v => {
    const [b, st] = v.split("|"),
      id = saAt(b, st);
    ui.sa.st = st;
    ui.sa.no = id || "";
    ui.sa.step = "no";
    render();
    window.scrollTo(0, 0);
  },
  saNoOk: () => {
    const v = ($("#saNo") || {}).value || "",
      id = saNo(v);
    if (!id) return toast(t("번호를 6-001 ~ 6-999 처럼 넣어 주세요"));
    const s = state.sows.find(x => x.id === id);
    if (s && state.records.some(r => r.data && r.data.sow === id && !r.data.setup))
      return toast(t("이미 앱에 기록이 있는 모돈입니다. 모돈 상세에서 고쳐 주세요."));
    // 한 칸에 모돈 한 마리(밤 점검 2026-11-07): 다른 모돈이 있으면 묻고, 그 모돈은 칸에서 뺌(돈사는 그대로)
    const cur = ui.sa.st ? saAt(ui.sa.b, ui.sa.st) : "";
    ui.sa.evict = null;
    if (cur && cur !== id) {
      if (
        !confirm(
          `${t(ui.sa.b)} ${ui.sa.st}${t("번 칸에는")} ${cur} ${t("이(가) 있습니다.")} ${cur} ${t("을(를) 칸에서 빼고")} ${id} ${t("을(를) 넣을까요?")}`
        )
      )
        return;
      ui.sa.evict = cur;
    }
    ui.sa.no = v;
    ui.sa.d = JSON.parse(JSON.stringify(suS().cards[id] || { id, breed: FARM.breed || "LY", cols: {} }));
    ui.sa.pg = 1;
    ui.sa.dirty = false;
    ui.sa.step = "card";
    render();
    window.scrollTo(0, 0);
  },
  saPg: v => {
    ui.sa.pg = +v;
    render();
  },
  saSave: () => {
    saCommit();
    // 다음 칸으로: 같은 돈사 배치도로 돌아감
    ui.sa.step = BM_BARNS().includes(ui.sa.b) ? "stall" : "barn";
    render();
    window.scrollTo(0, 0);
  }
});
