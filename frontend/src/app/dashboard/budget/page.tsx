"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { BudgetProgressCard, CategoryBudgetList, SafeToSpendCard } from "@/components/BudgetCards";
import { ApiClientError, fieldMessage } from "@/lib/api";
import { createBudget, deleteBudget, getCurrentBudget, listBudgets, updateBudget } from "@/lib/budget";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import { formatPaise, paiseToInput, rupeesToPaise } from "@/lib/currency";
import { card, errorBox, errorText, faint, field, heading, muted, notice, primaryButton, secondaryButton, sectionTitle, textLink } from "@/lib/ui";
import { currentMonthParts, formatMonth, shiftMonth } from "@/lib/dates";
import type { BudgetListItem, FieldError, MonthReport } from "@/lib/types";

const inputClass = field;

export default function BudgetPage() {
  const today = currentMonthParts();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);
  const [report, setReport] = useState<MonthReport | null>(null);
  const [budgets, setBudgets] = useState<BudgetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getCurrentBudget(month, year), listBudgets()])
      .then(([current, list]) => {
        if (cancelled) return;
        setReport(current.data);
        setBudgets(list.data.budgets);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load your budget.");
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
    setNotice(null);
  }

  function handleSaved(message: string) {
    setNotice(message);
    setReloadKey((value) => value + 1);
  }

  return (
    <div className="max-w-2xl">
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
      <p className={`mt-2 ${muted}`}>
        Set how much you want to spend this month. Category limits are optional.
      </p>

      {notice ? (
        <p className={`mt-4 ${notice}`} role="status">
          {notice}
        </p>
      ) : null}

      {loading && !report ? <p className={`mt-8 ${muted}`}>Loading your budget…</p> : null}

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

      {report && report.month === month && report.year === year ? (
        <div className="mt-8 space-y-4">
          <BudgetProgressCard report={report} />
          {report.budget ? <SafeToSpendCard safe={report.safeToSpend} hideLink /> : null}
          <CategoryBudgetList items={report.categoryBudgets} />
          {report.categoriesExceedBudget ? (
            <p className={muted}>
              Your category limits add up to more than the monthly budget.
            </p>
          ) : null}
          <BudgetEditor
            key={`${year}-${month}-${report.budget?._id ?? "new"}-${report.budget?.updatedAt ?? "none"}`}
            month={month}
            year={year}
            budget={report.budget}
            onSaved={handleSaved}
          />
        </div>
      ) : null}

      <section className={`mt-8 ${card} px-5 py-6`}>
        <h2 className={sectionTitle}>Saved budgets</h2>
        {budgets.length === 0 ? (
          <p className={`mt-3 ${muted}`}>No budgets yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-200 dark:divide-stone-700">
            {budgets.map((item) => (
              <li key={item._id} className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => {
                    setYear(item.year);
                    setMonth(item.month);
                    setNotice(null);
                  }}
                  className={textLink}
                >
                  {formatMonth(item.year, item.month)}
                </button>
                <p className="text-right text-sm text-stone-600 dark:text-stone-400">
                  <span className="tabular-nums">{formatPaise(item.amount)}</span>
                  <span className="mt-1 block tabular-nums">
                    {formatPaise(item.spent)} spent ·{" "}
                    {item.remaining >= 0
                      ? `${formatPaise(item.remaining)} left`
                      : `${formatPaise(-item.remaining)} over`}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BudgetEditor({
  month,
  year,
  budget,
  onSaved,
}: {
  month: number;
  year: number;
  budget: MonthReport["budget"];
  onSaved: (message: string) => void;
}) {
  const [amount, setAmount] = useState(budget ? paiseToInput(budget.amount) : "");
  const [rows, setRows] = useState(() =>
    budget?.categories.map((item) => ({ category: item.category, amount: paiseToInput(item.amount) })) ?? []
  );
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const used = new Set(rows.map((row) => row.category));
  const available = EXPENSE_CATEGORIES.filter((category) => !used.has(category));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: FieldError[] = [];
    const paise = rupeesToPaise(amount);
    if (paise === null) {
      nextErrors.push({ field: "amount", message: "Enter an amount greater than 0" });
    }

    const categories: { category: string; amount: number }[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (seen.has(row.category)) {
        nextErrors.push({ field: "categories", message: `${row.category} is listed more than once` });
      }
      seen.add(row.category);
      const categoryAmount = rupeesToPaise(row.amount);
      if (categoryAmount === null) {
        nextErrors.push({ field: "categories", message: `Enter an amount for ${row.category}` });
      } else {
        categories.push({ category: row.category, amount: categoryAmount });
      }
    }

    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.length > 0 || paise === null) return;

    setPending(true);
    try {
      if (budget) {
        const result = await updateBudget(budget._id, { amount: paise, categories });
        onSaved(result.message ?? "Budget updated");
      } else {
        const result = await createBudget({ amount: paise, categories, month, year });
        onSaved(result.message ?? "Budget saved");
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
        setErrors(err.errors ?? []);
      } else {
        setFormError(err instanceof Error ? err.message : "Could not save this budget.");
      }
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!budget) return;
    setPending(true);
    setFormError(null);
    try {
      const result = await deleteBudget(budget._id);
      onSaved(result.message ?? "Budget removed");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Could not remove this budget.");
    } finally {
      setPending(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${card} px-5 py-6`}>
      <h2 className={sectionTitle}>{budget ? "Edit budget" : "Set a budget"}</h2>
      <p className={`mt-2 ${muted}`}>
        You can use PocketPilot with only this monthly amount.
      </p>

      {formError ? <p className={`mt-4 ${errorText}`}>{formError}</p> : null}

      <label htmlFor="budget-amount" className="mt-4 block text-sm font-medium text-stone-800 dark:text-stone-200">
        Monthly budget
      </label>
      <div className="mt-1.5 flex border border-stone-300 focus-within:border-emerald-800 dark:border-stone-600 dark:focus-within:border-emerald-400">
        <span className={`flex items-center px-3 ${faint}`}>₹</span>
        <input
          id="budget-amount"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="10000"
          className="w-full bg-transparent px-3 py-2 text-sm text-stone-900 outline-none dark:text-stone-100"
        />
      </div>
      {fieldMessage(errors, "amount") ? (
        <p className={`mt-1 ${errorText}`}>{fieldMessage(errors, "amount")}</p>
      ) : null}

      <div className="mt-6">
        <h3 className="text-sm font-medium text-stone-800 dark:text-stone-200">Category limits</h3>
        <p className={`mt-1 ${muted}`}>Optional. Leave this empty if you only want one monthly budget.</p>
        <ul className="mt-3 space-y-3">
          {rows.map((row, index) => (
            <li key={`${row.category}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_8rem_auto] sm:items-center">
              <select
                aria-label={`${row.category} category`}
                value={row.category}
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = { ...row, category: event.target.value };
                  setRows(next);
                }}
                className={inputClass}
              >
                {EXPENSE_CATEGORIES.filter((category) => category === row.category || !used.has(category)).map(
                  (category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  )
                )}
              </select>
              <div className="flex border border-stone-300 focus-within:border-emerald-800 dark:border-stone-600 dark:focus-within:border-emerald-400">
                <span className={`flex items-center px-3 ${faint}`}>₹</span>
                <input
                  aria-label={`${row.category} limit`}
                  inputMode="decimal"
                  value={row.amount}
                  onChange={(event) => {
                    const next = [...rows];
                    next[index] = { ...row, amount: event.target.value };
                    setRows(next);
                  }}
                  className="w-full bg-transparent px-3 py-2 text-sm text-stone-900 outline-none dark:text-stone-100"
                />
              </div>
              <button
                type="button"
                onClick={() => setRows(rows.filter((_, rowIndex) => rowIndex !== index))}
                className="min-h-11 text-sm text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {fieldMessage(errors, "categories") ? (
          <p className={`mt-2 ${errorText}`}>{fieldMessage(errors, "categories")}</p>
        ) : null}
        {available.length > 0 ? (
          <button
            type="button"
            onClick={() => setRows([...rows, { category: available[0], amount: "" }])}
            className={`mt-3 ${textLink}`}
          >
            Add a category limit
          </button>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className={primaryButton}
        >
          {pending ? "Saving…" : budget ? "Save changes" : "Save budget"}
        </button>
        {budget && !confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={pending}
            className={secondaryButton}
          >
            Remove budget
          </button>
        ) : null}
        {budget && confirmingDelete ? (
          <>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={pending}
              className={secondaryButton}
            >
              Remove this budget
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={pending}
              className="min-h-11 text-sm text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
            >
              Cancel
            </button>
          </>
        ) : null}
      </div>
    </form>
  );
}
