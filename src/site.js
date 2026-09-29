import { establishPrimitive } from "./webkit.js";
import { installWindowP } from "./utils/mem.js";

const STAGES = [
  { id: "webkit", shape: "triangle", label: "WebKit" },
  { id: "readwrite", shape: "circle", label: "Read/Write" },
  { id: "kernel", shape: "cross", label: "Kernel" },
  { id: "payloads", shape: "square", label: "Payloads" },
];

const SHAPES = {
  triangle: '<polygon points="50,13 87,75 13,75"/>',
  circle: '<circle cx="50" cy="50" r="36"/>',
  cross:
    '<g transform="rotate(45 50 50)">' +
    '<rect x="35" y="9" width="30" height="82" rx="4"/>' +
    '<rect x="9" y="35" width="82" height="30" rx="4"/>' +
    "</g>",
  square: '<rect x="16" y="16" width="68" height="68" rx="5"/>',
};

const STAGE_INDEX = new Map(STAGES.map((stage, index) => [stage.id, index]));

const statusBox = document.getElementById("status");
const statusText = document.getElementById("status-text");
const buttonRow = document.getElementById("buttons");
const trackFill = document.getElementById("track-fill");
const errorBox = document.getElementById("error");
const logBox = document.getElementById("details-log");
const details = document.getElementById("details");
const firmwareLabel = document.getElementById("fw");

let current = -1;
let state = "running";
let attempts = 0;

const buttons = STAGES.map((stage) => {
  const button = document.createElement("div");
  button.className = "button pending";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.innerHTML = SHAPES[stage.shape];
  button.appendChild(svg);

  const label = document.createElement("span");
  label.className = "label";
  label.textContent = stage.label;
  button.appendChild(label);

  buttonRow.appendChild(button);
  return button;
});

function render() {
  buttons.forEach((button, index) => {
    let modifier = "pending";
    if (state === "failed" && index === current) modifier = "failed";
    else if (index < current) modifier = "done";
    else if (index === current) modifier = "active";
    button.className = "button " + modifier;
  });

  const reached = state === "done" ? STAGES.length - 1 : Math.max(current, 0);
  const span = STAGES.length - 1;
  trackFill.style.transform = "scaleX(" + reached / span + ")";
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
  current = STAGES.length;
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
    if (attempts > 1 && current === STAGE_INDEX.get("webkit")) {
      setStatus("Establishing WebKit primitive (attempt " + attempts + ")");
    }
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
  setStatus("Establishing WebKit primitive");
  const primitive = await getPrimitive();
  writeLog("WebKit base: 0x" + getWebKitBase().toString(16), "info");

  setStatus("Running kernel exploit");
  await import("./relapse_exploit.js");
  await main(primitive);
  complete();
}

run().catch((error) => fail(error instanceof Error ? error.message : String(error)));
