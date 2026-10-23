"use client";

import { useEffect, useState } from "react";
import { BudgetProgressCard } from "@/components/BudgetCards";
import { CategoryDonut, IncomeExpenseBars, SpendingTrend } from "@/components/SpendingCharts";
import { getMonthReport } from "@/lib/budget";
import { formatChangePaise, formatPaise } from "@/lib/currency";
import { currentMonthParts, formatMonth, shiftMonth } from "@/lib/dates";
import { card, errorBox, faint, heading, muted, primaryButton, sectionTitle } from "@/lib/ui";
import type { MonthReport } from "@/lib/types";

export default function InsightsPage() {
  const today = currentMonthParts();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);
  const [report, setReport] = useState<MonthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMonthReport(month, year)
      .then((body) => {
        if (!cancelled) setReport(body.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load insights.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month, year, reloadKey]);

  const atCurrent = year === today.year && month === today.month;
  const atOldest = year === 2000 && month === 1;

  function move(delta: number) {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={atOldest}
          className="min-h-11 text-sm text-stone-600 hover:text-stone-900 disabled:opacity-40 dark:text-stone-400 dark:hover:text-stone-100"
        >
          Previous
        </button>
        <h1 className={heading}>{formatMonth(year, month)}</h1>
        <button
          type="button"
          onClick={() => move(1)}
          disabled={atCurrent}
          className="min-h-11 text-sm text-stone-600 hover:text-stone-900 disabled:opacity-40 dark:text-stone-400 dark:hover:text-stone-100"
        >
          Next
        </button>
      </div>
      <p className={`mt-2 ${muted}`}>These notes come from the transactions you have added.</p>

      {loading && !report ? <p className={`mt-8 ${muted}`}>Loading insights…</p> : null}

      {error ? (
        <div className={`mt-8 ${errorBox}`}>
          <p>{error}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className={`mt-4 ${primaryButton}`}>
            Try again
          </button>
        </div>
      ) : null}

      {report && report.month === month && report.year === year ? (
        <div className="mt-8 space-y-4">
          <InsightCards report={report} />

          <section className={`${card} px-5 py-6`}>
            <h2 className={sectionTitle}>Spending by category</h2>
            <div className="mt-4">
              <CategoryDonut categories={report.expenseByCategory} total={report.expenses} />
            </div>
            {report.expenses > 0 ? (
              <ul className="mt-4 divide-y divide-stone-200 dark:divide-stone-700">
                {report.expenseByCategory.map((item) => (
                  <li key={item.category} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                    <span>{item.category}</span>
                    <span className="tabular-nums text-stone-700 dark:text-stone-300">
                      {formatPaise(item.amount)}
                      <span className="ml-3 inline-block w-10 text-right text-stone-500 dark:text-stone-400">
                        {Math.round((item.amount * 100) / report.expenses)}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className={`${card} px-5 py-6`}>
            <h2 className={sectionTitle}>Monthly spending</h2>
            <div className="mt-4">
              <SpendingTrend history={report.history ?? []} />
            </div>
          </section>

          <section className={`${card} px-5 py-6`}>
            <h2 className={sectionTitle}>Income and expenses</h2>
            <div className="mt-4">
              <IncomeExpenseBars history={report.history ?? []} />
            </div>
          </section>

          <BudgetProgressCard report={report} />

          <section className={`${card} px-5 py-6`}>
            <h2 className={sectionTitle}>
              {report.comparison ? `${report.monthLabel} vs ${report.comparison.monthLabel}` : "Compared with last month"}
            </h2>
            {report.comparison ? (
              <div className="mt-4 space-y-5">
                <ComparisonBlock
                  title="Expenses"
                  currentLabel={report.monthLabel}
                  previousLabel={report.comparison.monthLabel}
                  side={report.comparison.expenses}
                />
                <ComparisonBlock
                  title="Income"
                  currentLabel={report.monthLabel}
                  previousLabel={report.comparison.monthLabel}
                  side={report.comparison.income}
                />
                {report.comparison.categories.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-medium">By category</h3>
                    <ul className="mt-3 space-y-3">
                      {report.comparison.categories.map((item) => (
                        <li key={item.category} className="text-sm">
                          <div className="flex items-baseline justify-between gap-4">
                            <span>{item.category}</span>
                            <span className="tabular-nums">{formatChangePaise(item.change)}</span>
                          </div>
                          <p className={`mt-1 ${faint}`}>
                            {report.monthLabel} {formatPaise(item.current)} · {report.comparison?.monthLabel}{" "}
                            {formatPaise(item.previous)}
                            {item.percent !== null ? ` · ${item.percent > 0 ? "+" : ""}${item.percent}%` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className={`mt-3 ${muted}`}>
                {report.income > 0 || report.expenses > 0
                  ? "Not enough data yet. Keep adding transactions to see spending trends."
                  : "Add transactions from two different months to compare them."}
              </p>
            )}
          </section>

          {report.projection.kind !== "empty" || report.expenses > 0 ? (
            <section className={`${card} px-5 py-6`}>
              <h2 className={sectionTitle}>Month-end estimate</h2>
              {report.projection.kind === "estimate" ? (
                <dl className="mt-4 space-y-2 text-sm">
                  <Row label="Current spending" value={formatPaise(report.projection.spent)} />
                  <Row label="Average daily spending" value={formatPaise(report.projection.averageDaily)} />
                  <Row label="Projected month-end spending" value={`≈ ${formatPaise(report.projection.projected)}`} />
                  {report.projection.budgetAmount !== null ? (
                    <Row label="Monthly budget" value={formatPaise(report.projection.budgetAmount)} />
                  ) : null}
                  <p className={`pt-2 ${faint}`}>{report.projection.note}</p>
                </dl>
              ) : (
                <p className={`mt-3 ${muted}`}>{report.projection.note}</p>
              )}
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function InsightCards({ report }: { report: MonthReport }) {
  const top = report.expenseByCategory.find((item) => item.amount > 0);
  const change = [...(report.comparison?.categories ?? [])]
    .filter((item) => item.previous > 0 && item.change !== 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
  const cards = [
    top
      ? { label: "Highest spending", value: `${top.category} — ${formatPaise(top.amount)}` }
      : null,
    change
      ? {
          label: "Biggest change",
          value: `${change.category} spending ${change.change > 0 ? "increased" : "decreased"}${
            change.percent !== null ? ` ${Math.abs(change.percent)}%` : ` by ${formatPaise(Math.abs(change.change))}`
          } from last month.`,
        }
      : null,
    typeof report.averageDaily === "number"
      ? { label: "Daily average", value: `${formatPaise(report.averageDaily)}/day` }
      : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  if (cards.length === 0) {
    return (
      <section className={`${card} px-5 py-6`}>
        <h2 className={sectionTitle}>Spending overview</h2>
        <p className={`mt-3 ${muted}`}>{report.emptyInsightsMessage}</p>
      </section>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((item) => (
        <section key={item.label} className={`${card} px-5 py-5`}>
          <p className={faint}>{item.label}</p>
          <p className="mt-2 text-sm leading-6 text-stone-900 dark:text-stone-100">{item.value}</p>
        </section>
      ))}
    </div>
  );
}

function ComparisonBlock({
  title,
  currentLabel,
  previousLabel,
  side,
}: {
  title: string;
  currentLabel: string;
  previousLabel: string;
  side: { current: number; previous: number; change: number };
}) {
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      <dl className="mt-2 space-y-1 text-sm">
        <Row label={currentLabel} value={formatPaise(side.current)} />
        <Row label={previousLabel} value={formatPaise(side.previous)} />
        <Row label="Change" value={formatChangePaise(side.change)} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
