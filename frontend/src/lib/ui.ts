export const card = "border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900";
export const muted = "text-sm leading-6 text-stone-600 dark:text-stone-400";
export const faint = "text-sm text-stone-500 dark:text-stone-400";
export const heading = "text-2xl font-medium tracking-tight text-stone-900 dark:text-stone-50";
export const sectionTitle = "text-base font-medium text-stone-900 dark:text-stone-100";
export const primaryButton =
  "rounded-full bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-700 dark:hover:bg-emerald-600";
export const secondaryButton =
  "rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800";
export const textLink = "text-sm text-emerald-800 hover:underline dark:text-emerald-300";
export const field =
  "w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100 dark:focus:border-emerald-400";
export const label = "block text-sm font-medium text-stone-800 dark:text-stone-200";
export const errorText = "text-sm text-red-800 dark:text-red-300";
export const errorBox =
  "border border-red-200 bg-white px-5 py-6 text-sm text-red-900 dark:border-red-900 dark:bg-stone-900 dark:text-red-200";
export const notice = "text-sm text-emerald-800 dark:text-emerald-300";
export const line = "border-stone-200 dark:border-stone-700";
export const track = "bg-stone-100 dark:bg-stone-800";

export function budgetBarClass(status: "under" | "approaching" | "over" | null) {
  if (status === "over") return "h-2 bg-rose-800 dark:bg-rose-400";
  if (status === "approaching") return "h-2 bg-amber-700 dark:bg-amber-400";
  return "h-2 bg-emerald-800 dark:bg-emerald-400";
}
