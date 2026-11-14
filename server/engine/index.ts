import { randomCategoryId } from "@/lib/categories";
import type { Clock } from "./machine";

export * from "./config";
export * from "./machine";
export * from "./scoring";

export const pickTopic = (exclude?: string | null) => randomCategoryId(exclude);

export const realClock = (): Clock => ({ now: Date.now(), pickTopic });
