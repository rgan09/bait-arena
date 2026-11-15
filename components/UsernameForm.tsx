"use client";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { GAME } from "@/server/engine/config";
import { Button } from "./feed";

/** Claim a username (no password; a secret token is saved on this device). */
export function UsernameForm({ onSubmit, cta = "Let's go" }: { onSubmit: (username: string) => Promise<unknown>; cta?: string }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await onSubmit(name.trim());
        } catch (e) {
          setErr(e instanceof ApiError ? e.message : "Couldn't save that. Try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex items-center rounded-full border border-zinc-700 bg-zinc-900 px-5 focus-within:border-sky-500">
        <span className="text-lg text-zinc-500">@</span>
        <input
          autoFocus
          value={name}
          maxLength={GAME.NAME_MAX_CHARS}
          onChange={(e) => setName(e.target.value.replace(/\s/g, "_"))}
          placeholder="pick_a_username"
          className="w-full bg-transparent py-3 pl-1 text-lg focus:outline-none"
        />
      </div>
      {err && <p className="text-center text-sm text-rose-400">{err}</p>}
      <div className="flex justify-center">
        <Button type="submit" disabled={name.trim().length < 2 || busy}>{busy ? "Saving…" : cta}</Button>
      </div>
      <p className="text-center text-xs text-zinc-600">No password. You start at 1000 Elo (Reply Guy).</p>
    </form>
  );
}
