import { logout as apiLogout } from "../api/auth.api.js";
import { clearAuth, isAdmin, isLoggedIn, subscribeAuth } from "../state/authStore.js";

export function updateNavbar() {
  const aLogin = document.getElementById("Login");
  const aMe = document.getElementById("Me");
  const aLogout = document.getElementById("Logout");
  const aCourts = document.getElementById("Courts");

  const logged = isLoggedIn();
  const admin = isAdmin();

  if (aLogin) aLogin.style.display = logged ? "none" : "";
  if (aMe) aMe.style.display = logged && !admin ? "" : "none";
  if (aLogout) aLogout.style.display = logged ? "" : "none";
  if (aCourts) aCourts.style.display = logged && admin ? "" : "none";
}

export function setActiveNav() {
  const hash = location.hash || "#/";
  const aHome = document.getElementById("Home");
  const aCourts = document.getElementById("Courts");
  const aLogin = document.getElementById("Login");
  const aMe = document.getElementById("Me");

  if (aHome) aHome.classList.toggle("active", hash === "#/" || hash === "");
  if (aCourts) aCourts.classList.toggle("active", hash.startsWith("#/courts"));
  if (aLogin) aLogin.classList.toggle("active", hash.startsWith("#/login"));
  if (aMe) aMe.classList.toggle("active", hash.startsWith("#/me"));
}

export function initNavbar({ onLogout } = {}) {
  subscribeAuth(() => updateNavbar());
  updateNavbar();
  setActiveNav();

  const logoutLink = document.getElementById("Logout");
  if (logoutLink) {
    logoutLink.onclick = async () => {
      try {
        await apiLogout().catch(() => {});
      } finally {
        clearAuth();
        if (onLogout) onLogout();
        location.hash = "#/login";
      }
    };
  }
}

