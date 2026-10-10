import { describe, expect, it } from "vitest";
import { canClaim, canTransition } from "./workflow";

describe("task workflow", () => {
  it("requires an approved specification before Ready", () => {
    expect(canTransition("BACKLOG", "READY").ok).toBe(false);
    expect(canTransition("BACKLOG", "READY", { approvedSpec: true }).ok).toBe(true);
  });
  it("enforces completion gates", () => {
    expect(canTransition("QA", "DONE", { testsPassed: true }).ok).toBe(false);
    expect(canTransition("QA", "DONE", { testsPassed: true, qaAccepted: true }).ok).toBe(true);
  });
  it("prevents unsafe task claims", () => {
    expect(canClaim({ status: "READY", assigneeId: "user-1" }, true).ok).toBe(false);
    expect(canClaim({ status: "READY" }, true).ok).toBe(true);
  });
});
