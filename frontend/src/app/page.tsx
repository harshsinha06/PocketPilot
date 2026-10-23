import Link from "next/link";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { formatInr } from "@/lib/currency";

const points = [
  {
    title: "Track spending",
    body: "Write down income and expenses as they happen, instead of reconstructing the month from memory.",
  },
  {
    title: "Set a monthly budget",
    body: "Pick one amount for the month. That number is the plan.",
  },
  {
    title: "See what is left",
    body: "Know whether the money you have will last until the month ends.",
  },
];

const exampleRows = [
  { label: "Allowance", amount: 8000 },
  { label: "Rent share", amount: 4500 },
  { label: "Food", amount: 2200 },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-950">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Brand />
          <nav className="flex items-center gap-4 text-sm">
            <ThemeToggle />
            <Link href="/login" className="text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100">
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-emerald-800 px-4 py-2 font-medium text-white hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-16">
        <h1 className="max-w-[900px] text-[clamp(35px,4.4vw,53px)] font-semibold leading-[1.12] tracking-[-0.02em] text-stone-900 dark:text-stone-50">
          Know where this month&apos;s
          <br />
          money is <span className="headline-accent">going</span>.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-stone-600 dark:text-stone-400">
          PocketPilot helps you track spending and keep a monthly budget, so you
          are less likely to run out of money before the month ends.
        </p>
        <div className="mt-8 flex flex-col items-start gap-2.5">
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/register"
              className="rounded-full bg-emerald-800 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              Create an account
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-800 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
            >
              I already have an account
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-10 border-t border-stone-200 pt-10 dark:border-stone-700 md:grid-cols-[1.4fr_0.8fr]">
          <ul className="divide-y divide-stone-200 border-y border-stone-200 dark:divide-stone-700 dark:border-stone-700">
            {points.map((point) => (
              <li key={point.title} className="py-5">
                <h2 className="text-base font-medium">{point.title}</h2>
                <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-400">{point.body}</p>
              </li>
            ))}
          </ul>
          <aside className="h-fit border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Example, not your data
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              {exampleRows.map((row) => (
                <li key={row.label} className="flex items-baseline justify-between gap-4">
                  <span className="text-stone-700 dark:text-stone-300">{row.label}</span>
                  <span className="tabular-nums text-stone-900 dark:text-stone-100">{formatInr(row.amount)}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}
