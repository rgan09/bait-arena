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
