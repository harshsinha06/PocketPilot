import { currentMonthInIst } from "../utils/dates";

type IncomeProfile = {
  monthlyIncome?: number;
  bonus?: number;
  recurringExpenses?: { amount: number }[];
};

export function statedIncome(user: IncomeProfile | null | undefined) {
  return (user?.monthlyIncome ?? 0) + (user?.bonus ?? 0);
}

export function statedIncomeForMonth(
  user: IncomeProfile | null | undefined,
  year?: number,
  month?: number,
  now = new Date()
) {
  const amount = statedIncome(user);
  if (year === undefined || month === undefined) return amount;
  const current = currentMonthInIst(now);
  if (year !== current.year || month !== current.month) return 0;
  return amount;
}

export function recurringTotal(user: IncomeProfile | null | undefined) {
  return (user?.recurringExpenses ?? []).reduce((sum, item) => sum + (item.amount || 0), 0);
}

export function recurringForMonth(
  user: IncomeProfile | null | undefined,
  year?: number,
  month?: number,
  now = new Date()
) {
  const amount = recurringTotal(user);
  if (year === undefined || month === undefined) return amount;
  const current = currentMonthInIst(now);
  if (year !== current.year || month !== current.month) return 0;
  return amount;
}
