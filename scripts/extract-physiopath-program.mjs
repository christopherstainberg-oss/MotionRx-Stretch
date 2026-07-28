/**
 * One-shot extractor: pull PhysioPath program-creation data from engine.js
 * into JSON that MotionRx can compile into TypeScript modules.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const enginePath = path.resolve(
  __dirname,
  "../../../physiopath/src/engine.js"
);
const outPath = path.join(__dirname, "_physiopath-program-raw.json");

const src = fs.readFileSync(enginePath, "utf8");

function extractText(constName) {
  const needle = `const ${constName} = `;
  const start = src.indexOf(needle);
  if (start < 0) throw new Error(`missing ${constName}`);
  let i = start + needle.length;
  const open = src[i];
  if (open !== "[" && open !== "{") throw new Error(`${constName} not array/obj`);
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inStr = null;
  let esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = c;
      continue;
    }
    // skip regex literals roughly: /.../ after = ( [ , :
    if (c === "/" && /[=(\[,:!\s&|]/.test(src[i - 1] || " ")) {
      i++;
      while (i < src.length) {
        if (src[i] === "\\") {
          i += 2;
          continue;
        }
        if (src[i] === "/") {
          i++;
          while (/[gimsuy]/.test(src[i])) i++;
          i--;
          break;
        }
        if (src[i] === "\n") break;
        i++;
      }
      continue;
    }
    if (c === open) depth++;
    if (c === close) {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  return src.slice(start + needle.length, i);
}

function extractArrayOrObject(constName, context = {}) {
  const text = extractText(constName);
  const keys = Object.keys(context);
  try {
    return new Function(...keys, `return (${text})`)(...keys.map((k) => context[k]));
  } catch (e) {
    throw new Error(`eval ${constName}: ${e.message}`);
  }
}

function serialize(obj) {
  return JSON.stringify(
    obj,
    (_k, v) => {
      if (v instanceof RegExp) return { __re: v.source, __flags: v.flags };
      return v;
    },
    2
  );
}

const REHAB_PLANS = extractArrayOrObject("REHAB_PLANS");
const TEMPLATE = extractArrayOrObject("TEMPLATE");
const PHASE_CRITERIA = extractArrayOrObject("PHASE_CRITERIA");
const XCUT_VARIANTS = extractArrayOrObject("XCUT_VARIANTS");
const PACE_VARIANTS = extractArrayOrObject("PACE_VARIANTS", { XCUT_VARIANTS });
const DOMAIN_FALLBACK = extractArrayOrObject("DOMAIN_FALLBACK");
const INJURY_FOCUS = extractArrayOrObject("INJURY_FOCUS");
const BALANCE_LADDER = extractArrayOrObject("BALANCE_LADDER");
const AGILITY_LADDER = extractArrayOrObject("AGILITY_LADDER");
const FALLS_LADDER = extractArrayOrObject("FALLS_LADDER");
const SPORT_DEMANDS = extractArrayOrObject("SPORT_DEMANDS");

const payload = {
  TEMPLATE,
  PHASE_CRITERIA,
  PHASE_TARGET: [6, 6, 7, 7],
  XCUT_VARIANTS,
  PACE_VARIANTS,
  DOMAIN_FALLBACK,
  REHAB_PLANS,
  INJURY_FOCUS,
  BALANCE_LADDER,
  AGILITY_LADDER,
  FALLS_LADDER,
  SPORT_DEMANDS,
};

fs.writeFileSync(outPath, serialize(payload));
console.log("Wrote", outPath);
console.log({
  plans: REHAB_PLANS.length,
  injuryFocus: INJURY_FOCUS.length,
  sports: SPORT_DEMANDS.length,
  bytes: fs.statSync(outPath).size,
});
