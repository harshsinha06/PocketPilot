"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BudgetProgressCard, SafeToSpendCard } from "@/components/BudgetCards";
import { TransactionForm } from "@/components/TransactionForm";
import { useAuth } from "@/lib/auth";
import { getMonthReport } from "@/lib/budget";
import { formatPaise, formatSignedPaise } from "@/lib/currency";
import { formatMonth, formatTransactionDate, greeting } from "@/lib/dates";
import { getSummary } from "@/lib/transactions";
import { card, errorBox, faint, heading, line, muted, notice, primaryButton, sectionTitle, textLink } from "@/lib/ui";
import type { MonthReport, Summary } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [report, setReport] = useState<MonthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReportError(null);

    Promise.allSettled([getSummary(), getMonthReport()]).then(([summaryResult, reportResult]) => {
      if (cancelled) return;
      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value.data);
      } else {
        const reason: unknown = summaryResult.reason;
        setError(reason instanceof Error ? reason.message : "Could not load your overview.");
      }
      if (reportResult.status === "fulfilled") {
        setReport(reportResult.value.data);
      } else {
        const reason: unknown = reportResult.reason;
        setReportError(reason instanceof Error ? reason.message : "Could not load your budget.");
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function handleSaved(message: string) {
    setNotice(message);
    setReloadKey((value) => value + 1);
  }

  const largestCategory = summary?.expenseByCategory[0]?.amount || 1;

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={heading}>{user ? greeting(user.name) : "Dashboard"}</h1>
          <p className={`mt-2 ${muted}`}>
            {summary ? formatMonth(summary.year, summary.month) : "This month"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className={primaryButton}
        >
          Add transaction
        </button>
      </div>

      {notice ? (
        <p className={`mt-4 ${notice}`} role="status">
          {notice}
        </p>
      ) : null}

      {loading && !summary ? <p className={`mt-8 ${muted}`}>Loading your overview…</p> : null}

      {error ? (
        <div className={`mt-8 ${errorBox}`}>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className={`mt-4 ${primaryButton}`}
          >
            Try again
          </button>
        </div>
      ) : null}

      {summary ? (
        <div className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <section className={`${card} px-5 py-6`}>
              <p className="text-3xl font-medium tabular-nums tracking-tight">{formatPaise(summary.balance)}</p>
              <p className={`mt-1 ${faint}`}>Current balance</p>
            </section>
            {report ? (
              <SafeToSpendCard safe={report.safeToSpend} />
            ) : reportError ? (
              <section className={errorBox}>
                <p>{reportError}</p>
                <button type="button" onClick={() => setReloadKey((value) => value + 1)} className={`mt-4 ${primaryButton}`}>
                  Try again
                </button>
              </section>
            ) : null}
          </div>

          {report ? <BudgetProgressCard report={report} showLink /> : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Monthly expenses" amount={summary.monthlyExpenses} />
            <Stat label="Monthly income" amount={summary.monthlyIncome} />
            <Stat label="Left this month" amount={summary.monthlyBalance} />
          </div>

          <section className={card}>
            <div className={`flex items-center justify-between border-b px-5 py-4 ${line}`}>
              <h2 className={sectionTitle}>Recent transactions</h2>
              <Link href="/dashboard/transactions" className={textLink}>
                View all
              </Link>
            </div>
            {summary.recent.length === 0 ? (
              <p className={`px-5 py-8 ${muted}`}>
                No transactions yet. Add your first expense to start understanding where your money goes.
              </p>
            ) : (
              <ul>
                {summary.recent.map((transaction) => (
                  <li
                    key={transaction._id}
                    className={`flex items-baseline justify-between gap-4 border-b px-5 py-3 last:border-b-0 ${line}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {transaction.description || transaction.category}
                      </p>
                      <p className={`mt-1 ${faint}`}>
                        {formatTransactionDate(transaction.date)} · {transaction.category}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 text-sm tabular-nums ${
                        transaction.type === "income" ? "text-emerald-800 dark:text-emerald-300" : "text-stone-800 dark:text-stone-100"
                      }`}
                    >
                      {formatSignedPaise(transaction.type, transaction.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${card} px-5 py-6`}>
            <h2 className={sectionTitle}>Spending by category</h2>
            {summary.expenseByCategory.length === 0 ? (
              <p className={`mt-3 ${muted}`}>No expenses this month.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {summary.expenseByCategory.map((item) => {
                  const limit = report?.categoryBudgets.find((entry) => entry.category === item.category);
                  const width = Math.max(4, Math.round((item.amount / largestCategory) * 100));
                  return (
                    <li key={item.category}>
                      <div className="flex items-baseline justify-between gap-4 text-sm">
                        <span>{item.category}</span>
                        <span className="tabular-nums text-stone-700 dark:text-stone-300">{formatPaise(item.amount)}</span>
                      </div>
                      {limit ? (
                        <p className={`mt-1 ${faint}`}>
                          {formatPaise(limit.budget)} budget ·{" "}
                          {limit.remaining >= 0
                            ? `${formatPaise(limit.remaining)} left`
                            : `${formatPaise(-limit.remaining)} over`}
                        </p>
                      ) : null}
                      <div className="mt-2 h-1.5 bg-stone-100 dark:bg-stone-800">
                        <div className="h-1.5 bg-emerald-800 dark:bg-emerald-400" style={{ width: `${width}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {summary.recurringExpenses > 0 ? (
              <div className="mt-4 flex items-baseline justify-between gap-4 text-sm">
                <span>Recurring bills</span>
                <span className="tabular-nums text-stone-700 dark:text-stone-300">{formatPaise(summary.recurringExpenses)}</span>
              </div>
            ) : null}
            {summary.monthlyIncome === 0 ? (
              <p className={`mt-4 ${muted}`}>No income recorded this month.</p>
            ) : null}
          </section>

          <section className={`${card} px-5 py-6`}>
            <div className="flex items-center justify-between gap-4">
              <h2 className={sectionTitle}>PocketPilot noticed</h2>
              <Link href="/dashboard/insights" className={textLink}>
                View insights
              </Link>
            </div>
            {report ? (
              <p className={`mt-3 ${muted}`}>
                {report.insights[0] ?? report.emptyInsightsMessage}
              </p>
            ) : (
              <p className={`mt-3 ${muted}`}>
                {reportError ?? "Insights will appear once your budget and spending load."}
              </p>
            )}
          </section>
        </div>
      ) : null}

      <TransactionForm
        key={formOpen ? "create" : "closed"}
        open={formOpen}
        initial={null}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}

function Stat({ label, amount }: { label: string; amount: number }) {
  return (
    <section className={`${card} px-5 py-4`}>
      <p className="text-lg font-medium tabular-nums">{formatPaise(amount)}</p>
      <p className={`mt-1 ${faint}`}>{label}</p>
    </section>
  );
}
