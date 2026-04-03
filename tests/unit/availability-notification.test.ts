import assert from "node:assert/strict";
import test from "node:test";
import { getNewlyMatchingTimeSlots } from "../../src/lib/server/availability-notification.ts";

test("getNewlyMatchingTimeSlots returns only newly qualified slots", () => {
  assert.deepEqual(
    getNewlyMatchingTimeSlots({
      previousMatchingSlots: ["morning", "evening"],
      currentMatchingSlots: ["morning", "afternoon", "late_night"],
    }),
    ["afternoon", "late_night"]
  );
});

test("getNewlyMatchingTimeSlots ignores previously matched undecided values", () => {
  assert.deepEqual(
    getNewlyMatchingTimeSlots({
      previousMatchingSlots: ["undecided"],
      currentMatchingSlots: ["evening"],
    }),
    ["evening"]
  );
});
