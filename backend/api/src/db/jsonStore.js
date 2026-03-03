import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const IS_VERCEL = !!process.env.VERCEL;

// Redis client (lazy initialized)
let redis = null;
let redisInitialized = false;

async function initializeRedis() {
  if (redisInitialized) return;
  redisInitialized = true;

  if (!IS_VERCEL) return; // Only use Redis in production

  try {
    const { Redis } = await import("@upstash/redis");
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log("✓ Redis connected");
  } catch (err) {
    console.error("⚠ Redis initialization failed:", err.message);
    redis = null;
  }
}

function dataPath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

async function readJson(name, fallback) {
  await initializeRedis();

  if (IS_VERCEL && redis) {
    try {
      const data = await redis.get(`data:${name}`);
      return data || fallback;
    } catch (err) {
      console.error(`Error reading from Redis: ${name}`, err.message);
      return fallback;
    }
  }
  
  // Fallback to file system (local development)
  try {
    const raw = await fs.readFile(dataPath(name), "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(name, value) {
  await initializeRedis();

  if (IS_VERCEL && redis) {
    try {
      await redis.set(`data:${name}`, value);
      return;
    } catch (err) {
      console.error(`Error writing to Redis: ${name}`, err.message);
      // Continue to file system fallback
    }
  }
  
  // File system (local development)
  try {
    const target = dataPath(name);
    const tmp = `${target}.${Date.now()}.tmp`;
    const raw = JSON.stringify(value, null, 2);
    await fs.writeFile(tmp, raw, "utf-8");
    await fs.rename(tmp, target);
  } catch (err) {
    console.error(`Error writing to file system: ${name}`, err.message);
    throw err;
  }
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

