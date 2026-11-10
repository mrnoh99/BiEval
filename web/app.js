/* ================= 기분 측정표 웹앱 ================= */

const STORAGE_KEY = "bieval-web-v1";

/* ---- 매일 기록 항목 (각 0~10점) ----
   항목을 바꾸려면 이 배열만 수정하면 됩니다. key는 저장 필드명, color는 styles.css의 CSS 변수. */
const ITEMS = [
  { key: "dep", label: "우울", short: "우울", color: "--dep", def: 0, lo: "없음", hi: "극심",
    desc: "그날 느낀 우울감의 최고(가장 심했던) 정도" },
  { key: "mania", label: "고조 / 경조증·조증", short: "고조", color: "--mania", def: 0, lo: "없음", hi: "극심",
    desc: "기분이 들뜨거나 과도하게 활기찬 고조 상태의 정도" },
  { key: "irr", label: "짜증", short: "짜증", color: "--irr", def: 0, lo: "없음", hi: "극심",
    desc: "예민함이나 분노, 격앙된 짜증의 정도" },
  { key: "anx", label: "불안", short: "불안", color: "--anx", def: 0, lo: "없음", hi: "극심",
    desc: "불안감이나 초조함의 정도" },
  { key: "energy", label: "에너지 레벨", short: "에너지", color: "--energy", def: 5, lo: "매우 낮음", hi: "매우 높음",
    desc: "그날의 신체적·정신적 활동 에너지 수준" },
];
const SLEEP_COLOR = "--sleep";

/* ================= 저장 ================= */
function loadData() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { records: Array.isArray(d?.records) ? d.records : [] };
  } catch {
    return { records: [] };
  }
}
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
  catch { alert("기록을 저장하지 못했습니다. 브라우저 저장 공간 설정을 확인해 주세요."); }
}
let store = loadData();

/* ---- 유틸 ---- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function dateInput(d) {
  d = new Date(d);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
const todayInput = () => dateInput(new Date());
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const byDate = (a, b) => a.date.localeCompare(b.date);
const clampNum = (v, a, b) => Math.max(a, Math.min(b, v));

/* ================= 탭 ================= */
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    $(tab.dataset.tab).classList.add("active");
    if (tab.dataset.tab === "analysis") renderAnalysis();
  });
});

/* ================= 기분 기록 폼 ================= */
function buildItems() {
  $("mood-items").innerHTML = ITEMS.map((it) => `
    <div class="m-item" style="--c: var(${it.color})">
      <div class="m-head">
        <label class="m-label" for="r-${it.key}">${it.label}</label>
        <span class="m-score"><span id="v-${it.key}">${it.def}</span><small> / 10</small></span>
      </div>
      <p class="m-desc">${it.desc}</p>
      <div class="slider-row">
        <span class="edge">0 ${it.lo}</span>
        <input type="range" min="0" max="10" step="1" value="${it.def}" id="r-${it.key}" />
        <span class="edge">10 ${it.hi}</span>
      </div>
    </div>`).join("");
  ITEMS.forEach((it) => $("r-" + it.key).addEventListener("input", updateScores));
}
function updateScores() {
  ITEMS.forEach((it) => { $("v-" + it.key).textContent = $("r-" + it.key).value; });
}

/* 폼을 기본값 또는 기존 기록(rec)으로 채운다 */
function fillForm(rec) {
  ITEMS.forEach((it) => { $("r-" + it.key).value = rec ? rec[it.key] : it.def; });
  $("sleep-bedtime").value = rec ? rec.bedtime || "" : "";
  $("sleep-hours").value = rec && rec.sleepHours != null ? rec.sleepHours : "";
  $("daily-memo").value = rec ? rec.memo || "" : "";
  $("edit-note").hidden = !rec;
  updateScores();
}
function resetForm() {
  $("daily-date").value = todayInput();
  loadDate();
}
/* 날짜를 고르면 그 날짜의 기존 기록을 불러와 수정할 수 있게 한다 */
function loadDate() {
  fillForm(store.records.find((r) => r.date === $("daily-date").value) || null);
}
$("daily-date").addEventListener("change", loadDate);
$("daily-reset").addEventListener("click", () => { $("daily-date").value = todayInput(); fillForm(null); });

