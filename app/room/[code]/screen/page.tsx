import { Suspense } from "react";
import ScreenClient from "./ScreenClient";

// /room/CODE/screen — the big-screen (projector) view of a room. Read-only.
export default function ScreenPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent" />}>
      <Screen params={params} />
    </Suspense>
  );
}

async function Screen({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ScreenClient code={code.toUpperCase()} />;
}
