const STORAGE_KEY = "netology.session";

export function saveSession(payload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function getSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse session payload", error);
    clearSession();
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function requireSession() {
  const session = getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  return session;
}
