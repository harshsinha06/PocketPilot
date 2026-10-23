"use client";

import { useEffect, useState } from "react";
import { TransactionForm } from "@/components/TransactionForm";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { formatSignedPaise } from "@/lib/currency";
import { formatTransactionDate } from "@/lib/dates";
import { deleteTransaction, listTransactions } from "@/lib/transactions";
import { card, errorText, faint, field, heading, line, muted, notice, primaryButton, secondaryButton, sectionTitle } from "@/lib/ui";
import type { Transaction, TransactionList } from "@/lib/types";

const selectClass = field;

export default function TransactionsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [monthValue, setMonthValue] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<TransactionList["pagination"] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    const [yearText, monthText] = monthValue.split("-");
    setLoading(true);
    setError(null);

    listTransactions({
      search,
      type,
      category,
      sort,
      page,
      year: yearText ? Number(yearText) : undefined,
      month: monthText ? Number(monthText) : undefined,
    })
      .then((body) => {
        if (cancelled) return;
        setTransactions(body.data.transactions);
        setPagination(body.data.pagination);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load transactions.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, type, category, monthValue, sort, page, reloadKey]);

  const categoryOptions = type === "income"
    ? INCOME_CATEGORIES
    : type === "expense"
      ? EXPENSE_CATEGORIES
      : [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES.filter((item) => item !== "Other")];

  const filtersActive = Boolean(search || type || category || monthValue);
  const total = pagination?.total ?? 0;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleSaved(message: string) {
    setNotice(message);
    setReloadKey((value) => value + 1);
  }

  async function confirmDelete(transaction: Transaction) {
    setDeleting(true);
    setError(null);
    try {
      await deleteTransaction(transaction._id);
      setNotice("Transaction deleted.");
      setConfirmId(null);
      if (transactions.length === 1 && page > 1) setPage(page - 1);
      else setReloadKey((value) => value + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete this transaction.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={heading}>Transactions</h1>
          <p className={`mt-2 ${muted}`}>
            Income and expenses you record.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
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

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search descriptions"
          aria-label="Search descriptions"
          className={selectClass}
        />
        <select
          aria-label="Filter by type"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setCategory("");
            setPage(1);
          }}
          className={selectClass}
        >
          <option value="">All types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </select>
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
          className={selectClass}
        >
          <option value="">All categories</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          type="month"
          aria-label="Filter by month"
          value={monthValue}
          onChange={(event) => {
            setMonthValue(event.target.value);
            setPage(1);
          }}
          className={selectClass}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
          Sort
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </label>
        {monthValue ? (
          <button
            type="button"
            onClick={() => {
              setMonthValue("");
              setPage(1);
            }}
            className="min-h-11 text-sm text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          >
            Clear month
          </button>
        ) : null}
      </div>

      <div className={`mt-6 ${card}`}>
        {loading ? (
          <p className={`border-b px-5 py-4 text-sm text-stone-600 dark:text-stone-400 ${line}`}>
            Loading transactions…
          </p>
        ) : null}

        {!loading && error ? (
          <div className="px-5 py-8">
            <p className={errorText}>{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className={`mt-4 ${primaryButton}`}
            >
              Try again
            </button>
          </div>
        ) : null}

        {!loading && !error && transactions.length === 0 ? (
          <div className="px-5 py-10">
            <h2 className={sectionTitle}>
              {filtersActive ? "No matching transactions" : "No transactions yet"}
            </h2>
            <p className={`mt-2 max-w-md ${muted}`}>
              {filtersActive
                ? "Nothing matches these filters. Try a different search, category, or month."
                : "Add your first expense to start understanding where your money goes."}
            </p>
          </div>
        ) : null}

        {!loading && !error && transactions.length > 0 ? (
          <ul>
            {transactions.map((transaction) => (
              <li key={transaction._id} className={`border-b px-4 py-4 last:border-b-0 sm:px-5 ${line}`}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="min-w-0 truncate text-sm font-medium">
                    {transaction.description || transaction.category}
                  </p>
                  <p
                    className={`shrink-0 text-sm tabular-nums ${
                      transaction.type === "income" ? "text-emerald-800 dark:text-emerald-300" : "text-stone-800 dark:text-stone-100"
                    }`}
                  >
                    {formatSignedPaise(transaction.type, transaction.amount)}
                  </p>
                </div>
                <p className={`mt-1 flex flex-wrap items-center gap-2 ${faint}`}>
                  <span>{formatTransactionDate(transaction.date)}</span>
                  <span className="border border-stone-200 px-1.5 py-0.5 text-xs text-stone-700 dark:border-stone-600 dark:text-stone-300">
                    {transaction.category}
                  </span>
                  <span className="capitalize">{transaction.type}</span>
                </p>
                <div className="mt-2 flex gap-4 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(transaction);
                      setFormOpen(true);
                      setConfirmId(null);
                    }}
                    className="min-h-11 text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(transaction._id)}
                    className="min-h-11 text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100"
                  >
                    Delete
                  </button>
                </div>
                {confirmId === transaction._id ? (
                  <div className="mt-3 border border-stone-200 bg-stone-50 px-3 py-3 dark:border-stone-700 dark:bg-stone-800">
                    <p className="text-sm text-stone-700 dark:text-stone-200">Delete this transaction?</p>
                    <div className="mt-2 flex gap-3">
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => void confirmDelete(transaction)}
                        className="min-h-11 text-sm font-medium text-red-800 disabled:opacity-60 dark:text-red-300"
                      >
                        {deleting ? "Deleting…" : "Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="min-h-11 text-sm text-stone-600 dark:text-stone-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-stone-600 dark:text-stone-400">
            {total === 0 ? "0" : `${(page - 1) * pagination.limit + 1}–${Math.min(page * pagination.limit, total)}`} of {total}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              className={`${secondaryButton} px-3 py-2`}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((value) => value + 1)}
              className={`${secondaryButton} px-3 py-2`}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <TransactionForm
        key={formOpen ? editing?._id ?? "create" : "closed"}
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}