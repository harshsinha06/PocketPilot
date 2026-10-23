"use client";

import { FormEvent, useEffect, useState } from "react";
import { categoriesFor, type TransactionType } from "@/lib/categories";
import { paiseToInput, rupeesToPaise } from "@/lib/currency";
import { todayInputValue, toDateInputValue } from "@/lib/dates";
import { ApiClientError, fieldMessage } from "@/lib/api";
import { createTransaction, updateTransaction } from "@/lib/transactions";
import { errorText, field, label as labelClass, primaryButton, secondaryButton } from "@/lib/ui";
import type { FieldError, Transaction } from "@/lib/types";

const inputClass = `mt-1.5 ${field}`;

export function TransactionForm({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Transaction | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? paiseToInput(initial.amount) : "");
  const [category, setCategory] = useState(initial?.category ?? "Food");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(initial ? toDateInputValue(initial.date) : todayInputValue());
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  function chooseType(next: TransactionType) {
    setType(next);
    const options = categoriesFor(next);
    if (!options.includes(category)) setCategory(options[0]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: FieldError[] = [];
    const paise = rupeesToPaise(amount);
    const trimmedDescription = description.trim();

    if (paise === null) {
      const raw = amount.trim().replace(/[₹,\s]/g, "");
      if (!raw) {
        nextErrors.push({ field: "amount", message: "Amount is required" });
      } else if (/^\d+\.\d{3,}$/.test(raw)) {
        nextErrors.push({ field: "amount", message: "Use at most 2 decimal places" });
      } else if (raw === "0" || raw === "0.0" || raw === "0.00") {
        nextErrors.push({ field: "amount", message: "Amount must be greater than 0" });
      } else {
        nextErrors.push({ field: "amount", message: "Enter a valid amount" });
      }
    }
    if (!category) {
      nextErrors.push({ field: "category", message: "Category is required" });
    }
    if (trimmedDescription.length > 140) {
      nextErrors.push({
        field: "description",
        message: "Description must be at most 140 characters",
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      nextErrors.push({ field: "date", message: "Enter a valid date" });
    }

    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.length > 0 || paise === null) return;

    setPending(true);
    try {
      const input = {
        type,
        amount: paise,
        category,
        description: trimmedDescription,
        date,
      };
      if (initial) {
        await updateTransaction(initial._id, input);
        onSaved("Transaction updated.");
      } else {
        await createTransaction(input);
        onSaved(type === "income" ? "Income added." : "Expense added.");
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.errors ?? []);
        setFormError(error.errors?.length ? null : error.message);
      } else {
        setFormError("Could not save this transaction.");
      }
    } finally {
      setPending(false);
    }
  }

  const options = categoriesFor(type);

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto px-4 py-8">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-stone-900/40 dark:bg-black/60"
        onClick={() => {
          if (!pending) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-form-title"
        className="relative z-10 w-full max-w-md border border-stone-200 bg-white px-5 py-6 dark:border-stone-700 dark:bg-stone-900 sm:px-6"
      >
        <h2 id="transaction-form-title" className="text-lg font-medium">
          {initial ? "Edit transaction" : "Add transaction"}
        </h2>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          {formError ? (
            <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200" role="alert">
              {formError}
            </p>
          ) : null}

          <div>
            <span className={labelClass}>Type</span>
            <div className="mt-1.5 grid grid-cols-2 border border-stone-300 dark:border-stone-600">
              {(["expense", "income"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => chooseType(option)}
                  className={`px-3 py-2 text-sm capitalize ${
                    type === option
                      ? "bg-emerald-800 text-white dark:bg-emerald-700"
                      : "bg-white text-stone-700 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="amount" className={labelClass}>
              Amount
            </label>
            <div className="mt-1.5 flex border border-stone-300 focus-within:border-emerald-800 dark:border-stone-600 dark:focus-within:border-emerald-400">
              <span className="flex items-center px-3 text-sm text-stone-500 dark:text-stone-400">₹</span>
              <input
                id="amount"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                aria-invalid={Boolean(fieldMessage(errors, "amount"))}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="450"
                className="w-full bg-transparent px-3 py-2 text-sm text-stone-900 outline-none dark:text-stone-100"
              />
            </div>
            {fieldMessage(errors, "amount") ? (
              <p className={`mt-1 ${errorText}`}>{fieldMessage(errors, "amount")}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="category" className={labelClass}>
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={inputClass}
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {fieldMessage(errors, "category") ? (
              <p className={`mt-1 ${errorText}`}>{fieldMessage(errors, "category")}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>
              Description
            </label>
            <input
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Dinner"
              className={inputClass}
            />
            {fieldMessage(errors, "description") ? (
              <p className={`mt-1 ${errorText}`}>{fieldMessage(errors, "description")}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="date" className={labelClass}>
              Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
            />
            {fieldMessage(errors, "date") ? (
              <p className={`mt-1 ${errorText}`}>{fieldMessage(errors, "date")}</p>
            ) : null}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={pending}
              className={primaryButton}
            >
              {pending
                ? "Saving…"
                : initial
                  ? "Save changes"
                  : "Add transaction"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className={secondaryButton}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}