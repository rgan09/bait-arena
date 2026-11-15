import { Suspense } from "react";
import SchoolPlay from "./SchoolPlay";

type Search = Promise<{ category?: string; technique?: string; daily?: string }>;

export default function PlayPage({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent p-10 text-center text-zinc-500">Loading class…</div>}>
      <Play searchParams={searchParams} />
    </Suspense>
  );
}

async function Play({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  return <SchoolPlay category={sp.category ?? null} technique={sp.technique ?? null} daily={sp.daily === "1"} />;
}
