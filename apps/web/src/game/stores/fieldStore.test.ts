import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { useFieldStore } from "./fieldStore";

const emptyDraft = {
  approach: "a",
  steps: [{ action: "Recon", detail: "Watch the door." }],
  risksAccepted: ["cover"],
  resourcesUsed: ["surveillance"],
  contingencies: ["Abort"],
  finalOutcomeClaim: "Out",
};

describe("fieldStore multi-agent deployments", () => {
  it("keeps separate deployments per agent on the same mission", () => {
    useFieldStore.setState({
      ownerKey: "test",
      deployments: [],
      hydrated: true,
    });
    useFieldStore.getState().deploy("m1", "agent-a", emptyDraft, {
      playHash: "0xaaa",
    });
    useFieldStore.getState().deploy("m1", "agent-b", emptyDraft, {
      playHash: "0xbbb",
    });
    const rows = useFieldStore.getState().getDeploymentsForMission("m1");
    assert.equal(rows.length, 2);
    assert.equal(
      rows.filter((r) => r.status === "in_field").length,
      2,
    );
    assert.ok(useFieldStore.getState().getActiveForAgent("agent-a"));
    assert.ok(useFieldStore.getState().getActiveForAgent("agent-b"));
  });

  it("replaces only the same agent on redeploy", () => {
    useFieldStore.setState({
      ownerKey: "test",
      deployments: [],
      hydrated: true,
    });
    useFieldStore.getState().deploy("m1", "agent-a", emptyDraft, {
      playHash: "0x1",
    });
    useFieldStore.getState().deploy("m1", "agent-b", emptyDraft, {
      playHash: "0x2",
    });
    useFieldStore.getState().deploy("m1", "agent-a", emptyDraft, {
      playHash: "0x3",
    });
    const rows = useFieldStore.getState().getDeploymentsForMission("m1");
    assert.equal(rows.length, 2);
    const a = rows.find((r) => r.agentId === "agent-a");
    assert.equal(a?.playHash, "0x3");
  });
});
