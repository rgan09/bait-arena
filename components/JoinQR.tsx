"use client";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** QR code that opens the room on a phone — judges scan it from the projector to join. */
export function JoinQR({ code, size = 200 }: { code: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(`${location.origin}/room/${code}`, { width: size * 2, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [code, size]);
  if (!src) return <div style={{ width: size, height: size }} className="mx-auto animate-pulse rounded-2xl bg-zinc-800" />;
  // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimise
  return <img src={src} width={size} height={size} alt={`QR code to join room ${code}`} className="mx-auto rounded-2xl" />;
}
