/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 09/02/2026

dashboard.js – Dashboard interactions (UPDATED for your latest dashboard.html)

Works with:
- NO topbar search (topSearch removed)
- Course search stays in the Courses section:
    #courseSearch (desktop) + #mobileSearch (mobile)
  These are fully synced.
- Slide sidebar open/close (backdrop + ESC)
- User dropdown toggle + click outside + ESC
- Brand routing: dashboard if logged in, index if not
- Course lock gating by numeric_level:
    novice unlocked at level >= 1
    intermediate unlocked at level >= 3
    advanced unlocked at level >= 5
- Welcome/Sidebar UI fill:
    sets name, email, avatar initial, level, XP bar, and updates the ring (#welcomeRing)
- Continue Learning:
    picks first unlocked course (simple but always works)
- Courses grid:
    shows unlocked courses as normal, locked courses show "Unlock at Level X" and are not clickable
*/

(function () {
  // -----------------------------
  // Helpers
  // -----------------------------
  const $ = (id) => document.getElementById(id);
  const XP_PER_LEVEL = 100;

  function safeJSONParse(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
  }

  function getCurrentUser() {
    return (
      safeJSONParse(localStorage.getItem("netology_user"), null) ||
      safeJSONParse(localStorage.getItem("user"), null) ||
      null
    );
  }

  function isLoggedIn() {
    const u = getCurrentUser();
    return !!(u && (u.email || u.username || u.name));
  }

  function levelFromXP(totalXP) {
    const xp = Math.max(0, Number(totalXP) || 0);
    return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
  }

  function userNumericLevel(user) {
    const totalXP = Number(user?.xp) || 0;
    return levelFromXP(totalXP);
  }

  function getUserRank(user) {
    const raw = String(user?.unlock_tier || user?.rank || user?.level_name || user?.level || "novice").toLowerCase();
    if (raw.includes("advanced")) return "Advanced";
    if (raw.includes("intermediate")) return "Intermediate";
    return "Novice";
  }

  function computeXP(user) {
    const totalXP = Number(user?.xp) || 0;
    const currentLevelXP = ((totalXP % XP_PER_LEVEL) + XP_PER_LEVEL) % XP_PER_LEVEL; // safe mod
    const progressPct = Math.max(0, Math.min(100, (currentLevelXP / XP_PER_LEVEL) * 100));
    const toNext = XP_PER_LEVEL - currentLevelXP;
    const level = levelFromXP(totalXP);
    return { totalXP, currentLevelXP, progressPct, toNext, level };
  }

  function difficultyRequiredLevel(diff) {
    if (diff === "novice") return 1;
    if (diff === "intermediate") return 3;
    if (diff === "advanced") return 5;
    return 1;
  }

  function prettyDiff(diff) {
    if (!diff) return "Novice";
    return diff.charAt(0).toUpperCase() + diff.slice(1);
  }

  // Welcome ring
  // Your HTML uses the course-style ring (r=58, dasharray ~364.42)
  function setWelcomeRing(progressPct) {
    const ring = $("welcomeRing");
    if (!ring) return;

    const r = 58;
    const CIRC = 2 * Math.PI * r; // ~364.42
    const offset = CIRC * (1 - (progressPct / 100));

    ring.style.strokeDasharray = `${CIRC.toFixed(2)}`;
    ring.style.strokeDashoffset = `${offset.toFixed(2)}`;
  }

  // -----------------------------
  // Brand routing (dashboard vs index)
  // -----------------------------
  function wireBrandRouting() {
    const topBrand = $("topBrand");
    const sideBrand = $("sideBrand");
    const target = isLoggedIn() ? "dashboard.html" : "index.html";

    if (topBrand) topBrand.setAttribute("href", target);
    if (sideBrand) sideBrand.setAttribute("href", target);
  }

  // -----------------------------
  // Sidebar
  // -----------------------------
  function setupSidebar() {
    const openBtn = $("openSidebarBtn");
    const closeBtn = $("closeSidebarBtn");
    const sidebar = $("slideSidebar");
    const backdrop = $("sideBackdrop");

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

  // -----------------------------
  // User dropdown
  // -----------------------------
  function setupUserDropdown() {
    const btn = $("userBtn");
    const dd = $("userDropdown");

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

  // -----------------------------
  // Logout
  // -----------------------------
  function setupLogout() {
    const topLogout = $("topLogoutBtn");
    const sideLogout = $("sideLogoutBtn");

    function doLogout() {
      localStorage.removeItem("netology_user");
      localStorage.removeItem("user");
      localStorage.removeItem("netology_token");
      window.location.href = "index.html";
    }

    topLogout?.addEventListener("click", doLogout);
    sideLogout?.addEventListener("click", doLogout);
  }

  // -----------------------------
  // Courses data (from course_content.js)
  // -----------------------------
  function getCoursesFromContent() {
    const cc = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT)
      ? COURSE_CONTENT
      : (window.COURSE_CONTENT || {});
    const list = [];

    for (const key of Object.keys(cc)) {
      const c = cc[key] || {};
      const id = c.id || key;
      const title = c.title || "Untitled Course";
      const description = c.description || c.about || "Learn networking skills.";
      const difficulty = (c.difficulty || "novice").toLowerCase();
      const required_level = Number(c.required_level) || difficultyRequiredLevel(difficulty);

      const items = countRequiredItems(c);

      const xpReward = Number(c.xpReward || c.xp_reward || 500) || 500;
      const category = c.category || "Core";
      const estimatedTime = c.estimatedTime || "—";

      list.push({
        key,
        id,
        title,
        description,
        difficulty,
        required_level,
        xpReward,
        items,
        category,
        estimatedTime,
      });
    }

    const rank = { novice: 1, intermediate: 2, advanced: 3 };
    list.sort((a, b) => (rank[a.difficulty] - rank[b.difficulty]) || a.title.localeCompare(b.title));
    return list;
  }

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

  function getCourseCompletions(email, courseId) {
    if (!email || !courseId) {
      return { lesson: new Set(), quiz: new Set(), challenge: new Set() };
    }
    const raw = localStorage.getItem(`netology_completions:${email}:${courseId}`);
    const payload = safeJSONParse(raw, {}) || {};
    const lessonArr = payload.lesson || payload.lessons || payload.learn || [];
    const quizArr = payload.quiz || payload.quizzes || [];
    const chArr = payload.challenge || payload.challenges || [];

    return {
      lesson: new Set((lessonArr || []).map(Number)),
      quiz: new Set((quizArr || []).map(Number)),
      challenge: new Set((chArr || []).map(Number))
    };
  }

  function getProgressLog(email) {
    if (!email) return [];
    return safeJSONParse(localStorage.getItem(`netology_progress_log:${email}`), []) || [];
  }

  function getStartedCourses(email) {
    if (!email) return [];
    const raw = localStorage.getItem(`netology_started_courses:${email}`);
    const list = safeJSONParse(raw, []) || [];
    return Array.isArray(list) ? list : [];
  }

  function computeStreak(log) {
    if (!log.length) return 0;
    const days = new Set(log.map(e => e.date).filter(Boolean));
    let streak = 0;
    const d = new Date();
    for (;;) {
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

  // -----------------------------
  // Render course cards
  // -----------------------------
  function buildCourseCard(course, userLevel) {
    const locked = userLevel < course.required_level;
    const diff = course.difficulty;

    const gradClass =
      diff === "advanced" ? "net-grad-adv"
      : diff === "intermediate" ? "net-grad-int"
      : "net-grad-nov";

    const badgeClass =
      diff === "advanced" ? "net-badge-adv"
      : diff === "intermediate" ? "net-badge-int"
      : "net-badge-nov";

    const card = document.createElement("div");
    card.className = "net-coursecard";
    card.setAttribute("data-diff", diff);
    card.setAttribute("data-title", (course.title || "").toLowerCase());
    card.setAttribute("data-category", (course.category || "").toLowerCase());
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", locked ? `${course.title} locked` : `${course.title} open course`);

    card.innerHTML = `
      <div class="net-coursebar ${gradClass}"></div>
      <div class="p-4">
        <div class="d-flex align-items-start justify-content-between gap-2">
          <div class="flex-grow-1">
            <div class="net-eyebrow">${course.category}</div>
            <div class="fw-bold fs-6 mt-1 d-flex align-items-center gap-2">
              ${course.title}
              ${locked ? `<span class="badge bg-light text-dark border" title="Locked"><i class="bi bi-lock-fill me-1"></i>Locked</span>` : ``}
            </div>
          </div>
          <span class="net-diffbadge ${badgeClass}">${prettyDiff(diff)}</span>
        </div>

        <div class="text-muted small mt-2" style="min-height:44px;">
          ${course.description}
        </div>

        <div class="d-flex align-items-center justify-content-between mt-3 small">
          <div class="text-muted">
            ${course.items ? `${course.items} items` : `Course`} • ${course.estimatedTime}
          </div>
          <div class="fw-bold" style="color:#0f766e;">
            <i class="bi bi-lightning-charge-fill me-1"></i>${course.xpReward}
          </div>
        </div>

        <div class="mt-3">
          <button class="btn ${locked ? "btn-outline-secondary" : "btn-teal"} btn-sm w-100" ${locked ? "disabled" : ""}>
            ${locked ? `Unlock at Level ${course.required_level}` : "Open Course"}
          </button>
        </div>
      </div>
    `;

    function goCourse() {
      if (locked) return;
      window.location.href = `course.html?id=${encodeURIComponent(course.key)}`;
    }

    card.addEventListener("click", goCourse);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goCourse();
      }
    });

    return { card, locked };
  }

  // -----------------------------
  // Search + filter
  // -----------------------------
  function applyCourseFilters() {
    const q = (window.__dashQuery || "").trim().toLowerCase();
    const diff = window.__dashDiff || "all";

    const grid = $("coursesGrid");
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll(".net-coursecard"));
    let shown = 0;

    cards.forEach((el) => {
      const title = el.getAttribute("data-title") || "";
      const cat = el.getAttribute("data-category") || "";
      const cdiff = el.getAttribute("data-diff") || "novice";

      const matchQuery = !q || title.includes(q) || cat.includes(q);
      const matchDiff = diff === "all" || cdiff === diff;

      const show = matchQuery && matchDiff;
      el.style.display = show ? "" : "none";
      if (show) shown++;
    });

    // If nothing matches, show empty-state (but DON'T permanently destroy the grid content)
    const emptyId = "dashEmptyState";
    const existing = $(emptyId);
    if (existing) existing.remove();

    if (shown === 0) {
      const empty = document.createElement("div");
      empty.id = emptyId;
      empty.className = "net-empty";
      empty.innerHTML = `
        <i class="bi bi-search"></i>
        <div class="fw-bold">No courses found</div>
        <div class="small text-muted">Try a different search or filter.</div>
      `;
      grid.appendChild(empty);
    }
  }

  function setupCourseSearchAndChips() {
    const desktop = $("courseSearch");
    const mobile = $("mobileSearch");
    const chips = Array.from(document.querySelectorAll(".net-chip[data-diff]"));

    window.__dashQuery = "";
    window.__dashDiff = "all";

    function onSearchInput(from) {
      const val = from?.value || "";
      window.__dashQuery = val;

      // sync the other input
      if (from === desktop && mobile) mobile.value = val;
      if (from === mobile && desktop) desktop.value = val;

      applyCourseFilters();
    }

    desktop?.addEventListener("input", () => onSearchInput(desktop));
    mobile?.addEventListener("input", () => onSearchInput(mobile));

    chips.forEach((btn) => {
      btn.addEventListener("click", () => {
        chips.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        window.__dashDiff = btn.getAttribute("data-diff") || "all";
        applyCourseFilters();
      });
    });
  }

  // -----------------------------
  // Continue learning
  // -----------------------------
  function renderContinueLearning() {
    const box = $("continueBox");
    if (!box) return;

    const user = getCurrentUser();
    const email = user?.email;

    if (!email) {
      box.className = "dash-continue-list";
      box.innerHTML = `<div class="text-muted small">Sign in to track your learning progress.</div>`;
      return;
    }

    const started = getStartedCourses(email)
      .sort((a, b) => Number(b.lastViewed || 0) - Number(a.lastViewed || 0));

    if (!started.length) {
      box.className = "dash-continue-list";
      box.innerHTML = `<div class="text-muted small">No started courses yet. Pick a course to begin.</div>`;
      return;
    }

    const content = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) ? COURSE_CONTENT : {};

    box.className = "dash-continue-list";
    box.innerHTML = started.map((entry) => {
      const course = content[String(entry.id)] || {};
      const title = course.title || "Course";
      const diff = String(course.difficulty || "novice");
      const category = course.category || "Core";
      const xpReward = Number(course.xpReward || course.xp_reward || course.totalXP || 0);

      const required = countRequiredItems(course);
      const completions = getCourseCompletions(email, entry.id);
      const done = completions.lesson.size + completions.quiz.size + completions.challenge.size;
      const pct = required ? Math.round((done / required) * 100) : 0;

      return `
        <div class="dash-continue-item" data-course-id="${entry.id}">
          <div class="flex-grow-1">
            <div class="fw-semibold">${title}</div>
            <div class="dash-continue-meta">${category} • ${prettyDiff(diff)}</div>
            <div class="net-meter mt-2" aria-label="Course progress">
              <div class="net-meter-fill" style="width:${pct}%"></div>
            </div>
            <div class="small text-muted mt-1">${done}/${required || 0} items</div>
          </div>
          <div class="text-end">
            <div class="small text-muted">Suggested</div>
            <div class="fw-semibold net-xp-accent">
              <i class="bi bi-lightning-charge-fill me-1"></i>${xpReward || 0}
            </div>
            <button class="btn btn-teal btn-sm mt-2" type="button">Continue</button>
          </div>
        </div>
      `;
    }).join("");

    box.querySelectorAll("[data-course-id]").forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.getAttribute("data-course-id");
        if (!id) return;
        window.location.href = `course.html?id=${encodeURIComponent(id)}`;
      });
    });
  }

  // -----------------------------
  // Render courses
  // -----------------------------
  function renderCourses() {
    const grid = $("coursesGrid");
    if (!grid) return;

    const user = getCurrentUser();
    const uLevel = userNumericLevel(user);

    const courses = getCoursesFromContent();
    if (!courses.length) {
      grid.innerHTML = `
        <div class="net-empty">
          <i class="bi bi-journal-x"></i>
          <div class="fw-bold">No courses available</div>
          <div class="small text-muted">Please check back later.</div>
        </div>
      `;
      const lockNote = $("lockNote");
      if (lockNote) lockNote.style.display = "none";
      return;
    }

    grid.innerHTML = "";
    let anyLocked = false;

    courses.forEach((c) => {
      const { card, locked } = buildCourseCard(c, uLevel);
      if (locked) anyLocked = true;
      grid.appendChild(card);
    });

    applyCourseFilters();

    const lockNote = $("lockNote");
    if (lockNote) {
      if (anyLocked) {
        lockNote.style.display = "";
        lockNote.textContent = "Some courses are locked until you level up (Intermediate unlocks at Level 3, Advanced at Level 5).";
      } else {
        lockNote.style.display = "none";
      }
    }
  }

  // -----------------------------
  // Progress widgets (streak, goals, achievements)
  // -----------------------------
  function renderProgressWidgets() {
    const user = getCurrentUser();
    const email = user?.email;
    if (!email) return;

    const content = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) ? COURSE_CONTENT : {};
    const courseIds = Object.keys(content);

    let lessonsDone = 0;
    let quizzesDone = 0;
    let challengesDone = 0;
    let inProgress = 0;
    let completed = 0;

    courseIds.forEach((id) => {
      const completions = getCourseCompletions(email, id);
      lessonsDone += completions.lesson.size;
      quizzesDone += completions.quiz.size;
      challengesDone += completions.challenge.size;

      const required = countRequiredItems(content[id]);
      const done = completions.lesson.size + completions.quiz.size + completions.challenge.size;
      if (required > 0) {
        if (done >= required) completed += 1;
        else if (done > 0) inProgress += 1;
      }
    });

    if ($("statInProgress")) $("statInProgress").textContent = String(inProgress);
    if ($("statCompleted")) $("statCompleted").textContent = String(completed);

    // Streak + weekly goals
    const log = getProgressLog(email);
    const streak = computeStreak(log);
    if ($("streakText")) $("streakText").textContent = `Streak: ${streak} day${streak === 1 ? "" : "s"}`;

    const weeklyTargets = { lessons: 5, quizzes: 3, sandbox: 2 };
    const weeklyLessons = countInLastDays(log, 7, "learn");
    const weeklyQuizzes = countInLastDays(log, 7, "quiz");
    const weeklySandbox = countInLastDays(log, 7, "challenge");

    const weeklyLessonsPct = Math.min(100, Math.round((weeklyLessons / weeklyTargets.lessons) * 100));
    const weeklyQuizzesPct = Math.min(100, Math.round((weeklyQuizzes / weeklyTargets.quizzes) * 100));
    const weeklySandboxPct = Math.min(100, Math.round((weeklySandbox / weeklyTargets.sandbox) * 100));

    if ($("weeklyLessonsText")) $("weeklyLessonsText").textContent = `${weeklyLessons}/${weeklyTargets.lessons}`;
    if ($("weeklyQuizzesText")) $("weeklyQuizzesText").textContent = `${weeklyQuizzes}/${weeklyTargets.quizzes}`;
    if ($("weeklySandboxText")) $("weeklySandboxText").textContent = `${weeklySandbox}/${weeklyTargets.sandbox}`;

    if ($("weeklyLessonsBar")) $("weeklyLessonsBar").style.width = `${weeklyLessonsPct}%`;
    if ($("weeklyQuizzesBar")) $("weeklyQuizzesBar").style.width = `${weeklyQuizzesPct}%`;
    if ($("weeklySandboxBar")) $("weeklySandboxBar").style.width = `${weeklySandboxPct}%`;

    const lessonsLeft = Math.max(0, weeklyTargets.lessons - weeklyLessons);
    if ($("weeklyGoalText")) {
      $("weeklyGoalText").textContent = lessonsLeft === 0 ? "Weekly goal complete" : `${lessonsLeft} lessons left`;
    }

    // Achievements (show only incomplete)
    const achievements = [
      { id: "fast-learner", title: "Fast Learner", desc: "Complete 5 lessons", icon: "bi-lightning-charge-fill", type: "lessons", target: 5 },
      { id: "sandbox-builder", title: "Sandbox Builder", desc: "Build 2 topologies", icon: "bi-diagram-3", type: "challenges", target: 2 },
      { id: "quiz-master", title: "Quiz Master", desc: "Pass 3 quizzes", icon: "bi-patch-check", type: "quizzes", target: 3 }
    ];

    const counts = { lessons: lessonsDone, quizzes: quizzesDone, challenges: challengesDone };
    const pending = achievements.filter(a => (counts[a.type] || 0) < a.target);

    if ($("nextBadgeText")) {
      if (pending.length) {
        const next = pending[0];
        const remaining = Math.max(0, next.target - (counts[next.type] || 0));
        const label = next.type === "quizzes" ? "quizzes" : next.type === "challenges" ? "topologies" : "lessons";
        $("nextBadgeText").textContent = `Complete ${remaining} ${label}`;
      } else {
        $("nextBadgeText").textContent = "All badges earned";
      }
    }

    const list = $("achievementsList");
    if (list) {
      if (!pending.length) {
        list.innerHTML = `<div class="small text-muted">All achievements completed. Great work.</div>`;
      } else {
        list.innerHTML = pending.map((a) => {
          const current = counts[a.type] || 0;
          return `
            <div class="dash-badge">
              <span class="dash-badge-ico"><i class="bi ${a.icon}"></i></span>
              <div>
                <div class="fw-semibold">${a.title}</div>
                <div class="small text-muted">${a.desc} (${current}/${a.target})</div>
              </div>
            </div>
          `;
        }).join("");
      }
    }

    if ($("focusText")) {
      $("focusText").textContent = streak > 0
        ? "Complete 1 lesson to keep your streak"
        : "Complete 1 lesson to start your streak";
    }
    if ($("focusXp")) $("focusXp").textContent = "XP varies";
  }

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

    const lvl = userNumericLevel(user);
    const { totalXP, currentLevelXP, progressPct, toNext } = computeXP(user);

    // Welcome
    if ($("welcomeName")) $("welcomeName").textContent = name;

    // Top user
    if ($("topUserName")) $("topUserName").textContent = name;
    if ($("topAvatar")) $("topAvatar").textContent = initial;

    // Dropdown
    if ($("ddName")) $("ddName").textContent = name;
    if ($("ddEmail")) $("ddEmail").textContent = email;
    if ($("ddAvatar")) $("ddAvatar").textContent = initial;
    if ($("ddLevel")) $("ddLevel").textContent = `Level ${lvl}`;
    if ($("ddRank")) $("ddRank").textContent = rank;

    // Sidebar user
    if ($("sideUserName")) $("sideUserName").textContent = name;
    if ($("sideUserEmail")) $("sideUserEmail").textContent = email;
    if ($("sideAvatar")) $("sideAvatar").textContent = initial;

    if ($("sideLevelBadge")) $("sideLevelBadge").textContent = `Lv ${lvl}`;
    if ($("sideXpText")) $("sideXpText").textContent = `${currentLevelXP}/${XP_PER_LEVEL}`;
    if ($("sideXpBar")) $("sideXpBar").style.width = `${progressPct}%`;
    if ($("sideXpHint")) $("sideXpHint").textContent = `${toNext} XP to next level`;

    // Stats tiles
    if ($("statLevel")) $("statLevel").textContent = String(lvl);
    if ($("statXp")) $("statXp").textContent = String(totalXP);
    if ($("statLevelHint")) $("statLevelHint").textContent = `${toNext} XP to next level`;

    // Welcome ring block
    if ($("welcomeLevel")) $("welcomeLevel").textContent = String(lvl);
    if ($("welcomeRank")) $("welcomeRank").textContent = rank;
    if ($("welcomeXpText")) $("welcomeXpText").textContent = `${currentLevelXP}/${XP_PER_LEVEL} XP`;
    if ($("welcomeLevelHint")) $("welcomeLevelHint").textContent = `${toNext} XP to next level`;

    setWelcomeRing(progressPct);
  }

  // -----------------------------
  // Init
  // -----------------------------
  function init() {
    wireBrandRouting();
    setupSidebar();
    setupUserDropdown();
    setupLogout();
    fillUserUI();
    setupCourseSearchAndChips();
    renderCourses();
    renderContinueLearning();
    renderProgressWidgets();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
