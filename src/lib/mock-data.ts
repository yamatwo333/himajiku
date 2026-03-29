import { User, AvailabilityWithUser } from "./types";
import { format, addDays } from "date-fns";

export const CURRENT_USER: User = {
  id: "user-1",
  displayName: "自分",
};

export const MOCK_USERS: User[] = [
  CURRENT_USER,
  { id: "user-2", displayName: "たろう" },
  { id: "user-3", displayName: "はなこ" },
  { id: "user-4", displayName: "じろう" },
  { id: "user-5", displayName: "ゆうき" },
];

const today = new Date();

export const MOCK_AVAILABILITIES: AvailabilityWithUser[] = [
  {
    id: "a1",
    userId: "user-1",
    date: format(today, "yyyy-MM-dd"),
    timeSlots: ["afternoon", "evening"],
    comment: "午後からヒマ",
    user: CURRENT_USER,
  },
  {
    id: "a2",
    userId: "user-2",
    date: format(today, "yyyy-MM-dd"),
    timeSlots: ["morning", "afternoon", "evening", "late_night"],
    comment: "どこか行きたい",
    user: MOCK_USERS[1],
  },
  {
    id: "a3",
    userId: "user-3",
    date: format(today, "yyyy-MM-dd"),
    timeSlots: ["evening"],
    comment: "飲みたい",
    user: MOCK_USERS[2],
  },
  {
    id: "a4",
    userId: "user-2",
    date: format(addDays(today, 2), "yyyy-MM-dd"),
    timeSlots: ["morning", "afternoon", "evening"],
    comment: "",
    user: MOCK_USERS[1],
  },
  {
    id: "a5",
    userId: "user-4",
    date: format(addDays(today, 2), "yyyy-MM-dd"),
    timeSlots: ["morning", "afternoon"],
    comment: "フットサルしたい",
    user: MOCK_USERS[3],
  },
  {
    id: "a6",
    userId: "user-3",
    date: format(addDays(today, 5), "yyyy-MM-dd"),
    timeSlots: ["afternoon"],
    comment: "",
    user: MOCK_USERS[2],
  },
  {
    id: "a7",
    userId: "user-5",
    date: format(addDays(today, 5), "yyyy-MM-dd"),
    timeSlots: ["afternoon", "evening"],
    comment: "カフェでも",
    user: MOCK_USERS[4],
  },
  {
    id: "a8",
    userId: "user-1",
    date: format(addDays(today, 7), "yyyy-MM-dd"),
    timeSlots: ["morning", "afternoon", "evening", "late_night"],
    comment: "一日中ヒマ！",
    user: CURRENT_USER,
  },
  {
    id: "a9",
    userId: "user-2",
    date: format(addDays(today, 7), "yyyy-MM-dd"),
    timeSlots: ["evening"],
    comment: "",
    user: MOCK_USERS[1],
  },
  {
    id: "a10",
    userId: "user-4",
    date: format(addDays(today, 7), "yyyy-MM-dd"),
    timeSlots: ["morning", "afternoon", "evening"],
    comment: "暇すぎる",
    user: MOCK_USERS[3],
  },
  {
    id: "a11",
    userId: "user-5",
    date: format(addDays(today, 7), "yyyy-MM-dd"),
    timeSlots: ["afternoon"],
    comment: "",
    user: MOCK_USERS[4],
  },
];
