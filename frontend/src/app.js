import { initAuthFromStorage } from "./state/authStore.js";
import { initNavbar } from "./ui/navbar.js";
import { initRouter } from "./router/router.js";
import { stopMeGeolocation } from "./geo/meGeo.js";
import { resetMeMaps } from "./geo/meMaps.js";

window.addEventListener("DOMContentLoaded", async () => {
  const appRoot = document.getElementById("app");
  if (!appRoot) throw new Error("#app not found");

  initNavbar({
    onLogout: () => {
      stopMeGeolocation();
      resetMeMaps();
    },
  });

  await initAuthFromStorage();
  initRouter(appRoot);
});

