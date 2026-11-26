/* ================= 양극성 기분 기록 웹앱 ================= */

const STORAGE_KEY = "bieval-web-v1";

/* ---- 매일 기록 항목 (모두 0~10점) ----
   key: 저장 필드명 · lo/hi: 슬라이더 양 끝 설명 · def: 기본값 */
const SCALE_MAX = 10;
const ITEMS = [
  { key: "dep", name: "우울", desc: "그날 느낀 우울감의 최고(가장 심했던) 정도", lo: "없음", hi: "매우 심함", def: 0 },
  { key: "elev", name: "고조 / 경조증·조증", desc: "기분이 들뜨거나 과도하게 활기찬 고조 상태의 정도", lo: "없음", hi: "매우 심함", def: 0 },
  { key: "irr", name: "분노 / 짜증", desc: "예민함이나 분노, 격앙된 짜증의 정도", lo: "없음", hi: "매우 심함", def: 0 },
  { key: "anx", name: "불안", desc: "불안감이나 초조함의 정도", lo: "없음", hi: "매우 심함", def: 0 },
  { key: "energy", name: "에너지 레벨", desc: "그날의 신체적·정신적 활동 에너지 수준 (5 = 평소 수준)", lo: "매우 낮음", hi: "매우 높음", def: 5 },
];
const showVal = (it, v) => (v == null ? "—" : String(v));

/* ================= 저장 ================= */
function loadData() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { daily: d?.daily || [] };
  } catch {
    return { daily: [] };
  }
}
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
  catch { alert("기록을 저장하지 못했습니다. 브라우저 저장 공간 설정을 확인해 주세요."); }
}
let store = loadData();

/* ---- 유틸 ---- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function todayInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const byDate = (a, b) => a.date.localeCompare(b.date);
/* 소수 시간(7.25) → "7시간 15분" */
function fmtSleep(v) {
  if (v == null) return "—";
  const min = Math.round(v * 60);
  return `${Math.floor(min / 60)}시간` + (min % 60 ? ` ${min % 60}분` : "");
}
const clampNum = (v, a, b) => Math.max(a, Math.min(b, v));

/* ================= 탭 ================= */
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    $(tab.dataset.tab).classList.add("active");
    if (tab.dataset.tab === "analysis") renderChart();
  });
});

/* ================= 매일 기분 기록 ================= */
function buildQuestions() {
  const ol = $("daily-questions");
  ol.innerHTML = "";
  ITEMS.forEach((it, i) => {
    const li = document.createElement("li");
    li.className = "q-item";
    li.innerHTML = `<div class="mood-head">
        <div class="q-text"><span class="q-num">${i + 1}.</span><span class="q-name">${it.name}</span>
          <span class="q-desc">${it.desc}</span></div>
        <span class="mood-score" style="color: var(--${it.key})"><span id="v-${it.key}">${it.def}</span>점</span>
      </div>
      <div class="slider-row">
        <span class="edge">0 ${it.lo}</span>
        <input type="range" min="0" max="${SCALE_MAX}" step="1" value="${it.def}" id="q-${it.key}"
          style="accent-color: var(--${it.key})" aria-label="${it.name}" />
        <span class="edge">${SCALE_MAX} ${it.hi}</span>
      </div>`;
    ol.appendChild(li);
  });
  ol.addEventListener("input", (e) => {
    if (e.target.type === "range") $("v-" + e.target.id.slice(2)).textContent = e.target.value;
  });
}
const readScore = (it) => parseInt($("q-" + it.key).value, 10);

