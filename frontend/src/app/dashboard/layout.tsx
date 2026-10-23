"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusScreen } from "@/components/StatusScreen";
import { useAuth } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, error, refresh } = useAuth();
  const hadUser = useRef(false);
  if (user) hadUser.current = true;

  useEffect(() => {
    if (!loading && !user && !error && !hadUser.current) {
      router.replace("/login");
    }
  }, [loading, user, error, router]);

  if (loading) {
    return <StatusScreen title="PocketPilot" body="Checking your session…" />;
  }

  if (error) {
    return (
      <StatusScreen
        title="Could not load your account"
        body={error}
        action={
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-full bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            Try again
          </button>
        }
      />
    );
  }

  if (!user) {
    return <StatusScreen title="PocketPilot" body="Redirecting to login…" />;
  }

  return <AppShell>{children}</AppShell>;
}
