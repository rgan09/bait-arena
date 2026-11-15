import { z } from "zod";
import { GAME } from "./engine/config";

export const NameSchema = z
  .string({ message: "Pick a username." })
  .trim()
  .min(2, "Usernames need at least 2 characters.")
  .max(GAME.NAME_MAX_CHARS, `Usernames are max ${GAME.NAME_MAX_CHARS} characters.`)
  .regex(/^[A-Za-z0-9_.]+$/, "Letters, numbers, _ and . only (no spaces).");

export const CreatePlayerBody = z.object({ username: NameSchema });
export const CreateRoomBody = z.object({ quick: z.boolean().optional() });

const Text = z.string().max(2000, "Way too long.");

export const JudgeRequestBody = z.object({
  topic: z.string().trim().min(1).max(200),
  bait: z.string().max(2000),
  response: z.string().max(2000).nullable(),
});
export const ActionBody = z.discriminatedUnion("type", [
  z.object({ type: z.literal("post_bait"), text: Text }),
  z.object({ type: z.literal("post_reply"), text: Text }),
  z.object({ type: z.literal("ignore") }),
  z.object({ type: z.literal("timeout") }),
  z.object({ type: z.literal("next") }),
]);

export const JudgeBaitBody = z.object({ topic: z.string().trim().min(1).max(200), bait: z.string().max(2000) });
export const FakeRepliesBody = z.object({ bait: z.string().max(2000), score: z.number().min(0).max(30) });
export const SchoolPostBody = z.object({
  category: z.string().trim().min(1).max(40),
  bait: z.string().trim().min(1, "Write a take first.").max(GAME.MAX_POST_CHARS, `Max ${GAME.MAX_POST_CHARS} characters.`),
  technique: z.string().max(40).nullable().optional(),
});
