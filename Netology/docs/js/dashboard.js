/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 09/02/2026

dashboard.js – Dashboard interactions (UPDATED for your latest dashboard.html)

Works with:
- NO topbar search (topSearch removed)
- Slide sidebar open/close (backdrop + ESC)
- User dropdown toggle + click outside + ESC
- Brand routing: dashboard if logged in, index if not
- Welcome/Sidebar UI fill:
    sets name, email, avatar initial, level, XP bar, and updates the ring (#welcomeRing)
- Continue Learning:
    surfaces in-progress courses using API or local progress
*/

(function () {
  // AI Prompt: Explain the Helpers section in clear, simple terms.
  // -----------------------------
  // Helpers
  // -----------------------------
  const getById = (id) => document.getElementById(id);
  const clearChildren = (node) => { if (node) node.replaceChildren(); };
  const makeEl = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text !== "undefined") el.textContent = text;
    return el;
  };
  const makeIcon = (className) => {
    const icon = document.createElement("i");
    icon.className = className;
    return icon;
  };
  const makeStatusChip = (status) => {
    const chip = document.createElement("span");
    const icon = document.createElement("i");
    let label = "Active";
    let cls = "net-status-chip net-status-chip--active";
    let iconCls = "bi bi-play-circle";
    if (status === "completed") {
      label = "Completed";
      cls = "net-status-chip net-status-chip--completed";
      iconCls = "bi bi-check2-circle";
    } else if (status === "progress") {
      label = "In progress";
      cls = "net-status-chip net-status-chip--progress";
      iconCls = "bi bi-arrow-repeat";
    }
    chip.className = cls;
    icon.className = iconCls;
    icon.setAttribute("aria-hidden", "true");
    chip.append(icon, document.createTextNode(label));
    return chip;
  };
  const BASE_XP = 100;
  const ACHIEVEMENT_ICON_MAP = {
    first_lesson: "bi-journal-check",
    five_day_streak: "bi-fire",
    novice_master: "bi-mortarboard-fill",
    sandbox_builder: "bi-diagram-3-fill",
    speed_learner: "bi-lightning-charge-fill"
  };
  const apiGet = window.apiGet || (async (path, params = {}) => {
    const base = String(window.API_BASE || "").trim();
    const url = base
      ? new URL(base.replace(/\/$/, "") + path)
      : new URL(path, window.location.origin);
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
    const res = await fetch(url.toString(), { cache: "no-store" });
    return res.json();
  });
  const listFrom = window.API_HELPERS?.list || ((data, ...keys) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
  });
  const ENDPOINTS = window.ENDPOINTS || {};

  const DAILY_TIPS = [
    "CompTIA Network+ covers the physical, data link, network, transport, and application layers.",
    "A MAC address is 48 bits long and burnt into the NIC.",
    "OSPF is a link-state routing protocol using Dijkstra's algorithm.",
    "TCP is connection-oriented, while UDP is connectionless.",
    "DNS translates human-readable domain names into IP addresses.",
    "DHCP automatically assigns IP addresses to devices on a network.",
    "VLANs segment a network to improve security and performance.",
    "A subnet mask defines the network and host portions of an IP address.",
    "ARP maps IP addresses to MAC addresses.",
    "A firewall filters traffic based on security rules."
  ];

  function setDailyTip() {
    const tipEl = getById("dailyTip");
    if (!tipEl) return;
    const controls = getById("dailyTipControls");
    const courseCarousel = getById("courseCarousel");
    const courseNameEl = getById("courseName");
    const prevBtn = getById("coursePrev");
    const nextBtn = getById("courseNext");

    const courseIndex = getCourseIndex();
    const courseList = Object.keys(courseIndex || {}).map((k) => courseIndex[k]).filter(Boolean);
    const fadeDuration = 820; // ms to match CSS

    const updateTipTooltip = (text) => {
      try {
        tipEl.setAttribute('title', text);
        if (window.bootstrap && window.bootstrap.Tooltip) {
          const existing = bootstrap.Tooltip.getInstance(tipEl);
          if (existing) existing.dispose();
          new bootstrap.Tooltip(tipEl);
        }
      } catch (e) { }
    };

    if (courseList.length > 0) {
      // show carousel area and indicators
      if (controls) { controls.innerHTML = ""; controls.setAttribute('aria-hidden', 'false'); }
      if (courseCarousel) courseCarousel.setAttribute('aria-hidden', 'false');

      const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      let idx = dayOfYear % courseList.length;

      const showByIndex = (i) => {
        const entry = courseList[i];
        if (!entry) return;
        const title = entry.title || entry.name || "Course";
        const desc = (entry.description || "").split("\n")[0] || "Click to view course details.";
        // update visible course name and tip description with fade
        if (courseNameEl) {
          courseNameEl.classList.add('is-hidden');
          window.setTimeout(() => {
            courseNameEl.textContent = title;
            courseNameEl.classList.remove('is-hidden');
          }, fadeDuration - 10);
        }
        tipEl.classList.add('is-hidden');
        window.setTimeout(() => {
          tipEl.textContent = desc;
          updateTipTooltip(desc);
          tipEl.classList.remove('is-hidden');
        }, fadeDuration - 10);
        // update indicators
        if (controls) {
          const dots = controls.querySelectorAll('.daily-indicator');
          dots.forEach((d, j) => d.classList.toggle('active', j === i));
        }
      };

      // build indicators and prev/next handlers
      if (controls) {
        controls.innerHTML = "";
        courseList.forEach((c, i) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'daily-indicator' + (i === idx ? ' active' : '');
          btn.setAttribute('aria-label', `Show ${c.title || c.name || 'course'}`);
          btn.dataset.index = String(i);
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            idx = Number(btn.dataset.index || 0);
            showByIndex(idx);
            if (window.__dashCourseTicker) clearInterval(window.__dashCourseTicker);
            window.__dashCourseTicker = setInterval(() => { idx = (idx + 1) % courseList.length; showByIndex(idx); }, 8000);
          });
          controls.appendChild(btn);
        });
      }

      if (prevBtn) {
        prevBtn.onclick = (e) => { e.stopPropagation(); idx = (idx - 1 + courseList.length) % courseList.length; showByIndex(idx); if (window.__dashCourseTicker) { clearInterval(window.__dashCourseTicker); window.__dashCourseTicker = setInterval(() => { idx = (idx + 1) % courseList.length; showByIndex(idx); }, 8000); } };
      }
      if (nextBtn) {
        nextBtn.onclick = (e) => { e.stopPropagation(); idx = (idx + 1) % courseList.length; showByIndex(idx); if (window.__dashCourseTicker) { clearInterval(window.__dashCourseTicker); window.__dashCourseTicker = setInterval(() => { idx = (idx + 1) % courseList.length; showByIndex(idx); }, 8000); } };
      }

      // show initial
      showByIndex(idx);

      // start auto-rotate
      if (window.__dashCourseTicker) clearInterval(window.__dashCourseTicker);
      window.__dashCourseTicker = setInterval(() => { idx = (idx + 1) % courseList.length; showByIndex(idx); }, 8000);
      return;
    }

    // fallback: hide carousel area and indicators, show static daily tip
    if (controls) { controls.innerHTML = ''; controls.setAttribute('aria-hidden', 'true'); }
    if (courseCarousel) courseCarousel.setAttribute('aria-hidden', 'true');
    const dayOfYear2 = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const tip = DAILY_TIPS[dayOfYear2 % DAILY_TIPS.length];
    tipEl.textContent = tip;
    try { updateTipTooltip(tip); } catch (e) {}
  }

  const animateCount = (el, target) => {
    if (!el) return;
    const to = Number(target || 0);
    const from = Number(el.dataset.count || el.textContent || 0);
    if (!Number.isFinite(to) || !Number.isFinite(from) || from === to) {
      el.textContent = String(to);
      el.dataset.count = String(to);
      return;
    }
    const start = performance.now();
    const duration = 450;
    const tick = (now) => {
      const pct = Math.min(1, (now - start) / duration);
      const value = Math.round(from + (to - from) * pct);
      el.textContent = String(value);
      if (pct < 1) requestAnimationFrame(tick);
      else el.dataset.count = String(to);
    };
    requestAnimationFrame(tick);
  };

  function parseJsonSafe(str, fallback) {
    if (!str) return fallback;
    try { return JSON.parse(str); } catch { return fallback; }
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  const __dashErrors = [];
  function reportError(label, err) {
    __dashErrors.push({ label, err });
    console.error(`[dashboard] ${label}`, err);
  }

  function safeStep(label, fn) {
    try { return fn(); }
    catch (e) { reportError(label, e); return null; }
  }

  async function safeStepAsync(label, fn) {
    try { return await fn(); }
    catch (e) { reportError(label, e); return null; }
  }

  async function fetchJson(url) {
    // Simple JSON fetch helper with no-store to avoid stale results.
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function getCurrentUser() {
    return (
      parseJsonSafe(localStorage.getItem("netology_user"), null) ||
      parseJsonSafe(localStorage.getItem("user"), null) ||
      null
    );
  }

  function isLoggedIn() {
    const u = getCurrentUser();
    return !!(u && (u.email || u.username || u.name));
  }

  function totalXpForLevel(level) {
    const lvl = Math.max(1, Number(level) || 1);
    return BASE_XP * (lvl - 1) * lvl / 2;
  }

  function levelFromXP(totalXP) {
    const xp = Math.max(0, Number(totalXP) || 0);
    const t = xp / BASE_XP;
    const lvl = Math.floor((1 + Math.sqrt(1 + 8 * t)) / 2);
    return Math.max(1, lvl);
  }

  function xpForNextLevel(level) {
    const lvl = Math.max(1, Number(level) || 1);
    return BASE_XP * lvl;
  }

  function userNumericLevel(user) {
    const serverLevel = Number(user?.numeric_level);
    if (Number.isFinite(serverLevel) && serverLevel > 0) return serverLevel;
    const totalXP = Number(user?.xp) || 0;
    return levelFromXP(totalXP);
  }

  function getUserRank(user) {
    const lvl = userNumericLevel(user);
    if (Number.isFinite(lvl)) return rankForLevel(lvl);
    const raw = String(user?.unlock_tier || user?.rank || user?.level_name || user?.level || "novice").toLowerCase();
    if (raw.includes("advanced")) return "Advanced";
    if (raw.includes("intermediate")) return "Intermediate";
    return "Novice";
  }

  function computeXP(user) {
    // Converts total XP into level + progress for UI display.
    const totalXP = Number(user?.xp) || 0;
    const serverLevel = Number(user?.numeric_level);
    const xpInto = Number(user?.xp_into_level);
    const nextXp = Number(user?.next_level_xp);
    const fallbackLevel = levelFromXP(totalXP);
    const level = Number.isFinite(serverLevel) && serverLevel > 0 ? serverLevel : fallbackLevel;
    const levelStart = totalXpForLevel(level);
    const fallbackCurrent = Math.max(0, totalXP - levelStart);
    const fallbackNext = xpForNextLevel(level);
    const fallbackPct = Math.max(0, Math.min(100, (fallbackCurrent / Math.max(fallbackNext, 1)) * 100));
    const fallbackToNext = Math.max(0, fallbackNext - fallbackCurrent);
    const fallback = {
      totalXP,
      currentLevelXP: fallbackCurrent,
      xpNext: fallbackNext,
      progressPct: fallbackPct,
      toNext: fallbackToNext,
      level
    };

    if (Number.isFinite(xpInto) && Number.isFinite(nextXp) && nextXp > 0) {
      const matchesTotal = Math.abs((levelStart + xpInto) - totalXP) <= 1;
      if (matchesTotal) {
        const progressPct = Math.max(0, Math.min(100, (xpInto / nextXp) * 100));
        const toNext = Math.max(0, nextXp - xpInto);
        return { totalXP, currentLevelXP: xpInto, xpNext: nextXp, progressPct, toNext, level };
      }
    }
    return fallback;
  }

  function rankForLevel(level) {
    if (Number(level) >= 5) return "Advanced";
    if (Number(level) >= 3) return "Intermediate";
    return "Novice";
  }

  function applyXpToUser(user, addXP) {
    const nextTotal = Math.max(0, Number(user?.xp || 0) + Number(addXP || 0));
    const level = levelFromXP(nextTotal);
    const levelStart = totalXpForLevel(level);
    const currentLevelXP = Math.max(0, nextTotal - levelStart);
    const xpNext = xpForNextLevel(level);
    const rank = rankForLevel(level);
    return {
      ...user,
      xp: nextTotal,
      numeric_level: level,
      xp_into_level: currentLevelXP,
      next_level_xp: xpNext,
      rank,
      level: rank
    };
  }

  function prettyDiff(diff) {
    if (!diff) return "Novice";
    return diff.charAt(0).toUpperCase() + diff.slice(1);
  }

  // AI Prompt: Explain the Login streak + badges section in clear, simple terms.
  // -----------------------------
  // Login streak + badges
  // -----------------------------
  function dateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function weekKey(date = new Date()) {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
    return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  function getLoginLog(email) {
    const raw = localStorage.getItem(`netology_login_log:${email}`);
    return parseJsonSafe(raw, []);
  }

  function saveLoginLog(email, log) {
    localStorage.setItem(`netology_login_log:${email}`, JSON.stringify(log));
  }

  function recordLoginDay(email) {
    if (!email) return { log: [], isNew: false };
    const log = getLoginLog(email);
    const today = dateKey();
    let isNew = false;
    if (!log.includes(today)) {
      log.push(today);
      log.sort();
      saveLoginLog(email, log);
      isNew = true;
    }
    return { log, isNew };
  }

  async function syncLoginLog(email) {
    const base = String(window.API_BASE || "").replace(/\/$/, "");
    if (!email || !base) return null;
    try {
      const res = await fetch(`${base}/record-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!data || !data.success || !Array.isArray(data.log)) return null;
      saveLoginLog(email, data.log);
      return { log: data.log, isNew: !!data.is_new };
    } catch {
      return null;
    }
  }

  function computeLoginStreak(log) {
    if (!Array.isArray(log) || !log.length) return 0;
    const set = new Set(log);
    let streak = 0;
    const cursor = new Date();
    while (set.has(dateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function getBadges(email) {
    if (Array.isArray(window.__dashAchievements)) return window.__dashAchievements;
    const raw = parseJsonSafe(localStorage.getItem(`netology_badges:${email}`), []);
    return Array.isArray(raw) ? raw : [];
  }

  function setBadgesCache(list) {
    window.__dashAchievements = Array.isArray(list) ? list : [];
  }

  async function fetchAchievements(email) {
    try {
      const data = await apiGet("/user-achievements", { email });
      const achievements = listFrom(data, "achievements");
      if (!data || !data.success) return getBadges(email);
      setBadgesCache(achievements);
      return getBadges(email);
    } catch {
      return getBadges(email);
    }
  }

  function getAchievementCatalog() {
    return window.__dashAchievementCatalog || { all: [], unlocked: [], locked: [] };
  }

  function setAchievementCatalog(payload) {
    window.__dashAchievementCatalog = payload || { all: [], unlocked: [], locked: [] };
    window.__dashAchievementCatalogAt = Date.now();
  }

  function getAchievementIconClass(ach) {
    const raw = String(ach?.icon || "").replace(/<[^>]*>/g, "").trim();
    if (raw.startsWith("bi-")) return raw;
    return ACHIEVEMENT_ICON_MAP[ach?.id] || "bi-star-fill";
  }

  async function fetchAchievementCatalog(email, { force = false } = {}) {
    if (!email) return getAchievementCatalog();
    if (!force && window.__dashAchievementCatalog && Date.now() - (window.__dashAchievementCatalogAt || 0) < 60000) {
      return getAchievementCatalog();
    }
    try {
      const data = await apiGet(ENDPOINTS.achievements?.list || "/api/user/achievements", { user_email: email });
      if (!data || !data.success) return getAchievementCatalog();
      const unlocked = listFrom(data, "unlocked").map((a) => ({ ...a, unlocked: true }));
      const locked = listFrom(data, "locked").map((a) => ({ ...a, unlocked: false }));
      const all = [...unlocked, ...locked];
      setAchievementCatalog({
        all,
        unlocked,
        locked,
        total_unlocked: Number.isFinite(Number(data.total_unlocked)) ? Number(data.total_unlocked) : unlocked.length
      });
      return getAchievementCatalog();
    } catch {
      return getAchievementCatalog();
    }
  }

  async function awardAchievementRemote(email, def) {
    const base = String(window.API_BASE || "").replace(/\/$/, "");
    if (!email || !base) return { awarded: false };
    try {
      const res = await fetch(`${base}/award-achievement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          achievement_id: def.id,
          name: def.title,
          description: def.desc,
          tier: def.tier || "bronze",
          xp: def.xp || 0
        })
      });
      const data = await res.json();
      if (data && data.success && data.awarded) {
        const updated = getBadges(email).slice();
        updated.push({
          id: def.id,
          name: def.title,
          description: def.desc,
          tier: def.tier || "bronze",
          xp: def.xp || 0,
          earned_at: new Date().toISOString()
        });
        setBadgesCache(updated);
      }
      return data || { awarded: false };
    } catch {
      return { awarded: false };
    }
  }

  async function awardXpOnce(email, action, xp) {
    const base = String(window.API_BASE || "").replace(/\/$/, "");
    if (!email || !base || !action || !xp) return { awarded: false, xp_added: 0 };
    try {
      const res = await fetch(`${base}/award-xp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action, xp: Number(xp || 0) })
      });
      const data = await res.json().catch(() => ({}));
      if (data && typeof data.success !== "undefined") return data;
      return { success: false, awarded: false, xp_added: 0 };
    } catch {
      return { success: false, awarded: false, xp_added: 0 };
    }
  }

  function bumpUserXP(email, delta) {
    if (!delta) return;
    const rawUser = parseJsonSafe(localStorage.getItem("user"), null);
    if (rawUser && rawUser.email === email) {
      const updated = applyXpToUser(rawUser, delta);
      localStorage.setItem("user", JSON.stringify(updated));
    }
    const rawNet = parseJsonSafe(localStorage.getItem("netology_user"), null);
    if (rawNet && rawNet.email === email) {
      const updated = applyXpToUser(rawNet, delta);
      localStorage.setItem("netology_user", JSON.stringify(updated));
    }
  }

  function renderChallengeList(container, challenges, email, type) {
    if (!container) return;
    clearChildren(container);

    if (!Array.isArray(challenges) || challenges.length === 0) {
      container.innerHTML = `<div class="small text-muted">No ${type} challenges available.</div>`;
      return;
    }

    challenges.forEach((c) => {
      const isDone = Number(c.progress || 0) >= 100;
      const item = makeEl("div", `dash-task${isDone ? " is-done" : ""}`);
      item.dataset.challengeId = c.id;
      item.dataset.challengeType = type;
      item.dataset.xp = c.xp;
      if (c.description) item.dataset.tip = c.description;

      const left = makeEl("div", "flex-grow-1");
      left.append(
        makeEl("div", "fw-semibold small", c.title || "Challenge"),
        makeEl("div", "text-muted small", c.description || "")
      );

      const xpBadge = makeEl("div", `dash-task-xp${isDone ? " is-done" : ""}`);
      if (isDone) {
        xpBadge.innerHTML = '<i class="bi bi-check2-circle"></i>';
      } else {
        xpBadge.textContent = `+${c.xp} XP`;
      }

      item.append(left, xpBadge);

      if (!isDone) {
        item.style.cursor = "pointer";
        item.setAttribute("role", "button");
        item.setAttribute("tabindex", "0");
        const complete = async () => {
          item.classList.add("is-done");
          xpBadge.classList.add("is-done");
          xpBadge.innerHTML = '<i class="bi bi-check2-circle"></i>';
          item.style.cursor = "default";
          c.progress = 100;

          const action = `challenge:${type}:${c.id}`;
          const result = await awardXpOnce(email, action, Number(c.xp || 0));
          if (result?.success && result.xp_added) {
            bumpUserXP(email, Number(result.xp_added || 0));
            safeStep("fillUserUI", fillUserUI);
          }
        };
        item.addEventListener("click", complete, { once: true });
        item.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            complete();
          }
        });
      }

      container.appendChild(item);
    });
  }

  function setChallengesRetryVisible(show) {
    const btn = getById("challengesRetryBtn");
    if (!btn) return;
    btn.classList.toggle("d-none", !show);
  }

  function maybeShowChallengesToastOnce() {
    try {
      if (sessionStorage.getItem("netology_challenges_toast") === "1") return;
      sessionStorage.setItem("netology_challenges_toast", "1");
    } catch {}
    if (typeof window.showPopup === "function") {
      window.showPopup("Challenges are temporarily unavailable. We’ll keep trying in the background.", "warning");
    }
  }

  function clearChallengesToastFlag() {
    try {
      sessionStorage.removeItem("netology_challenges_toast");
    } catch {}
  }

  function challengeFallbackHtml() {
    const timeLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `
      <div class="small text-muted">Challenges are temporarily unavailable.</div>
      <div class="small text-muted">Try again later • ${timeLabel}</div>
    `;
  }

  async function loadChallenges(email, { force = false } = {}) {
    if (!email) return;
    if (!force && window.__dashChallengesCache && Date.now() - (window.__dashChallengesAt || 0) < 60000) {
      renderChallengeList(getById("dailyTasks"), window.__dashChallengesCache.daily, email, "daily");
      renderChallengeList(getById("weeklyTasks"), window.__dashChallengesCache.weekly, email, "weekly");
      setChallengesRetryVisible(false);
      return;
    }

    const dailyTarget = getById("dailyTasks");
    const weeklyTarget = getById("weeklyTasks");
    if (dailyTarget) dailyTarget.innerHTML = '<div class="small text-muted">Loading daily focus…</div>';
    if (weeklyTarget) weeklyTarget.innerHTML = '<div class="small text-muted">Loading weekly challenges…</div>';

    const fetchChallengesByType = async (type) => {
      const base = String(window.API_BASE || "").trim();
      const endpoint = ENDPOINTS.challenges?.list || "/api/user/challenges";
      const url = base ? new URL(base.replace(/\/$/, "") + endpoint) : new URL(endpoint, window.location.origin);
      url.searchParams.set("type", type);
      url.searchParams.set("user_email", email);

      try {
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = String(res.headers.get("content-type") || "");
        if (!contentType.includes("application/json")) throw new Error("Non-JSON response");
        const data = await res.json();
        return { ok: true, data };
      } catch (err) {
        return { ok: false, error: err };
      }
    };

    const [dailyRes, weeklyRes] = await Promise.all([
      fetchChallengesByType("daily"),
      fetchChallengesByType("weekly")
    ]);

    const daily = dailyRes.ok ? listFrom(dailyRes.data, "challenges") : [];
    const weekly = weeklyRes.ok ? listFrom(weeklyRes.data, "challenges") : [];
    const hasError = !dailyRes.ok || !weeklyRes.ok;

    if (dailyRes.ok && weeklyRes.ok) {
      window.__dashChallengesCache = { daily, weekly };
      window.__dashChallengesAt = Date.now();
    }

    if (!dailyRes.ok) {
      console.warn("Daily challenges unavailable:", dailyRes.error);
      if (dailyTarget) dailyTarget.innerHTML = challengeFallbackHtml();
    } else {
      renderChallengeList(dailyTarget, daily, email, "daily");
    }

    if (!weeklyRes.ok) {
      console.warn("Weekly challenges unavailable:", weeklyRes.error);
      if (weeklyTarget) weeklyTarget.innerHTML = challengeFallbackHtml();
    } else {
      renderChallengeList(weeklyTarget, weekly, email, "weekly");
    }

    setChallengesRetryVisible(hasError);
    if (hasError) {
      maybeShowChallengesToastOnce();
    } else {
      clearChallengesToastFlag();
    }
  }

  function loginBadgeDefs() {
    return [
      { id: "login-streak-3", title: "3-Day Streak", desc: "Log in 3 days in a row", icon: "bi-fire", type: "login", target: 3, xp: 50, tier: "bronze" },
      { id: "login-streak-5", title: "5-Day Streak", desc: "Log in 5 days in a row", icon: "bi-fire", type: "login", target: 5, xp: 75, tier: "silver" },
      { id: "login-streak-7", title: "7-Day Streak", desc: "Log in 7 days in a row", icon: "bi-fire", type: "login", target: 7, xp: 100, tier: "gold" },
      { id: "login-streak-10", title: "10-Day Streak", desc: "Log in 10 days in a row", icon: "bi-fire", type: "login", target: 10, xp: 150, tier: "gold" }
    ];
  }

  async function awardLoginStreakBadges(email, streak) {
    if (!email) return;
    const defs = loginBadgeDefs();
    const badges = getBadges(email);
    const earned = new Set(badges.map((b) => b.id));
    let didAward = false;

    for (const def of defs) {
      if (streak >= def.target && !earned.has(def.id)) {
        const result = await awardAchievementRemote(email, {
          id: def.id,
          title: def.title,
          desc: def.desc,
          tier: def.tier || "bronze",
          xp: def.xp
        });
        if (result?.awarded) {
          earned.add(def.id);
          const xpAdded = Number(result.xp_added || def.xp || 0);
          if (xpAdded > 0) bumpUserXP(email, xpAdded);
          didAward = true;
          if (typeof window.showCelebrateToast === "function") {
            window.showCelebrateToast({
              title: "Streak badge unlocked",
              message: def.title,
              sub: def.desc,
              xp: xpAdded || def.xp,
              icon: "bi-award",
              mini: true
            });
          }
        }
      }
    }

    if (didAward) {
      safeStep("fillUserUI", fillUserUI);
      scheduleDashboardRefresh();
    }
  }

  async function awardWeeklyTaskXp(email, task) {
    if (!email || !task || task.progress < task.target) return;
    const wk = weekKey();
    const localKey = `netology_weekly_award:${email}:${wk}:${task.id}`;
    if (localStorage.getItem(localKey) === "1") return;

    const action = `weekly:${wk}:${task.id}`;
    const result = await awardXpOnce(email, action, task.xp);
    if (result?.success && result?.awarded) {
      const xpAdded = Number(result.xp_added || task.xp || 0);
      if (xpAdded > 0) bumpUserXP(email, xpAdded);
      localStorage.setItem(localKey, "1");
      safeStep("fillUserUI", fillUserUI);
      if (typeof window.showCelebrateToast === "function") {
        window.showCelebrateToast({
          title: "Weekly goal complete",
          message: task.title,
          sub: "Keep the momentum going.",
          xp: xpAdded || task.xp,
          icon: "bi-calendar-check",
          mini: true
        });
      }
      scheduleDashboardRefresh();
    } else if (result?.success && result?.awarded === false) {
      localStorage.setItem(localKey, "1");
    }
  }

  // Welcome ring
  // Match the course ring (full circle, r=58)
  function setWelcomeRing(progressPct) {
    const ring = getById("welcomeRing");
    if (!ring) return;
    const track = ring.parentElement?.querySelector(".net-ring-track");

    const r = 58;
    const CIRC = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, Number(progressPct) || 0));
    const offset = CIRC * (1 - (pct / 100));
    const dashArray = `${CIRC.toFixed(2)}`;
    ring.style.strokeDasharray = dashArray;
    ring.style.strokeDashoffset = `${offset.toFixed(2)}`;

    if (track) {
      track.style.strokeDasharray = dashArray;
      track.style.strokeDashoffset = "0";
    }
  }

  // AI Prompt: Explain the Brand routing (dashboard vs index) section in clear, simple terms.
  // -----------------------------
  // Brand routing (dashboard vs index)
  // -----------------------------
  function wireBrandRouting() {
    const topBrand = getById("topBrand");
    const sideBrand = getById("sideBrand");
    const target = isLoggedIn() ? "dashboard.html" : "index.html";

    if (topBrand) topBrand.setAttribute("href", target);
    if (sideBrand) sideBrand.setAttribute("href", target);
  }

  // AI Prompt: Explain the Sidebar section in clear, simple terms.
  // -----------------------------
  // Sidebar
  // -----------------------------
  function setupSidebar() {
    // Slide-in sidebar (backdrop + ESC to close).
    const openBtn = getById("openSidebarBtn");
    const closeBtn = getById("closeSidebarBtn");
    const sidebar = getById("slideSidebar");
    const backdrop = getById("sideBackdrop");

    function open() {
      if (!sidebar || !backdrop) return;
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("net-noscroll");
      sidebar.setAttribute("aria-hidden", "false");
      backdrop.setAttribute("aria-hidden", "false");
    }

    function close() {
      if (!sidebar || !backdrop) return;
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("net-noscroll");
      sidebar.setAttribute("aria-hidden", "true");
      backdrop.setAttribute("aria-hidden", "true");
    }

    openBtn?.addEventListener("click", open);
    closeBtn?.addEventListener("click", close);
    backdrop?.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    return { open, close };
  }

  // AI Prompt: Explain the User dropdown section in clear, simple terms.
  // -----------------------------
  // User dropdown
  // -----------------------------
  function setupUserDropdown() {
    // User dropdown toggle with outside-click + ESC close.
    const btn = getById("userBtn");
    const dd = getById("userDropdown");

    function open() {
      if (!btn || !dd) return;
      dd.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
    }

    function close() {
      if (!btn || !dd) return;
      dd.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    }

    btn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!dd) return;
      dd.classList.contains("is-open") ? close() : open();
    });

    document.addEventListener("click", () => close());
    dd?.addEventListener("click", (e) => e.stopPropagation());

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    return { open, close };
  }

  // AI Prompt: Explain the Logout section in clear, simple terms.
  // -----------------------------
  // Logout
  // -----------------------------
  function setupLogout() {
    const topLogout = getById("topLogoutBtn");
    const sideLogout = getById("sideLogoutBtn");

    function doLogout() {
      localStorage.removeItem("netology_user");
      localStorage.removeItem("user");
      localStorage.removeItem("netology_token");
      window.location.href = "index.html";
    }

    topLogout?.addEventListener("click", doLogout);
    sideLogout?.addEventListener("click", doLogout);
  }

  // AI Prompt: Explain the Courses data (from course content) section in clear, simple terms.
  // -----------------------------
  // Courses data (from course content)
  // -----------------------------
  function getCourseIndex() {
    if (window.__dashCourseIndex && Object.keys(window.__dashCourseIndex).length) {
      return window.__dashCourseIndex;
    }
    const content = (window.COURSE_CONTENT && typeof window.COURSE_CONTENT === "object")
      ? window.COURSE_CONTENT
      : (typeof COURSE_CONTENT !== "undefined" ? COURSE_CONTENT : null);
    if (content && typeof content === "object") {
      const index = {};
      Object.keys(content).forEach((id) => {
        const course = content[id] || {};
        index[id] = {
          id: String(id),
          key: String(id),
          ...course
        };
      });
      window.__dashCourseIndex = index;
      return index;
    }
    return {};
  }

  async function fetchContinueCourses(email) {
    try {
      const data = await apiGet(ENDPOINTS.courses?.userCourses || "/user-courses", { email });
      const courses = listFrom(data, "courses");
      if (!courses.length) return null;
      return courses.filter((c) => c.status === "in-progress");
    } catch {
      return null;
    }
  }

  async function fetchProgressSummary(email) {
    try {
      const data = await apiGet("/user-progress-summary", { email });
      if (!data || !data.success) return null;
      const summary = {
        email,
        lessonsDone: Number(data.lessons_done || 0),
        quizzesDone: Number(data.quizzes_done || 0),
        challengesDone: Number(data.challenges_done || 0),
        coursesDone: Number(data.courses_done || 0),
        inProgress: Number(data.in_progress || 0),
        totalCourses: Number(data.total_courses || 0)
      };
      window.__dashProgressSummary = summary;
      return summary;
    } catch {
      return null;
    }
  }

  /* AI Prompt: Explain the Progress + Completions (local) section in clear, simple terms. */
  /* -----------------------------
     Progress + Completions (local)
  ----------------------------- */
  function mapItemType(sectionType, item) {
    const st = String(sectionType || "").toLowerCase();
    if (st.includes("quiz")) return "quiz";
    if (st.includes("challenge")) return "challenge";
    if (st.includes("practice") || st.includes("sandbox") || st.includes("hands-on")) return "sandbox";

    const t = String(item?.type || "").toLowerCase();
    if (t === "quiz") return "quiz";
    if (t === "challenge") return "challenge";
    if (t === "sandbox" || t === "practice") return "sandbox";
    return "learn";
  }

  function countRequiredItems(course) {
    if (!course) return 0;
    const total = Number(course.total_lessons || course.totalLessons || course.items || 0) || 0;
    if (total > 0) return total;
    const units = course.units || course.modules || [];
    let required = 0;

    units.forEach((u) => {
      if (Array.isArray(u?.sections)) {
        u.sections.forEach((s) => {
          const st = String(s?.type || s?.kind || s?.title || "").toLowerCase();
          const items = s?.items || s?.lessons || [];
          if (!Array.isArray(items)) return;
          items.forEach((it) => {
            const t = mapItemType(st, it);
            if (t === "learn" || t === "quiz" || t === "challenge") required += 1;
          });
        });
      } else if (u?.sections && typeof u.sections === "object") {
        const obj = u.sections;
        const learnArr = obj.learn || obj.lesson || obj.lessons || [];
        const quizArr = obj.quiz || obj.quizzes || [];
        const challengeArr = obj.challenge || obj.challenges || [];
        required += (learnArr.length || 0);
        required += (quizArr.length || 0);
        required += (challengeArr.length || 0);
      } else if (Array.isArray(u?.lessons)) {
        u.lessons.forEach((it) => {
          const t = mapItemType("", it);
          if (t === "learn" || t === "quiz" || t === "challenge") required += 1;
        });
      }
    });

    return required;
  }

  function mergeSoftLessonCompletions(set, email, courseId) {
    if (!set || !courseId) return;
    const who = email || "guest";
    const prefix = `netology_lesson_progress:${who}:${courseId}:`;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const record = parseJsonSafe(localStorage.getItem(key), null) || {};
      const total = Math.max(1, Number(record.total_steps || 0) || 1);
      const completed = Math.max(0, Number(record.completed_steps || 0) || 0);
      const pctFromSteps = Math.round((completed / total) * 100);
      const pct = Math.max(pctFromSteps, Number(record.progress_pct || 0));
      if (pct < 40) continue;
      const parts = key.split(":");
      const lessonNum = Number(parts[parts.length - 1] || 0);
      if (lessonNum) set.add(lessonNum);
    }
  }

  function getCourseCompletionsLocal(email, courseId) {
    if (!email || !courseId) {
      return { lesson: new Set(), quiz: new Set(), challenge: new Set() };
    }
    const raw = localStorage.getItem(`netology_completions:${email}:${courseId}`);
    const payload = parseJsonSafe(raw, {}) || {};
    const lessonArr = payload.lesson || payload.lessons || payload.learn || [];
    const quizArr = payload.quiz || payload.quizzes || [];
    const chArr = payload.challenge || payload.challenges || [];

    const base = {
      lesson: new Set((lessonArr || []).map(Number)),
      quiz: new Set((quizArr || []).map(Number)),
      challenge: new Set((chArr || []).map(Number))
    };

    // Fallback: merge from progress log if completion sets are empty
    const log = getProgressLog(email);
    if (Array.isArray(log) && log.length) {
      log.forEach((e) => {
        if (String(e?.course_id) !== String(courseId)) return;
        const t = String(e?.type || "").toLowerCase();
        const n = Number(e?.lesson_number);
        if (!Number.isFinite(n)) return;
        if (t === "learn" || t === "lesson") base.lesson.add(n);
        else if (t === "quiz") base.quiz.add(n);
        else if (t === "challenge") base.challenge.add(n);
      });
    }

    mergeSoftLessonCompletions(base.lesson, email, courseId);

    return base;
  }

  function getLocalProgressSummary(email) {
    const content = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) ? COURSE_CONTENT : {};
    const courseIds = Object.keys(content);
    const started = getStartedCourses(email);
    const startedIds = new Set((started || []).map((c) => String(c.id)));

    let lessonsDone = 0;
    let quizzesDone = 0;
    let challengesDone = 0;
    let coursesDone = 0;
    let inProgress = 0;

    courseIds.forEach((id) => {
      const course = content[id] || {};
      const comps = getCourseCompletionsLocal(email, id);
      const done = comps.lesson.size + comps.quiz.size + comps.challenge.size;
      const required = countRequiredItems(course);

      lessonsDone += comps.lesson.size;
      quizzesDone += comps.quiz.size;
      challengesDone += comps.challenge.size;

      if (required > 0 && done >= required) {
        coursesDone += 1;
      } else if (startedIds.has(String(id)) || done > 0) {
        inProgress += 1;
      }
    });

    return {
      lessonsDone,
      quizzesDone,
      challengesDone,
      coursesDone,
      inProgress,
      totalCourses: courseIds.length
    };
  }

  function getCourseCompletions(email, courseId) {
    if (!email || !courseId) {
      return { lesson: new Set(), quiz: new Set(), challenge: new Set() };
    }
    const raw = localStorage.getItem(`netology_completions:${email}:${courseId}`);
    const payload = parseJsonSafe(raw, {}) || {};
    const lessonArr = payload.lesson || payload.lessons || payload.learn || [];
    const quizArr = payload.quiz || payload.quizzes || [];
    const chArr = payload.challenge || payload.challenges || [];

    const base = {
      lesson: new Set((lessonArr || []).map(Number)),
      quiz: new Set((quizArr || []).map(Number)),
      challenge: new Set((chArr || []).map(Number))
    };

    // Fallback: merge from progress log if completion sets are empty
    const log = getProgressLog(email);
    if (Array.isArray(log) && log.length) {
      log.forEach((e) => {
        if (String(e?.course_id) !== String(courseId)) return;
        const t = String(e?.type || "").toLowerCase();
        const n = Number(e?.lesson_number);
        if (!Number.isFinite(n)) return;
        if (t === "learn" || t === "lesson") base.lesson.add(n);
        else if (t === "quiz") base.quiz.add(n);
        else if (t === "challenge") base.challenge.add(n);
      });
    }

    mergeSoftLessonCompletions(base.lesson, email, courseId);

    return base;
  }

  function getProgressLog(email) {
    if (!email) return [];
    return parseJsonSafe(localStorage.getItem(`netology_progress_log:${email}`), []) || [];
  }

  function getStartedCourses(email) {
    if (!email) return [];
    const raw = localStorage.getItem(`netology_started_courses:${email}`);
    const list = parseJsonSafe(raw, []) || [];
    return Array.isArray(list) ? list : [];
  }

  function computeStreak(log) {
    if (!log.length) return 0;
    const days = new Set(log.map(e => e.date).filter(Boolean));
    let streak = 0;
    const d = new Date();
    for (; ;) {
      const key = d.toISOString().slice(0, 10);
      if (!days.has(key)) break;
      streak += 1;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function countInLastDays(log, days, type) {
    if (!log.length) return 0;
    const now = Date.now();
    const windowMs = days * 24 * 60 * 60 * 1000;
    return log.filter(e => e?.type === type && (now - Number(e.ts || 0)) <= windowMs).length;
  }

  function formatRelative(ts) {
    const diff = Date.now() - Number(ts || 0);
    if (!Number.isFinite(diff) || diff < 0) return "";
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return `${min} min ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  async function fetchRecentActivity(email) {
    try {
      const data = await apiGet("/recent-activity", { email, limit: 8 });
      const activity = listFrom(data, "activity");
      if (!data || !data.success) return null;
      return activity;
    } catch {
      return null;
    }
  }

  function getCourseTitleById(courseId) {
    const fromIndex = getCourseIndex();
    const fromContent = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) ? COURSE_CONTENT : {};
    const match = fromIndex[String(courseId)] || fromContent[String(courseId)] || {};
    return match.title || "Course";
  }

  async function renderRecentActivity() {
    const list = getById("recentActivityList");
    if (!list) return;
    const user = getCurrentUser();
    const email = user?.email;

    if (!email) {
      clearChildren(list);
      list.appendChild(makeEl("div", "p-3 text-center text-muted small", "Sign in to track your recent activity."));
      return;
    }

    // Get recent login streak for the mini-header
    const log = getLoginLog(email);
    const streak = computeLoginStreak(log);

    // Get activity items from API or local logs
    let activityItems = [];
    const apiRecent = await fetchRecentActivity(email);

    if (Array.isArray(apiRecent) && apiRecent.length) {
      apiRecent.forEach((e) => {
        const type = String(e?.type || "").toLowerCase();
        let label = "Activity";
        let icon = "bi-journal-check";
        let colorClass = "text-primary";
        let bgClass = "bg-primary-subtle";

        if (type === "quiz") {
          label = "Quiz Passed";
          icon = "bi-patch-check-fill";
          colorClass = "text-success";
          bgClass = "bg-success-subtle";
        } else if (type === "challenge") {
          label = "Challenge Completed";
          icon = "bi-trophy-fill";
          colorClass = "text-warning";
          bgClass = "bg-warning-subtle";
        } else if (type === "lesson") {
          label = "Lesson Completed";
          icon = "bi-check-circle-fill";
          colorClass = "text-teal";
          bgClass = "bg-teal-sub";
        }

        const time = e.completed_at ? formatRelative(new Date(e.completed_at).getTime()) : "";
        activityItems.push({
          label,
          courseTitle: e.course_title || "Course",
          lessonNumber: e.lesson_number,
          time,
          xp: Number(e.xp || 0),
          icon,
          colorClass,
          bgClass
        });
      });
    } else {
      const progressLog = getProgressLog(email);
      const now = Date.now();
      const windowMs = 7 * 24 * 60 * 60 * 1000;
      const recent = progressLog
        .filter((e) => (now - Number(e.ts || 0)) <= windowMs)
        .sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0))
        .slice(0, 6);

      recent.forEach((e) => {
        const type = String(e?.type || "").toLowerCase();
        let label = "Activity";
        let icon = "bi-journal-check";
        let colorClass = "text-primary";
        let bgClass = "bg-primary-subtle"; // Bootstrap 5.3 or custom

        if (type === "quiz") {
          label = "Quiz Passed";
          icon = "bi-patch-check-fill";
          colorClass = "text-success";
          bgClass = "bg-success-subtle"; // assumes css class exists
        } else if (type === "challenge") {
          label = "Challenge Completed";
          icon = "bi-trophy-fill";
          colorClass = "text-warning";
          bgClass = "bg-warning-subtle";
        } else if (type === "sandbox") {
          label = "Sandbox Build";
          icon = "bi-diagram-3-fill";
          colorClass = "text-purple";
          bgClass = "bg-purple-sub";
        } else {
          label = "Lesson Completed";
          icon = "bi-check-circle-fill";
          colorClass = "text-teal";
          bgClass = "bg-teal-sub";
        }

        activityItems.push({
          label,
          courseTitle: getCourseTitleById(e.course_id),
          lessonNumber: e.lesson_number,
          time: formatRelative(e.ts),
          xp: Number(e.xp || 0),
          icon,
          colorClass,
          bgClass
        });
      });
    }

    clearChildren(list);

    // 1. Login Streak Row
    if (streak > 0) {
      const streakRow = makeEl("div", "d-flex align-items-center gap-3 p-3 border-bottom net-activity-item");
      const iconBox = makeEl("div", "net-icon-box rounded-circle bg-orange-sub text-orange");
      iconBox.style.width = "36px";
      iconBox.style.height = "36px";
      iconBox.innerHTML = '<i class="bi bi-fire"></i>';

      const content = makeEl("div", "flex-grow-1");
      content.innerHTML = `<div class="fw-semibold text-dark">Login Streak</div><div class="small text-muted">${streak} day${streak === 1 ? "" : "s"} so far</div>`;

      streakRow.append(iconBox, content);
      list.appendChild(streakRow);
    }

    // 2. Activity Items
    if (!activityItems.length) {
      list.appendChild(makeEl("div", "p-4 text-center text-muted small", "No recent activity recorded this week."));
    } else {
      activityItems.forEach((item) => {
        const row = makeEl("div", "d-flex align-items-center gap-3 p-3 border-bottom net-activity-item");

        const iconBox = makeEl("div", `net-icon-box rounded-circle ${item.bgClass} ${item.colorClass}`);
        iconBox.style.width = "36px";
        iconBox.style.height = "36px";
        iconBox.innerHTML = `<i class="bi ${item.icon}"></i>`;

        const content = makeEl("div", "flex-grow-1");
        const sub = item.courseTitle ? `${item.courseTitle} • ${item.time}` : item.time;
        content.innerHTML = `<div class="fw-semibold text-dark">${item.label}</div><div class="small text-muted">${sub}</div>`;

        const right = makeEl("div", "text-end");
        if (item.xp > 0) {
          right.innerHTML = `<span class="badge bg-light text-success border border-success-subtle">+${item.xp} XP</span>`;
        }

        row.append(iconBox, content, right);
        list.appendChild(row);
      });
    }
  }

  function setupGoalToggle() {
    const btns = Array.from(document.querySelectorAll(".dash-toggle-btn[data-panel]"));
    if (!btns.length) return;

    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        btns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");

        const panelId = btn.getAttribute("data-panel");
        btns.forEach((b) => {
          const id = b.getAttribute("data-panel");
          if (!id) return;
          const panel = document.getElementById(id);
          if (!panel) return;

          if (id === panelId) {
            panel.hidden = false;
            requestAnimationFrame(() => panel.classList.add("is-active"));
          } else {
            panel.classList.remove("is-active");
            window.setTimeout(() => {
              panel.hidden = true;
            }, 200);
          }
        });
      });
    });
  }

  function setupKpiCarousel() {
    const carousel = getById("kpiCarousel");
    const track = getById("kpiTrack");
    const dotsWrap = getById("kpiDots");
    if (!carousel || !track || !dotsWrap) return;

    const slides = Array.from(track.querySelectorAll(".dash-kpi-slide"));
    const dots = Array.from(dotsWrap.querySelectorAll(".dash-kpi-dot[data-kpi-dot]"));
    if (!slides.length || dots.length !== slides.length) return;

    let activeIndex = 0;
    let timer = null;
    const intervalMs = 8000;

    function setActive(nextIndex) {
      const max = slides.length;
      activeIndex = ((Number(nextIndex) || 0) % max + max) % max;
      track.style.transform = `translateX(-${activeIndex * 100}%)`;
      dots.forEach((dot, idx) => {
        dot.classList.toggle("is-active", idx === activeIndex);
        dot.setAttribute("aria-current", idx === activeIndex ? "true" : "false");
      });
      slides.forEach((slide, idx) => {
        slide.setAttribute("aria-hidden", idx === activeIndex ? "false" : "true");
        slide.tabIndex = idx === activeIndex ? 0 : -1;
      });
    }

    function startAuto() {
      if (timer) clearInterval(timer);
      timer = window.setInterval(() => setActive(activeIndex + 1), intervalMs);
    }

    function stopAuto() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const idx = Number(dot.getAttribute("data-kpi-dot") || 0);
        setActive(idx);
        startAuto();
      });
    });

    carousel.addEventListener("mouseenter", stopAuto);
    carousel.addEventListener("mouseleave", startAuto);
    carousel.addEventListener("focusin", stopAuto);
    carousel.addEventListener("focusout", () => {
      if (!carousel.contains(document.activeElement)) startAuto();
    });
    carousel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setActive(activeIndex + 1);
        startAuto();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActive(activeIndex - 1);
        startAuto();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopAuto();
      else startAuto();
    });

    setActive(0);
    startAuto();
  }

  // AI Prompt: Explain the Continue learning section in clear, simple terms.
  // -----------------------------
  // Continue learning
  // -----------------------------
  async function renderContinueLearning() {
    const box = getById("continueBox");
    if (!box) return;

    const user = getCurrentUser();
    const email = user?.email;

    if (!email) {
      box.className = "dash-continue-list";
      clearChildren(box);
      const content = getCourseIndex();
      const suggestions = Object.values(content).slice(0, 2);
      if (suggestions.length) {
        suggestions.forEach((c) => {
          box.appendChild(buildContinueItem({
            id: c.id, title: c.title, description: c.description,
            category: c.category, diff: c.difficulty, pct: 0, done: 0, required: countRequiredItems(c),
            xpReward: c.xpReward || 50, estimatedTime: c.estimatedTime
          }));
        });
      } else {
        box.appendChild(makeEl("div", "text-muted small", "Explore our courses to start learning."));
      }
      return;
    }


    const content = getCourseIndex();
    const apiCourses = await fetchContinueCourses(email);
    const startedList = getStartedCourses(email)
      .filter((c) => c && c.id)
      .sort((a, b) => Number(b.lastViewed || 0) - Number(a.lastViewed || 0));
    const startedMap = new Map(startedList.map((entry) => [String(entry.id), Number(entry.lastLesson || 0)]));
    if (Array.isArray(apiCourses) && apiCourses.length) {
      box.className = "dash-continue-list";
      clearChildren(box);
      apiCourses.forEach((entry) => {
        const course = content[String(entry.id)] || {};
        const title = entry.title || course.title || "Course";
        const description = entry.description || course.description || "";
        const diff = String(entry.difficulty || course.difficulty || "novice");
        const category = entry.category || course.category || "Core";
        const xpReward = Number(entry.xp_reward || course.xpReward || course.totalXP || 0);
        const estimatedTime = entry.estimatedTime || course.estimatedTime || "";

        const requiredApi = Number(entry.total_lessons || course.total_lessons || course.items || 0);
        const pctApi = Math.max(0, Math.min(100, Number(entry.progress_pct || 0)));
        const doneApi = requiredApi ? Math.round((pctApi / 100) * requiredApi) : 0;

        const comps = getCourseCompletionsLocal(email, entry.id);
        const requiredLocal = countRequiredItems(course);
        const doneLocal = comps.lesson.size + comps.quiz.size + comps.challenge.size;

        const required = requiredApi || requiredLocal;
        const done = Math.max(doneApi, doneLocal);
        const pct = required ? Math.round((done / required) * 100) : Math.max(pctApi, 0);

        const item = buildContinueItem({
          id: entry.id,
          title,
          description,
          category,
          diff,
          pct,
          done,
          required,
          xpReward,
          estimatedTime,
          lastLesson: startedMap.get(String(entry.id))
        });
        box.appendChild(item);
      });
      return;
    }

    // Fallback: use local started courses
    const started = startedList.slice(0, 3);

    if (started.length) {
      box.className = "dash-continue-list";
      clearChildren(box);
      started.forEach((entry) => {
        const course = content[String(entry.id)] || (COURSE_CONTENT?.[String(entry.id)] || {});
        const title = course.title || "Course";
        const description = course.description || "";
        const diff = String(course.difficulty || "novice");
        const category = course.category || "Core";
        const xpReward = Number(course.xpReward || course.totalXP || course.xp_reward || 0);
        const estimatedTime = course.estimatedTime || "";

        const comps = getCourseCompletionsLocal(email, entry.id);
        const done = comps.lesson.size + comps.quiz.size + comps.challenge.size;
        const required = countRequiredItems(course);
        const pct = required ? Math.round((done / required) * 100) : 0;

        const item = buildContinueItem({
          id: entry.id,
          title,
          description,
          category,
          diff,
          pct,
          done,
          required,
          xpReward,
          estimatedTime,
          lastLesson: entry.lastLesson
        });
        box.appendChild(item);
      });
      return;
    }

    box.className = "dash-continue-list";
    clearChildren(box);
    box.appendChild(makeEl("div", "text-muted small", "No started courses yet. Pick a course to begin."));
  }

  function buildContinueItem({ id, title, description, category, diff, pct, done, required, xpReward, estimatedTime, lastLesson }) {
    const item = document.createElement("div");
    item.className = "net-coursecard-enhanced net-card net-pop position-relative overflow-hidden p-0";
    item.setAttribute("data-course-id", String(id));
    item.tabIndex = 0;
    item.setAttribute("role", "button");

    const body = makeEl("div", "p-4 position-relative z-1 h-100 d-flex flex-column");
    item.appendChild(body);

    // Top: Badge + Category
    const topRow = makeEl("div", "d-flex align-items-center justify-content-between mb-3");

    const badgeGroup = makeEl("div", "d-flex align-items-center gap-2");
    const diffCls = diff === "intermediate" ? "net-diff-intermediate" : diff === "advanced" ? "net-diff-advanced" : "net-diff-novice";
    const diffBadge = makeEl("span", `badge net-pill-badge border ${diffCls}`);
    diffBadge.textContent = prettyDiff(diff);

    const catBadge = makeEl("span", "text-muted small fw-bold text-uppercase ls-1");
    catBadge.textContent = category || "Course";

    badgeGroup.append(diffBadge, catBadge);

    // XP pill
    const xpPill = makeEl("span", "badge bg-light text-dark border net-pill-badge");
    xpPill.innerHTML = `<i class="bi bi-lightning-charge-fill text-warning me-1"></i>${xpReward || 0} XP`;

    topRow.append(badgeGroup, xpPill);
    body.appendChild(topRow);

    // Title
    const titleEl = makeEl("h3", "h5 fw-bold mb-2", title);
    body.appendChild(titleEl);

    // Description
    if (description) {
      const snippet = description.length > 85 ? description.slice(0, 82) + "…" : description;
      body.appendChild(makeEl("p", "text-muted small mb-4 flex-grow-1", snippet));
    } else {
      body.appendChild(makeEl("div", "flex-grow-1"));
    }

    // Progress
    const footer = makeEl("div", "mt-auto");
    const progressMeta = makeEl("div", "d-flex justify-content-between small mb-1 fw-bold");
    progressMeta.append(
      makeEl("span", "text-teal", `${pct}% Complete`),
      makeEl("span", "text-muted", `${done}/${required || 0} items`)
    );

    const progressTrack = makeEl("div", "progress");
    progressTrack.style.height = "6px";
    const progressBar = makeEl("div", "progress-bar net-progress-fill");
    progressBar.style.width = `${pct}%`;
    progressTrack.appendChild(progressBar);

    footer.append(progressMeta, progressTrack);
    body.appendChild(footer);

    // Background decoration
    const bgDeco = makeEl("div", "position-absolute top-0 end-0 p-5 pe-0 pt-0");
    bgDeco.style.zIndex = "0";
    bgDeco.style.opacity = "0.03";
    bgDeco.style.transform = "translate(20%, -20%) scale(1.5)";
    bgDeco.style.pointerEvents = "none";
    bgDeco.innerHTML = '<svg width="200" height="200" viewBox="0 0 200 200" fill="currentColor"><circle cx="100" cy="100" r="80"/></svg>';
    item.appendChild(bgDeco);

    // Navigation
    const nav = () => {
      if (lastLesson) {
        window.location.href = `lesson.html?course_id=${encodeURIComponent(id)}&lesson=${encodeURIComponent(lastLesson)}`;
      } else {
        window.location.href = `course.html?id=${encodeURIComponent(id)}`;
      }
    };
    item.addEventListener("click", nav);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        nav();
      }
    });

    return item;
  }

  // AI Prompt: Explain the Progress widgets (streak, goals, achievements) section in clear, simple terms.
  // -----------------------------
  // Progress widgets (streak, goals, achievements)
  // -----------------------------
  function renderProgressWidgets() {
    const user = getCurrentUser();
    const email = user?.email || "";

    let inProgress = 0;
    const localSummary = email ? getLocalProgressSummary(email) : null;
    const apiSummary = (window.__dashProgressSummary && window.__dashProgressSummary.email === email)
      ? window.__dashProgressSummary
      : null;

    if (apiSummary || localSummary) {
      inProgress = Math.max(apiSummary?.inProgress || 0, localSummary?.inProgress || 0);
    }

    animateCount(getById("heroActive"), inProgress);

    // Login streak
    const loginLog = email ? getLoginLog(email) : [];
    const loginStreak = computeLoginStreak(loginLog);
    animateCount(getById("heroStreak"), loginStreak);

    // Render Weekly Calendar
    renderStreakCalendar(loginLog);

    // Legacy top streak pill (if used)
    const topStreakPill = getById("topStreakPill");
    if (topStreakPill) topStreakPill.style.display = loginStreak > 0 ? "" : "none";

    let lessonsDone = 0, quizzesDone = 0, challengesDone = 0;
    if (apiSummary || localSummary) {
      lessonsDone = Math.max(apiSummary?.lessonsDone || 0, localSummary?.lessonsDone || 0);
      quizzesDone = Math.max(apiSummary?.quizzesDone || 0, localSummary?.quizzesDone || 0);
      challengesDone = Math.max(apiSummary?.challengesDone || 0, localSummary?.challengesDone || 0);
    }

    animateCount(getById("statLessons"), lessonsDone);
    animateCount(getById("statQuizzes"), quizzesDone);
    animateCount(getById("statChallenges"), challengesDone);
    // Render Recent Activity (assuming helper exists)
    if (typeof renderRecentActivity === "function") renderRecentActivity();
  }

  // AI Prompt: Explain the User UI fill section in clear, simple terms.
  // -----------------------------
  // User UI fill
  // -----------------------------
  function fillUserUI() {
    const user = getCurrentUser();

    const name = user?.first_name
      ? `${user.first_name} ${user.last_name || ""}`.trim()
      : (user?.name || user?.username || "Student");

    const email = user?.email || "Not logged in";
    const rank = getUserRank(user);

    // avatar = first letter of name/username
    const initial = (name || "S").trim().charAt(0).toUpperCase();
    const streakPill = getById("topStreakPill");
    if (streakPill) streakPill.style.display = user?.email ? "" : "none";

    const lvl = userNumericLevel(user);
    const { totalXP, currentLevelXP, xpNext, progressPct } = computeXP(user);

    // Welcome & Top Nav
    if (getById("welcomeName")) getById("welcomeName").textContent = name;
    if (getById("topUserName")) getById("topUserName").textContent = name;
    if (getById("topAvatar")) getById("topAvatar").textContent = initial;

    // Dropdown
    if (getById("ddName")) getById("ddName").textContent = name;
    if (getById("ddEmail")) getById("ddEmail").textContent = email;
    if (getById("ddAvatar")) getById("ddAvatar").textContent = initial;
    if (getById("ddLevel")) getById("ddLevel").textContent = `Level ${lvl}`;
    if (getById("ddRank")) getById("ddRank").textContent = rank;

    // Sidebar
    if (getById("sideUserName")) getById("sideUserName").textContent = name;
    if (getById("sideUserEmail")) getById("sideUserEmail").textContent = email;
    if (getById("sideAvatar")) getById("sideAvatar").textContent = initial;
    if (getById("sideLevelBadge")) getById("sideLevelBadge").textContent = `Lv ${lvl}`;
    if (getById("sideXpText")) getById("sideXpText").textContent = `${currentLevelXP}/${xpNext}`;
    if (getById("sideXpBar")) getById("sideXpBar").style.width = `${progressPct}%`;

    // NEW HERO STATS
    if (getById("heroRank")) getById("heroRank").textContent = rank;
    if (getById("heroLevel")) getById("heroLevel").textContent = `Level ${lvl}`;
    if (getById("heroXP")) {
      const xpVal = Number(totalXP || 0);
      getById("heroXP").textContent = xpVal.toLocaleString();
    }

    // Replace Linear Bar with Arc Gauge (Round 7: Larger Semi-circle)
    const cardXP = getById("heroXP")?.closest(".net-stat-card");
    if (cardXP) {
      const oldProg = cardXP.querySelector(".progress");
      if (oldProg) oldProg.remove();

      let arcContainer = cardXP.querySelector(".net-xp-arc");
      if (!arcContainer) {
        arcContainer = document.createElement("div");
        arcContainer.className = "net-xp-arc position-relative mt-2 d-flex justify-content-center";
        const containerDiv = getById("heroXP")?.parentElement;
        if (containerDiv) containerDiv.appendChild(arcContainer);
      }

      const radius = 45;
      const circumference = 2 * Math.PI * radius;
      const arcLength = (180 / 360) * circumference;
      const offset = arcLength - (progressPct / 100) * arcLength;

      arcContainer.innerHTML = `
        <svg width="170" height="95" viewBox="0 0 110 65" style="display:block; margin:0 auto; overflow:visible;">
          <defs>
            <linearGradient id="xpGradHero7" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#0d9488" />
              <stop offset="100%" stop-color="#06b6d4" />
            </linearGradient>
          </defs>
          <path d="M 10,55 A 45,45 0 0 1 100,55" fill="none" stroke="#f1f5f9" stroke-width="12" stroke-linecap="round" />
          <path d="M 10,55 A 45,45 0 0 1 100,55" fill="none" stroke="url(#xpGradHero7)" stroke-width="12" stroke-linecap="round"
            stroke-dasharray="${arcLength}" stroke-dashoffset="${offset}" 
            style="transition: stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1);" />
        </svg>
        <div class="net-xp-gauge-lbl">
           <div class="net-xp-level-big">Lvl ${lvl}</div>
           <div class="net-xp-percent-sm">${Math.round(progressPct)}%</div>
        </div>
      `;
    }
  }

  async function refreshUserFromApi() {
    const user = getCurrentUser();
    const email = user?.email || localStorage.getItem("netology_last_email") || "";
    if (!email) return user;

    try {
      const data = await apiGet(ENDPOINTS.auth?.userInfo || "/user-info", { email });
      if (!data || !data.success) return user;

      const unlockTier = String(data.start_level || user?.unlock_tier || user?.unlock_level || user?.unlockTier || "novice")
        .trim()
        .toLowerCase();

      const serverXP = Number(data.xp ?? data.total_xp);
      const xp = Number.isFinite(serverXP) ? serverXP : Number(user?.xp || 0);

      const merged = {
        ...(user || {}),
        email,
        first_name: data.first_name || user?.first_name,
        last_name: data.last_name || user?.last_name,
        username: data.username || user?.username,
        xp,
        numeric_level: Number.isFinite(Number(data.numeric_level)) ? Number(data.numeric_level) : user?.numeric_level,
        xp_into_level: Number.isFinite(Number(data.xp_into_level)) ? Number(data.xp_into_level) : user?.xp_into_level,
        next_level_xp: Number.isFinite(Number(data.next_level_xp)) ? Number(data.next_level_xp) : user?.next_level_xp,
        rank: data.rank || data.level || user?.rank,
        level: data.level || data.rank || user?.level,
        unlock_tier: ["novice", "intermediate", "advanced"].includes(unlockTier) ? unlockTier : "novice"
      };

      localStorage.setItem("user", JSON.stringify(merged));
      localStorage.setItem("netology_user", JSON.stringify(merged));
      return merged;
    } catch {
      return user;
    }
  }

  // AI Prompt: Explain the Lightweight refresh (focus/visibility/storage) section in clear, simple terms.
  // -----------------------------
  // Lightweight refresh (focus/visibility/storage)
  // -----------------------------
  let __dashRefreshTimer = null;

  function scheduleDashboardRefresh() {
    if (document.hidden) return;
    if (__dashRefreshTimer) clearTimeout(__dashRefreshTimer);
    __dashRefreshTimer = window.setTimeout(() => {
      refreshDashboard();
    }, 150);
  }

  async function refreshDashboard() {
    const user = getCurrentUser();

    safeStep("fillUserUI", fillUserUI);
    await safeStepAsync("renderContinueLearning", renderContinueLearning);

    if (user?.email) {
      await safeStepAsync("fetchProgressSummary", () => fetchProgressSummary(user.email));
      await safeStepAsync("loadChallenges", () => loadChallenges(user.email));
      await safeStepAsync("fetchAchievementCatalog", () => fetchAchievementCatalog(user.email));
    }

    safeStep("renderProgressWidgets", renderProgressWidgets);
    safeStep("renderAchievements", renderAchievements);
  }

  function renderAchievements() {
    const scroller = getById("achieveScroller");
    if (!scroller) return;
    clearChildren(scroller);

    const catalog = getAchievementCatalog();
    const list = Array.isArray(catalog?.all) ? catalog.all : [];

    if (!list.length) {
      scroller.innerHTML = '<div class="small text-muted">Complete goals to earn badges!</div>';
      return;
    }

    list.forEach((a) => {
      const item = makeEl("div", "net-achieve-item");
      const isEarned = !!a.unlocked;
      if (isEarned) item.classList.add("is-earned");

      const iconBox = makeEl("div", "net-achieve-icon-box");
      iconBox.innerHTML = `<i class="bi ${getAchievementIconClass(a)}"></i>`;

      const name = makeEl("div", "net-achieve-name", a.name || "Achievement");
      item.append(iconBox, name);

      item.setAttribute("data-bs-toggle", "tooltip");
      item.setAttribute("data-bs-placement", "top");
      item.title = `${a.description || a.name || "Achievement"}${isEarned ? " (Unlocked!)" : " (Locked)"}`;

      scroller.appendChild(item);
    });

    if (window.bootstrap && window.bootstrap.Tooltip) {
      scroller.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
        new bootstrap.Tooltip(el);
      });
    }
  }

  // AI Prompt: Explain the Init section in clear, simple terms.
  // -----------------------------
  // -----------------------------
  // New Stats Helpers
  // -----------------------------
  function renderStreakCalendar(log) {
    const cal = getById("streakCalendar");
    if (!cal) return;
    clearChildren(cal);

    // Get current week (Mon-Sun)
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon...
    const diff = day === 0 ? -6 : 1 - day; // Adjust to get Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);

    const days = ["M", "T", "W", "T", "F", "S", "S"];
    days.forEach((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = dateKey(d);
      const isActive = log.includes(key);
      const isToday = key === dateKey(new Date());

      const col = makeEl("div", `net-cal-day ${isActive ? "is-active" : ""}`);
      if (isToday) col.classList.add("fw-bold");

      const pill = makeEl("div", "net-cal-pill");
      const lbl = makeEl("div", "net-cal-label", label);

      col.append(pill, lbl);
      col.title = d.toLocaleDateString();
      cal.appendChild(col);
    });
  }

  function initStatsCarousel() {
    const card = getById("statsCarouselCard");
    const track = getById("statsTrack");
    const indicators = getById("statsIndicators");
    if (!track || !indicators) return;

    // Make entire card navigate to progress.html on click
    if (card) {
      card.style.cursor = "pointer";
      card.addEventListener("click", (e) => {
        // Don't navigate if clicking on indicator dots
        if (e.target.closest(".net-indicator")) return;
        window.location.href = "progress.html";
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.location.href = "progress.html";
        }
      });
    }

    // 1. Calculate Stats
    const progressRaw = localStorage.getItem("netology_progress");
    const progress = progressRaw ? JSON.parse(progressRaw) : {};

    const activeCourses = Object.keys(progress).length;
    const completedCourses = 0;

    let completedLessons = 0;
    Object.values(progress).forEach(course => {
      Object.values(course).forEach(module => {
        if (typeof module === 'object') {
          completedLessons += Object.values(module).filter(v => v === true).length;
        }
      });
    });
    const activeLessons = activeCourses > 0 ? 1 : 0;

    let activeLabs = 0;
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i).startsWith("netology_topology_")) activeLabs++;
    }
    const completedLabs = 0;
    const activeQuizzes = 0;
    const completedQuizzes = 0;

    // 2. Define Slides Data
    const slidesData = [
      { title: "Courses", icon: "bi-journal-album", colorCls: "teal", active: activeCourses, completed: completedCourses },
      { title: "Lessons", icon: "bi-book-half", colorCls: "blue", active: activeLessons, completed: completedLessons },
      { title: "Quizzes", icon: "bi-puzzle-fill", colorCls: "purple", active: activeQuizzes, completed: completedQuizzes },
      { title: "Sandbox", icon: "bi-box-seam", colorCls: "orange", active: activeLabs, completed: completedLabs }
    ];

    // 3. Render Slides
    track.innerHTML = "";
    slidesData.forEach((s, i) => {
      const slide = document.createElement("div");
      slide.className = `net-carousel-slide ${i === 0 ? "is-active" : ""}`;

      slide.innerHTML = `
        <div class="d-flex align-items-center justify-content-between mb-2">
          <span class="small text-muted fw-bold text-uppercase ls-1">${s.title}</span>
          <div class="net-icon-box bg-${s.colorCls}-sub text-${s.colorCls} rounded-circle p-2">
            <i class="bi ${s.icon}"></i>
          </div>
        </div>
        <div class="row g-0 mt-2">
          <div class="col-6 border-end pe-2">
            <div class="h4 fw-bolder mb-0 text-dark">${s.active}</div>
            <div class="small text-muted">Active</div>
          </div>
          <div class="col-6 ps-3">
             <div class="h4 fw-bolder mb-0 text-dark opacity-75">${s.completed}</div>
             <div class="small text-muted">Done</div>
          </div>
        </div>
      `;
      track.appendChild(slide);
    });

    // 4. Carousel Logic
    let currentSlide = 0;
    const slides = Array.from(track.querySelectorAll(".net-carousel-slide"));
    const dots = Array.from(indicators.querySelectorAll(".net-indicator"));
    const total = slides.length;
    let timer = null;

    const showSlide = (index) => {
      currentSlide = (index + total) % total;
      slides.forEach((s, i) => {
        s.classList.toggle("is-active", i === currentSlide);
      });
      dots.forEach((d, i) => {
        d.classList.toggle("active", i === currentSlide);
      });
    };

    const next = () => showSlide(currentSlide + 1);

    const startTimer = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(next, 8000);
    };

    dots.forEach((dot, i) => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        showSlide(i);
        startTimer();
      });
    });

    startTimer();
  }

  // -----------------------------
  // Init
  // -----------------------------
  async function init() {
    safeStep("wireBrandRouting", wireBrandRouting);
    safeStep("setupSidebar", setupSidebar);
    safeStep("setupUserDropdown", setupUserDropdown);
    safeStep("setupLogout", setupLogout);
    safeStep("setupGoalToggle", setupGoalToggle);
    safeStep("setDailyTip", setDailyTip);
    safeStep("initStatsCarousel", initStatsCarousel);
    safeStep("wireChallengesRetry", wireChallengesRetry);

    // Init Bootstrap Tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    // Fast first paint using cached user data
    const cachedUser = getCurrentUser();
    safeStep("fillUserUI", fillUserUI);
    await safeStepAsync("renderContinueLearning", renderContinueLearning);
    safeStep("renderProgressWidgets", renderProgressWidgets);

    const user = await safeStepAsync("refreshUserFromApi", refreshUserFromApi) || cachedUser;
    if (user?.email) {
      await safeStepAsync("fetchAchievements", () => fetchAchievements(user.email));
      let loginInfo = safeStep("recordLoginDay", () => recordLoginDay(user.email)) || { log: [] };
      const remoteLogin = await safeStepAsync("syncLoginLog", () => syncLoginLog(user.email));
      if (remoteLogin && Array.isArray(remoteLogin.log)) loginInfo = remoteLogin;
      const streak = safeStep("computeLoginStreak", () => computeLoginStreak(loginInfo.log)) || 0;
      await safeStepAsync("awardLoginStreakBadges", () => awardLoginStreakBadges(user.email, streak));

      await safeStepAsync("fetchAchievementCatalog", () => fetchAchievementCatalog(user.email, { force: true }));
      safeStep("renderAchievements", renderAchievements);
      await safeStepAsync("loadChallenges", () => loadChallenges(user.email, { force: true }));

      if (typeof window.maybeStartOnboardingTour === "function") {
        setTimeout(() => {
          const welcomeShown = maybeShowDashboardWelcome(user);
          if (welcomeShown) return;
          const started = window.maybeStartOnboardingTour("dashboard", user.email);
          if (!started) {
            window.maybeStartOnboardingTour("wrapup", user.email);
          }
        }, 600);
      }

      if (loginInfo.isNew) {
        const pill = getById("topStreakPill");
        if (pill) {
          pill.classList.remove("is-animate");
          requestAnimationFrame(() => {
            pill.classList.add("is-animate");
            window.setTimeout(() => pill.classList.remove("is-animate"), 1200);
          });
        }
      }
    }

    safeStep("fillUserUI", fillUserUI);
    await safeStepAsync("renderContinueLearning", renderContinueLearning);
    if (user?.email) {
      await safeStepAsync("fetchProgressSummary", () => fetchProgressSummary(user.email));
    }
    safeStep("renderProgressWidgets", renderProgressWidgets);

    // Auto-refresh when the tab regains focus or storage changes.
    window.addEventListener("focus", scheduleDashboardRefresh);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) scheduleDashboardRefresh();
    });
    window.addEventListener("storage", (e) => {
      if (!e.key) return;
      if (e.key === "user" || e.key.startsWith("netology_")) scheduleDashboardRefresh();
    });
  }

  function wireChallengesRetry() {
    const btn = getById("challengesRetryBtn");
    if (!btn || btn._netBound) return;
    btn._netBound = true;
    const originalHtml = btn.innerHTML;

    btn.addEventListener("click", async () => {
      const user = getCurrentUser();
      if (!user?.email) return;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Retrying';
      await loadChallenges(user.email, { force: true });
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    });
  }

  function maybeShowDashboardWelcome(user) {
    const overlay = getById("dashboardWelcomeOverlay");
    if (!overlay || !user?.email) return false;

    const normalizedEmail = String(user.email || "").trim().toLowerCase();
    const onboardingUser = String(localStorage.getItem("netology_onboarding_user") || "")
      .trim()
      .toLowerCase();
    const stage = String(localStorage.getItem("netology_onboarding_stage") || "").trim().toLowerCase();

    let sessionAllowed = false;
    let alreadyShown = false;
    try {
      sessionAllowed = sessionStorage.getItem("netology_onboarding_session") === "true";
      alreadyShown = sessionStorage.getItem("netology_welcome_shown") === "true";
    } catch {}

    if (!sessionAllowed || alreadyShown || stage !== "dashboard" || onboardingUser !== normalizedEmail) {
      return false;
    }

    const nameEl = getById("dashboardWelcomeName");
    if (nameEl) nameEl.textContent = user.first_name || "there";

    overlay.classList.remove("d-none");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    const startBtn = getById("dashboardWelcomeStart");
    let closing = false;
    const closeOverlay = () => {
      if (closing) return;
      closing = true;
      if (startBtn) startBtn.disabled = true;
      try {
        sessionStorage.setItem("netology_welcome_shown", "true");
      } catch {}
      overlay.classList.add("is-exiting");
      window.setTimeout(() => {
        overlay.classList.add("d-none");
        overlay.classList.remove("is-exiting");
        overlay.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";

        if (typeof window.maybeStartOnboardingTour === "function") {
          const started = window.maybeStartOnboardingTour("dashboard", user.email);
          if (!started) window.maybeStartOnboardingTour("wrapup", user.email);
        }
      }, 420);
    };

    if (startBtn && !startBtn._netBound) {
      startBtn._netBound = true;
      startBtn.addEventListener("click", closeOverlay);
    }
    if (startBtn && typeof startBtn.focus === "function") {
      startBtn.focus({ preventScroll: true });
    }

    return true;
  }

  // Expose helpers needed by inline scripts on dashboard.html
  window.onReady = onReady;
  window.escapeHtml = window.escapeHtml || function (str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  };

  onReady(init);
})();
