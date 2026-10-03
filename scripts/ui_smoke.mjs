// Browser smoke test for the web interface.
//
//   1. start the app:   OFFLINE=1 .venv/Scripts/uvicorn src.api.main:app --port 8000
//   2. run:             node scripts/ui_smoke.mjs [http://127.0.0.1:8000]
//
// Drives a headless Chrome over the DevTools protocol (Node 22+ has WebSocket
// built in; no npm install). Fails with exit code 1 on any JavaScript error or
// missing piece of the interface. Set CHROME to the browser path if needed.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] || "http://127.0.0.1:8000/finder.html#target=moon";
const CHROME = process.env.CHROME || (process.platform === "win32"
  ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
  : "google-chrome");
const PORT = 9400 + Math.floor(Math.random() * 400);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
  "--window-size=1600,900", `--user-data-dir=${mkdtempSync(join(tmpdir(), "eaf-smoke-"))}`, "about:blank",
], { stdio: "ignore" });

let targets = [];
for (let i = 0; i < 60 && !targets.length; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch { await sleep(250); }
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener("message", (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;

const checks = [];
const check = (name, ok, detail = "") => { checks.push({ name, ok: !!ok, detail }); };

await send("Runtime.enable");
await send("Page.navigate", { url: `${BASE}/#target=jezero_crater` });
await sleep(12000);
check("ranked sites listed", (await js(`document.querySelectorAll('.site').length`)) >= 5);
check("validation chip shows AUC", /AUC/.test(await js(`document.getElementById('chipAuc').textContent`)));
check("legend rendered", !!(await js(`document.querySelector('#legend .ramp')`)));
for (const layer of ["vegetation", "annual_temperature_range", "mean_annual_temperature", "slope"]) {
  await js(`(() => { const s = document.getElementById('layer'); s.value = '${layer}'; s.dispatchEvent(new Event('change')); })()`);
  await sleep(700);
  check(`layer ${layer} legend`, (await js(`document.querySelector('#legend .title')?.textContent || ''`)).length > 0);
}
await js(`document.querySelector('.site').click()`);
await sleep(1200);
check("site card opens", !!(await js(`document.querySelector('#detail h3')`)));
await js(`document.getElementById('tabExplore').click()`);
await sleep(2500);
check("explore scatter drawn", (await js(`document.querySelectorAll('.scatter [data-i]').length`)) > 5);
await js(`document.getElementById('tabValidation').click()`);
await sleep(4000);
check("validation controls table", (await js(`document.querySelectorAll('#validation table.controls tbody tr').length`)) > 5);
await js(`document.getElementById('toggleLeft').click()`);
await sleep(600);
check("globe keeps its width with a panel hidden", (await js(`document.querySelector('.stage').getBoundingClientRect().width`)) > 600);
await js(`document.getElementById('toggleLeft').click()`);

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.detail ? `  (${c.detail})` : ""}`);
  if (!c.ok) failed++;
}
for (const e of errors) console.log(`FAIL  JavaScript error: ${e}`);
ws.close();
chrome.kill();
process.exit(failed || errors.length ? 1 : 0);