$("daily-save").addEventListener("click", () => {
  const rec = { id: uid(), date: $("daily-date").value || todayInput() };
  ITEMS.forEach((it) => { rec[it.key] = readScore(it); });
  const hours = $("sleep-h").value === "" ? null
    : parseInt($("sleep-h").value, 10) + parseInt($("sleep-m").value, 10) / 60;
  rec.bedtime = $("sleep-bed-h").value ? `${$("sleep-bed-h").value}:${$("sleep-bed-m").value}` : "";
  rec.sleepHours = hours;
  rec.event = $("daily-event").value.trim();

  // 하루에 한 건: 같은 날짜 기록이 있으면 덮어쓸지 확인
  const idx = store.daily.findIndex((r) => r.date === rec.date);
  if (idx >= 0) {
    if (!confirm(`${rec.date} 기록이 이미 있습니다. 새 내용으로 바꿀까요?`)) return;
    rec.id = store.daily[idx].id;
    store.daily[idx] = rec;
  } else {
    store.daily.push(rec);
  }
  store.daily.sort(byDate);
  saveData();
  chartScrollToEnd = true;
  resetDailyForm();
  renderDailyTable();
});
$("daily-reset").addEventListener("click", resetDailyForm);

function resetDailyForm() {
  ITEMS.forEach((it) => { $("q-" + it.key).value = it.def; $("v-" + it.key).textContent = it.def; });
  $("sleep-bed-h").value = "";
  $("sleep-bed-m").value = "00";
  $("sleep-h").value = "";
  $("sleep-m").value = "0";
  $("daily-event").value = "";
  $("daily-date").value = todayInput();
}

