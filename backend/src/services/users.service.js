import { readUsers, writeUsers } from "../db/jsonStore.js";
import { makeUserId } from "../utils/ids.js";

function normalizeRole(role) {
  return role === "admin" ? "admin" : "user";
}

export async function listUsersSafe() {
  const users = await readUsers();
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    login: u.login,
    role: u.role || "user",
  }));
}

export async function getUserById(userId) {
  const users = await readUsers();
  return users.find((u) => u.id === userId) || null;
}

export async function getUserByLoginAndPassword(login, password) {
  const users = await readUsers();
  return users.find((u) => u.login === String(login) && u.password === String(password)) || null;
}

export async function createUser({ name, login, password, role }) {
  if (!name || !login || !password) {
    const err = new Error("name, login, password are required");
    err.status = 400;
    throw err;
  }

  const users = await readUsers();
  if (users.some((u) => u.login === String(login))) {
    const err = new Error("login already exists");
    err.status = 400;
    throw err;
  }

  const user = {
    id: makeUserId(),
    name: String(name),
    login: String(login),
    password: String(password),
    role: normalizeRole(role),
  };

  users.push(user);
  await writeUsers(users);

  return { id: user.id, name: user.name, login: user.login, role: user.role };
}