$("daily-save").addEventListener("click", () => {
  const hoursRaw = $("sleep-hours").value.trim();
  const hours = hoursRaw === "" ? null : parseFloat(hoursRaw);
  if (hours !== null && (isNaN(hours) || hours < 0 || hours > 24)) { alert("총 수면시간은 0~24 사이로 입력해 주세요."); return; }
  const rec = {
    id: uid(),
    date: $("daily-date").value || todayInput(),
    bedtime: $("sleep-bedtime").value || "",
    sleepHours: hours,
    memo: $("daily-memo").value.trim(),
  };
  ITEMS.forEach((it) => { rec[it.key] = parseInt($("r-" + it.key).value, 10); });

  const idx = store.records.findIndex((r) => r.date === rec.date);
  if (idx >= 0) {
    if (!confirm(`${rec.date} 기록이 이미 있습니다. 새 내용으로 바꿀까요?`)) return;
    rec.id = store.records[idx].id;
    store.records[idx] = rec;
  } else {
    store.records.push(rec);
  }
  store.records.sort(byDate);
  saveData();
  renderDailyTable();
  resetForm();
});

function renderDailyTable() {
  const tbody = document.querySelector("#daily-table tbody");
  tbody.innerHTML = "";
  const has = store.records.length > 0;
  $("daily-empty").style.display = has ? "none" : "block";
  $("daily-table").style.display = has ? "" : "none";
  [...store.records].sort(byDate).reverse().forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${esc(r.date)}</td>` +
      ITEMS.map((it) => `<td>${r[it.key]}</td>`).join("") +
      `<td>${esc(r.bedtime) || "—"}</td><td>${r.sleepHours != null ? r.sleepHours + "h" : "—"}</td>
      <td class="note-cell">${esc(r.memo) || "—"}</td>
      <td><button class="btn link edit" data-edit="${esc(r.id)}">수정</button><button class="btn link" data-del="${esc(r.id)}">삭제</button></td>`;
    tbody.appendChild(tr);
  });
}

/* ================= 수정 / 삭제 / 전체삭제 ================= */
document.addEventListener("click", (e) => {
  const del = e.target.getAttribute("data-del");
  const edit = e.target.getAttribute("data-edit");
  if (del && confirm("이 기록을 삭제할까요?")) {
    store.records = store.records.filter((r) => r.id !== del);
    saveData(); renderDailyTable(); loadDate();
  }
  if (edit) {
    const rec = store.records.find((r) => r.id === edit);
    if (!rec) return;
    $("daily-date").value = rec.date;
    fillForm(rec);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
$("clear-all").addEventListener("click", () => {
  if (confirm("모든 기분 기록을 삭제합니다. 계속할까요?")) {
    store = { records: [] };
    saveData();
    renderDailyTable();
    loadDate();
    renderAnalysis();
  }
});

/* ================= 결과 분석 ================= */
function renderAnalysis() {
  renderSummary();
  renderChart();
}

/* 최근 7일 / 30일 / 전체 평균 */
function renderSummary() {
  const tbody = document.querySelector("#summary-table tbody");
  tbody.innerHTML = "";
  const has = store.records.length > 0;
  $("summary-empty").style.display = has ? "none" : "block";
  $("summary-table").style.display = has ? "" : "none";
  if (!has) return;
  const since = (days) => { const d = new Date(); d.setDate(d.getDate() - (days - 1)); return dateInput(d); };
  const today = todayInput();
  const avg = (rows, f) => {
    const vals = rows.map(f).filter((v) => v !== null && v !== undefined);
    return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : "—";
  };
  [["최근 7일", since(7)], ["최근 30일", since(30)], ["전체", ""]].forEach(([name, from]) => {
    const rows = store.records.filter((r) => !from || (r.date >= from && r.date <= today));
    const tr = document.createElement("tr");
    const sleep = avg(rows, (r) => r.sleepHours);
    tr.innerHTML = `<td>${name}</td><td>${rows.length}</td>` +
      ITEMS.map((it) => `<td>${avg(rows, (r) => r[it.key])}</td>`).join("") +
      `<td>${sleep === "—" ? sleep : sleep + "h"}</td>`;
    tbody.appendChild(tr);
  });
}

/* 그래프에 표시할 계열(범례 체크박스로 켜고 끔) */
const SERIES = [
  ...ITEMS.map((it) => ({ key: it.key, label: it.short, color: it.color, axis: "left" })),
  { key: "sleepHours", label: "수면시간 (오른쪽 축)", color: SLEEP_COLOR, axis: "right" },
];
const chartSeries = Object.fromEntries(SERIES.map((s) => [s.key, true]));
function buildLegend() {
  $("legend").innerHTML = SERIES.map((s) =>
    `<span class="legend-item"><label><input type="checkbox" data-series="${s.key}" checked />` +
    `<span class="swatch" style="background: var(${s.color})"></span>${s.label}</label></span>`).join("");
  document.querySelectorAll(".legend input[data-series]").forEach((cb) => {
    cb.addEventListener("change", () => { chartSeries[cb.dataset.series] = cb.checked; renderChart(); });
  });
}

/* 이중 축 선 그래프 — 외부 라이브러리 없이 SVG로 직접 렌더링.
   왼쪽 축 0~10: 기분 5항목 · 오른쪽 축: 총 수면시간(시간, 점선)
   · 기본: 한 화면에 7개(넓은 화면 14개) 데이터가 보이도록 간격 자동 설정
   · 두 손가락(핀치)으로 데이터 간격을 좁히거나 넓힘 · 좌우로 밀어서 이동 */
const CHART_M = { top: 24, right: 52, bottom: 60, left: 44 };
const CHART_H = 340;
const CHART_WIDE_BP = 600;
const CHART_MIN_PX = 14;
const CHART_MAX_PX = 240;
let chartPxPerPoint = null;
let chartScrollToEnd = true;

function chartDefaultVisible(cw) { return cw >= CHART_WIDE_BP ? 14 : 7; }

function renderChart() {
  const container = $("chart-container");
  const rows = [...store.records].sort(byDate);
  container.innerHTML = "";
  if (rows.length === 0) { $("chart-empty").style.display = "block"; return; }
  $("chart-empty").style.display = "none";

  const css = getComputedStyle(document.documentElement);
  const col = (name, fb) => css.getPropertyValue(name).trim() || fb;
  const gridColor = col("--border", "#dde3ec");
  const textColor = col("--muted", "#6b7688");
  const sleepColor = col(SLEEP_COLOR, "#5c7080");

  const m = CHART_M, H = CHART_H, n = rows.length;
  const LEFT_MAX = 10;
  // 오른쪽 축(수면): 기본 0~15시간(눈금 3시간), 더 긴 기록이 있으면 그에 맞춰 늘림
  const maxSleep = Math.max(0, ...rows.map((r) => r.sleepHours || 0));
  const RIGHT_MAX = maxSleep > 15 ? Math.ceil(maxSleep / 5) * 5 : 15;
  const cw = container.clientWidth || 600;
  const availW = Math.max(120, cw - m.left - m.right);

  const visible = chartDefaultVisible(cw);
  const defaultPx = n > 1 ? availW / (visible - 1) : availW;
  if (chartPxPerPoint == null) chartPxPerPoint = defaultPx;
  chartPxPerPoint = clampNum(chartPxPerPoint, CHART_MIN_PX, CHART_MAX_PX);
  const px = chartPxPerPoint;

  const iw = n > 1 ? px * (n - 1) : 0;
  const plotW = Math.max(iw, availW);
  const W = m.left + plotW + m.right;
  const ih = H - m.top - m.bottom;

  const x = (i) => (n === 1 ? m.left + plotW / 2 : m.left + px * i);
  const yLeft = (v) => m.top + ih - (ih * v) / LEFT_MAX;
  const yRight = (v) => m.top + ih - (ih * v) / RIGHT_MAX;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", W);
  svg.setAttribute("height", H);
  const el = (tag, attrs, text) => {
    const e = document.createElementNS(svgNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  };

  const steps = 5;
  for (let s = 0; s <= steps; s++) {
    const yy = m.top + (ih * s) / steps;
    svg.appendChild(el("line", { x1: m.left, y1: yy, x2: m.left + plotW, y2: yy, stroke: gridColor, "stroke-width": 1 }));
    svg.appendChild(el("text", { x: m.left - 8, y: yy + 4, "text-anchor": "end", "font-size": 11, fill: textColor },
      Math.round(LEFT_MAX - (LEFT_MAX * s) / steps)));
    svg.appendChild(el("text", { x: m.left + plotW + 8, y: yy + 4, "text-anchor": "start", "font-size": 11, fill: sleepColor },
      (RIGHT_MAX - (RIGHT_MAX * s) / steps).toFixed(1).replace(/\.0$/, "")));
  }
  svg.appendChild(el("text", { x: m.left, y: 14, "text-anchor": "start", "font-size": 11, fill: textColor }, "점수 /10"));
  svg.appendChild(el("text", { x: m.left + plotW, y: 14, "text-anchor": "end", "font-size": 11, fill: sleepColor }, "수면 (시간)"));

  // x축 라벨(날짜): 간격이 좁으면 일정 간격마다만 표시(마지막은 항상)
  const labelStep = Math.max(1, Math.ceil(68 / px));
  rows.forEach((r, i) => {
    const isLast = i === n - 1;
    if (!isLast && (i % labelStep !== 0 || (n - 1 - i) < labelStep)) return;
    const [yy, mm, dd] = r.date.split("-");
    [`${mm}-${dd}`, yy].forEach((p, k) => {
      svg.appendChild(el("text", { x: x(i), y: m.top + ih + 18 + k * 14, "text-anchor": "middle", "font-size": 10, fill: textColor }, p));
    });
  });

  // 계열이 많으면 값 라벨이 겹치므로 2개 이하로 켰을 때만 숫자를 표시
  const active = SERIES.filter((s) => chartSeries[s.key]);
  const showValues = px >= 34 && active.length <= 2;
  // 선은 기록이 있는 날끼리 잇는다(값이 비어 있는 날은 건너뜀). 수면은 점선.
  function drawSeries(s) {
    const yFn = s.axis === "right" ? yRight : yLeft;
    const color = col(s.color, "#888");
    const pts = [];
    rows.forEach((r, i) => { const v = r[s.key]; if (v !== null && v !== undefined) pts.push([x(i), yFn(v), v]); });
    if (pts.length > 1) {
      svg.appendChild(el("path", {
        d: pts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" "), fill: "none", stroke: color,
        "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round",
        ...(s.axis === "right" ? { "stroke-dasharray": "6 4" } : {}),
      }));
    }
    pts.forEach((p) => {
      svg.appendChild(el("circle", { cx: p[0], cy: p[1], r: px < 24 ? 3 : 4, fill: color }));
      if (showValues) svg.appendChild(el("text", { x: p[0], y: p[1] - 9, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: color }, p[2]));
    });
  }
  [...active].reverse().forEach(drawSeries); // 범례 앞쪽 항목이 위에 그려지도록 역순
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
  const payload = { app: "bieval", version: 1, exportedAt: new Date().toISOString(), records: store.records };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `기분측정표-백업-${fileStamp()}.json`);
});

$("import-data").addEventListener("click", () => $("import-file").click());

const validDate = (r) => r && typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date);
const validScore = (v) => Number.isInteger(v) && v >= 0 && v <= 10;

$("import-file").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const incoming = (Array.isArray(data.records) ? data.records : [])
        .filter((r) => validDate(r) && ITEMS.every((it) => validScore(r[it.key])))
        .map((r) => {
          const rec = {
            id: String(r.id || uid()), date: r.date,
            bedtime: /^\d{2}:\d{2}$/.test(r.bedtime || "") ? r.bedtime : "",
            sleepHours: typeof r.sleepHours === "number" && r.sleepHours >= 0 && r.sleepHours <= 24 ? r.sleepHours : null,
            memo: String(r.memo || "").slice(0, 200),
          };
          ITEMS.forEach((it) => { rec[it.key] = r[it.key]; });
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
      const seen = new Set(store.records.map((r) => r.date));
      incoming.forEach((r) => { if (!seen.has(r.date)) { store.records.push(r); seen.add(r.date); } });
      store.records.sort(byDate);
      saveData();
      renderDailyTable();
      loadDate();
      renderAnalysis();
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
const csvFilename = () => `기분측정표-${fileStamp()}.csv`;

/* 날짜순 CSV(Excel용 BOM 포함) */
function buildCSV() {
  const headers = ["날짜", ...ITEMS.map((it) => `${it.short}(0-10)`), "잠든시간", "총수면시간", "메모"];
  const lines = [headers.join(",")];
  [...store.records].sort(byDate).forEach((r) => {
    const cells = [r.date, ...ITEMS.map((it) => r[it.key]), r.bedtime, r.sleepHours ?? "", r.memo];
    lines.push(cells.map(csvEscape).join(","));
  });
  return "﻿" + lines.join("\r\n"); // BOM → Excel 한글 깨짐 방지
}

function hasRecords() { return store.records.length > 0; }

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
      await navigator.share({ files: [file], title: "기분 측정표 데이터", text: "기분 측정표 CSV 데이터입니다." });
      return;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return; // 사용자가 취소
  }

  // 2) 폴백(주로 데스크톱): CSV를 내려받고 메일 작성 창을 연다(첨부는 수동)
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), name);
  const subject = encodeURIComponent("기분 측정표 데이터");
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
buildItems();
buildLegend();
resetForm();
renderDailyTable();