function renderDailyTable() {
  const tbody = document.querySelector("#daily-table tbody");
  tbody.innerHTML = "";
  const has = store.daily.length > 0;
  $("daily-empty").style.display = has ? "none" : "block";
  $("daily-table").style.display = has ? "" : "none";
  [...store.daily].sort(byDate).reverse().forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${esc(r.date)}</td>` +
      ITEMS.map((it) => `<td>${showVal(it, r[it.key])}</td>`).join("") +
      `<td>${esc(r.bedtime) || "—"}</td><td>${fmtSleep(r.sleepHours)}</td>
      <td class="note-cell">${esc(r.event) || "—"}</td>
      <td><button class="btn link" data-del="${esc(r.id)}">삭제</button></td>`;
    tbody.appendChild(tr);
  });
}

/* ================= 삭제 / 전체삭제 ================= */
document.addEventListener("click", (e) => {
  const id = e.target.getAttribute("data-del");
  if (id && confirm("이 기록을 삭제할까요?")) {
    store.daily = store.daily.filter((r) => r.id !== id);
    saveData();
    renderDailyTable();
  }
});
$("clear-all").addEventListener("click", () => {
  if (confirm("모든 기록을 삭제합니다. 계속할까요?")) {
    store = { daily: [] };
    saveData();
    renderDailyTable();
    renderChart();
  }
});

/* ================= 결과 분석 (그래프) ================= */
const chartSeries = { dep: true, elev: true, energy: true, irr: true, anx: true, sleep: true };
document.querySelectorAll(".legend input[data-series]").forEach((cb) => {
  cb.addEventListener("change", () => { chartSeries[cb.dataset.series] = cb.checked; renderChart(); });
});

/* 두 단으로 된 그래프 — 외부 라이브러리 없이 SVG로 직접 렌더링.
   · 위(기분): 기준선 0에서 위로 고조(0~10), 아래로 우울(0~10) 막대
   · 아래: 분노/짜증·불안·에너지(0~10, 왼쪽 축) 선 + 수면 시간(오른쪽 축) 점선
   · 기본: 한 화면에 7개(넓은 화면 14개) · 핀치로 간격 조절 · 좌우로 밀어서 이동 */
const CHART_M = { top: 26, right: 44, bottom: 56, left: 44 };
const CHART_HA = 190;   // 위 단 높이
const CHART_GAP = 40;
const CHART_HB = 130;   // 아래 단 높이
const CHART_H = CHART_M.top + CHART_HA + CHART_GAP + CHART_HB + CHART_M.bottom;
const CHART_WIDE_BP = 600;
const CHART_MIN_PX = 14;
const CHART_MAX_PX = 240;
let chartPxPerPoint = null;
let chartScrollToEnd = true;

function chartDefaultVisible(cw) { return cw >= CHART_WIDE_BP ? 14 : 7; }

function renderChart() {
  const container = $("chart-container");
  const rows = [...store.daily].sort(byDate);
  container.innerHTML = "";
  if (rows.length === 0) { $("chart-empty").style.display = "block"; return; }
  $("chart-empty").style.display = "none";

  const css = getComputedStyle(document.documentElement);
  const col = (name, fb) => css.getPropertyValue(name).trim() || fb;
  const C = {
    dep: col("--dep", "#3a6df0"), elev: col("--elev", "#e8742c"), energy: col("--energy", "#6c4bd4"),
    irr: col("--irr", "#d9435a"), anx: col("--anx", "#1f9d6b"), sleep: col("--sleep", "#8a94a6"),
    grid: col("--border", "#dde3ec"), text: col("--muted", "#6b7688"),
  };

  const m = CHART_M, H = CHART_H, n = rows.length;
  const cw = container.clientWidth || 600;
  const availW = Math.max(120, cw - m.left - m.right);
  const visible = chartDefaultVisible(cw);
  if (chartPxPerPoint == null) chartPxPerPoint = availW / visible;
  chartPxPerPoint = clampNum(chartPxPerPoint, CHART_MIN_PX, CHART_MAX_PX);
  const px = chartPxPerPoint;

  const plotW = Math.max(px * n, availW);
  const W = m.left + plotW + m.right;
  const x = (i) => m.left + px * (i + 0.5);   // 각 날짜는 폭 px인 칸의 가운데

  const aTop = m.top, aMid = aTop + CHART_HA / 2, aUnit = CHART_HA / (2 * SCALE_MAX);
  const yA = (v) => aMid - v * aUnit;          // v: −10 ~ +10
  const bTop = aTop + CHART_HA + CHART_GAP, bBot = bTop + CHART_HB;
  const yB = (v) => bBot - (CHART_HB * v) / SCALE_MAX; // v: 0 ~ 10
  const maxSleep = Math.max(12, ...rows.map((r) => r.sleepHours || 0));
  const SLEEP_MAX = Math.ceil(maxSleep / 4) * 4;
  const yS = (v) => bBot - (CHART_HB * v) / SLEEP_MAX;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", W);
  svg.setAttribute("height", H);
  const el = (tag, attrs, text) => {
    const e = document.createElementNS(svgNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    svg.appendChild(e);
    return e;
  };
  const xr = m.left + plotW;

  // ---- 위 단 격자: +10 ~ −10 ----
  for (let v = SCALE_MAX; v >= -SCALE_MAX; v -= 5) {
    el("line", { x1: m.left, y1: yA(v), x2: xr, y2: yA(v), stroke: v === 0 ? C.text : C.grid, "stroke-width": v === 0 ? 1.5 : 1 });
    el("text", { x: m.left - 8, y: yA(v) + 4, "text-anchor": "end", "font-size": 11, fill: v > 0 ? C.elev : v < 0 ? C.dep : C.text }, Math.abs(v));
  }
  el("text", { x: m.left, y: aTop - 10, "text-anchor": "start", "font-size": 11, fill: C.text }, "▲ 고조 (0~10)  ·  ▼ 우울 (0~10)");

  // ---- 아래 단 격자: 0 ~ 10 / 수면 ----
  for (let v = 0; v <= SCALE_MAX; v += 2.5) {
    if (v % 5 !== 0) { el("line", { x1: m.left, y1: yB(v), x2: xr, y2: yB(v), stroke: C.grid, "stroke-width": 1, "stroke-dasharray": "2 4" }); }
    else
    { el("line", { x1: m.left, y1: yB(v), x2: xr, y2: yB(v), stroke: C.grid, "stroke-width": 1 });
      el("text", { x: m.left - 8, y: yB(v) + 4, "text-anchor": "end", "font-size": 11, fill: C.text }, v); }
    el("text", { x: xr + 8, y: yB(v) + 4, "text-anchor": "start", "font-size": 11, fill: C.sleep }, (SLEEP_MAX * v) / SCALE_MAX + "h");
  }
  el("text", { x: m.left, y: bTop - 10, "text-anchor": "start", "font-size": 11, fill: C.text }, "분노/짜증 · 불안 · 에너지 (0~10)");
  el("text", { x: xr, y: bTop - 10, "text-anchor": "end", "font-size": 11, fill: C.sleep }, "수면 시간");

  // ---- x축 라벨(날짜): 간격이 좁으면 일정 간격마다만 표시(마지막은 항상) ----
  const labelStep = Math.max(1, Math.ceil(68 / px));
  rows.forEach((r, i) => {
    const isLast = i === n - 1;
    if (!isLast && (i % labelStep !== 0 || (n - 1 - i) < labelStep)) return;
    const [yy, mm, dd] = r.date.split("-");
    [`${mm}-${dd}`, yy].forEach((p, k) => {
      el("text", { x: x(i), y: bBot + 18 + k * 14, "text-anchor": "middle", "font-size": 10, fill: C.text }, p);
    });
  });

  const showValues = px >= 34;

  // ---- 위 단: 고조(위)·우울(아래) 막대 ----
  const bw = clampNum(px * 0.55, 5, 30);
  rows.forEach((r, i) => {
    if (chartSeries.elev && r.elev > 0) {
      el("rect", { x: x(i) - bw / 2, y: yA(r.elev), width: bw, height: aMid - yA(r.elev), rx: 3, fill: C.elev });
      if (showValues) el("text", { x: x(i), y: yA(r.elev) - 5, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: C.elev }, r.elev);
    }
    if (chartSeries.dep && r.dep > 0) {
      el("rect", { x: x(i) - bw / 2, y: aMid, width: bw, height: yA(-r.dep) - aMid, rx: 3, fill: C.dep });
      if (showValues) el("text", { x: x(i), y: yA(-r.dep) + 13, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: C.dep }, r.dep);
    }
  });

  // ---- 선 계열 ----
  function drawLine(key, yFn, color, opts = {}) {
    let d = "", started = false;
    rows.forEach((r, i) => {
      const v = r[key];
      if (v === null || v === undefined) { started = false; return; }
      d += (started ? " L" : " M") + x(i) + " " + yFn(v);
      started = true;
    });
    if (d) el("path", { d: d.trim(), fill: "none", stroke: color, "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round", ...(opts.dash ? { "stroke-dasharray": "6 4" } : {}) });
    rows.forEach((r, i) => {
      const v = r[key];
      if (v === null || v === undefined) return;
      el("circle", { cx: x(i), cy: yFn(v), r: px < 24 ? 3 : 4, fill: color, stroke: col("--card-bg", "#fff"), "stroke-width": 1.5 });
      if (showValues && opts.label) el("text", { x: x(i), y: yFn(v) - 9, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: color }, opts.label(v));
    });
  }
    if (chartSeries.sleep) drawLine("sleepHours", yS, C.sleep, { dash: true, label: (v) => v + "h" });
  if (chartSeries.irr) drawLine("irr", yB, C.irr);
  if (chartSeries.anx) drawLine("anx", yB, C.anx);
  if (chartSeries.energy) drawLine("energy", yB, C.energy);

  // ---- 날짜별 상세(마우스를 올리거나 길게 누르면 표시) ----
  rows.forEach((r, i) => {
    const hit = el("rect", { x: x(i) - px / 2, y: aTop, width: px, height: bBot - aTop, fill: "transparent" });
    const t = document.createElementNS(svgNS, "title");
    t.textContent = `${r.date}\n` + ITEMS.map((it) => `${it.name}: ${showVal(it, r[it.key])}`).join("\n") +
      `\n전날 잠든 시간: ${r.bedtime || "—"}\n수면: ${fmtSleep(r.sleepHours)}` + (r.event ? `\n메모: ${r.event}` : "");
    hit.appendChild(t);
  });

  container.appendChild(svg);
  if (chartScrollToEnd) { container.scrollLeft = container.scrollWidth; chartScrollToEnd = false; }
}

/* 뷰포트 중앙을 기준으로 간격 확대/축소(+/− 버튼) */
function zoomChart(factor) {
  const c = $("chart-container");
  const old = chartPxPerPoint || 40;
  const neu = clampNum(old * factor, CHART_MIN_PX, CHART_MAX_PX);
  if (neu === old) return;
  const centerContent = c.scrollLeft + c.clientWidth / 2;
  chartPxPerPoint = neu;
  renderChart();
  const newCenter = CHART_M.left + (centerContent - CHART_M.left) * (neu / old);
  c.scrollLeft = newCenter - c.clientWidth / 2;
}

/* 핀치 중심(focusContent: 핀치 시작 당시 콘텐츠 좌표, focusViewport: 화면 내 x)을
   기준으로 간격을 newPx로 바꾸고, 그 지점이 손가락 아래 그대로 머무르도록 스크롤 보정 */
function applyChartSpacing(newPx, startPx, focusContent, focusViewport) {
  const c = $("chart-container");
  newPx = clampNum(newPx, CHART_MIN_PX, CHART_MAX_PX);
  if (newPx === chartPxPerPoint) return;
  chartPxPerPoint = newPx;
  renderChart();
  const newContent = CHART_M.left + (focusContent - CHART_M.left) * (newPx / startPx);
  c.scrollLeft = newContent - focusViewport;
}

/* 그래프 영역 안에서만 동작 (iOS Safari 포함, Touch 이벤트 기반):
   · 한 손가락 가로 드래그 → 좌우로 이동(팬)  / 세로 드래그는 페이지 스크롤에 양보
   · 두 손가락 핀치 → 데이터 간격 확대/축소(양방향)
   · 마우스 드래그 → 좌우 이동(데스크톱)
   그래프 밖에서는 핸들러가 없어 브라우저 기본 동작(페이지 확대/축소)이 그대로 작동한다. */
function setupChartGestures() {
  const c = $("chart-container");
  if (!c) return;

  const dist2 = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  let mode = 0;                          // 0=없음, 1=팬, 2=핀치
  let startX = 0, startY = 0, startScroll = 0, panLocked = false;
  let pinchDist = 0, pinchPx = 0, focusContent = 0, focusViewport = 0;

  const beginPan = (x, y) => { mode = 1; panLocked = false; startX = x; startY = y; startScroll = c.scrollLeft; };
  const beginPinch = (t) => {
    mode = 2;
    pinchDist = dist2(t);
    pinchPx = chartPxPerPoint || 40;
    const rect = c.getBoundingClientRect();
    focusViewport = (t[0].clientX + t[1].clientX) / 2 - rect.left;
    focusContent = c.scrollLeft + focusViewport;
  };

  c.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) { e.preventDefault(); beginPinch(e.touches); }
    else if (e.touches.length === 1) { beginPan(e.touches[0].clientX, e.touches[0].clientY); }
  }, { passive: false });

  c.addEventListener("touchmove", (e) => {
    if (mode === 2 && e.touches.length >= 2) {
      e.preventDefault(); // 그래프 위 핀치 → 간격 조절 (페이지 확대 안 함)
      applyChartSpacing(pinchPx * (dist2(e.touches) / pinchDist), pinchPx, focusContent, focusViewport);
    } else if (mode === 1 && e.touches.length === 1) {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!panLocked) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) panLocked = true;        // 가로 → 팬 확정
        else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) { mode = 0; return; } // 세로 → 페이지 스크롤 양보
        else return;
      }
      e.preventDefault();
      c.scrollLeft = startScroll - dx; // 한 손가락 좌우 이동
    }
  }, { passive: false });

  const onTouchEnd = (e) => {
    if (e.touches.length === 1) beginPan(e.touches[0].clientX, e.touches[0].clientY); // 핀치→한 손가락 전환
    else if (e.touches.length === 0) mode = 0;
  };
  c.addEventListener("touchend", onTouchEnd);
  c.addEventListener("touchcancel", onTouchEnd);

  // 데스크톱 마우스 드래그로 좌우 이동
  let mouseDown = false, mStartX = 0, mStartScroll = 0;
  c.addEventListener("mousedown", (e) => { mouseDown = true; mStartX = e.clientX; mStartScroll = c.scrollLeft; e.preventDefault(); });
  window.addEventListener("mousemove", (e) => { if (mouseDown) c.scrollLeft = mStartScroll - (e.clientX - mStartX); });
  window.addEventListener("mouseup", () => { mouseDown = false; });

  // iOS Safari: 그래프 위 핀치가 페이지 확대로 번지지 않도록 차단(간격 조절은 touchmove가 담당)
  ["gesturestart", "gesturechange", "gestureend"].forEach((ev) =>
    c.addEventListener(ev, (e) => e.preventDefault(), { passive: false })
  );
}

/* ================= 데이터 내보내기 / 가져오기 ================= */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
const fileStamp = () => todayInput() + "-" + new Date().toTimeString().slice(0, 5).replace(":", "");

$("export-data").addEventListener("click", () => {
  const payload = { app: "bieval", version: 1, exportedAt: new Date().toISOString(), daily: store.daily };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `기분기록-백업-${fileStamp()}.json`);
});

$("import-data").addEventListener("click", () => $("import-file").click());

const validRecord = (r) => r && typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
  ITEMS.every((it) => Number.isInteger(r[it.key]) && r[it.key] >= 0 && r[it.key] <= SCALE_MAX);

$("import-file").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const incoming = (Array.isArray(data.daily) ? data.daily : []).filter(validRecord).map((r) => {
        const rec = { id: String(r.id || uid()), date: r.date };
        ITEMS.forEach((it) => { rec[it.key] = r[it.key]; });
        rec.bedtime = /^\d{2}:\d{2}$/.test(r.bedtime) ? r.bedtime : "";
        rec.sleepHours = typeof r.sleepHours === "number" && r.sleepHours >= 0 && r.sleepHours <= 24 ? r.sleepHours : null;
        rec.event = String(r.event || "").slice(0, 200);
        return rec;
      });
      if (!incoming.length) {
        alert("가져올 기록이 없습니다. 올바른 백업 파일인지 확인해 주세요.");
        return;
      }
      const ok = confirm(
        `가져올 기록: ${incoming.length}건\n\n` +
        "확인 = 현재 기록에 병합(이미 기록이 있는 날짜는 건너뜀), 취소 = 가져오기 중단"
      );
      if (!ok) return;
      const seen = new Set(store.daily.map((r) => r.date));
      incoming.forEach((r) => { if (!seen.has(r.date)) { store.daily.push(r); seen.add(r.date); } });
      store.daily.sort(byDate);
      saveData();
      chartScrollToEnd = true;
      renderDailyTable();
      renderChart();
      alert("가져오기가 완료되었습니다.");
    } catch {
      alert("파일을 읽을 수 없습니다. 올바른 JSON 백업 파일인지 확인해 주세요.");
    } finally {
      e.target.value = "";
    }
  };
  reader.readAsText(file);
});

/* ================= CSV 저장 / 메일 보내기 ================= */
function csvEscape(v) {
  v = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(v) && isNaN(Number(v))) v = "'" + v; // 스프레드시트 수식 실행 방지
  return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
const csvFilename = () => `기분기록-${fileStamp()}.csv`;

function buildCSV() {
  const headers = ["날짜", "우울(0-10)", "고조(0-10)", "분노/짜증(0-10)", "불안(0-10)", "에너지(0-10)", "전날잠든시간", "총수면시간", "메모"];
  const lines = [headers.join(",")];
  [...store.daily].sort(byDate).forEach((r) => {
    const cells = [r.date, ...ITEMS.map((it) => r[it.key]), r.bedtime, r.sleepHours ?? "", r.event];
    lines.push(cells.map(csvEscape).join(","));
  });
  return "﻿" + lines.join("\r\n"); // BOM → Excel 한글 깨짐 방지
}

function hasRecords() { return store.daily.length > 0; }

$("export-csv").addEventListener("click", () => {
  if (!hasRecords()) { alert("저장된 기록이 없습니다."); return; }
  downloadBlob(new Blob([buildCSV()], { type: "text/csv;charset=utf-8" }), csvFilename());
});

$("email-csv").addEventListener("click", async () => {
  if (!hasRecords()) { alert("보낼 기록이 없습니다."); return; }
  const csv = buildCSV();
  const name = csvFilename();

  // 1) 파일 공유 지원 시(아이폰/안드로이드): 공유 시트 → 메일 앱에 CSV 첨부
  try {
    const file = new File([csv], name, { type: "text/csv" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "양극성 기분 기록 데이터", text: "양극성 기분 기록 CSV 데이터입니다." });
      return;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return; // 사용자가 취소
  }

  // 2) 폴백(주로 데스크톱): CSV를 내려받고 메일 작성 창을 연다(첨부는 수동)
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), name);
  const subject = encodeURIComponent("양극성 기분 기록 데이터");
  const body = encodeURIComponent(`방금 내려받은 CSV 파일(${name})을 이 메일에 첨부해 보내세요.`);
  location.href = `mailto:?subject=${subject}&body=${body}`;
});

/* ================= PWA: 서비스워커 등록 + 설치 안내 ================= */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $("install-app").hidden = false;
});
$("install-app").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $("install-app").hidden = true;
});
window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  $("install-app").hidden = true;
});

/* ================= 그래프 확대/축소 버튼 + 제스처 ================= */
$("chart-zoom-in").addEventListener("click", () => zoomChart(1.3));
$("chart-zoom-out").addEventListener("click", () => zoomChart(1 / 1.3));
$("chart-zoom-reset").addEventListener("click", () => {
  chartPxPerPoint = null;     // 기본(7개 맞춤)으로
  chartScrollToEnd = true;
  renderChart();
});
setupChartGestures();

// 창 크기·방향이 바뀌면 그래프를 기본 간격(세로 7 / 넓으면 14)으로 다시 맞춤
function resetChartDefault() {
  chartPxPerPoint = null;
  chartScrollToEnd = true;
  if (document.getElementById("analysis").classList.contains("active")) renderChart();
}
window.addEventListener("resize", resetChartDefault);
window.addEventListener("orientationchange", resetChartDefault);

/* ================= 초기화 ================= */
/* 수면 선택지 — 전날 잠든 시간: 시(저녁 6시부터 한 바퀴) + 분(0·15·30·45) */
(function buildBedtimeOptions() {
  let html = '<option value="">시 선택</option>';
  for (let k = 0; k < 24; k++) {
    const h = (18 + k) % 24;
    html += `<option value="${String(h).padStart(2, "0")}">${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}시</option>`;
  }
  $("sleep-bed-h").innerHTML = html;
  // 총 수면 시간: 시간(0~16) + 분(0·15·30·45)
  let hrs = '<option value="">시간 선택</option>';
  for (let v = 0; v <= 16; v++) hrs += `<option value="${v}">${v}시간</option>`;
  $("sleep-h").innerHTML = hrs;
  $("sleep-m").innerHTML = ["0", "15", "30", "45"].map((m) => `<option value="${m}">${m}분</option>`).join("");
  $("sleep-bed-m").innerHTML = ["00", "15", "30", "45"].map((m) => `<option value="${m}">${m}분</option>`).join("");
})();
buildQuestions();
resetDailyForm();
renderDailyTable();
