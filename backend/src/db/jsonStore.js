import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");

function dataPath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

async function readJson(name, fallback) {
  try {
    const raw = await fs.readFile(dataPath(name), "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(name, value) {
  const target = dataPath(name);
  const tmp = `${target}.${Date.now()}.tmp`;
  const raw = JSON.stringify(value, null, 2);
  await fs.writeFile(tmp, raw, "utf-8");
  await fs.rename(tmp, target);
}

export async function readCourts() {
  return await readJson("courts", []);
}
export async function writeCourts(items) {
  await writeJson("courts", items);
}

export async function readMeetings() {
  return await readJson("meetings", []);
}
export async function writeMeetings(items) {
  await writeJson("meetings", items);
}

export async function readUsers() {
  return await readJson("users", []);
}
export async function writeUsers(items) {
  await writeJson("users", items);
}

