// Mock coding-agent CLI for xender-pm tests. Behaviour is chosen by MOCK_AGENT_MODE.
//   interrupt: two milestones, then a usage-limit error (exit 1) — simulates a session cut off mid-task
//   done:      one milestone, then XPM-DONE (exit 0)
const prompt = process.argv[2] || "";
const mode = process.env.MOCK_AGENT_MODE || "done";
const say = (kind, data) => console.log(`${kind} ${JSON.stringify(data)}`);
console.log(prompt.startsWith("# CONTINUE") ? "mock: got continuation prompt" : "mock: got assignment prompt");
if (mode === "interrupt") {
  say("XPM-CHECKPOINT", { done: "Confirmed Live E2E run 41900000001 green on main 8b7aaab (mock)", next: "MT-010: draft docs/PAYU_CHARGEBACK.md from PayU dispute docs", files: [], tests: ["live-e2e 18/18 (mock)"] });
  say("XPM-CHECKPOINT", { done: "Drafted chargeback section outline", next: "MT-010: finish docs/PAYU_CHARGEBACK.md steps 3-5 and link from RELEASE_GATES G11", files: ["docs/PAYU_CHARGEBACK.md"] });
  console.log("XPM-CHECKPOINT {not json"); // malformed lines must be ignored
  console.error("Error: Claude usage limit reached. Your limit will reset at 11pm.");
  process.exit(1);
}
if (mode === "done") {
  if (!prompt.includes("NEXT EXACT ACTION") && process.env.MOCK_REQUIRE_CONTINUATION) {
    console.error("mock: expected a continuation prompt");
    process.exit(9);
  }
  say("XPM-CHECKPOINT", { done: "Finished docs/PAYU_CHARGEBACK.md steps 3-5", files: ["docs/PAYU_CHARGEBACK.md", "docs/RELEASE_GATES.md"], tests: ["unit 150/150 (mock)"] });
  say("XPM-DONE", { done: "MT-004 verified, MT-010 documented", commit: "abc1234", pr: "https://github.com/sahilsharma171098-star/Xender-Secrets-V2/pull/999", tests: ["unit 150/150 (mock)"], next: "Sahil reviews the PR" });
  process.exit(0);
}
process.exit(2);
