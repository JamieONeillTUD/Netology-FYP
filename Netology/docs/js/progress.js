// progress.js — progress page

(() => {
  "use strict";

  const EP = window.ENDPOINTS;
  const XP = window.NetologyXP;
  const STORAGE_KEY = "netology_progress_type";

  const TAB_ALIASES = {
    courses: "courses", modules: "modules", lessons: "lessons",
    quizzes: "quizzes", tutorials: "tutorials", challenges: "challenges",
    "sandbox-tutorials": "tutorials", "sandbox-challenges": "challenges"
  };

  const TAB_CONFIG = {
    courses:    { title: "Courses",           subtitle: "Active and completed courses at a glance.",           emptyTitle: "No courses yet",      emptyText: "Browse and enroll in courses to get started.", icon: "bi-journal-bookmark", ctaText: "Browse courses",  ctaLink: "courses.html" },
    modules:    { title: "Modules",           subtitle: "Track module progress across your courses.",          emptyTitle: "No module progress",  emptyText: "Start a course to unlock modules.",            icon: "bi-layers",           ctaText: "View courses",    ctaLink: "courses.html" },
    lessons:    { title: "Lessons",           subtitle: "Lessons grouped by course, split by status.",         emptyTitle: "No lessons yet",      emptyText: "Complete your first lesson to see it here.",   icon: "bi-journal-check",    ctaText: "Start learning",  ctaLink: "courses.html" },
    quizzes:    { title: "Quizzes",           subtitle: "Quiz progress, split into in-progress and completed.", emptyTitle: "No quizzes yet",      emptyText: "Take a quiz to track your results.",           icon: "bi-patch-question",   ctaText: "Browse courses",  ctaLink: "courses.html" },
    tutorials:  { title: "Sandbox Tutorials", subtitle: "Sandbox tutorials and checklist progress.",           emptyTitle: "No tutorials yet",    emptyText: "Launch a sandbox tutorial to track it here.",  icon: "bi-diagram-3",        ctaText: "Open sandbox",    ctaLink: "sandbox.html" },
    challenges: { title: "Sandbox Challenges",subtitle: "Challenge progress split by status.",                 emptyTitle: "No challenges yet",   emptyText: "Complete a sandbox challenge to see it here.", icon: "bi-flag",             ctaText: "View challenges", ctaLink: "sandbox.html" }
  };

  const TYPE_CONFIG = {
    lessons:    { icon: "bi-journal-check",  label: "Lesson",    variant: "",       card: "net-card--lesson",    ctaContinue: "Resume Lesson",    ctaDone: "Review Lesson" },
    quizzes:    { icon: "bi-patch-question", label: "Quiz",      variant: "blue",   card: "net-card--quiz",      ctaContinue: "Resume Quiz",      ctaDone: "Review Quiz" },
    tutorials:  { icon: "bi-diagram-3",      label: "Tutorial",  variant: "",       card: "net-card--tutorial",  ctaContinue: "Resume Tutorial",  ctaDone: "Review Tutorial" },
    challenges: { icon: "bi-flag",           label: "Challenge", variant: "violet", card: "net-card--challenge", ctaContinue: "Resume Challenge", ctaDone: "Review Challenge" },
    modules:    { icon: "bi-layers",         label: "Module",    variant: "green",  card: "net-card--course",    ctaContinue: "Open Module",      ctaDone: "Review Module" }
  };

  const completionCache = new Map();
  const pageData = { email: null, courses: null, completions: null, content: null, counts: null };

  // tiny helpers
  const $ = (id) => document.getElementById(id);
  const setText = (id, v) => { const el = $(id); if (el) el.textContent = String(v ?? ""); };
  const get = (path, params) => window.apiGet(path, params);
  const parseJson = (raw, fb) => { try { return JSON.parse(raw); } catch { return fb; } };
  const capitalize = (s) => { const v = String(s || ""); return v ? v[0].toUpperCase() + v.slice(1) : ""; };
  const getUser = () => parseJson(localStorage.getItem("netology_user"), null) || parseJson(localStorage.getItem("user"), null);
  const normalizeTab = (v) => { const c = String(v || "").trim().toLowerCase(); return TAB_ALIASES[c] || null; };
  const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

  // startup
  document.addEventListener("DOMContentLoaded", () => {
    init().catch((e) => console.error("Progress init failed:", e));
  });

  async function init() {
    const user = getUser();
    if (!user?.email) { window.location.href = "login.html"; return; }

    setupSidebar();
    setupDropdown();
    setupLogout();
    fillUser(user);
    setupTabs();

    await loadHero(user);

    const tab = normalizeTab(new URLSearchParams(location.search).get("type"))
      || normalizeTab(localStorage.getItem(STORAGE_KEY))
      || "courses";

    setActiveTab(tab);
    localStorage.setItem(STORAGE_KEY, tab);
    await loadTab(tab, user);

    document.body.classList.replace("net-loading", "net-loaded");
    window.maybeStartOnboardingTour?.("progress", user.email);
  }

  // sidebar / dropdown / logout
  function setupSidebar() {
    const sidebar = $("slideSidebar"), backdrop = $("sideBackdrop");
    const open = () => { sidebar.classList.add("is-open"); backdrop.classList.add("is-open"); document.body.classList.add("net-noscroll"); sidebar.setAttribute("aria-hidden","false"); backdrop.setAttribute("aria-hidden","false"); };
    const close = () => { sidebar.classList.remove("is-open"); backdrop.classList.remove("is-open"); document.body.classList.remove("net-noscroll"); sidebar.setAttribute("aria-hidden","true"); backdrop.setAttribute("aria-hidden","true"); };
    $("openSidebarBtn")?.addEventListener("click", open);
    $("closeSidebarBtn")?.addEventListener("click", close);
    backdrop?.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  function setupDropdown() {
    const btn = $("userBtn"), dd = $("userDropdown");
    if (!btn || !dd) return;
    btn.addEventListener("click", (e) => { e.stopPropagation(); const open = dd.classList.toggle("is-open"); btn.setAttribute("aria-expanded", String(open)); });
    document.addEventListener("click", (e) => { if (!dd.contains(e.target) && !btn.contains(e.target)) { dd.classList.remove("is-open"); btn.setAttribute("aria-expanded","false"); } });
  }

  function setupLogout() {
    const logout = () => { ["netology_user","netology_token","user"].forEach((k) => localStorage.removeItem(k)); location.href = "index.html"; };
    $("topLogoutBtn")?.addEventListener("click", logout);
    $("sideLogoutBtn")?.addEventListener("click", logout);
  }

  // fill user info
  function fillUser(user) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || "Student";
    const initial = name[0].toUpperCase();
    const xp = Number(user.xp || 0);
    const level = Number.isFinite(Number(user.numeric_level)) ? Number(user.numeric_level) : XP.levelFromTotalXp(xp);
    const rank = user.rank || XP.rankForLevel(level);

    setText("topAvatar", initial); setText("ddAvatar", initial);
    setText("ddName", name); setText("ddEmail", user.email || "");
    setText("ddLevel", `Level ${level}`); setText("ddRank", rank);
    setText("sideAvatar", initial); setText("sideUserName", name);
    setText("sideUserEmail", user.email || ""); setText("sideLevelBadge", `Lv ${level}`);

    const levelStart = XP.totalXpForLevel(level);
    const into = Math.max(0, xp - levelStart);
    const needed = XP.xpForNextLevel(level);
    const pct = Math.min(100, (into / Math.max(needed, 1)) * 100);

    setText("sideXpText", `${into}/${needed}`);
    setText("sideXpHint", `${Math.max(0, needed - into)} XP to next level`);
    const bar = $("sideXpBar"); if (bar) bar.style.width = `${pct}%`;
  }

  // tabs
  function setupTabs() {
    document.querySelectorAll(".net-progress-nav-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const tab = normalizeTab(btn.getAttribute("data-type"));
        if (!tab) return;
        setActiveTab(tab);
        localStorage.setItem(STORAGE_KEY, tab);
        const user = getUser();
        if (user?.email) await loadTab(tab, user);
      });
    });
  }

  function setActiveTab(tab) {
    document.querySelectorAll(".net-progress-nav-btn").forEach((btn) => {
      const active = btn.getAttribute("data-type") === tab;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
  }

  function updateBadges(counts) {
    document.querySelectorAll(".net-progress-nav-btn").forEach((btn) => {
      const tab = btn.getAttribute("data-type");
      if (!tab || !counts) return;
      const n = tab === "courses" ? (counts["in-progress"] || 0) + (counts["completed-courses"] || 0)
              : tab === "modules" ? (counts["modules-in-progress"] || 0) + (counts["modules-completed"] || 0)
              : counts[tab] || 0;
      let badge = btn.querySelector(".net-progress-nav-count");
      if (!badge) { badge = el("span", "net-progress-nav-count"); btn.appendChild(badge); }
      animateNum(badge, n);
      badge.classList.remove("is-animated"); void badge.offsetWidth; badge.classList.add("is-animated");
    });
  }

  // hero stats
  async function loadHero(user) {
    const [summary, streak, achievements] = await Promise.all([
      get(EP.courses.userProgressSummary, { email: user.email }).catch(() => null),
      get(EP.progress.userStreaks, { user_email: user.email }).catch(() => null),
      get(EP.achievements.list, { user_email: user.email }).catch(() => null)
    ]);
    setText("heroCoursesActive", summary?.in_progress || 0);
    setText("heroLessons", summary?.lessons_done || 0);
    setText("heroStreak", streak?.current_streak || 0);
    setText("heroAchievements", achievements?.total_unlocked || 0);
  }

  // ensure common data is loaded once per user
  async function ensureData(user) {
    if (pageData.email === user.email && pageData.courses && pageData.completions) return;
    pageData.email = user.email;
    pageData.content = window.COURSE_CONTENT || {};
    pageData.courses = await fetchCourses(user.email);
    pageData.completions = await buildCompletionsMap(user.email, pageData.courses);
    pageData.counts = await buildCounts(user.email);
    updateBadges(pageData.counts);
  }

  // main tab loader
  async function loadTab(tab, user) {
    const list = $("progressList"), empty = $("progressEmpty");
    if (!list || !empty) return;
    skeleton(list);
    empty.classList.add("d-none");
    await ensureData(user);
    const totals = await renderTab(list, tab, user.email);
    if (!totals.ip && !totals.done) showEmpty(tab);
  }

  async function renderTab(container, tab, email) {
    const started = getStartedMap(email);
    container.replaceChildren();
    const cfg = TAB_CONFIG[tab];
    const sec = buildSection(tab, cfg);
    container.appendChild(sec.wrap);

    if (tab === "courses") return renderCourses(sec.body, email, started);
    if (tab === "modules") return renderModules(sec.body, email, started);
    return renderItems(tab, sec.body, email, started);
  }

  // courses tab
  async function renderCourses(parent, email, started) {
    const all = await buildCourseList(email, started);
    const ip = all.filter((c) => c.status === "in-progress");
    const done = all.filter((c) => c.status === "completed");

    if (!ip.length && !done.length) return { ip: 0, done: 0 };

    const split = el("div", "net-progress-split");
    const left = buildCol("In progress", ip.length, false, ip.reduce((s, c) => s + (c.earnedXp || 0), 0));
    const right = buildCol("Completed", done.length, true, done.reduce((s, c) => s + (c.earnedXp || 0), 0));

    renderCourseCards(ip, left.body, false, started);
    if (!ip.length) emptyCol(left.body, "No active courses yet.");
    renderCourseCards(done, right.body, true);
    if (!done.length) emptyCol(right.body, "No completed courses yet.");

    split.append(left.wrap, right.wrap);
    parent.appendChild(split);
    return { ip: ip.length, done: done.length };
  }

  async function buildCourseList(email, started) {
    return Promise.all((pageData.courses || []).map(async (course) => {
      const id = String(course.id);
      const content = courseContent(course);
      const comps = pageData.completions.get(id) || await fetchCompletions(email, id);
      const items = flatItems(content);
      const earnedXp = items.reduce((s, i) => {
        const set = i.type === "learn" ? comps.lesson : i.type === "quiz" ? comps.quiz : i.type === "challenge" ? comps.challenge : null;
        return s + (set?.has(Number(i.lesson_number)) ? Number(i.xp || 0) : 0);
      }, 0);
      const done = comps.lesson.size + comps.quiz.size + comps.challenge.size;
      const required = items.filter((i) => i.type !== "sandbox").length;
      const status = course.status && course.status !== "not-started" ? course.status
        : required > 0 && done >= required ? "completed" : done > 0 ? "in-progress" : "not-started";
      return { ...course, contentId: contentId(course) || id, earnedXp, status };
    }));
  }

  function renderCourseCards(courses, parent, isCompleted, started) {
    courses.forEach((c) => {
      const last = started?.get(String(c.id));
      const link = (!isCompleted && last) ? lessonLink(c.id, c.contentId, last) : courseLink(c.id, c.contentId);
      const diff = String(c.difficulty || "novice").toLowerCase();
      const pct = Number(c.progress_pct || 0);
      const card = el("div", "net-card net-coursecard-enhanced mb-3");
      card.innerHTML = `
        <div class="d-flex flex-column flex-md-row gap-4 p-4">
          <div class="net-course-visual"><i class="bi ${isCompleted ? "bi-check-circle-fill" : "bi-journal-album"}"></i></div>
          <div class="flex-grow-1">
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="net-diffbadge net-badge-${diff === "intermediate" ? "int" : diff === "advanced" ? "adv" : "nov"}">${capitalize(diff)}</span>
            </div>
            <h3 class="h5 fw-bold mb-2">${c.title || "Course"}</h3>
            <p class="text-muted small mb-3" style="max-width:600px">${c.description || "No description available."}</p>
            ${c.estimated_time ? `<div class="small text-muted"><i class="bi bi-clock me-1"></i>${c.estimated_time}</div>` : ""}
            <div class="mt-3" style="max-width:280px">
              <div class="d-flex justify-content-between small mb-1"><span>Progress</span><span class="fw-semibold">${pct}%</span></div>
              <div class="net-meter"><div class="net-meter-fill" style="width:${pct}%"></div></div>
            </div>
          </div>
          <div class="d-flex flex-column align-items-md-end justify-content-center gap-2 min-w-150">
            <a class="btn btn-teal" href="${link}">${isCompleted ? '<i class="bi bi-eye me-1"></i> Review' : '<i class="bi bi-play-fill me-1"></i> Resume'}</a>
          </div>
        </div>`;
      parent.appendChild(card);
    });
  }

  // modules tab
  async function renderModules(parent, email, started) {
    const ip = [], done = [];

    for (const course of (pageData.courses || [])) {
      const id = String(course.id);
      const content = courseContent(course);
      if (!content?.units?.length) continue;
      const comps = pageData.completions.get(id) || await fetchCompletions(email, id);
      const total = comps.lesson.size + comps.quiz.size + comps.challenge.size;
      const courseStarted = total > 0 || started.has(id);
      const cid = contentId(course) || id;

      buildModules(content).forEach((mod) => {
        const prog = modProgress(mod, comps);
        if (!prog.total) return;
        const item = { number: mod.index, title: mod.title, link: moduleLink(id, cid, mod.id || mod.index), meta: `Module ${mod.index} — ${prog.done}/${prog.total} items`, ctaLabel: prog.completed ? "Review Module" : "Open Module" };
        if (prog.completed) done.push({ id, cid, title: course.title, item });
        else if (courseStarted) ip.push({ id, cid, title: course.title, item });
      });
    }

    const toGroups = (arr) => {
      const map = new Map();
      arr.forEach(({ id, cid, title, item }) => { if (!map.has(id)) map.set(id, { courseId: id, contentId: cid, title, items: [] }); map.get(id).items.push(item); });
      return [...map.values()];
    };

    const ipGroups = toGroups(ip), doneGroups = toGroups(done);
    if (ipGroups.length || doneGroups.length) renderSplit(ipGroups, doneGroups, parent, "modules");
    return { ip: ip.length, done: done.length };
  }

  // items tabs (lessons / quizzes / challenges / tutorials)
  async function renderItems(tab, parent, email, started) {
    const groups = tab === "tutorials" ? buildTutorialGroups(email) : await buildItemGroups(tab, email, started);
    if (groups.ip.length || groups.done.length) renderSplit(groups.ip, groups.done, parent, tab);
    return { ip: countItems(groups.ip), done: countItems(groups.done) };
  }

  async function buildItemGroups(tab, email, started) {
    const ip = [], done = [];
    const targetType = tab === "lessons" ? "learn" : tab === "quizzes" ? "quiz" : "challenge";

    for (const course of (pageData.courses || [])) {
      const id = String(course.id);
      const cid = contentId(course) || id;
      const content = courseContent(course);
      const comps = pageData.completions.get(id) || await fetchCompletions(email, id);
      const total = comps.lesson.size + comps.quiz.size + comps.challenge.size;
      const courseStarted = total > 0 || started.has(id);
      const doneSet = targetType === "quiz" ? comps.quiz : targetType === "challenge" ? comps.challenge : comps.lesson;
      const titleMap = lessonTitles(content);

      uniqueByType(content, targetType).forEach((item) => {
        const n = Number(item.lesson_number);
        if (!n) return;
        const entry = { number: n, title: titleMap.get(n) || `Lesson ${n}`, link: targetType === "challenge" ? challengeLink(id, cid, n) : lessonLink(id, cid, n) };
        if (doneSet.has(n)) done.push({ id, cid, title: course.title, item: entry });
        else if (courseStarted) ip.push({ id, cid, title: course.title, item: entry });
      });
    }

    const toGroups = (arr) => {
      const map = new Map();
      arr.sort((a, b) => a.item.number - b.item.number).forEach(({ id, cid, title, item }) => { if (!map.has(id)) map.set(id, { courseId: id, contentId: cid, title, items: [] }); map.get(id).items.push(item); });
      return [...map.values()];
    };
    return { ip: toGroups(ip), done: toGroups(done) };
  }

  function buildTutorialGroups(email) {
    const ipMap = new Map(), doneMap = new Map();
    const prefix = `netology_tutorial_progress:${email}:`;

    Object.keys(localStorage).forEach((key) => {
      if (!key.startsWith(prefix)) return;
      const [courseId, lessonStr] = key.replace(prefix, "").split(":");
      const lessonNum = Number(lessonStr);
      if (!courseId || !lessonNum) return;

      const payload = parseJson(localStorage.getItem(key), {});
      const checked = Array.isArray(payload.checked) ? payload.checked.filter(Boolean).length : 0;
      const course = pageData.courses.find((c) => String(c.id) === courseId);
      const cid = contentId(course) || courseId;
      const content = courseContent(course || { id: courseId });
      const totalSteps = tutorialSteps(content, lessonNum);

      const item = { number: lessonNum, title: lessonTitles(content).get(lessonNum) || `Lesson ${lessonNum}`, link: tutorialLink(courseId, cid, lessonNum), meta: `Tutorial — ${checked}/${totalSteps || 0} steps` };
      const map = totalSteps > 0 && checked >= totalSteps ? doneMap : ipMap;
      const list = map.get(courseId) || [];
      list.push(item);
      map.set(courseId, list);
    });

    const toGroups = (map) => [...map.entries()].map(([id, items]) => {
      const c = pageData.courses.find((x) => String(x.id) === id);
      return { courseId: id, contentId: contentId(c) || id, title: c?.title || `Course ${id}`, items: items.sort((a, b) => a.number - b.number) };
    });
    return { ip: toGroups(ipMap), done: toGroups(doneMap) };
  }

  // split column renderer
  function renderSplit(ipGroups, doneGroups, parent, tab) {
    const split = el("div", "net-progress-split");
    const left = buildCol("In progress", countItems(ipGroups), false);
    const right = buildCol("Completed", countItems(doneGroups), true);
    renderGroupCards(ipGroups, left.body, tab, false);
    if (!ipGroups.length) emptyCol(left.body, "Nothing in progress yet.");
    renderGroupCards(doneGroups, right.body, tab, true);
    if (!doneGroups.length) emptyCol(right.body, "Nothing completed yet.");
    split.append(left.wrap, right.wrap);
    parent.appendChild(split);
  }

  function renderGroupCards(groups, parent, tab, isReview) {
    const cfg = TYPE_CONFIG[tab] || TYPE_CONFIG.lessons;
    groups.forEach((group) => {
      const card = el("div", `net-card net-progress-card net-card-fixed net-focus-card mb-3 ${cfg.card}`);
      const header = el("div", "d-flex align-items-start justify-content-between flex-wrap gap-3 mb-2 net-progress-group-head");
      header.innerHTML = `
        <div class="d-flex align-items-start gap-3">
          <div class="net-progress-pill"><i class="bi ${cfg.icon}"></i></div>
          <div>
            <div class="fw-semibold">${group.title || "Course"}</div>
            <div class="small text-muted">${group.items.length} ${cfg.label.toLowerCase()}${group.items.length === 1 ? "" : "s"}</div>
            <div class="d-flex flex-wrap gap-2 mt-2"></div>
          </div>
        </div>
        <a class="btn btn-outline-secondary btn-sm" href="${courseLink(group.courseId, group.contentId)}"><i class="bi bi-arrow-right me-2"></i>Open course</a>`;
      header.querySelector(".gap-2.mt-2").appendChild(statusChip(isReview ? "completed" : "progress"));

      const ul = el("ul", "net-progress-items net-card-body");
      group.items.forEach((item) => {
        const li = el("li");
        const variant = cfg.variant ? ` net-progress-item--${cfg.variant}` : "";
        const cta = item.ctaLabel || (isReview ? cfg.ctaDone : cfg.ctaContinue);
        li.innerHTML = `
          <a href="${item.link}" class="net-progress-item${variant} net-focus-card">
            <span class="net-progress-item-pill"><i class="bi ${cfg.icon}"></i></span>
            <span class="net-progress-item-text">
              <span class="net-progress-item-title">${item.title || ""}</span>
              <span class="net-progress-item-meta">${item.meta || `${cfg.label} ${item.number}`}</span>
            </span>
            <span class="net-progress-item-cta"><i class="bi bi-arrow-right"></i> ${cta}</span>
          </a>`;
        ul.appendChild(li);
      });
      card.append(header, ul);
      parent.appendChild(card);
    });
  }

  // section / column / state builders
  function buildSection(id, cfg) {
    const wrap = el("section", "net-progress-section");
    wrap.id = id;
    wrap.setAttribute("data-progress-section", id);
    wrap.innerHTML = `<div class="net-card p-4 net-progress-section-head net-section-head"><div class="net-progress-section-title net-section-title">${cfg.title}</div><div class="net-section-sub">${cfg.subtitle}</div></div>`;
    const body = el("div", "net-progress-section-body");
    wrap.appendChild(body);
    return { wrap, body };
  }

  function buildCol(title, count, isCompleted, xpTotal) {
    const wrap = el("div", "net-progress-col");
    const xpHtml = typeof xpTotal === "number" ? `<span class="net-progress-col-xp"><i class="bi bi-lightning-charge-fill"></i> ${xpTotal} XP</span>` : "";
    wrap.innerHTML = `<div class="net-card p-3 net-progress-col-head"><div class="net-progress-col-title"><i class="bi ${isCompleted ? "bi-check2-circle" : "bi-play-circle"} text-teal"></i><span>${title}</span></div><div class="net-progress-col-meta"><span class="net-progress-col-count">${count}</span>${xpHtml}</div></div>`;
    const body = el("div", "net-progress-col-body");
    wrap.appendChild(body);
    return { wrap, body };
  }

  function emptyCol(parent, msg) {
    const d = el("div", "net-card p-4 net-progress-empty-col");
    d.innerHTML = `<i class="bi bi-info-circle"></i><div class="small text-muted">${msg}</div>`;
    parent.appendChild(d);
  }

  function showEmpty(tab) {
    const container = $("progressEmpty");
    if (!container) return;
    const cfg = TAB_CONFIG[tab];
    container.classList.remove("d-none");
    const icon = container.querySelector("i");
    if (icon) icon.className = `bi ${cfg.icon}`;
    setText("progressEmptyTitle", cfg.emptyTitle);
    setText("progressEmptyText", cfg.emptyText);
    const cta = $("progressEmptyCta");
    if (cta) { cta.innerHTML = `<i class="bi ${cfg.icon} me-2"></i>${cfg.ctaText}`; cta.setAttribute("href", cfg.ctaLink); }
  }

  function skeleton(parent) {
    const wrap = el("div", "net-progress-loading");
    for (let i = 0; i < 2; i++) {
      const card = el("div", "net-card p-4");
      card.innerHTML = `<div class="net-skel net-w-40 mb-2"></div><div class="net-skel net-w-80 mb-2"></div><div class="net-skel net-w-60"></div>`;
      wrap.appendChild(card);
    }
    parent.replaceChildren(wrap);
  }

  function statusChip(status) {
    const lookup = {
      completed: ["Completed",   "net-status-chip--completed", "bi-check2-circle"],
      locked:    ["Locked",      "net-status-chip--locked",    "bi-lock-fill"],
      progress:  ["In progress", "net-status-chip--progress",  "bi-arrow-repeat"]
    };
    const [label, cls, icon] = lookup[status] || ["Active", "net-status-chip--active", "bi-play-circle"];
    const chip = el("span", `net-status-chip ${cls}`);
    chip.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i>${label}`;
    return chip;
  }

  function animateNum(el, target) {
    const next = Number(target || 0), cur = Number(el.dataset.count || el.textContent || 0);
    if (!Number.isFinite(next) || cur === next) { el.textContent = next; el.dataset.count = next; return; }
    const t0 = performance.now();
    const tick = (now) => { const p = Math.min(1, (now - t0) / 420); el.textContent = Math.round(cur + (next - cur) * p); if (p < 1) requestAnimationFrame(tick); else el.dataset.count = next; };
    requestAnimationFrame(tick);
  }

  // link builders
  const courseLink    = (id, cid) => `course.html?id=${id}${cid ? `&content_id=${cid}` : ""}`;
  const lessonLink    = (id, cid, n) => `lesson.html?course_id=${id}${cid ? `&content_id=${cid}` : ""}&lesson=${n}`;
  const challengeLink = (id, cid, n) => `sandbox.html?course_id=${id}${cid ? `&content_id=${cid}` : ""}&lesson=${n}&mode=challenge&challenge=1`;
  const tutorialLink  = (id, cid, n) => `sandbox.html?course_id=${id}${cid ? `&content_id=${cid}` : ""}&lesson=${n}&mode=practice`;
  const moduleLink    = (id, cid, m) => `course.html?id=${id}${cid ? `&content_id=${cid}` : ""}${m ? `&module=${m}` : ""}`;

  // data fetching
  async function fetchCourses(email) {
    const data = await get(EP.courses.userCourses, { email });
    if (data?.success && Array.isArray(data.courses)) return data.courses;
    return Object.entries(window.COURSE_CONTENT || {}).map(([id, c]) => ({ id, title: c.title, description: c.description || "", difficulty: c.difficulty || "novice", estimated_time: c.estimatedTime || "", progress_pct: 0, status: "not-started" }));
  }

  function getStartedMap(email) {
    const list = parseJson(localStorage.getItem(`netology_started_courses:${email}`), []) || [];
    return new Map(list.filter(Boolean).map((e) => [String(e.id), Number(e.lastLesson)]).filter(([, n]) => n > 0));
  }

  async function fetchCompletions(email, courseId) {
    const key = `${email}:${courseId}`;
    if (completionCache.has(key)) return completionCache.get(key);
    let result;
    try {
      const data = await get(EP.courses.userCourseStatus, { email, course_id: courseId });
      if (data?.success) {
        result = { lesson: new Set((data.lessons || []).map(Number)), quiz: new Set((data.quizzes || []).map(Number)), challenge: new Set((data.challenges || []).map(Number)) };
      }
    } catch { /* fall through */ }
    if (!result) {
      const raw = parseJson(localStorage.getItem(`netology_completions:${email}:${courseId}`), {});
      result = { lesson: new Set((raw.lesson || raw.lessons || raw.learn || []).map(Number)), quiz: new Set((raw.quiz || raw.quizzes || []).map(Number)), challenge: new Set((raw.challenge || raw.challenges || []).map(Number)) };
    }
    completionCache.set(key, result);
    return result;
  }

  async function buildCompletionsMap(email, courses) {
    const map = new Map();
    await Promise.all((courses || []).map(async (c) => { const id = String(c.id); map.set(id, await fetchCompletions(email, id)); }));
    return map;
  }

  async function buildCounts(email) {
    const counts = { "in-progress": 0, "completed-courses": 0, "modules-in-progress": 0, "modules-completed": 0, lessons: 0, quizzes: 0, challenges: 0, tutorials: 0 };
    const started = getStartedMap(email);

    await Promise.all((pageData.courses || []).map(async (course) => {
      const id = String(course.id);
      const content = courseContent(course);
      const comps = pageData.completions.get(id) || await fetchCompletions(email, id);
      const done = comps.lesson.size + comps.quiz.size + comps.challenge.size;
      const required = flatItems(content).filter((i) => i.type !== "sandbox").length;

      if (required > 0 && done >= required) counts["completed-courses"]++;
      else if (done > 0) counts["in-progress"]++;

      counts.lessons += comps.lesson.size;
      counts.quizzes += comps.quiz.size;
      counts.challenges += comps.challenge.size;

      if (content?.units?.length) {
        const courseStarted = done > 0 || started.has(id);
        buildModules(content).forEach((mod) => {
          const p = modProgress(mod, comps);
          if (p.completed) counts["modules-completed"]++;
          else if (courseStarted) counts["modules-in-progress"]++;
        });
      }
    }));

    const prefix = `netology_tutorial_progress:${email}:`;
    Object.keys(localStorage).forEach((k) => {
      if (!k.startsWith(prefix)) return;
      const [cid, ln] = k.replace(prefix, "").split(":");
      if (cid && Number(ln) > 0) counts.tutorials++;
    });

    return counts;
  }

  // course content helpers
  function courseContent(course) {
    if (!course) return null;
    const content = window.COURSE_CONTENT || {};
    const byTitle = Object.values(content).find((c) => String(c?.title || "").trim().toLowerCase() === String(course.title || "").trim().toLowerCase());
    return byTitle || content[String(course.id)] || null;
  }

  function contentId(course) {
    if (!course) return null;
    const content = window.COURSE_CONTENT || {};
    const match = Object.values(content).find((c) => String(c?.title || "").trim().toLowerCase() === String(course.title || "").trim().toLowerCase());
    return match?.id ? String(match.id) : null;
  }

  function flatItems(course) {
    if (!course?.units?.length) return [];
    const items = []; let n = 1;
    course.units.forEach((unit) => { const r = normalizeUnit(unit, n); items.push(...r.items); n = r.next; });
    return items;
  }

  function buildModules(course) {
    if (!course?.units?.length) return [];
    const mods = []; let n = 1;
    course.units.forEach((unit, i) => {
      const r = normalizeUnit(unit, n);
      mods.push({ id: unit.id || `module-${i + 1}`, index: i + 1, title: unit.title || `Module ${i + 1}`, items: r.items });
      n = r.next;
    });
    return mods;
  }

  function normalizeUnit(unit, start) {
    const items = []; let n = start;

    const push = (type, raw) => items.push({ type, title: raw.title || raw.name || capitalize(type), lesson_number: Number(raw.lesson_number || raw.lessonNumber || 0), xp: Number(raw.xp || raw.xpReward || raw.xp_reward || 0), steps: Array.isArray(raw.steps) ? raw.steps : [] });

    if (Array.isArray(unit.sections)) {
      unit.sections.forEach((sec) => {
        const st = String(sec.type || sec.kind || sec.title || "").toLowerCase();
        (sec.items || sec.lessons || []).forEach((item) => push(resolveType(st, item), item));
      });
    } else if (unit.sections && typeof unit.sections === "object") {
      const s = unit.sections;
      (s.learn || s.lesson || s.lessons || []).forEach((i) => push("learn", i));
      (s.quiz || s.quizzes || []).forEach((i) => push("quiz", i));
      (s.practice || s.sandbox || []).forEach((i) => push("sandbox", i));
      (s.challenge || s.challenges || []).forEach((i) => push("challenge", i));
    } else if (Array.isArray(unit.lessons)) {
      unit.lessons.forEach((item) => { const t = String(item.type || "learn").toLowerCase(); push(t === "quiz" ? "quiz" : t === "challenge" ? "challenge" : t === "sandbox" || t === "practice" ? "sandbox" : "learn", item); });
    }

    let lastLearn = n - 1;
    items.forEach((item) => {
      if (item.type === "learn") { item.lesson_number = item.lesson_number || (n++); lastLearn = item.lesson_number; n = Math.max(n, item.lesson_number + 1); }
      else if (!item.lesson_number) item.lesson_number = Math.max(1, lastLearn);
      if (!item.xp) item.xp = item.type === "quiz" ? 60 : item.type === "challenge" ? 80 : item.type === "sandbox" ? 30 : 40;
    });

    const order = { learn: 1, quiz: 2, sandbox: 3, challenge: 4 };
    items.sort((a, b) => a.lesson_number !== b.lesson_number ? a.lesson_number - b.lesson_number : (order[a.type] || 9) - (order[b.type] || 9));
    return { items, next: n };
  }

  function resolveType(sectionType, item) {
    const t = String(item.type || "").toLowerCase();
    if (t === "quiz" || t === "challenge" || t === "learn") return t;
    if (t === "sandbox" || t === "practice") return "sandbox";
    if (sectionType.includes("quiz")) return "quiz";
    if (sectionType.includes("challenge")) return "challenge";
    if (sectionType.includes("practice") || sectionType.includes("sandbox") || sectionType.includes("hands-on")) return "sandbox";
    return "learn";
  }

  function uniqueByType(course, type) {
    const seen = new Set();
    return flatItems(course).filter((i) => i.type === type && Number(i.lesson_number)).filter((i) => { const n = Number(i.lesson_number); return seen.has(n) ? false : (seen.add(n), true); });
  }

  function lessonTitles(course) {
    const map = new Map();
    flatItems(course).forEach((i) => { if (i.type === "learn" && i.lesson_number && !map.has(i.lesson_number)) map.set(Number(i.lesson_number), i.title || `Lesson ${i.lesson_number}`); });
    return map;
  }

  function tutorialSteps(course, lessonNumber) {
    if (!course?.units?.length) return 0;
    let n = 1, steps = 0;
    course.units.forEach((unit) => {
      (unit.sections || []).forEach((sec) => {
        (sec.items || []).forEach((item) => {
          const t = String(item.type || "").toLowerCase();
          if (t === "learn") { if (n === lessonNumber) steps = Math.max(steps, (item.steps || []).length); n++; }
          else if ((t === "practice" || t === "sandbox") && n - 1 === lessonNumber) steps = Math.max(steps, (item.steps || []).length);
        });
      });
    });
    return steps;
  }

  function modProgress(mod, comps) {
    const required = (mod.items || []).filter((i) => i.type === "learn" || i.type === "quiz" || i.type === "challenge");
    const setMap = { learn: comps.lesson, quiz: comps.quiz, challenge: comps.challenge };
    const done = required.filter((i) => setMap[i.type]?.has(Number(i.lesson_number))).length;
    return { done, total: required.length, completed: required.length > 0 && done === required.length };
  }

  function countItems(groups) { return (groups || []).reduce((s, g) => s + (g.items?.length || 0), 0); }
})();
