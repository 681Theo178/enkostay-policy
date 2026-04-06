/**
 * 정책/약관 아카이브 - 메인 애플리케이션
 */
(function () {
  "use strict";

  /* ── 상태 ────────────────────────────── */
  let state = {
    group: "guest",    // guest | host
    policy: "terms",   // terms | privacy | tenant-policy | host-policy
    version: null       // null = 최신
  };

  /* ── DOM 참조 ────────────────────────── */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const groupTabsEl   = $("#group-tabs");
  const policyCardsEl = $("#policy-cards");
  const docViewerEl   = $("#doc-viewer");

  /* ── 중분류 키 목록 ──────────────────── */
  const POLICY_KEYS = {
    guest: ["terms", "privacy", "tenant-policy"],
    host:  ["terms", "privacy", "host-policy"]
  };

  /* ── URL → 상태 파싱 ─────────────────── */
  function parseURL() {
    const params = new URLSearchParams(window.location.search);
    const g = params.get("group");
    const p = params.get("policy");
    const v = params.get("version");

    if (g && POLICY_DATA.groups[g]) state.group = g;
    if (p && POLICY_DATA[state.group]?.[p]) state.policy = p;
    else state.policy = POLICY_KEYS[state.group][0];
    state.version = v || null;
  }

  /* ── 상태 → URL 반영 ─────────────────── */
  function pushURL() {
    const params = new URLSearchParams();
    params.set("group", state.group);
    params.set("policy", state.policy);
    if (state.version) params.set("version", state.version);
    const url = window.location.pathname + "?" + params.toString();
    window.history.pushState(null, "", url);
    // 페이지 타이틀 업데이트
    const pData = POLICY_DATA[state.group]?.[state.policy];
    if (pData) {
      document.title = pData.title + " - 정책 아카이브";
    }
  }

  /* ── 대분류 탭 렌더링 ────────────────── */
  function renderGroupTabs() {
    groupTabsEl.innerHTML = "";
    Object.entries(POLICY_DATA.groups).forEach(([key, g]) => {
      const btn = document.createElement("button");
      btn.className = "group-tab";
      btn.textContent = g.label;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", key === state.group);
      btn.addEventListener("click", () => {
        state.group = key;
        state.policy = POLICY_KEYS[key][0];
        state.version = null;
        pushURL();
        render();
      });
      groupTabsEl.appendChild(btn);
    });
  }

  /* ── 중분류 카드 렌더링 ──────────────── */
  function renderPolicyCards() {
    policyCardsEl.innerHTML = "";
    const keys = POLICY_KEYS[state.group];
    keys.forEach((key) => {
      const p = POLICY_DATA[state.group][key];
      if (!p) return;
      const card = document.createElement("button");
      card.className = "policy-card";
      card.setAttribute("role", "tab");
      card.setAttribute("aria-selected", key === state.policy);
      card.innerHTML =
        '<div class="policy-card-title">' + p.title + "</div>" +
        '<div class="policy-card-desc">' + p.description + "</div>";
      card.addEventListener("click", () => {
        state.policy = key;
        state.version = null;
        pushURL();
        render();
      });
      policyCardsEl.appendChild(card);
    });
  }

  /* ── 문서 뷰어 렌더링 ───────────────── */
  function renderDocViewer() {
    const pData = POLICY_DATA[state.group]?.[state.policy];
    if (!pData || !pData.versions || pData.versions.length === 0) {
      docViewerEl.innerHTML =
        '<div class="empty-state"><p>등록된 문서가 없습니다.</p></div>';
      return;
    }

    const versions = pData.versions; // 최신순 정렬 전제
    let selectedIdx = 0;
    if (state.version) {
      const idx = versions.findIndex((v) => v.version === state.version);
      selectedIdx = idx >= 0 ? idx : 0;
      if (idx < 0) state.version = null; // fallback
    }
    const current = versions[selectedIdx];
    const isLatest = selectedIdx === 0;

    // ── 헤더
    let html = '<div class="doc-header">';
    html += '<div class="doc-title-row">';
    html += '<span class="doc-title">' + pData.title + "</span>";
    if (isLatest) html += '<span class="badge-latest">최신 버전</span>';
    html += "</div>";
    html +=
      '<div class="doc-meta">' +
      current.version +
      " · 시행일 " +
      current.effectiveDate +
      "</div>";

    // ── 드롭다운
    html += '<div class="version-select-wrap">';
    html +=
      '<label for="version-select">버전 선택</label>';
    html += '<select id="version-select" class="version-select">';
    versions.forEach((v, i) => {
      const tag = i === 0 ? " (최신)" : "";
      html +=
        '<option value="' +
        v.version +
        '"' +
        (i === selectedIdx ? " selected" : "") +
        ">" +
        v.version +
        " — " +
        v.effectiveDate +
        tag +
        "</option>";
    });
    html += "</select></div></div>";

    // ── 본문
    html += '<article class="doc-body">' + current.body + "</article>";

    // ── 버전 히스토리
    html += '<div class="version-history">';
    html += "<h3>📋 버전 히스토리</h3>";
    html += '<ul class="version-history-list">';
    versions.forEach((v, i) => {
      html += '<li class="version-history-item">';
      html +=
        '<a data-version="' +
        v.version +
        '">' +
        v.version +
        "</a>";
      html += '<span class="vh-date">' + v.effectiveDate + "</span>";
      if (i === 0) html += '<span class="vh-current">현행</span>';
      html += "</li>";
    });
    html += "</ul></div>";

    docViewerEl.innerHTML = html;

    // ── 이벤트: 드롭다운
    const sel = $("#version-select");
    sel.addEventListener("change", (e) => {
      state.version = e.target.value === versions[0].version ? null : e.target.value;
      pushURL();
      renderDocViewer();
    });

    // ── 이벤트: 히스토리 링크
    docViewerEl.querySelectorAll("[data-version]").forEach((a) => {
      a.addEventListener("click", () => {
        const ver = a.getAttribute("data-version");
        state.version = ver === versions[0].version ? null : ver;
        pushURL();
        renderDocViewer();
        window.scrollTo({ top: docViewerEl.offsetTop - 20, behavior: "smooth" });
      });
    });
  }

  /* ── 전체 렌더 ───────────────────────── */
  function render() {
    renderGroupTabs();
    renderPolicyCards();
    renderDocViewer();
  }

  /* ── 초기화 ──────────────────────────── */
  function init() {
    parseURL();
    render();
    window.addEventListener("popstate", () => {
      parseURL();
      render();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
