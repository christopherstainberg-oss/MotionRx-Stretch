/**
 * Follow-up interview realism / accuracy tests.
 * Run: npx tsx scripts/test-followup-intel.mjs
 */
import { analyzeStoryIntelligence } from "../src/lib/story-intelligence.ts";
import { analyzeJournalIntelligence } from "../src/lib/journal-intelligence.ts";
import { detectPartialAnswers } from "../src/lib/interview-followups.ts";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  :", msg);
  }
}

const deskStory =
  "My left lower back has been aching for 3 weeks. Sitting at my desk for more than 20 minutes makes it worse. Stairs are hard going down. Heat helps a little. Pain is 5/10 most of the day, 8/10 at worst. I want to be able to work full days without needing to lie down.";

{
  const p = detectPartialAnswers(deskStory);
  assert(p.sittingDose, "partial: sitting dose from 20 minutes");
  assert(p.stairsDirection, "partial: stairs direction from going down");
  assert(!p.stairsLimiter, "partial: stairs limiter NOT assumed from global pain NRS");
  assert(p.painNrs, "partial: pain NRS present");
  assert(p.onsetOrDuration, "partial: 3 weeks duration");
  assert(p.easers, "partial: heat helps");
  assert(p.goals, "partial: want to work full days");
  assert(p.laterality, "partial: left laterality");
}

{
  const s = analyzeStoryIntelligence(deskStory, { preferredName: "Chris" });
  const labels = s.adaptiveQuestions.map((q) => q.label.toLowerCase());
  const questions = s.adaptiveQuestions.map((q) => q.question.toLowerCase());

  assert(
    !labels.some((l) => l.includes("sitting tolerance") || l === "sitting dose?"),
    `should not re-ask sitting minutes; got labels: ${labels.slice(0, 5).join(" | ")}`
  );
  assert(
    labels.some((l) => l.includes("sit flare") || l.includes("ends the sit")),
    "should deepen sitting recovery when dose known"
  );
  assert(
    !questions.some((q) => /about how many minutes before/i.test(q)),
    "no 'how many minutes' re-ask when 20 minutes already stated"
  );
  assert(
    !labels.filter((l) => l.includes("stair")).length ||
      labels.some((l) => l.includes("limits stairs") || l.includes("work-around") || l.includes("up")),
    "stairs follow-up should be present and not duplicated blindly"
  );
  // No duplicate sit + stairs cluster
  const sitCount = labels.filter((l) => /sit|desk/.test(l)).length;
  const stairCount = labels.filter((l) => /stair/.test(l)).length;
  assert(sitCount <= 1, `at most one sitting cluster question, got ${sitCount}`);
  assert(stairCount <= 1, `at most one stairs cluster question, got ${stairCount}`);
  assert(
    !questions.some((q) => /lower back \/ lumbar/i.test(q)),
    "no robotic dual region labels in questions"
  );
  assert(
    questions.some((q) => /your lower back|desk flare|after you move|2–24|2-24/i.test(q)),
    "questions sound clinically grounded"
  );
  // Should not re-ask 0–10 when already given
  assert(
    !labels.some((l) => /pain 0|pain scale|0–10|0-10/.test(l)),
    `should not re-ask NRS when 5/10 and 8/10 present; labels=${labels.join(", ")}`
  );
}

{
  const j = analyzeJournalIntelligence(
    "Feeling anxious today. Lower back still sore after yesterday's walk. Slept poorly - woke at 3am. Mood 4/10. Tried heat and it helped for an hour. Pain 5/10.",
    { preferredName: "Chris", painOverall: 5, mood: 4, sleepQuality: 3 }
  );
  assert(j.adaptiveQuestions.length >= 3, `journal has adaptive questions: ${j.adaptiveQuestions.length}`);
  const top = j.adaptiveQuestions[0];
  assert(top?.question, "journal top question exists");
  assert(
    !/what do you most need someone to understand about today/i.test(top.question) ||
      j.adaptiveQuestions.length > 1,
    "journal should not only ask cold open when story is rich"
  );
  // Prefer named personalization on many items
  const named = j.adaptiveQuestions.filter((q) => /chris/i.test(q.question)).length;
  assert(named >= 1, `at least one journal question uses preferred name (got ${named})`);
}

if (failed) {
  console.error(`\n${failed} follow-up test(s) failed.`);
  process.exit(1);
}
console.log("\nAll follow-up intel tests passed.");
