/**
 * Quick PSQI scoring smoke tests.
 * Run: node scripts/test-psqi.mjs  (via tsx on the TS module)
 */
import { createRequire } from "module";

// Use dynamic import of TS via tsx when available
let scorePsqi, defaultPsqiAnswers, qualityBandFromGlobal, hoursInBedFromTimes;
try {
  const mod = await import("../src/lib/psqi.ts");
  scorePsqi = mod.scorePsqi;
  defaultPsqiAnswers = mod.defaultPsqiAnswers;
  qualityBandFromGlobal = mod.qualityBandFromGlobal;
  hoursInBedFromTimes = mod.hoursInBedFromTimes;
} catch (e) {
  console.error("Run with: npx tsx scripts/test-psqi.mjs");
  console.error(e);
  process.exit(1);
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  :", msg);
  }
}

// Overnight bed window
assert(hoursInBedFromTimes("22:30", "06:30") === 8, "8h in bed overnight");
assert(hoursInBedFromTimes("23:00", "07:00") === 8, "8h in bed 23→07");

// Perfect-ish sleep
{
  const a = defaultPsqiAnswers();
  a.latencyMinutes = 10;
  a.hoursSleep = 8;
  a.bedtime = "22:00";
  a.wakeTime = "06:00";
  a.subjectiveQuality = 0;
  const r = scorePsqi(a);
  assert(r.global === 0, `perfect night global=0 got ${r.global}`);
  assert(r.band === "good", "perfect night band good");
  assert(r.sleepEfficiency === 100, `eff 100 got ${r.sleepEfficiency}`);
}

// Short sleep + long latency
{
  const a = defaultPsqiAnswers();
  a.latencyMinutes = 90;
  a.hoursSleep = 4.5;
  a.bedtime = "00:00";
  a.wakeTime = "08:00";
  a.disturbances.a = 3;
  a.subjectiveQuality = 3;
  const r = scorePsqi(a);
  assert(r.global >= 5, `poor pattern global>=5 got ${r.global}`);
  assert(r.components.c2 === 3, `c2 max got ${r.components.c2}`);
  assert(r.components.c3 === 3, `c3 max got ${r.components.c3}`);
}

assert(qualityBandFromGlobal(3).band === "good", "band 3 good");
assert(qualityBandFromGlobal(13).band === "needs-attention" || qualityBandFromGlobal(13).band === "poor", "band 13 elevated");

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nAll PSQI smoke tests passed");
