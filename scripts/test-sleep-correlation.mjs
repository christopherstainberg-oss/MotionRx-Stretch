/**
 * Sleep PSQI cross-app correlation tests.
 * Run: npx tsx scripts/test-sleep-correlation.mjs
 */
import {
  buildSleepCorrelation,
  defaultPsqiAnswers,
  psqiGlobalToJournalSleep,
  scorePsqi,
} from "../src/lib/psqi.ts";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  :", msg);
  }
}

// Empty without logs (no localStorage in node unless mocked)
{
  const s = buildSleepCorrelation([]);
  assert(!s.hasData, "empty logs → no data");
  assert(s.minutesScale === 1, "empty minutesScale 1");
  assert(s.summaryLines.length >= 1, "empty has summary nudge");
}

// Good sleep
{
  const answers = defaultPsqiAnswers();
  answers.latencyMinutes = 10;
  answers.hoursSleep = 8;
  answers.subjectiveQuality = 0;
  answers.daytimeSleepiness = 0;
  answers.enthusiasm = 0;
  const result = scorePsqi(answers);
  const entry = {
    id: "t1",
    createdAt: new Date().toISOString(),
    answers,
    result,
  };
  const s = buildSleepCorrelation([entry]);
  assert(s.hasData, "good sleep has data");
  assert(s.global === result.global, "global matches");
  assert(s.journalSleepQuality >= 3, `journal map decent: ${s.journalSleepQuality}`);
  assert(s.minutesScale >= 0.9, `good minutesScale ${s.minutesScale}`);
  assert(s.promptBlob.includes("PSQI"), "promptBlob present");
}

// Poor sleep with pain at night
{
  const answers = defaultPsqiAnswers();
  answers.latencyMinutes = 90;
  answers.hoursSleep = 4.5;
  answers.subjectiveQuality = 3;
  answers.daytimeSleepiness = 3;
  answers.enthusiasm = 3;
  answers.disturbances = {
    a: 3,
    b: 3,
    c: 2,
    d: 1,
    e: 2,
    f: 1,
    g: 1,
    h: 1,
    i: 3, // pain
    j: 0,
  };
  answers.sleepMeds = 2;
  const result = scorePsqi(answers);
  assert(result.global >= 5, `poor global ${result.global}`);
  const entry = {
    id: "t2",
    createdAt: new Date().toISOString(),
    answers,
    result,
  };
  const s = buildSleepCorrelation([entry]);
  assert(s.painAtNight, "pain at night detected");
  assert(s.usesSleepMeds, "sleep meds detected");
  assert(s.daytimeDysfunction, "daytime dysfunction");
  assert(s.minutesScale < 1, `poor minutesScale ${s.minutesScale}`);
  assert(s.irritabilityBoost > 0, `irritabilityBoost ${s.irritabilityBoost}`);
  assert(s.modalityIds.includes("mod-sleep-hygiene"), "sleep hygiene modality");
  assert(s.modalityIds.includes("mod-sleep-position"), "sleep position modality");
  assert(s.preferTags.includes("gentle") || s.preferTags.includes("recovery"), "prefer tags");
  assert(s.journalSleepQuality <= 3, `poor journal map ${s.journalSleepQuality}`);
}

// Journal mapping monotonic-ish
{
  assert(psqiGlobalToJournalSleep(2) >= psqiGlobalToJournalSleep(10), "lower PSQI → higher journal");
  assert(psqiGlobalToJournalSleep(0) === 5, "best sleep → 5");
  assert(psqiGlobalToJournalSleep(21) === 1, "worst sleep → 1");
}

if (failed) {
  console.error(`\n${failed} sleep correlation test(s) failed.`);
  process.exit(1);
}
console.log("\nAll sleep correlation tests passed.");
