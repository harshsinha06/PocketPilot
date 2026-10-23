import Link from "next/link";
import { formatPaise } from "@/lib/currency";
import { budgetBarClass, card, faint, muted, sectionTitle, textLink, track } from "@/lib/ui";
import type { CategoryBudgetProgress, MonthReport, SafeToSpend } from "@/lib/types";

export function SafeToSpendCard({ safe, hideLink = false }: { safe: SafeToSpend; hideLink?: boolean }) {
  if (!safe.applicable || safe.amount === null) {
    return (
      <section className={`${card} px-5 py-6`}>
        <h2 className={sectionTitle}>Safe to spend</h2>
        <p className={`mt-2 ${muted}`}>
          {safe.message ?? "Set a monthly budget to see how much you can spend each day."}
        </p>
        {safe.amount === null && !hideLink ? (
          <Link href="/dashboard/budget" className={`mt-3 inline-block ${textLink}`}>
            Set a monthly budget
          </Link>
        ) : null}
      </section>
    );
  }

  const days = safe.daysLeft === 1 ? "1 day left" : `${safe.daysLeft} days left`;

  return (
    <section className={`${card} px-5 py-6`}>
      <p className="text-3xl font-medium tabular-nums tracking-tight">{formatPaise(safe.amount)}</p>
      <p className={`mt-1 ${faint}`}>Safe to spend</p>
      <p className="mt-4 text-sm text-stone-700 dark:text-stone-300">{days}</p>
      {safe.perDay !== null ? (
        <p className="mt-1 text-sm tabular-nums text-stone-700 dark:text-stone-300">≈ {formatPaise(safe.perDay)}/day</p>
      ) : null}
      {safe.message ? <p className="mt-3 text-sm leading-6 text-stone-700 dark:text-stone-300">{safe.message}</p> : null}
      <p className={`mt-3 ${faint}`}>
        This splits the budget you have left across the days left in the month. It is not financial advice.
      </p>
    </section>
  );
}

export function BudgetProgressCard({
  report,
  showLink = false,
}: {
  report: MonthReport;
  showLink?: boolean;
}) {
  if (!report.budget || report.percent === null || report.remaining === null) {
    return (
      <section className={`${card} px-5 py-6`}>
        <h2 className={sectionTitle}>{report.monthLabel} budget</h2>
        <p className={`mt-2 ${muted}`}>No budget set for {report.monthLabel}.</p>
        {showLink ? (
          <Link href="/dashboard/budget" className={`mt-3 inline-block ${textLink}`}>
            Set a monthly budget
          </Link>
        ) : null}
      </section>
    );
  }

  const width = Math.min(Math.max(report.percent, 0), 100);

  return (
    <section className={`${card} px-5 py-6`}>
      <h2 className={sectionTitle}>{report.monthLabel} budget</h2>
      <p className="mt-4 text-sm tabular-nums text-stone-800 dark:text-stone-200">
        {formatPaise(report.expenses + (report.recurringExpenses ?? 0))} / {formatPaise(report.budget.amount)} spent
      </p>
      <div
        className={`mt-3 h-2 ${track}`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={width}
        aria-valuetext={`${report.percent}% of monthly budget`}
      >
        <div className={budgetBarClass(report.status)} style={{ width: `${width}%` }} />
      </div>
      <p className={`mt-3 ${faint}`}>
        {report.remaining >= 0
          ? `${formatPaise(report.remaining)} remaining`
          : `${formatPaise(-report.remaining)} over`}
      </p>
      {report.statusMessage ? (
        <p className="mt-3 text-sm leading-6 text-stone-700 dark:text-stone-300">{report.statusMessage}</p>
      ) : null}
    </section>
  );
}

export function CategoryBudgetList({ items }: { items: CategoryBudgetProgress[] }) {
  if (items.length === 0) return null;

  return (
    <section className={`${card} px-5 py-6`}>
      <h2 className={sectionTitle}>Category limits</h2>
      <ul className="mt-4 space-y-4">
        {items.map((item) => (
          <li key={item.category} className="text-sm">
            <p className="font-medium">{item.category}</p>
            <p className="mt-1 text-stone-600 dark:text-stone-400">
              Budget {formatPaise(item.budget)} · Spent {formatPaise(item.spent)} ·{" "}
              {item.remaining >= 0
                ? `${formatPaise(item.remaining)} left`
                : `${formatPaise(-item.remaining)} over`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
