"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiClientError, fieldMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPaise, paiseToInput, rupeesToPaise } from "@/lib/currency";
import { errorText, field, label as labelClass, primaryButton, secondaryButton } from "@/lib/ui";
import type { FieldError } from "@/lib/types";

function formatJoined(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

function readAmount(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed === "0" || trimmed === "0.0" || trimmed === "0.00") return 0;
  return rupeesToPaise(trimmed);
}

export default function ProfilePage() {
  const { user, updateIncome, saveRecurring, removeRecurring } = useAuth();
  const [income, setIncome] = useState("");
  const [bonus, setBonus] = useState("");
  const [editingIncome, setEditingIncome] = useState(false);
  const [addingBonus, setAddingBonus] = useState(false);
  const [billId, setBillId] = useState<string | null>(null);
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<"income" | "bonus" | "bill" | null>(null);

  useEffect(() => {
    if (!user) return;
    setIncome(paiseToInput(user.monthlyIncome ?? 0));
    setBonus(user.bonus ? paiseToInput(user.bonus) : "");
  }, [user]);

  if (!user) return null;

  const rows = [
    { label: "Name", value: user.name },
    { label: "Email", value: user.email },
    { label: "Joined", value: formatJoined(user.createdAt) },
  ];

  async function saveIncome(event: FormEvent) {
    event.preventDefault();
    const monthlyIncome = readAmount(income);
    const nextErrors: FieldError[] = [];
    if (monthlyIncome === null) nextErrors.push({ field: "monthlyIncome", message: "Enter a valid income" });
    setErrors(nextErrors);
    setFormError(null);
    if (monthlyIncome === null) return;

    setPending("income");
    try {
      await updateIncome(monthlyIncome, user?.bonus ?? 0);
      setEditingIncome(false);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.errors ?? []);
        setFormError(error.errors?.length ? null : error.message);
      } else {
        setFormError("Could not save income. Please try again.");
      }
    } finally {
      setPending(null);
    }
  }

  async function saveBonus(event: FormEvent) {
    event.preventDefault();
    const bonusAmount = readAmount(bonus);
    const nextErrors: FieldError[] = [];
    if (bonusAmount === null) nextErrors.push({ field: "bonus", message: "Enter a valid bonus" });
    setErrors(nextErrors);
    setFormError(null);
    if (bonusAmount === null) return;

    setPending("bonus");
    try {
      await updateIncome(user?.monthlyIncome ?? 0, bonusAmount);
      setAddingBonus(false);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.errors ?? []);
        setFormError(error.errors?.length ? null : error.message);
      } else {
        setFormError("Could not save bonus. Please try again.");
      }
    } finally {
      setPending(null);
    }
  }

  async function saveBill(event: FormEvent) {
    event.preventDefault();
    const nextErrors: FieldError[] = [];
    const name = billName.trim();
    const amount = rupeesToPaise(billAmount);
    if (name.length < 1) nextErrors.push({ field: "name", message: "Name is required" });
    else if (name.length > 40) nextErrors.push({ field: "name", message: "Name must be at most 40 characters" });
    if (amount === null) nextErrors.push({ field: "amount", message: "Enter an amount greater than 0" });
    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.length > 0 || amount === null) return;

    setPending("bill");
    try {
      await saveRecurring({ id: billId && billId !== "new" ? billId : undefined, name, amount });
      setBillId(null);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.errors ?? []);
        setFormError(error.errors?.length ? null : error.message);
      } else {
        setFormError("Could not save that bill. Please try again.");
      }
    } finally {
      setPending(null);
    }
  }

  const incomeError = fieldMessage(errors, "monthlyIncome");
  const bonusError = fieldMessage(errors, "bonus");
  const billNameError = fieldMessage(errors, "name");
  const billAmountError = fieldMessage(errors, "amount");
  const bills = user.recurringExpenses ?? [];

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-medium tracking-tight text-stone-900 dark:text-stone-50">Profile</h1>
      <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
        The details on your PocketPilot account.
      </p>
      <dl className="mt-8 border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid gap-1 border-b border-stone-200 px-5 py-4 last:border-b-0 dark:border-stone-700 sm:grid-cols-[140px_1fr]"
          >
            <dt className="text-sm text-stone-500">{row.label}</dt>
            <dd className="text-sm text-stone-900 dark:text-stone-100">{row.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8 border border-stone-200 bg-white px-5 py-5 dark:border-stone-700 dark:bg-stone-900">
        <h2 className="text-base font-medium text-stone-900 dark:text-stone-100">Income</h2>
        {formError ? (
          <p className="mt-3 text-sm text-red-800 dark:text-red-300" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className={labelClass}>Monthly Income / PocketMoney</p>
            {editingIncome ? (
              <form onSubmit={saveIncome} className="mt-1.5 flex items-center gap-3" noValidate>
                <input
                  id="monthlyIncome"
                  name="monthlyIncome"
                  inputMode="decimal"
                  value={income}
                  onChange={(event) => setIncome(event.target.value)}
                  className={`${field} w-40`}
                  aria-invalid={Boolean(incomeError)}
                />
                <button type="submit" className={primaryButton} disabled={pending !== null}>
                  {pending === "income" ? "Saving…" : "Save"}
                </button>
              </form>
            ) : (
              <p className="mt-1 w-40 text-sm tabular-nums text-stone-900 dark:text-stone-100">
                {formatPaise(user.monthlyIncome ?? 0)}
              </p>
            )}
            {incomeError ? <p className={`mt-1 ${errorText}`}>{incomeError}</p> : null}
          </div>
          {editingIncome ? null : (
            <button
              type="button"
              className={secondaryButton}
              onClick={() => {
                setIncome(paiseToInput(user.monthlyIncome ?? 0));
                setErrors([]);
                setFormError(null);
                setEditingIncome(true);
              }}
            >
              Edit
            </button>
          )}
        </div>
        <div className="mt-5 border-t border-stone-200 pt-5 dark:border-stone-700">
          <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
            Mention any bonus or extra income you received this month.
          </p>
          {addingBonus ? (
            <form onSubmit={saveBonus} className="mt-4 flex flex-wrap items-end gap-3" noValidate>
              <div>
                <label htmlFor="bonus" className={labelClass}>
                  Bonus
                </label>
                <input
                  id="bonus"
                  name="bonus"
                  inputMode="decimal"
                  value={bonus}
                  onChange={(event) => setBonus(event.target.value)}
                  className={`mt-1.5 ${field} w-40`}
                  aria-invalid={Boolean(bonusError)}
                />
                {bonusError ? <p className={`mt-1 ${errorText}`}>{bonusError}</p> : null}
              </div>
              <button type="submit" className={primaryButton} disabled={pending !== null}>
                {pending === "bonus" ? "Saving…" : "Save"}
              </button>
            </form>
          ) : (
            <div className="mt-4 flex items-center justify-between gap-4">
              {(user.bonus ?? 0) > 0 ? (
                <p className="text-sm text-stone-900 dark:text-stone-100">
                  Bonus <span className="tabular-nums">{formatPaise(user.bonus)}</span>
                </p>
              ) : (
                <span />
              )}
              <button
                type="button"
                className={secondaryButton}
                onClick={() => {
                  setBonus((user.bonus ?? 0) > 0 ? paiseToInput(user.bonus) : "");
                  setErrors([]);
                  setFormError(null);
                  setAddingBonus(true);
                }}
              >
                Add Bonus
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 border border-stone-200 bg-white px-5 py-5 dark:border-stone-700 dark:bg-stone-900">
        <h2 className="text-base font-medium text-stone-900 dark:text-stone-100">Recurring expenses</h2>
        <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-400">
          Bills that stay the same each month, like rent, a cook, or house help.
        </p>
        <ul className="mt-5 divide-y divide-stone-200 dark:divide-stone-700">
          {bills.map((item) =>
            billId === item._id ? (
              <li key={item._id} className="py-4 first:pt-0">
                <BillForm
                  name={billName}
                  amount={billAmount}
                  nameError={billNameError}
                  amountError={billAmountError}
                  pending={pending === "bill"}
                  onName={setBillName}
                  onAmount={setBillAmount}
                  onSubmit={saveBill}
                  onRemove={() => {
                    setPending("bill");
                    void removeRecurring(item._id)
                      .then(() => setBillId(null))
                      .catch((error: unknown) => {
                        setFormError(error instanceof Error ? error.message : "Could not remove that bill.");
                      })
                      .finally(() => setPending(null));
                  }}
                />
              </li>
            ) : (
              <li key={item._id} className="flex items-center justify-between gap-4 py-4 first:pt-0">
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{item.name}</p>
                  <p className="mt-1 w-40 text-sm tabular-nums">{formatPaise(item.amount)}</p>
                </div>
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => {
                    setBillId(item._id);
                    setBillName(item.name);
                    setBillAmount(paiseToInput(item.amount));
                    setErrors([]);
                    setFormError(null);
                  }}
                >
                  Edit
                </button>
              </li>
            )
          )}
        </ul>
        {billId === "new" ? (
          <BillForm
            name={billName}
            amount={billAmount}
            nameError={billNameError}
            amountError={billAmountError}
            pending={pending === "bill"}
            onName={setBillName}
            onAmount={setBillAmount}
            onSubmit={saveBill}
          />
        ) : (
          <button
            type="button"
            className={`${secondaryButton} mt-4`}
            onClick={() => {
              setBillId("new");
              setBillName("");
              setBillAmount("");
              setErrors([]);
              setFormError(null);
            }}
          >
            Add expense
          </button>
        )}
      </section>
    </div>
  );
}

function BillForm({
  name,
  amount,
  nameError,
  amountError,
  pending,
  onName,
  onAmount,
  onSubmit,
  onRemove,
}: {
  name: string;
  amount: string;
  nameError?: string;
  amountError?: string;
  pending: boolean;
  onName: (value: string) => void;
  onAmount: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onRemove?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3" noValidate>
      <div>
        <label className={labelClass}>Name</label>
        <input value={name} onChange={(event) => onName(event.target.value)} className={`mt-1.5 ${field} w-40`} aria-invalid={Boolean(nameError)} />
        {nameError ? <p className={`mt-1 ${errorText}`}>{nameError}</p> : null}
      </div>
      <div>
        <label className={labelClass}>Amount</label>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(event) => onAmount(event.target.value)}
          className={`mt-1.5 ${field} w-40`}
          aria-invalid={Boolean(amountError)}
        />
        {amountError ? <p className={`mt-1 ${errorText}`}>{amountError}</p> : null}
      </div>
      <button type="submit" className={primaryButton} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      {onRemove ? (
        <button type="button" className="min-h-11 text-sm text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100" disabled={pending} onClick={onRemove}>
          Remove
        </button>
      ) : null}
    </form>
  );
}
