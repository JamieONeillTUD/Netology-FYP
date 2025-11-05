const envBase = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_API_BASE : undefined;
const globalBase = typeof window !== "undefined" ? window.__NETOLOGY_API_BASE : undefined;
const API_BASE = envBase || globalBase || "http://localhost:8000";

const defaultHeaders = { "Content-Type": "application/json" };

async function request(path, { method = "GET", headers = {}, body, ...rest } = {}) {
  const opts = {
    method,
    headers: { ...defaultHeaders, ...headers },
    ...rest,
  };

  if (body !== undefined) {
    opts.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, opts);
  let payload = null;

  try {
    payload = await response.json();
  } catch (_err) {
    /* ignore JSON parse errors for empty responses */
  }

  if (!response.ok) {
    const error = new Error(payload?.detail || payload?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function login(email, password) {
  return request("/user/login", {
    method: "POST",
    body: { email, password },
  });
}

export function signup({ name, email, password, level, reason }) {
  return request("/user/signup", {
    method: "POST",
    body: { name, email, password, level, reason },
  });
}

export function verifyEmail(email) {
  return request("/user/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export function resetPassword(email, newPassword) {
  return request("/user/reset-password", {
    method: "PUT",
    body: { email, new_password: newPassword },
  });
}

export async function fetchChallengeRoadmap() {
  try {
    return await request("/progress/roadmap");
  } catch (error) {
    console.warn("Roadmap endpoint unavailable, using fallback data.", error);
    return {
      milestones: [
        {
          title: "Subnetting Essentials",
          description: "Practice binary conversions and CIDR assignments.",
          due_in: "2 days",
          focus: "Foundations",
        },
        {
          title: "Switch Security",
          description: "Harden access ports and mitigate MAC flooding.",
          due_in: "5 days",
          focus: "Security",
        },
        {
          title: "Routing Challenge",
          description: "Optimise OSPF costs across a multi-area topology.",
          due_in: "Next week",
          focus: "Optimization",
        },
      ],
    };
  }
}

export async function fetchActivityFeed(email) {
  try {
    return await request(`/progress/activity?email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.warn("Activity endpoint unavailable, using fallback feed.", error);
    return {
      events: [
        { action: "Completed VLAN segmentation lab", timestamp: "12 minutes ago" },
        { action: "Unlocked intermediate firewall badge", timestamp: "1 day ago" },
        { action: "Shared topology with cohort", timestamp: "3 days ago" },
      ],
    };
  }
}

export async function fetchSandboxTemplates() {
  try {
    return await request("/sandbox/templates");
  } catch (error) {
    console.warn("Sandbox templates endpoint unavailable, using offline templates.", error);
    return {
      templates: [
        {
          id: "small-office",
          name: "Small Office",
          difficulty: "Novice",
          nodes: [
            { label: "Router", status: "active" },
            { label: "Switch", status: "active" },
            { label: "Server", status: "idle" },
          ],
        },
        {
          id: "campus-core",
          name: "Campus Core",
          difficulty: "Intermediate",
          nodes: [
            { label: "Core", status: "active" },
            { label: "Distribution", status: "idle" },
            { label: "Access", status: "idle" },
          ],
        },
        {
          id: "soc-lab",
          name: "SOC Lab",
          difficulty: "Advanced",
          nodes: [
            { label: "Firewall", status: "active" },
            { label: "IDS", status: "active" },
            { label: "SIEM", status: "idle" },
          ],
        },
      ],
    };
  }
}

export { request, API_BASE };
