import { login as apiLogin } from "../../api/auth.api.js";
import { isLoggedIn, setAuth } from "../../state/authStore.js";
import { stopMeGeolocation } from "../../geo/meGeo.js";
import { resetMeMaps } from "../../geo/meMaps.js";

export function renderLogin(appRoot) {
  stopMeGeolocation();
  resetMeMaps();

  if (isLoggedIn()) {
    // Already authenticated: send to default page by role
    location.hash = "#/courts";
    return;
  }

  appRoot.innerHTML = `
    <h1>Login</h1>
    <form id="loginForm" class="form form--login">
      <input id="login" placeholder="login" required />
      <input id="password" placeholder="password" type="password" required />
      <button type="submit">Sign in</button>
    </form>
    <div class="card card--mt12">
      <small>Demo: users are stored in backend/src/data/users.json</small>
    </div>
  `;

  document.getElementById("loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const login = document.getElementById("login").value.trim();
    const password = document.getElementById("password").value;

    const data = await apiLogin(login, password);
    setAuth(data.token, data.user);
    const role = (data.user && data.user.role) || "user";
    location.hash = role === "admin" ? "#/courts" : "#/me";
  };
}

