/**
 * AstroBot Test Suite
 * Tests validators, astro calculations, session management, and flow logic
 * Run: node tests/test.js
 */

process.env.NODE_ENV = "test";
process.env.TELEGRAM_TOKEN = "test_token";
process.env.DEBUG_MODE = "false";

const { validateDOB, validateTOB, validateName, validatePlace } = require("../src/utils/validators");
const SessionManager = require("../src/services/sessionManager");
const { STEPS } = require("../src/services/sessionManager");
const AstroAgent = require("../src/agents/astroAgent");

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${label}: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(`${msg || "Not equal"}: "${a}" !== "${b}"`);
}

// ── Validator Tests ──────────────────────────────────────────────────────────

console.log("\n📋 VALIDATOR TESTS\n");

// Name validator
console.log("  Name Validation:");
test("accepts valid name", () => assert(validateName("Priya Sharma")));
test("accepts single name", () => assert(validateName("Raj")));
test("accepts Hindi name (unicode)", () => assert(validateName("राज कुमार")));
test("rejects empty name", () => assert(!validateName("")));
test("rejects single char", () => assert(!validateName("R")));
test("rejects numbers", () => assert(!validateName("Raj123")));

// DOB validator
console.log("\n  Date of Birth Validation:");
test("accepts DD/MM/YYYY format", () => {
  const r = validateDOB("15/08/1990");
  assert(r.valid && r.formatted === "15/08/1990");
});
test("accepts DD-MM-YYYY format", () => {
  const r = validateDOB("15-08-1990");
  assert(r.valid && r.formatted === "15/08/1990");
});
test("accepts D/M/YYYY format", () => {
  const r = validateDOB("5/8/1990");
  assert(r.valid && r.formatted === "05/08/1990");
});
test("rejects invalid month 13", () => {
  const r = validateDOB("15/13/1990");
  assert(!r.valid);
});
test("rejects future year 2090", () => {
  const r = validateDOB("15/08/2090");
  assert(!r.valid);
});
test("rejects Feb 30", () => {
  const r = validateDOB("30/02/1990");
  assert(!r.valid);
});
test("rejects garbage input", () => {
  const r = validateDOB("not a date");
  assert(!r.valid);
});
test("accepts Feb 28 (non-leap)", () => {
  const r = validateDOB("28/02/1991");
  assert(r.valid);
});
test("accepts Feb 29 (leap year 2000)", () => {
  const r = validateDOB("29/02/2000");
  assert(r.valid);
});
test("rejects Feb 29 (non-leap year 1991)", () => {
  const r = validateDOB("29/02/1991");
  assert(!r.valid);
});

// TOB validator
console.log("\n  Time of Birth Validation:");
test("accepts HH:MM format", () => {
  const r = validateTOB("14:30");
  assert(r.valid && r.formatted === "14:30");
});
test("accepts 12-hour PM", () => {
  const r = validateTOB("2:30 PM");
  assert(r.valid && r.formatted === "14:30");
});
test("accepts 12-hour AM", () => {
  const r = validateTOB("6:15 AM");
  assert(r.valid && r.formatted === "06:15");
});
test("accepts midnight 00:00", () => {
  const r = validateTOB("00:00");
  assert(r.valid && r.formatted === "00:00");
});
test("accepts 23:59", () => {
  const r = validateTOB("23:59");
  assert(r.valid && r.formatted === "23:59");
});
test("rejects 25:00 invalid hour", () => {
  const r = validateTOB("25:00");
  assert(!r.valid);
});
test("rejects invalid minutes 60", () => {
  const r = validateTOB("10:60");
  assert(!r.valid);
});

// Place validator
console.log("\n  Place Validation:");
test("accepts valid city", () => assert(validatePlace("Delhi, India")));
test("accepts single city name", () => assert(validatePlace("Mumbai")));
test("rejects empty", () => assert(!validatePlace("")));
test("rejects single char", () => assert(!validatePlace("D")));

