import { makeToken } from "../utils/ids.js";
import { getUserById, getUserByLoginAndPassword } from "./users.service.js";

const sessions = new Map(); // token -> userId

export async function login({ login, password }) {
  const user = await getUserByLoginAndPassword(login, password);
  if (!user) {
    const err = new Error("Invalid login/password");
    err.status = 401;
    throw err;
  }

  const token = makeToken();
  sessions.set(token, user.id);

  return {
    token,
    user: { id: user.id, name: user.name, login: user.login, role: user.role || "user" },
  };
}

export async function logout(token) {
  sessions.delete(token);
  return { ok: true };
}

export async function authenticate(token) {
  const userId = sessions.get(token);
  if (!userId) return null;
  const user = await getUserById(userId);
  if (!user) {
    sessions.delete(token);
    return null;
  }
  return { id: user.id, name: user.name, login: user.login, role: user.role || "user" };
}

