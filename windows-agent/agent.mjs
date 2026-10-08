import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { io } from "socket.io-client";

const CONFIG_PATH = path.join(process.cwd(), "config.json");

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) throw new Error("config.json not found. Copy config.example.json to config.json and configure the workstation.");
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

const config = loadConfig();
const serverUrl = String(config.serverUrl || "").replace(/\/$/, "");
const workstationId = String(config.workstationId || "").trim();
const heartbeatMs = Math.max(5, Number(config.heartbeatSeconds || 15)) * 1000;
const statePollMs = Math.max(2, Number(config.statePollSeconds || 5)) * 1000;
if (!serverUrl || !workstationId) throw new Error("serverUrl and workstationId are required in config.json");

function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (!entry.internal && entry.family === "IPv4") return { ipAddress: entry.address, macAddress: entry.mac || "" };
    }
  }
  return { ipAddress: "127.0.0.1", macAddress: "" };
}

async function trpcLogin() {
  if (config.sessionToken) return config.sessionToken;
  if (!config.adminUsername || !config.adminPassword) throw new Error("Set sessionToken or adminUsername/adminPassword in config.json");
  const response = await fetch(serverUrl + "/api/trpc/auth.login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ json: { username: config.adminUsername, password: config.adminPassword } })
  });
  const text = await response.text();
  let payload; try { payload = JSON.parse(text); } catch { throw new Error("Login returned an invalid response"); }
  if (!response.ok) throw new Error(payload?.error?.json?.message || payload?.error?.message || "Agent login failed");
  const data = payload?.result?.data?.json ?? payload?.result?.data;
  if (data?.sessionToken || data?.token) return data.sessionToken || data.token;
  const setCookie = response.headers.get("set-cookie") || "";
  const match = setCookie.match(/app_session_id=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  throw new Error("Login succeeded but no session token was returned. Set sessionToken manually in config.json.");
}

function run(command, args = []) {
  return new Promise(resolve => {
    const child = spawn(command, args, { windowsHide: true, stdio: "ignore", shell: false });
    child.on("error", () => resolve(false)); child.on("exit", code => resolve(code === 0));
  });
}
const lockWorkstation = () => run("rundll32.exe", ["user32.dll,LockWorkStation"]);
const shutdownWorkstation = () => run("shutdown.exe", ["/s", "/t", "0"]);
const restartWorkstation = () => run("shutdown.exe", ["/r", "/t", "0"]);
const logoffWorkstation = () => run("shutdown.exe", ["/l"]);

async function handlePcControl(data) {
  switch (String(data?.action || "").toLowerCase()) {
    case "lock": await lockWorkstation(); break;
    case "shutdown": await shutdownWorkstation(); break;
    case "restart": await restartWorkstation(); break;
    case "logoff": await logoffWorkstation(); break;
    case "unlock": console.log("Unlock requested; Windows requires an interactive sign-in."); break;
    default: console.log("Unknown PC control action:", data?.action);
  }
}

async function checkWorkstationState() {
  try {
    const url = new URL(serverUrl + "/api/workstation-state"); url.searchParams.set("workstationId", workstationId);
    const response = await fetch(url); if (!response.ok) return;
    const state = await response.json();
    if (!state.authorized && config.lockWhenNoSession) await lockWorkstation();
  } catch (error) { console.error("State check failed:", error.message); }
}

async function start() {
  const token = await trpcLogin();
  const network = getNetworkInfo();
  const socket = io(serverUrl, { transports:["websocket","polling"], auth:{token}, reconnection:true, reconnectionAttempts:Infinity, reconnectionDelay:2000, timeout:10000 });
  socket.on("connect", () => {
    console.log(new Date().toISOString(), "Connected:", socket.id);
    socket.emit("pc:register", { pcName: workstationId, ipAddress: network.ipAddress, macAddress: network.macAddress });
  });
  socket.on("pc:registered", result => console.log("Registration:", result));
  socket.on("session:force-logout", () => { void lockWorkstation(); });
  socket.on("pc:control", data => { void handlePcControl(data); });
  socket.on("notification:alert", data => console.log("Notification:", data?.title, data?.message));
  socket.on("auth:error", data => console.error("Agent authentication error:", data));
  socket.on("disconnect", reason => console.log(new Date().toISOString(), "Disconnected:", reason));
  setInterval(() => { if (socket.connected) socket.emit("pc:heartbeat", { pcName: workstationId }); }, heartbeatMs);
  setInterval(() => { void checkWorkstationState(); }, statePollMs);
  await checkWorkstationState();
}
start().catch(error => { console.error("Cyber Café Timer Agent failed:", error); process.exitCode = 1; });