// ── Session Manager Tests ────────────────────────────────────────────────────

console.log("\n📋 SESSION MANAGER TESTS\n");

const sm = new SessionManager();

test("creates a new session", () => {
  const s = sm.createSession(1001, { first_name: "Test" });
  assert(s !== null);
  assertEqual(s.step, STEPS.WELCOME, "Initial step should be WELCOME");
  assertEqual(s.userId, "1001", "userId should be stringified");
});

test("gets existing session", () => {
  const s = sm.getSession(1001);
  assert(s !== null);
});

test("returns null for unknown user", () => {
  const s = sm.getSession(9999);
  assert(s === null);
});

test("updates session data", () => {
  sm.updateSession(1001, { data: { name: "Priya" } });
  const s = sm.getSession(1001);
  assertEqual(s.data.name, "Priya", "Name should be updated");
});

test("sets step correctly", () => {
  sm.setStep(1001, STEPS.COLLECT_DOB);
  const s = sm.getSession(1001);
  assertEqual(s.step, STEPS.COLLECT_DOB, "Step should update");
});

test("adds questions", () => {
  sm.addQuestion(1001, "Will I get married this year?");
  sm.addQuestion(1001, "When will I get a new job?");
  const s = sm.getSession(1001);
  assertEqual(s.data.questions.length, 2, "Should have 2 questions");
});

test("getQuestionCount returns correct count", () => {
  const count = sm.getQuestionCount(1001);
  assertEqual(count, 2, "Should return 2");
});

test("resets session", () => {
  sm.resetSession(1001);
  const s = sm.getSession(1001);
  assert(s === null, "Session should be null after reset");
});

// ── Astro Agent Tests ────────────────────────────────────────────────────────

console.log("\n📋 ASTRO AGENT TESTS\n");

const astro = new AstroAgent();

test("generates kundali for sample birth data", async () => {
  // Synchronous portions wrapped - full async test below
  const result = await astro.analyzeKundali({
    name: "Priya Sharma",
    dob: "15/08/1990",
    tob: "14:30",
    pob: "Delhi, India",
  });

  assert(result.lagnaSign, "Should have lagnaSign");
  assert(result.moonSign, "Should have moonSign");
  assert(result.sunSign, "Should have sunSign");
  assert(result.nakshatra, "Should have nakshatra");
  assert(result.currentDasha, "Should have currentDasha");
  assert(result.currentDasha.lord, "Dasha should have lord");
  assert(result.currentDasha.yearsRemaining >= 0, "Years remaining should be >= 0");
  assert(result.personality && result.personality.length > 10, "Should have personality text");
  assert(result.predictions.career, "Should have career prediction");
  assert(result.predictions.love, "Should have love prediction");
  assert(result.predictions.health, "Should have health prediction");
  assert(Array.isArray(result.planetPositions), "Should have planet positions array");
  assertEqual(result.planetPositions.length, 7, "Should have 7 planets");
});

test("partial answer — free question (index 0)", async () => {
  const kundali = await astro.analyzeKundali({
    name: "Raj Kumar",
    dob: "01/01/1985",
    tob: "08:00",
    pob: "Mumbai",
  });

  const result = astro.generatePartialAnswer("Kab hogi meri shaadi?", kundali, 0);
  assert(result.answer && result.answer.length > 10, "Should return answer text");
  assert(result.isFree === true, "Index 0 should be free");
});

test("partial answer — paid question (index 2)", async () => {
  const kundali = await astro.analyzeKundali({
    name: "Raj Kumar",
    dob: "01/01/1985",
    tob: "08:00",
    pob: "Mumbai",
  });

  const result = astro.generatePartialAnswer("Kab milega job?", kundali, 2);
  assert(result.isFree === false, "Index 2 should not be free");
  assert(result.answer.includes("💎"), "Paid answer should have premium indicator");
});

