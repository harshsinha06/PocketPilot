export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Education",
  "Bills",
  "Health",
  "Travel",
  "Subscriptions",
  "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Salary",
  "Internship",
  "Freelance",
  "Allowance",
  "Scholarship",
  "Other",
] as const;

export type TransactionType = "income" | "expense";

const expenseSet = new Set<string>(EXPENSE_CATEGORIES);
const incomeSet = new Set<string>(INCOME_CATEGORIES);

export function categoriesFor(type: TransactionType): readonly string[] {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function isValidCategory(type: TransactionType, category: string): boolean {
  return type === "income" ? incomeSet.has(category) : expenseSet.has(category);
}
