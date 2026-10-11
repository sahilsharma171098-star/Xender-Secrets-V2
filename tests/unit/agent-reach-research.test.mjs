import test from "node:test";
import assert from "node:assert/strict";
import { parseResearchArgs, safeSlug, cliArguments } from "../../scripts/prospecting/agent-reach-research.mjs";

test("Agent-Reach capture permits a single scoped read-only platform query", () => {
  const opts = parseResearchArgs(["--platform", "instagram", "--query", "Toronto dental clinic"]);
  assert.equal(opts.platform, "instagram");
  assert.deepEqual(cliArguments(opts), ["instagram", "search", "Toronto dental clinic", "-f", "yaml"]);
});

test("Agent-Reach capture accepts equals options", () => {
  const opts = parseResearchArgs(["--platform=facebook", "--query=London auto repair"]);
  assert.deepEqual(cliArguments(opts), ["facebook", "search", "London auto repair", "-f", "yaml"]);
});

test("Agent-Reach capture rejects unsupported channels and malformed queries", () => {
  assert.throws(() => parseResearchArgs(["--platform", "linkedin", "--query", "hi"]), /Supported platforms/);
  assert.throws(() => parseResearchArgs(["--platform", "facebook", "--query", ""]), /Query must/);
  assert.throws(() => parseResearchArgs(["--platform", "facebook", "--query", "hello\nworld"]), /single line/);
  assert.throws(() => parseResearchArgs(["--platform", "facebook", "--query", "x".repeat(161)]), /1-160/);
  assert.throws(() => parseResearchArgs(["--platform", "facebook", "--query", "bar", "--upload"]), /Unknown option/);
});

test("Output filename prefix is safe", () => {
  assert.equal(safeSlug("Toronto / Dental Clinics 🇨🇦"), "toronto-dental-clinics");
  assert.equal(safeSlug("../"), "query");
});
