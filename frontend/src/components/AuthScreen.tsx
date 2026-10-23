import type { ReactNode } from "react";
import { Brand } from "./Brand";

export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="min-h-screen px-5 py-12">
      <div className="mx-auto w-full max-w-md">
        <Brand />
        <div className="mt-8 border border-stone-200 bg-white px-5 py-7 dark:border-stone-700 dark:bg-stone-900 sm:px-6">
          <h1 className="text-xl font-medium tracking-tight">{title}</h1>
          <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-400">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <div className="mt-4 text-sm text-stone-600 dark:text-stone-400">{footer}</div>
      </div>
    </main>
  );
}

export function TextField({
  id,
  label,
  type,
  value,
  autoComplete,
  error,
  onChange,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  autoComplete: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-stone-800 dark:text-stone-200">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100 dark:focus:border-emerald-400"
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-800 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200" role="alert">
      {message}
    </p>
  );
}

export function SubmitButton({
  pending,
  idleLabel,
  pendingLabel,
}: {
  pending: boolean;
  idleLabel: string;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-700 dark:hover:bg-emerald-600"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
