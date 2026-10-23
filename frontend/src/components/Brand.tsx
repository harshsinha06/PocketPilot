import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-stone-900 dark:text-stone-50">
      <span className="inline-block h-2.5 w-2.5 bg-emerald-800" aria-hidden="true" />
      <span className="text-base font-medium tracking-tight">PocketPilot</span>
    </Link>
  );
}
