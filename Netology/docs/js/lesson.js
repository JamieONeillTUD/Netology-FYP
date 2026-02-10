/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/02/2026

lesson.js – Lesson page
- Loads lesson content from COURSE_CONTENT
- Links to quiz and sandbox practice/challenge
- Persists completion using backend when available
*/

(() => {
  "use strict";

  const getApiBase = () => window.API_BASE || "";

  const state = {
    user: null,
    courseId: null,
    lessonNumber: null,
    course: null,
    lessonEntry: null,
    itemsForLesson: [],
    challengeItem: null,
    practiceItem: null,
    quizItem: null,
    completedLessons: new Set(),
  };

  /* =========================================================
     Core helpers
  ========================================================= */

  function parseJsonSafe(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function getById(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const node = getById(id);
    if (node) node.textContent = value;
  }

  function getCurrentUser() {
    return (
      parseJsonSafe(localStorage.getItem("netology_user")) ||
      parseJsonSafe(localStorage.getItem("user")) ||
      null
    );
  }

  function isLoggedIn(user) {
    return !!(user && (user.email || user.username));
  }

  function capitalize(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function xpForNextLevel(level) {
    return Number(level || 1) * 100;
  }

  /* =========================================================
     Progress tracking (local + backend)
  ========================================================= */

  function trackCourseStart(email, courseId, lessonNumber) {
    if (!email || !courseId) return;
    const key = `netology_started_courses:${email}`;
    const list = parseJsonSafe(localStorage.getItem(key)) || [];
    const existing = list.find((c) => String(c.id) === String(courseId));

    const payload = {
      id: String(courseId),
      lastViewed: Date.now(),
      lastLesson: Number(lessonNumber || 0) || undefined
    };

    if (existing) {
      existing.lastViewed = payload.lastViewed;
      if (payload.lastLesson) existing.lastLesson = payload.lastLesson;
    } else {
      list.push(payload);
    }

    localStorage.setItem(key, JSON.stringify(list));
    startCourseBackend(email, courseId);
  }

  async function startCourseBackend(email, courseId) {
    if (!email || !courseId) return;
    try {
      await fetch(`${getApiBase()}/start-course`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, course_id: Number(courseId) })
      });
    } catch {
      // best effort
    }
  }

  /* =========================================================
     Default resources (fallback links)
  ========================================================= */

  function buildDefaultResources(title, courseTitle) {
    const t = `${title || ""} ${courseTitle || ""}`.toLowerCase();
    const list = [];
    const add = (label, url) => {
      if (!list.find((r) => r.url === url)) list.push({ label, url });
    };

    if (t.includes("network")) add("Computer network overview", "https://en.wikipedia.org/wiki/Computer_network");
    if (t.includes("lan")) add("Local area network", "https://en.wikipedia.org/wiki/Local_area_network");
    if (t.includes("wan")) add("Wide area network", "https://en.wikipedia.org/wiki/Wide_area_network");
    if (t.includes("ethernet")) add("Ethernet basics", "https://en.wikipedia.org/wiki/Ethernet");
    if (t.includes("mac")) add("MAC address", "https://en.wikipedia.org/wiki/MAC_address");
    if (t.includes("ip")) add("IP address", "https://en.wikipedia.org/wiki/IP_address");
    if (t.includes("subnet")) add("Subnetting", "https://en.wikipedia.org/wiki/Subnetting");
    if (t.includes("gateway")) add("Default gateway", "https://en.wikipedia.org/wiki/Default_gateway");
    if (t.includes("vlan")) add("Virtual LAN", "https://en.wikipedia.org/wiki/Virtual_LAN");
    if (t.includes("trunk")) add("IEEE 802.1Q", "https://en.wikipedia.org/wiki/IEEE_802.1Q");
    if (t.includes("routing") || t.includes("ospf")) add("Routing (overview)", "https://en.wikipedia.org/wiki/Routing");
    if (t.includes("firewall")) add("Firewall", "https://en.wikipedia.org/wiki/Firewall_(computing)");
    if (t.includes("acl")) add("Access control list", "https://en.wikipedia.org/wiki/Access_control_list");
    if (t.includes("siem") || t.includes("logging")) add("SIEM", "https://en.wikipedia.org/wiki/Security_information_and_event_management");
    if (t.includes("bgp")) add("BGP", "https://en.wikipedia.org/wiki/Border_Gateway_Protocol");
    if (t.includes("automation")) add("Network automation", "https://en.wikipedia.org/wiki/Network_automation");
    if (t.includes("snmp")) add("SNMP", "https://en.wikipedia.org/wiki/Simple_Network_Management_Protocol");

    if (list.length < 3) {
      add("Internet protocol suite", "https://en.wikipedia.org/wiki/Internet_protocol_suite");
      add("OSI model", "https://en.wikipedia.org/wiki/OSI_model");
      add("Computer network topologies", "https://en.wikipedia.org/wiki/Network_topology");
    }

    return list.slice(0, 4);
  }

  /* =========================================================
     Init
  ========================================================= */

  document.addEventListener("DOMContentLoaded", () => {
    initLessonPage().catch((err) => {
      console.error("Lesson init failed:", err);
    });
  });

  async function initLessonPage() {
    const params = new URLSearchParams(window.location.search);
    state.courseId = params.get("course_id") || params.get("course") || "1";
    state.lessonNumber = Number(params.get("lesson") || "1");

    // User
    const user = getCurrentUser();
    state.user = isLoggedIn(user) ? user : null;

    // Chrome
    wireBrandRouting();
    if (!state.user) wireChromeGuest();
    else wireChrome(state.user);

    // Course content
    if (typeof COURSE_CONTENT === "undefined") {
      setText("lessonTitle", "Course content unavailable");
      return;
    }
    state.course = COURSE_CONTENT[String(state.courseId)];
    if (!state.course) {
      setText("lessonTitle", "Course not found");
      return;
    }

    if (state.user?.email) {
      trackCourseStart(state.user.email, state.courseId, state.lessonNumber);
    }

    // Flatten lessons and items
    const flatLessons = flattenLessons(state.course);
    state.lessonEntry = flatLessons.find((l) => l.lessonNumber === state.lessonNumber) || flatLessons[0];

    const allItems = flattenItems(state.course);
    state.itemsForLesson = allItems.filter((it) => Number(it.lesson_number) === Number(state.lessonNumber));
    state.quizItem = state.itemsForLesson.find((it) => it.type === "quiz") || null;
    state.practiceItem = state.itemsForLesson.find((it) => it.type === "sandbox" || it.type === "practice") || null;
    state.challengeItem = state.itemsForLesson.find((it) => it.type === "challenge") || null;

    // Load completion (best effort)
    if (state.user?.email) {
      await loadCompletions(state.user.email, state.courseId);
    }

    renderLesson();
    wireActions();
  }

  /* =========================================================
     Chrome (sidebar + user dropdown)
  ========================================================= */

  function wireBrandRouting() {
    const brand = getById("brandHome");
    const sideBrand = getById("sideBrandHome");
    const back = getById("backToCourse");

    const loggedIn = !!(state.user && state.user.email);
    const href = loggedIn ? "dashboard.html" : "index.html";

    if (brand) brand.setAttribute("href", href);
    if (sideBrand) sideBrand.setAttribute("href", href);
    if (back) back.setAttribute("href", `course.html?id=${encodeURIComponent(state.courseId)}&lesson=${encodeURIComponent(state.lessonNumber)}`);
  }

  function wireChromeGuest() {
    setText("topUserName", "Guest");
    setText("ddName", "Guest");
    setText("ddEmail", "Sign in to track progress");
    setText("topAvatar", "G");

    setText("sideAvatar", "G");
    setText("sideUserName", "Guest");
    setText("sideUserEmail", "Sign in to save progress");
    setText("sideLevelBadge", "Lv —");
    setText("sideXPText", "—");
    const bar = getById("sideXPBar");
    if (bar) bar.style.width = "0%";

    const topLogout = getById("topLogoutBtn");
    const sideLogout = getById("sideLogoutBtn");
    if (topLogout) topLogout.style.display = "none";
    if (sideLogout) sideLogout.style.display = "none";

    wireSidebar();
    wireUserDropdown();
  }

  function wireChrome(user) {
    wireSidebar();
    wireUserDropdown();
    fillIdentity(user);

    const topLogout = getById("topLogoutBtn");
    const sideLogout = getById("sideLogoutBtn");
    if (topLogout) topLogout.addEventListener("click", logout);
    if (sideLogout) sideLogout.addEventListener("click", logout);
  }

  function wireSidebar() {
    const openBtn = getById("openSidebarBtn");
    const closeBtn = getById("closeSidebarBtn");
    const sidebar = getById("slideSidebar");
    const backdrop = getById("sideBackdrop");

    const open = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("net-noscroll");
      sidebar.setAttribute("aria-hidden", "false");
      backdrop.setAttribute("aria-hidden", "false");
    };

    const close = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("net-noscroll");
      sidebar.setAttribute("aria-hidden", "true");
      backdrop.setAttribute("aria-hidden", "true");
    };

    openBtn?.addEventListener("click", open);
    closeBtn?.addEventListener("click", close);
    backdrop?.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        close();
        toggleDropdown(false);
      }
    });
  }

  function wireUserDropdown() {
    const userBtn = getById("userBtn");
    const dd = getById("userDropdown");

    userBtn?.addEventListener("click", () => {
      const expanded = userBtn.getAttribute("aria-expanded") === "true";
      toggleDropdown(!expanded);
    });

    document.addEventListener("click", (e) => {
      if (!dd || !userBtn) return;
      if (dd.contains(e.target) || userBtn.contains(e.target)) return;
      toggleDropdown(false);
    });
  }

  function toggleDropdown(open) {
    const userBtn = getById("userBtn");
    const dd = getById("userDropdown");
    if (!userBtn || !dd) return;
    dd.classList.toggle("is-open", !!open);
    userBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function fillIdentity(user) {
    const name = user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Student";
    const email = user?.email || "";
    const level = Number(user?.numeric_level || user?.level || 1);
    const xp = Number(user?.xp || 0);
    const xpNext = xpForNextLevel(level);
    const pct = xpNext ? Math.round((xp / xpNext) * 100) : 0;

    setText("topUserName", name);
    setText("ddName", name);
    setText("ddEmail", email || "email@example.com");
    setText("topAvatar", name.charAt(0).toUpperCase());

    setText("sideAvatar", name.charAt(0).toUpperCase());
    setText("sideUserName", name);
    setText("sideUserEmail", email || "email@example.com");
    setText("sideLevelBadge", `Lv ${level}`);
    setText("sideXPText", `${xp}/${xpNext}`);
    const bar = getById("sideXPBar");
    if (bar) bar.style.width = `${Math.min(100, pct)}%`;
  }

  function logout() {
    localStorage.removeItem("netology_user");
    localStorage.removeItem("user");
    window.location.href = "login.html";
  }

  /* =========================================================
     Data helpers
  ========================================================= */

  function flattenLessons(course) {
    const flat = [];
    let idx = 1;

    (course.units || []).forEach((unit) => {
      (unit.lessons || []).forEach((lesson) => {
        flat.push({
          lessonNumber: idx,
          unitTitle: unit.title || "",
          lesson
        });
        idx += 1;
      });
    });

    return flat;
  }

  function flattenItems(course) {
    const all = [];
    let lessonCounter = 1;

    (course.units || []).forEach((unit) => {
      const normalized = normalizeUnitItems(unit, lessonCounter);
      lessonCounter = normalized.nextLessonCounter;
      all.push(...normalized.items);
    });

    // Sort items in learning flow order
    all.sort((a, b) => {
      if (a.lesson_number !== b.lesson_number) return a.lesson_number - b.lesson_number;
      const order = { learn: 1, quiz: 2, sandbox: 3, challenge: 4 };
      return (order[a.type] || 9) - (order[b.type] || 9);
    });

    return all;
  }

  function mapSectionTypeToItemType(sectionType, item) {
    if (sectionType.includes("quiz")) return "quiz";
    if (sectionType.includes("challenge")) return "challenge";
    if (sectionType.includes("practice") || sectionType.includes("sandbox") || sectionType.includes("hands-on")) return "sandbox";

    const t = String(item.type || "").toLowerCase();
    if (t === "quiz") return "quiz";
    if (t === "challenge") return "challenge";
    if (t === "practice" || t === "sandbox") return "sandbox";
    return "learn";
  }

  function normalizeUnitItems(unit, startingLessonNumber) {
    const items = [];
    let lessonCounter = startingLessonNumber;

    const pushItem = (type, data) => {
      items.push({
        type,
        title: data.title || data.name || capitalize(type),
        content: data.content || data.learn || data.text || "",
        duration: data.duration || data.time || "—",
        xp: Number(data.xp || data.xpReward || data.xp_reward || 0),
        lesson_number: Number(data.lesson_number || data.lessonNumber || 0),
        unit_title: unit.title || "",
        challenge: data.challenge || data.rules || null,
        steps: data.steps || [],
        tips: data.tips || ""
      });
    };

    if (Array.isArray(unit.sections)) {
      unit.sections.forEach((sec) => {
        const t = String(sec.type || sec.kind || sec.title || "").toLowerCase();
        const secItems = sec.items || sec.lessons || [];
        if (!Array.isArray(secItems)) return;
        secItems.forEach((li) => {
          const type = mapSectionTypeToItemType(t, li);
          pushItem(type, li);
        });
      });
    }

    let lastLearn = lessonCounter - 1;
    items.forEach((it) => {
      if (it.type === "learn") {
        if (!it.lesson_number) {
          it.lesson_number = lessonCounter++;
        } else {
          lessonCounter = Math.max(lessonCounter, it.lesson_number + 1);
        }
        lastLearn = it.lesson_number;
      } else if (!it.lesson_number) {
        it.lesson_number = Math.max(1, lastLearn || 1);
      }
    });

    return { items, nextLessonCounter: lessonCounter };
  }

  async function loadCompletions(email, courseId) {
    try {
      const res = await fetch(`${getApiBase()}/user-course-status?email=${encodeURIComponent(email)}&course_id=${encodeURIComponent(courseId)}`);
      if (!res.ok) return;
      const data = await res.json();
      const lessons = data.lessons || data.lesson || [];
      state.completedLessons = new Set((lessons || []).map(Number));
    } catch {
      // silent
    }
  }

  /* =========================================================
     Render
  ========================================================= */

  function renderLesson() {
    const lessonData = state.lessonEntry?.lesson || {};
    const course = state.course;

    setText("lessonCourseTitle", course.title || "Course");
    setText("lessonDifficulty", capitalize(course.difficulty || "novice"));
    setText("lessonUnitTitle", state.lessonEntry?.unitTitle || "Unit");

    const difficultyPill = getById("lessonDifficulty");
    if (difficultyPill) {
      difficultyPill.className = "net-pill-badge badge text-bg-light border px-3 py-2";
      if (course.difficulty === "novice") difficultyPill.classList.add("net-diff-novice");
      if (course.difficulty === "intermediate") difficultyPill.classList.add("net-diff-intermediate");
      if (course.difficulty === "advanced") difficultyPill.classList.add("net-diff-advanced");
    }

    setText("lessonTitle", lessonData.title || "Lesson");
    setText("lessonSubtitle", lessonData.learn || course.description || "");

    const metaTime = state.itemsForLesson[0]?.duration || lessonData.duration || "—";
    const metaXp = state.itemsForLesson[0]?.xp || lessonData.xp || 0;
    setText("lessonMetaTime", metaTime);
    setText("lessonMetaXP", Number(metaXp || 0));

    // Objectives
    const objWrap = getById("lessonObjectivesWrap");
    const objList = getById("lessonObjectives");
    if (objWrap && objList && Array.isArray(lessonData.objectives) && lessonData.objectives.length) {
      objWrap.classList.remove("d-none");
      objList.innerHTML = lessonData.objectives.map((o) => `<li>${escapeHtml(o)}</li>`).join("");
    }

    // Content
    const content = getById("lessonContent");
    const c = lessonData.content || lessonData.learn;
    if (content) {
      if (Array.isArray(c)) {
        content.innerHTML = c.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
      } else if (typeof c === "string") {
        content.innerHTML = escapeHtml(c).replace(/\n/g, "<br>");
      } else {
        content.textContent = "Lesson content not available.";
      }
    }

    // Summary
    const summaryWrap = getById("lessonSummaryWrap");
    if (summaryWrap && lessonData.summary) {
      summaryWrap.classList.remove("d-none");
      setText("lessonSummary", lessonData.summary);
    }

    // Resources
    const resources = Array.isArray(lessonData.resources) && lessonData.resources.length
      ? lessonData.resources
      : buildDefaultResources(lessonData.title || "", course.title || "");
    const resWrap = getById("lessonResources");
    if (resWrap) {
      resWrap.innerHTML = resources.map((r) => `
        <a class="net-resource-item" href="${escapeHtml(r.url)}" target="_blank" rel="noopener">
          <span class="net-resource-ico"><i class="bi bi-book"></i></span>
          <span>${escapeHtml(r.label)}</span>
          <i class="bi bi-box-arrow-up-right ms-auto text-muted"></i>
        </a>
      `).join("");
    }

    // Practice
    const practiceCard = getById("lessonPracticeCard");
    if (practiceCard) {
      if (state.practiceItem) {
        practiceCard.classList.remove("d-none");
        setText("lessonPracticeMeta", state.practiceItem.title || "Sandbox practice");
      } else {
        practiceCard.classList.add("d-none");
      }
    }

    // Challenge
    const challengeCard = getById("lessonChallengeCard");
    if (challengeCard) {
      if (state.challengeItem) {
        challengeCard.classList.remove("d-none");
        const steps = (state.challengeItem.challenge && state.challengeItem.challenge.steps) || state.challengeItem.steps || [];
        const stepsEl = getById("lessonChallengeSteps");
        if (stepsEl) {
          stepsEl.innerHTML = steps.length ? steps.map((s) => `• ${escapeHtml(s)}`).join("<br>") : "";
        }
      } else {
        challengeCard.classList.add("d-none");
      }
    }

    // Status
    const status = getById("lessonStatus");
    if (status) {
      const done = state.completedLessons.has(Number(state.lessonNumber));
      status.textContent = done ? "Completed" : "Not started";
      const completeBtn = getById("lessonCompleteBtn");
      if (completeBtn) {
        completeBtn.disabled = done;
        completeBtn.innerHTML = done
          ? "<i class=\"bi bi-check2-circle me-1\" aria-hidden=\"true\"></i> Completed"
          : "<i class=\"bi bi-check2-circle me-1\" aria-hidden=\"true\"></i> Mark Complete";
      }
    }

    // Progress + prev/next
    const flat = flattenLessons(state.course);
    const idx = flat.findIndex((f) => f.lessonNumber === Number(state.lessonNumber));
    const prev = flat[idx - 1];
    const next = flat[idx + 1];

    const totalLessons = flat.length || 0;
    const completedCount = state.completedLessons.size || 0;
    const pct = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;
    setText("lessonProgressText", `${completedCount}/${totalLessons} lessons completed`);
    setText("lessonProgressPct", `${pct}%`);
    const bar = getById("lessonProgressBar");
    if (bar) bar.style.width = `${pct}%`;

    const unlockBanner = getById("lessonUnlockBanner");
    const unlockTitle = getById("lessonUnlockTitle");
    const isDone = state.completedLessons.has(Number(state.lessonNumber));
    if (unlockBanner) {
      if (isDone && next) {
        unlockBanner.classList.remove("d-none");
        if (unlockTitle) unlockTitle.textContent = next.lesson.title;
      } else {
        unlockBanner.classList.add("d-none");
      }
    }

    const prevLink = getById("prevLessonLink");
    const nextLink = getById("nextLessonLink");
    if (prevLink) {
      if (prev) {
        prevLink.href = `lesson.html?course_id=${encodeURIComponent(state.courseId)}&lesson=${encodeURIComponent(prev.lessonNumber)}`;
        prevLink.textContent = `Previous: ${prev.lesson.title}`;
      } else {
        prevLink.classList.add("disabled");
        prevLink.textContent = "No previous lesson";
      }
    }
    if (nextLink) {
      if (next) {
        nextLink.href = `lesson.html?course_id=${encodeURIComponent(state.courseId)}&lesson=${encodeURIComponent(next.lessonNumber)}`;
        nextLink.textContent = `Next: ${next.lesson.title}`;
      } else {
        nextLink.classList.add("disabled");
        nextLink.textContent = "No next lesson";
      }
    }
  }

  /* =========================================================
     Actions
  ========================================================= */

  function wireActions() {
    const practiceBtn = getById("lessonPracticeBtn");
    const challengeBtn = getById("lessonChallengeBtn");
    const completeBtn = getById("lessonCompleteBtn");

    practiceBtn?.addEventListener("click", () => {
      window.location.href = `sandbox.html?course_id=${encodeURIComponent(state.courseId)}&lesson=${encodeURIComponent(state.lessonNumber)}&mode=practice`;
    });

    challengeBtn?.addEventListener("click", () => {
      if (state.challengeItem) {
        const payload = {
          courseId: state.courseId,
          courseTitle: state.course.title,
          unitTitle: state.challengeItem.unit_title || "",
          lesson: state.lessonNumber,
          lessonTitle: state.challengeItem.title || "",
          challenge: {
            rules: (state.challengeItem.challenge && state.challengeItem.challenge.rules) || state.challengeItem.rules || state.challengeItem.challenge || null,
            steps: (state.challengeItem.challenge && state.challengeItem.challenge.steps) || state.challengeItem.steps || [],
            tips: (state.challengeItem.challenge && state.challengeItem.challenge.tips) || state.challengeItem.tips || ""
          }
        };
        localStorage.setItem("netology_active_challenge", JSON.stringify(payload));
      }

      window.location.href = `sandbox.html?course_id=${encodeURIComponent(state.courseId)}&lesson=${encodeURIComponent(state.lessonNumber)}&mode=challenge&challenge=1`;
    });

    completeBtn?.addEventListener("click", async () => {
      if (!state.user?.email) {
        alert("Sign in to save progress.");
        return;
      }
      await completeLesson(state.user.email, state.courseId, state.lessonNumber, state.itemsForLesson[0]?.xp || 0);
      state.completedLessons.add(Number(state.lessonNumber));
      renderLesson();
    });
  }

  async function completeLesson(email, courseId, lessonNumber, xp) {
    try {
      await fetch(`${getApiBase()}/complete-lesson`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          course_id: Number(courseId),
          lesson_number: Number(lessonNumber),
          earned_xp: Number(xp || 0)
        })
      });
    } catch {
      // silent fallback
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