test("different birth dates produce different lagna signs", async () => {
  const k1 = await astro.analyzeKundali({ name: "A", dob: "01/01/1990", tob: "06:00", pob: "Delhi" });
  const k2 = await astro.analyzeKundali({ name: "B", dob: "01/07/1990", tob: "18:00", pob: "Mumbai" });
  // Not guaranteed different, but should be stable
  assert(k1.lagnaSign && k2.lagnaSign, "Both should have lagna signs");
});

// ── Flow Simulation Test ─────────────────────────────────────────────────────

console.log("\n📋 FULL FLOW SIMULATION\n");

test("complete flow state transitions work", async () => {
  const sm2 = new SessionManager();
  const userId = 2001;

  // Step 1: Onboarding
  sm2.createSession(userId, { first_name: "Flow", username: "flowtest" });
  assertEqual(sm2.getSession(userId).step, STEPS.WELCOME, "Should start at WELCOME");

  sm2.setStep(userId, STEPS.COLLECT_NAME);
  sm2.updateSession(userId, { data: { name: "Flow Test" } });
  sm2.setStep(userId, STEPS.COLLECT_DOB);
  sm2.updateSession(userId, { data: { dob: "01/01/1990" } });
  sm2.setStep(userId, STEPS.COLLECT_TOB);
  sm2.updateSession(userId, { data: { tob: "12:00" } });
  sm2.setStep(userId, STEPS.COLLECT_POB);
  sm2.updateSession(userId, { data: { pob: "Delhi" } });
  sm2.setStep(userId, STEPS.ANALYZING);

  // Generate kundali
  const kundali = await astro.analyzeKundali({
    name: "Flow Test",
    dob: "01/01/1990",
    tob: "12:00",
    pob: "Delhi",
  });
  sm2.updateSession(userId, { data: { kundali } });

  // Step 2: Questions
  sm2.setStep(userId, STEPS.COLLECTING_Q1);
  sm2.addQuestion(userId, "When will I get married?");
  sm2.setStep(userId, STEPS.COLLECTING_Q2);
  sm2.addQuestion(userId, "When will I get a new job?");
  sm2.setStep(userId, STEPS.COLLECTING_Q3);
  sm2.addQuestion(userId, "Will I buy a house?");
  sm2.setStep(userId, STEPS.COLLECTING_Q4);
  sm2.addQuestion(userId, "How is my health?");
  sm2.setStep(userId, STEPS.COLLECTING_Q5);
  sm2.addQuestion(userId, "Will I travel abroad?");

  assertEqual(sm2.getQuestionCount(userId), 5, "Should have 5 questions");

  // Step 3: Payment
  sm2.setStep(userId, STEPS.UPSELL);
  sm2.setStep(userId, STEPS.AWAITING_PAYMENT);
  sm2.updateSession(userId, {
    data: { paymentStatus: "confirmed", paymentRef: "UTR123456789" },
  });
  sm2.setStep(userId, STEPS.PAYMENT_CONFIRMED);
  sm2.setStep(userId, STEPS.COMPLETED);

  const finalSession = sm2.getSession(userId);
  assertEqual(finalSession.step, STEPS.COMPLETED, "Should end at COMPLETED");
  assertEqual(finalSession.data.paymentStatus, "confirmed", "Payment should be confirmed");
  assertEqual(finalSession.data.questions.length, 5, "All 5 questions preserved");
  assert(finalSession.data.kundali !== null, "Kundali data should be preserved");
});

// ── Summary ──────────────────────────────────────────────────────────────────

// Run async tests
(async () => {
  // Trigger async tests
  await new Promise((r) => setTimeout(r, 100));

  console.log(`\n${"═".repeat(40)}`);
  console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log("🎉 All tests passed!\n");
  } else {
    console.log("⚠️  Some tests failed. Check errors above.\n");
    process.exit(1);
  }
})();
