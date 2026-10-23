"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ApiClientError, fieldMessage } from "@/lib/api";
import { formatChangePaise, formatPaise, rupeesToPaise } from "@/lib/currency";
import {
  createHolding,
  createSip,
  getInvestments,
  INVESTMENT_KINDS,
  investmentKindSlug,
} from "@/lib/investments";
import { card, errorText, faint, field, heading, label as labelClass, line, muted, primaryButton, secondaryButton, sectionTitle } from "@/lib/ui";
import type { FieldError, Holding, InvestmentKind, InvestmentOverview } from "@/lib/types";

type AddMode = "investment" | "sip";

type Draft = {
  name: string;
  invested: string;
  current: string;
  amount: string;
};

const emptyDraft = (): Draft => ({ name: "", invested: "", current: "", amount: "" });

const ADD_MODES: { id: AddMode; label: string }[] = [
  { id: "investment", label: "Investment" },
  { id: "sip", label: "Monthly SIP" },
];

function addedThisMonth(createdAt: string, year: number, month: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date(createdAt));
  const createdYear = Number(parts.find((part) => part.type === "year")?.value);
  const createdMonth = Number(parts.find((part) => part.type === "month")?.value);
  return createdYear === year && createdMonth === month;
}

function readName(name: string, errors: FieldError[]) {
  const trimmed = name.trim();
  if (trimmed.length < 1) errors.push({ field: "name", message: "Name is required" });
  else if (trimmed.length > 80) errors.push({ field: "name", message: "Name must be at most 80 characters" });
  return trimmed;
}

function readAmount(value: string, fieldName: string, errors: FieldError[]) {
  const amount = rupeesToPaise(value);
  if (amount === null) errors.push({ field: fieldName, message: "Enter an amount greater than 0" });
  return amount;
}

