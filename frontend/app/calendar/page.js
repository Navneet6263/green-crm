"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CalendarPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/tasks"); }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-400">
      Redirecting to Task Board…
    </div>
  );
}
