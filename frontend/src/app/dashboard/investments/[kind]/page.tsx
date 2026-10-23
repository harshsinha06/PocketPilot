"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ApiClientError, fieldMessage } from "@/lib/api";
import { formatChangePaise, formatPaise, paiseToInput, rupeesToPaise } from "@/lib/currency";
import { deleteHolding, getInvestments, investmentKindFromSlug, stopSip, updateHolding } from "@/lib/investments";
import { card, errorText, faint, field, heading, label as labelClass, line, muted, primaryButton, secondaryButton, textLink } from "@/lib/ui";
import type { FieldError, Holding, InvestmentKind, InvestmentOverview, Sip } from "@/lib/types";

export default function InvestmentKindPage() {
  const params = useParams<{ kind: string }>();
  const slug = Array.isArray(params.kind) ? params.kind[0] : params.kind;
  const kind = investmentKindFromSlug(slug ?? "");
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
    if (!kind) {
      setLoading(false);
      return;
    }
    void load();
  }, [kind]);

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

  if (!kind) {
    return (
      <div className="max-w-3xl">
        <Link href="/dashboard/investments" className={textLink}>
          Investments
        </Link>
        <h1 className={`mt-3 ${heading}`}>Investments</h1>
        <p className={`mt-4 ${muted}`}>That section does not exist.</p>
      </div>
    );
  }

  const holdings = overview?.holdings.filter((item) => item.kind === kind) ?? [];
  const sips = overview?.sips.filter((item) => item.kind === kind) ?? [];

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/investments" className={textLink}>
        Investments
      </Link>
      <h1 className={`mt-3 ${heading}`}>{kind}</h1>
      <p className={`mt-2 ${muted}`}>Every investment in {kind}.</p>
      {error ? (
        <p className="mt-4 text-sm text-red-800 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {loading || !overview ? (
        <p className={`mt-8 ${muted}`}>Loading your investments…</p>
      ) : holdings.length === 0 && sips.length === 0 ? (
        <p className={`mt-8 ${muted}`}>No investments in {kind} yet.</p>
      ) : (
        <div className="mt-8 space-y-8">
          {holdings.length > 0 ? (
            <ul className={card}>
              {holdings.map((item) => (
                <HoldingRow
                  key={item._id}
                  item={item}
                  kind={kind}
                  pending={pending}
                  onSave={(input) => run(item._id, () => updateHolding(item._id, input))}
                  onRemove={() => run(item._id, () => deleteHolding(item._id))}
                />
              ))}
            </ul>
          ) : null}
          {sips.length > 0 ? (
            <section>
              <h2 className="text-base font-medium">Monthly SIPs</h2>
              <ul className={`mt-3 ${card}`}>
                {sips.map((item) => (
                  <SipRow key={item._id} item={item} pending={pending !== null} onStop={() => run(item._id, () => stopSip(item._id))} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function HoldingRow({
  item,
  kind,
  pending,
  onSave,
  onRemove,
}: {
  item: Holding;
  kind: InvestmentKind;
  pending: string | null;
  onSave: (input: { name: string; kind: InvestmentKind; invested: number; current: number }) => Promise<boolean>;
  onRemove: () => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [invested, setInvested] = useState(paiseToInput(item.invested));
  const [current, setCurrent] = useState(paiseToInput(item.current));
  const [errors, setErrors] = useState<FieldError[]>([]);
  const returns = item.current - item.invested;
  const busy = pending !== null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: FieldError[] = [];
    const trimmed = name.trim();
    const investedAmount = rupeesToPaise(invested);
    const currentAmount = rupeesToPaise(current);
    if (trimmed.length < 1) nextErrors.push({ field: "name", message: "Name is required" });
    else if (trimmed.length > 80) nextErrors.push({ field: "name", message: "Name must be at most 80 characters" });
    if (investedAmount === null) nextErrors.push({ field: "invested", message: "Enter an amount greater than 0" });
    if (currentAmount === null) nextErrors.push({ field: "current", message: "Enter an amount greater than 0" });
    setErrors(nextErrors);
    if (nextErrors.length > 0 || investedAmount === null || currentAmount === null) return;
    const ok = await onSave({ name: trimmed, kind, invested: investedAmount, current: currentAmount });
    if (ok) setEditing(false);
  }

  return (
    <li className={`border-b px-4 py-4 last:border-b-0 ${line}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className={`mt-0.5 ${faint}`}>
            Invested {formatPaise(item.invested)} · Current {formatPaise(item.current)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className={`text-sm tabular-nums ${returns >= 0 ? "text-emerald-800 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300"}`}>
            {formatChangePaise(returns)}
          </p>
          <button
            type="button"
            className={secondaryButton}
            disabled={busy}
            onClick={() => {
              setName(item.name);
              setInvested(paiseToInput(item.invested));
              setCurrent(paiseToInput(item.current));
              setErrors([]);
              setEditing((open) => !open);
            }}
          >
            {editing ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            className="min-h-11 text-sm text-stone-600 hover:text-stone-900 disabled:opacity-60 dark:text-stone-400 dark:hover:text-stone-100"
            disabled={busy}
            onClick={() => void onRemove()}
          >
            Remove
          </button>
        </div>
      </div>
      {editing ? (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2" noValidate>
          <Field label="Name" value={name} error={fieldMessage(errors, "name")} onChange={setName} />
          <Field label="Invested" value={invested} error={fieldMessage(errors, "invested")} onChange={setInvested} />
          <Field label="Current value" value={current} error={fieldMessage(errors, "current")} onChange={setCurrent} />
          <div className="sm:col-span-2">
            <button type="submit" className={primaryButton} disabled={busy}>
              {pending === item._id ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}

function SipRow({ item, pending, onStop }: { item: Sip; pending: boolean; onStop: () => void }) {
  return (
    <li className={`flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 ${line}`}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className={`mt-0.5 ${faint}`}>Monthly SIP</p>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-sm tabular-nums">{formatPaise(item.amount)}</p>
        <button
          type="button"
          className="min-h-11 text-sm text-stone-600 hover:text-stone-900 disabled:opacity-60 dark:text-stone-400 dark:hover:text-stone-100"
          disabled={pending}
          onClick={onStop}
        >
          Stop
        </button>
      </div>
    </li>
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
