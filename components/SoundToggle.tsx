"use client";
import { useEffect, useState } from "react";
import { isMuted, setMuted, sfx, unlockAudio } from "@/lib/sfx";

export function SoundToggle({ className = "" }: { className?: string }) {
  const [muted, setM] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage after hydration
  useEffect(() => setM(isMuted()), []);
  return (
    <button
      type="button"
      title={muted ? "Sound off" : "Sound on"}
      onClick={() => {
        unlockAudio();
        setMuted(!muted);
        setM(!muted);
        if (muted) setTimeout(sfx.ding, 50);
      }}
      className={`rounded-full border border-zinc-700 px-2.5 py-1 text-sm hover:bg-zinc-800 ${className}`}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
