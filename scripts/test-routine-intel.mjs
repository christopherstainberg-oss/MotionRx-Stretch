/**
 * Routine creation intelligence tests — PT-style composition.
 * Run: npx tsx scripts/test-routine-intel.mjs
 */
import { generateHybridPlan } from "../src/lib/plan-engine.ts";
import { buildClinicalRehabPlan } from "../src/lib/clinical-rehab-intel.ts";
import { composePtSession } from "../src/lib/routine-session-composer.ts";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  :", msg);
  }
}

// Composer unit
{
  const composed = composePtSession({
    phase: "motor-control",
    patterns: ["cervical-desk", "lumbar-irritable"],
    priorityAreas: ["neck", "lower-back"],
    stretchCandidates: [
      { id: "chin-tuck", kind: "stretch", name: "Chin tuck", tags: ["cervical"], bodyParts: ["neck"], durationSeconds: 90 },
      { id: "cat-cow", kind: "stretch", name: "Cat cow", tags: ["warmup", "spine"], bodyParts: ["lower-back"], durationSeconds: 90 },
      { id: "doorway-chest-stretch", kind: "stretch", name: "Doorway", tags: ["chest"], bodyParts: ["chest"], durationSeconds: 120 },
      { id: "childs-pose", kind: "stretch", name: "Childs", tags: ["cooldown"], bodyParts: ["lower-back"], durationSeconds: 120 },
    ],
    exerciseCandidates: [
      { id: "ex-scapular-rows-band", kind: "exercise", name: "Rows", tags: ["scapular", "posture"], bodyParts: ["shoulders"], durationSeconds: 120 },
      { id: "ex-bird-dog", kind: "exercise", name: "Bird dog", tags: ["motor-control", "core"], bodyParts: ["core"], durationSeconds: 120 },
      { id: "ex-sit-to-stand", kind: "exercise", name: "STS", tags: ["functional"], bodyParts: ["knee"], durationSeconds: 120 },
    ],
    preferredStretchIds: ["chin-tuck", "doorway-chest-stretch"],
    preferredExerciseIds: ["ex-bird-dog", "ex-scapular-rows-band"],
    minutesTarget: 18,
    functionalLimits: ["work/desk", "stairs"],
  });
  const ids = composed.orderedIds.map((x) => x.id);
  assert(ids.length >= 4 && ids.length <= 10, `composer size 4–10, got ${ids.length}`);
  assert(composed.orderedIds[0]?.slot === "warm-up" || ids.includes("cat-cow") || ids.includes("chin-tuck"), "starts with warm-up-ish");
  assert(ids.includes("ex-bird-dog") || ids.includes("ex-scapular-rows-band"), "includes preferred exercise");
  assert(composed.dosingNotes.length >= 1, "dosing notes present");
  // cool-down near end if present
  const coolIdx = composed.orderedIds.findIndex((x) => x.slot === "cool-down");
  if (coolIdx >= 0) {
    assert(coolIdx >= composed.orderedIds.length - 2, "cool-down near end");
  }
}

