"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/transactions", label: "Transactions" },
  { href: "/dashboard/budget", label: "Budget" },
  { href: "/dashboard/insights", label: "Insights" },
  { href: "/dashboard/investments", label: "Investments" },
  { href: "/dashboard/profile", label: "Profile" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
      router.replace("/");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Could not log out.");
    } finally {
      setLoggingOut(false);
    }
  }

  const navigation = (
    <nav className="flex flex-1 flex-col">
      <ul className="space-y-1">
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`block min-h-11 border-l-2 px-4 py-3 text-sm ${
                  active
                    ? "border-emerald-800 bg-stone-50 font-medium text-stone-900 dark:border-emerald-400 dark:bg-stone-800 dark:text-stone-50"
                    : "border-transparent text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto px-4 py-4">
        <ThemeToggle className="hidden md:inline-flex" />
        {logoutError ? (
          <p className="mb-2 mt-3 text-sm text-red-800 dark:text-red-300" role="alert">
            {logoutError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-3 text-sm text-stone-600 hover:text-stone-900 disabled:opacity-60 dark:text-stone-400 dark:hover:text-stone-100"
        >
          {loggingOut ? "Logging out…" : "Log out"}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-stone-200 bg-white md:flex md:min-h-screen md:flex-col dark:border-stone-700 dark:bg-stone-950">
        <div className="px-4 py-5">
          <Brand href="/dashboard" />
        </div>
        {navigation}
      </aside>

      <div className="min-w-0">
        <header className="flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4 dark:border-stone-700 dark:bg-stone-950 md:hidden">
          <Brand href="/dashboard" />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="min-h-11 text-sm font-medium text-stone-700 dark:text-stone-200"
              aria-expanded={menuOpen}
            >
              {menuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </header>
        {menuOpen ? (
          <div className="border-b border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-950 md:hidden">
            {navigation}
          </div>
        ) : null}
        <main className="px-4 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
