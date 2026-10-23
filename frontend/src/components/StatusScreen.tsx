import type { ReactNode } from "react";

export function StatusScreen({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md border border-stone-200 bg-white px-6 py-8 dark:border-stone-700 dark:bg-stone-900">
        <h1 className="text-lg font-medium">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">{body}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </main>
  );
}
