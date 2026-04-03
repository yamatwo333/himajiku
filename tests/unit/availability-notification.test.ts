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

test("getNewlyMatchingTimeSlots returns an empty list when there are no new matches", () => {
  assert.deepEqual(
    getNewlyMatchingTimeSlots({
      previousMatchingSlots: ["morning", "late_night"],
      currentMatchingSlots: ["morning", "late_night"],
    }),
    []
  );
});

test("getNewlyMatchingTimeSlots keeps canonical slot order for newly matched slots", () => {
  assert.deepEqual(
    getNewlyMatchingTimeSlots({
      previousMatchingSlots: ["afternoon"],
      currentMatchingSlots: ["late_night", "morning", "afternoon", "evening"],
    }),
    ["morning", "evening", "late_night"]
  );
});

test("getNewlyMatchingTimeSlots becomes notifiable again after a slot drops out once", () => {
  const droppedSlots = getNewlyMatchingTimeSlots({
    previousMatchingSlots: ["morning"],
    currentMatchingSlots: [],
  });
  const requalifiedSlots = getNewlyMatchingTimeSlots({
    previousMatchingSlots: droppedSlots,
    currentMatchingSlots: ["morning"],
  });

  assert.deepEqual(droppedSlots, []);
  assert.deepEqual(requalifiedSlots, ["morning"]);
});
