import { setActiveNav, updateNavbar } from "../ui/navbar.js";
import { renderLogin } from "../ui/pages/login.page.js";
import { renderMe } from "../ui/pages/me.page.js";
import { renderCourtsPage } from "../ui/pages/courts.page.js";
import { isAdmin, isLoggedIn } from "../state/authStore.js";

function defaultHash() {
  if (!isLoggedIn()) return "#/login";
  return isAdmin() ? "#/courts" : "#/me";
}

export async function router(appRoot) {
  setActiveNav();
  updateNavbar();

  const hash = location.hash || "#/";

  if (hash.startsWith("#/login")) {
    if (isLoggedIn()) {
      location.hash = defaultHash();
      return;
    }
    renderLogin(appRoot);
    return;
  }

  if (hash.startsWith("#/me")) {
    if (!isLoggedIn()) {
      location.hash = "#/login";
      return;
    }
    if (isAdmin()) {
      location.hash = "#/courts";
      return;
    }
    try {
      await renderMe(appRoot);
    } catch (err) {
      alert(err.message);
    }
    return;
  }

  if (hash.startsWith("#/courts")) {
    if (!isLoggedIn()) {
      location.hash = "#/login";
      return;
    }
    if (!isAdmin()) {
      location.hash = "#/me";
      return;
    }
    renderCourtsPage(appRoot);
    return;
  }

  // For "#/" or any unknown route, send user to login/admin/user default
  const target = defaultHash();
  if (location.hash !== target) {
    location.hash = target;
    return;
  }
}

export function initRouter(appRoot) {
  window.addEventListener("hashchange", () => {
    router(appRoot);
  });
  router(appRoot);
}