export default function InvestmentsPage() {
  const [overview, setOverview] = useState<InvestmentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setOverview(await getInvestments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load investments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function run(key: string, action: () => Promise<void>) {
    setPending(key);
    setError(null);
    try {
      await action();
      setOverview(await getInvestments());
      return true;
    } catch (err) {
      if (err instanceof ApiClientError) setError(err.message);
      else setError("Could not update investments. Please try again.");
      return false;
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className={heading}>Investments</h1>
      <p className={`mt-2 ${muted}`}>Current value, what you have put in, and what went in this month.</p>
      {error ? (
        <p className="mt-4 text-sm text-red-800 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {loading || !overview ? (
        <p className={`mt-8 ${muted}`}>Loading your investments…</p>
      ) : (
        <div className="mt-8 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Summary label="Total investments" amount={overview.holdingsTotal} />
            <Summary label={`Invested in ${overview.monthLabel}`} amount={overview.contributedThisMonth} />
            <Summary label="Monthly SIPs" amount={overview.sipMonthlyTotal} />
          </div>

          {INVESTMENT_KINDS.map((kind) => (
            <CategorySection
              key={kind}
              kind={kind}
              year={overview.year}
              month={overview.month}
              holdings={overview.holdings.filter((item) => item.kind === kind)}
              pending={pending}
              onSaveHolding={(input) => run(`holding:${kind}`, () => createHolding(input))}
              onAddSip={(input) => run(`sip:${kind}`, () => createSip(input))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Summary({ label, amount }: { label: string; amount: number }) {
  return (
    <div className={`${card} px-4 py-4`}>
      <p className="text-lg font-medium tabular-nums">{formatPaise(amount)}</p>
      <p className="mt-1 text-sm text-stone-500">{label}</p>
    </div>
  );
}

function CategorySection({
  kind,
  year,
  month,
  holdings,
  pending,
  onSaveHolding,
  onAddSip,
}: {
  kind: InvestmentKind;
  year: number;
  month: number;
  holdings: Holding[];
  pending: string | null;
  onSaveHolding: (input: { name: string; kind: InvestmentKind; invested: number; current: number }) => Promise<boolean>;
  onAddSip: (input: { name: string; kind: InvestmentKind; amount: number }) => Promise<boolean>;
}) {
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<AddMode>("investment");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<FieldError[]>([]);

  const current = holdings.reduce((sum, item) => sum + item.current, 0);
  const invested = holdings.reduce((sum, item) => sum + item.invested, 0);
  const returns = current - invested;
  const monthTotal = holdings.reduce((sum, item) => {
    if (!addedThisMonth(item.createdAt, year, month)) return sum;
    return sum + item.invested;
  }, 0);
  const busy = pending !== null;
  const saving = pending === `holding:${kind}` || pending === `sip:${kind}`;

  function openAdd() {
    setAdding(true);
    setMode("investment");
    setDraft(emptyDraft());
    setErrors([]);
  }

  function closeAdd() {
    setAdding(false);
    setDraft(emptyDraft());
    setErrors([]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: FieldError[] = [];
    const name = readName(draft.name, nextErrors);

    if (mode === "investment") {
      const investedAmount = readAmount(draft.invested, "invested", nextErrors);
      const currentAmount = readAmount(draft.current, "current", nextErrors);
      setErrors(nextErrors);
      if (nextErrors.length > 0 || investedAmount === null || currentAmount === null) return;
      const ok = await onSaveHolding({ name, kind, invested: investedAmount, current: currentAmount });
      if (ok) closeAdd();
      return;
    }

    const amount = readAmount(draft.amount, "amount", nextErrors);
    setErrors(nextErrors);
    if (nextErrors.length > 0 || amount === null) return;
    const ok = await onAddSip({ name, kind, amount });
    if (ok) closeAdd();
  }

  return (
    <section className={`${card} px-4 py-5 sm:px-5`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className={sectionTitle}>{kind}</h2>
        <Link
          href={`/dashboard/investments/${investmentKindSlug(kind)}`}
          aria-label={`View ${kind} investments`}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <ChevronRight />
        </Link>
      </div>
      <dl className="mt-4 grid grid-cols-3 items-end gap-3">
        <Metric label="Current" value={formatPaise(current)} />
        <Metric label="Invested" value={formatPaise(invested)} />
        <Metric label="Returns" value={formatChangePaise(returns)} tone={returns > 0 ? "up" : returns < 0 ? "down" : "flat"} />
      </dl>
      <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${line}`}>
        <div>
          <p className={faint}>Invested this month</p>
          <p className="mt-1 text-sm font-medium tabular-nums">{formatPaise(monthTotal)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={primaryButton}
            aria-expanded={adding}
            onClick={() => (adding ? closeAdd() : openAdd())}
          >
            Add +
          </button>
        </div>
      </div>

      {adding ? (
        <form onSubmit={submit} className="mt-4" noValidate>
          <div className="flex flex-wrap gap-2">
            {ADD_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={mode === item.id ? primaryButton : secondaryButton}
                onClick={() => {
                  setMode(item.id);
                  setErrors([]);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field
              label="Name"
              value={draft.name}
              error={fieldMessage(errors, "name")}
              onChange={(name) => setDraft({ ...draft, name })}
            />
            {mode === "investment" ? (
              <>
                <Field
                  label="Invested"
                  value={draft.invested}
                  error={fieldMessage(errors, "invested")}
                  onChange={(invested) => setDraft({ ...draft, invested })}
                />
                <Field
                  label="Current value"
                  value={draft.current}
                  error={fieldMessage(errors, "current")}
                  onChange={(currentValue) => setDraft({ ...draft, current: currentValue })}
                />
              </>
            ) : (
              <Field
                label="Monthly amount"
                value={draft.amount}
                error={fieldMessage(errors, "amount")}
                onChange={(amount) => setDraft({ ...draft, amount })}
              />
            )}
          </div>
          <button type="submit" className={`mt-4 ${primaryButton}`} disabled={busy}>
            {saving ? "Saving…" : "Add"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

function Metric({ label, value, tone = "flat" }: { label: string; value: string; tone?: "up" | "down" | "flat" }) {
  const color =
    tone === "up"
      ? "text-emerald-800 dark:text-emerald-300"
      : tone === "down"
        ? "text-rose-800 dark:text-rose-300"
        : "text-stone-900 dark:text-stone-100";
  return (
    <div>
      <dt className={faint}>{label}</dt>
      <dd className={`mt-1 text-sm font-medium tabular-nums ${color}`}>{value}</dd>
    </div>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
      <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Field({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        value={value}
        inputMode={label === "Name" ? "text" : "decimal"}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1.5 ${field}`}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className={`mt-1 ${errorText}`}>{error}</p> : null}
    </div>
  );
}