// Desk / sitting story → protect or mobility, desk seeds
{
  const input = {
    areas: ["neck", "lower-back"],
    symptoms: [],
    painLevels: { neck: 4, "lower-back": 5 },
    goals: ["work full days"],
    availableMinutes: 20,
    difficulty: "beginner",
    preferKinds: "auto",
    concernParagraph:
      "My left lower back and neck ache after 20 minutes at my desk. Sitting makes it worse. Stairs are hard going down. Heat helps. Pain is 5/10 most of the day, 8/10 at worst. I want to work full days. After I stretch I feel better the same day.",
    painDescriptorIds: [],
    conditionIds: [],
  };
  const rehab = buildClinicalRehabPlan(input);
  assert(
    rehab.patterns.some((p) => /cervical|lumbar|thoracic/.test(p)),
    `desk patterns include spine: ${rehab.patterns.join(",")}`
  );
  assert(
    rehab.preferredStretchIds.includes("chin-tuck") ||
      rehab.preferredStretchIds.includes("doorway-chest-stretch"),
    `desk stretch seeds: ${rehab.preferredStretchIds.slice(0, 6).join(",")}`
  );
  assert(
    rehab.preferredExerciseIds.some((id) =>
      /scapular|cervical|thoracic|sit-to-stand|glute|bird/.test(id)
    ),
    `desk exercise seeds present: ${rehab.preferredExerciseIds.slice(0, 6).join(",")}`
  );

  const plan = generateHybridPlan(input);
  assert(plan.items.length >= 4 && plan.items.length <= 12, `plan items ${plan.items.length}`);
  assert(plan.estimatedMinutes >= 6 && plan.estimatedMinutes <= 45, `minutes ${plan.estimatedMinutes}`);
  const mids = plan.items.map((i) => i.movementId);
  // Should not be pure random full-body strength dump
  assert(
    mids.some((id) => /chin|cat-cow|doorway|scapular|bird|dead|glute|pelvic|trap|thoracic|sit-to-stand|row/.test(id)),
    `clinically relevant IDs: ${mids.join(",")}`
  );
  assert(/PT-style|outpatient|phase|warm-up|story/i.test(plan.description), "description is PT-style");
  // First item should be stretch (warm-up)
  assert(plan.items[0]?.kind === "stretch", `opens with stretch, got ${plan.items[0]?.kind}`);
  // Realistic HEP includes activation/function, not stretch-only
  assert(
    plan.items.some((i) => i.kind === "exercise"),
    `desk plan includes ≥1 exercise, got: ${mids.join(",")}`
  );
  assert(
    !/post-op/i.test(plan.name),
    `desk story must not falsely flag post-op, name=${plan.name}`
  );
}

// High irritability / delayed flare → protect-calm + beginner
{
  const input = {
    areas: ["lower-back"],
    symptoms: [],
    painLevels: { "lower-back": 7 },
    goals: ["sleep through night"],
    availableMinutes: 25,
    difficulty: "intermediate",
    preferKinds: "auto",
    concernParagraph:
      "Severe sharp low back pain 7/10 after lifting. Radiates to left leg with numbness. Much worse next day after I exercised. Afraid to bend. Pain is 7/10 now, 9 at worst.",
    conditionIds: ["cond-discogenic-lbp"],
  };
  const rehab = buildClinicalRehabPlan(input);
  assert(rehab.phase === "protect-calm", `protect-calm for irritable neuro, got ${rehab.phase}`);
  assert(rehab.maxDifficulty === "beginner", `beginner cap, got ${rehab.maxDifficulty}`);
  assert(
    rehab.avoidTags.some((t) => /plyo|end-range|flexion|neural-aggressive|sit-up/.test(t)),
    `protective avoid tags: ${rehab.avoidTags.slice(0, 8).join(",")}`
  );

  const plan = generateHybridPlan(input);
  assert(plan.difficulty === "beginner", `plan beginner, got ${plan.difficulty}`);
  assert(plan.items.length <= 9, `short protect volume items ${plan.items.length}`);
  assert(
    !plan.items.some((i) => /jump|plyo|heavy/.test(i.movementId)),
    "no plyo/heavy in protect plan"
  );
}

// PFPS condition protocol
{
  const rehab = buildClinicalRehabPlan({
    areas: ["knee"],
    symptoms: [],
    painLevels: { knee: 4 },
    goals: ["stairs"],
    availableMinutes: 18,
    difficulty: "beginner",
    preferKinds: "auto",
    concernParagraph: "Front knee pain on stairs down and after sitting. 4/10. Want to hike.",
    conditionIds: ["cond-patellofemoral"],
  });
  assert(
    rehab.preferredExerciseIds.some((id) =>
      /abduction|quad-set|sit-to-stand|glute|tke/.test(id)
    ),
    `PFPS exercises: ${rehab.preferredExerciseIds.join(",")}`
  );
  assert(
    rehab.evidenceNotes.some((n) => /Protocol|PFPS|patell/i.test(n)),
    "PFPS protocol note in evidence"
  );
}

if (failed) {
  console.error(`\n${failed} routine-intel test(s) failed.`);
  process.exit(1);
}
console.log("\nAll routine-intel tests passed.");
