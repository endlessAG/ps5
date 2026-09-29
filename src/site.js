import { establishPrimitive } from "./webkit.js";
import { installWindowP } from "./utils/mem.js";

const STAGES = [
  { id: "webkit", label: "Establishing WebKit primitive" },
  { id: "readwrite", label: "Building memory read/write" },
  { id: "kernel", label: "Running kernel exploit" },
  { id: "payloads", label: "Loading payloads" },
];

const STAGE_INDEX = new Map(STAGES.map((stage, index) => [stage.id, index]));

const statusBox = document.getElementById("status");
const statusText = document.getElementById("status-text");
const stageList = document.getElementById("stages");
const errorBox = document.getElementById("error");
const logBox = document.getElementById("details-log");
const details = document.getElementById("details");
const firmwareLabel = document.getElementById("fw");

let current = -1;
let state = "running";
let attempts = 0;

const rows = STAGES.map((stage) => {
  const row = document.createElement("li");
  row.className = "stage pending";

  const dot = document.createElement("span");
  dot.className = "dot";

  const label = document.createElement("span");
  label.className = "label";
  label.textContent = stage.label;

  row.appendChild(dot);
  row.appendChild(label);
  stageList.appendChild(row);

  return { row, label };
});

function render() {
  rows.forEach(({ row, label }, index) => {
    let modifier = "pending";
    if (state === "failed" && index === current) modifier = "failed";
    else if (index < current) modifier = "done";
    else if (index === current) modifier = "active";
    row.className = "stage " + modifier;

    let text = STAGES[index].label;
    if (modifier === "active" && attempts > 1 && STAGES[index].id === "webkit")
      text += " (attempt " + attempts + ")";
    label.textContent = text;
  });
}

function advance(id) {
  const index = STAGE_INDEX.get(id);
  if (index === undefined || index <= current) return;
  current = index;
  render();
}

function setStatus(text) {
  statusText.textContent = text;
}

function complete() {
  state = "done";
  current = rows.length;
  setStatus("Ready");
  statusBox.className = "done";
  render();
}

function fail(message) {
  state = "failed";
  setStatus("Failed");
  statusBox.className = "failed";
  errorBox.textContent = message;
  errorBox.style.display = "block";
  details.open = true;
  render();
}

function writeLog(message, type = "log", replace = false) {
  let line = replace ? logBox.lastElementChild : null;
  if (!line) {
    line = document.createElement("div");
    logBox.appendChild(line);
  }

  let marker = "*";
  if (type === "error") marker = "-";
  if (type === "info" || type === "success") marker = "+";
  line.textContent = "[" + marker + "] " + message;

  const text = String(message);
  if (/^Kernel: Starting kernel exploit/.test(text)) {
    advance("kernel");
  } else if (/^Kernel: payloads loaded/.test(text)) {
    advance("payloads");
  } else if (/^Kernel: finished/.test(text)) {
    advance("payloads");
  } else if (/^Attempt:/.test(text)) {
    attempts = parseInt(text.slice(8), 10) || attempts;
    render();
  }
}

function writeEvent(name, detail, type) {
  writeLog(detail == null || detail === "" ? name : name + ": " + detail,
    type || (name === "Failed" ? "error" : "log"));
}

window.writeLog = writeLog;
window.jb = { mark: writeEvent };

async function getPrimitive() {
  writeLog("Starting WebKit exploit");
  const primitive = installWindowP(await establishPrimitive(writeEvent));
  if (!primitive || typeof primitive.read8 !== "function")
    throw new Error("Memory primitive unavailable");

  writeLog("ARW ready", "success");
  advance("readwrite");
  return primitive;
}

function getWebKitBase() {
  const ctor = globalThis.__ps5NativeCtor;
  if (typeof ctor !== "number" || typeof OFFSET_wk_host_constructor_candidates === "undefined")
    throw new Error("WebKit base inputs are unavailable");

  for (const offset of OFFSET_wk_host_constructor_candidates) {
    const base = ctor - offset;
    if (base >= 0x800000000 && base < 0x900000000 && base % 0x4000 === 0)
      return base;
  }

  throw new Error("WebKit base not found");
}

async function run() {
  const rejection = window.firmware.rejection();
  if (rejection)
    throw new Error(rejection);

  firmwareLabel.textContent = window.fw_str;

  writeLog("Credits: ntfargo, ufm42, Sonic_Iso, Jordy, Dr. Yenyen, TheFlow, SlidyBat, Flatz, cow, nhk, bollarz, Sleirsgoevy, EchoStretch, EarthOnion", "info");
  writeLog("Agent: " + navigator.userAgent, "info");
  writeLog("Firmware: " + window.fw_str, "info");

  advance("webkit");
  const primitive = await getPrimitive();
  writeLog("WebKit base: 0x" + getWebKitBase().toString(16), "info");

  await import("./relapse_exploit.js");
  await main(primitive);
  complete();
}

run().catch((error) => fail(error instanceof Error ? error.message : String(error)));
