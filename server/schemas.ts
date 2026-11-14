import { z } from "zod";
import { GAME } from "./engine/config";

export const NameSchema = z
  .string({ message: "Pick a nickname." })
  .trim()
  .min(1, "Pick a nickname.")
  .max(GAME.NAME_MAX_CHARS, `Nicknames are max ${GAME.NAME_MAX_CHARS} characters.`)
  .regex(/^[\p{L}\p{N} _.\-]+$/u, "Letters, numbers, spaces, _ . - only.");

export const CreateRoomBody = z.object({ name: NameSchema });
export const JoinRoomBody = z.object({ name: NameSchema });

const Text = z.string().max(2000, "Way too long.");
export const ActionBody = z.discriminatedUnion("type", [
  z.object({ type: z.literal("post_bait"), text: Text }),
  z.object({ type: z.literal("post_reply"), text: Text }),
  z.object({ type: z.literal("ignore") }),
  z.object({ type: z.literal("timeout") }),
  z.object({ type: z.literal("next") }),
]);
