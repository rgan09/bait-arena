"use client";
import { useEffect, useState } from "react";
import type { FakeReply } from "@/lib/types";
import { Avatar } from "../feed";
import { compact } from "./CountUp";

/** The fake comment section: replies drop in one by one, angrier ones last. */
export function CommentFlood({ replies, extra, startDelay = 600 }: { replies: FakeReply[]; extra: number; startDelay?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timers = replies.map((_, i) => setTimeout(() => setShown(i + 1), startDelay + i * 450));
    return () => timers.forEach(clearTimeout);
  }, [replies, startDelay]);

  if (!replies.length) return null;
  const done = shown >= replies.length;

  return (
    <section>
      <p className="border-b border-zinc-800 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Replies {done ? "" : "incoming…"}
      </p>
      {replies.slice(0, shown).map((r, i) => {
        const caps = r.text.length > 8 && r.text === r.text.toUpperCase();
        return (
          <article key={i} className="flex animate-[slideIn_.35s_ease-out] gap-3 border-b border-zinc-800 px-4 py-3">
            <Avatar name={r.username} size={32} />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <b className="text-zinc-200">{r.username}</b> <span className="text-zinc-500">· {i + 1}m</span>
              </p>
              <p className={`text-[15px] ${caps ? "font-bold text-rose-300" : "text-zinc-100"}`}>{r.text}</p>
              <p className="mt-1 text-xs text-zinc-500">♡ {compact(r.likes)}</p>
            </div>
          </article>
        );
      })}
      {done && extra > 0 && (
        <p className="animate-[fadeIn_.4s_ease-out] px-4 py-4 text-center text-sm font-semibold text-sky-400">
          + {compact(extra)} more replies · {extra > 30 ? "someone is typing in all caps…" : "people are still typing…"}
        </p>
      )}
    </section>
  );
}
