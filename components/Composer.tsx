"use client";
import { useState } from "react";
import { Avatar, Button } from "./feed";

const MAX = 280;

export function Composer({
  name, placeholder, submitLabel, onSubmit, onDraft, busy, extra,
}: {
  name: string;
  placeholder: string;
  submitLabel: string;
  onSubmit: (text: string) => void;
  onDraft?: (text: string) => void; // parent keeps the draft so it can auto-post when time runs out
  busy?: boolean;
  extra?: React.ReactNode;
}) {
  const [text, setText] = useState("");
  const left = MAX - text.length;

  return (
    <form
      className="mx-3 my-3 flex gap-3 rounded-2xl border-2 border-spot/60 bg-canvas px-4 py-4 shadow-[0_0_40px_-12px_rgb(255_210_63/0.45)]"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim() && !busy) onSubmit(text);
      }}
    >
      <Avatar name={name} />
      <div className="flex-1">
        <textarea
          autoFocus
          value={text}
          maxLength={MAX}
          rows={3}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            onDraft?.(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim() && !busy) onSubmit(text);
          }}
          className="w-full resize-none bg-transparent focus-visible:outline-none text-xl font-semibold text-bone placeholder:font-normal placeholder:text-zinc-500 focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between border-t border-zinc-800 pt-3">
          <span className={`font-mono text-xs ${left < 20 ? "text-rose-400" : "text-zinc-500"}`}>{left}</span>
          <div className="flex gap-2">
            {extra}
            <Button type="submit" disabled={!text.trim() || busy}>{busy ? "Posting…" : submitLabel}</Button>
          </div>
        </div>
      </div>
    </form>
  );
}
