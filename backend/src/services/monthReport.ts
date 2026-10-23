import { Types } from "mongoose";
import { Budget, IBudget } from "../models/Budget";
import { monthLabel, monthShortLabel, monthTiming, previousMonth } from "../utils/dates";
import { formatPaise } from "../utils/money";
import {
  averageDailySpending,
  compareMonths,
  projectMonthEnd,
  safeToSpend,
  spendingInsights,
  spendingStatus,
  statusMessage,
} from "./budgetMath";
import { monthHistory, monthTotals, type MonthPoint } from "./monthTotals";
import { recurringForMonth, statedIncomeForMonth } from "./statedIncome";

function addStatedIncome(history: MonthPoint[], year: number, month: number, stated: number): MonthPoint[] {
  if (stated <= 0) return history;
  const existing = history.find((point) => point.year === year && point.month === month);
  if (existing) {
    return history.map((point) =>
      point.year === year && point.month === month ? { ...point, income: point.income + stated } : point
    );
  }
  return [
    ...history,
    { year, month, label: monthShortLabel(year, month), income: stated, expenses: 0 },
  ].sort((a, b) => a.year - b.year || a.month - b.month);
}

function presentBudget(budget: IBudget) {
  return {
    _id: budget._id,
    month: budget.month,
    year: budget.year,
    amount: budget.amount,
    categories: budget.categories.map((item) => ({
      category: item.category,
      amount: item.amount,
    })),
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  };
}

export async function buildMonthReport(
  userId: Types.ObjectId,
  year: number,
  month: number,
  now = new Date(),
  profile?: { monthlyIncome?: number; bonus?: number; recurringExpenses?: { amount: number }[] }
) {
  const previous = previousMonth(year, month);
  const [totals, previousTotals, budget, history] = await Promise.all([
    monthTotals(userId, year, month),
    monthTotals(userId, previous.year, previous.month),
    Budget.findOne({ userId, year, month }),
    monthHistory(userId, year, month),
  ]);
  const stated = statedIncomeForMonth(profile, year, month, now);
  const bills = recurringForMonth(profile, year, month, now);
  const income = totals.income + stated;
  const committed = totals.expenses + bills;
  const historyWithIncome = addStatedIncome(history, year, month, stated);

  const timing = monthTiming(year, month, now);
  const label = monthLabel(year, month);
  const previousLabel = monthLabel(previous.year, previous.month);
  const hasPrevious = previousTotals.income > 0 || previousTotals.expenses > 0;
  const progress = budget ? spendingStatus(budget.amount, committed) : null;
  const projected =
    timing.relation === "current"
      ? projectMonthEnd(totals.expenses, timing.daysElapsed, timing.daysInMonth)
      : null;

  const categoryBudgets = (budget?.categories ?? []).map((item) => {
    const spent = totals.expenseByCategory.find((row) => row.category === item.category)?.amount ?? 0;
    return {
      category: item.category,
      budget: item.amount,
      spent,
      remaining: item.amount - spent,
    };
  });

  const categoryBudgetTotal = categoryBudgets.reduce((sum, item) => sum + item.budget, 0);
  const comparison = hasPrevious ? compareMonths({ ...totals, income }, previousTotals) : null;
  const insights = spendingInsights({
    monthName: label,
    relation: timing.relation,
    expenses: totals.expenses,
    daysElapsed: timing.daysElapsed,
    expenseByCategory: totals.expenseByCategory,
    previousExpenseByCategory: hasPrevious ? previousTotals.expenseByCategory : null,
    hasBudget: Boolean(budget),
    percent: progress?.percent ?? null,
    projected,
  });

  let projection: {
    kind: "estimate" | "complete" | "empty" | "future";
    spent?: number;
    averageDaily?: number;
    projected?: number;
    budgetAmount: number | null;
    note: string;
  };

  if (timing.relation === "future") {
    projection = {
      kind: "future",
      budgetAmount: budget?.amount ?? null,
      note: "This month has not started, so there is no estimate yet.",
    };
  } else if (timing.relation === "past") {
    projection = {
      kind: "complete",
      spent: totals.expenses,
      budgetAmount: budget?.amount ?? null,
      note:
        totals.expenses > 0
          ? `${label} is over. You spent ${formatPaise(totals.expenses)}.`
          : `${label} is over. You recorded no expenses.`,
    };
  } else if (projected === null) {
    projection = {
      kind: "empty",
      budgetAmount: budget?.amount ?? null,
      note: "No spending yet this month, so there is no month-end estimate.",
    };
  } else {
    projection = {
      kind: "estimate",
      spent: totals.expenses,
      averageDaily: Math.round(totals.expenses / timing.daysElapsed),
      projected,
      budgetAmount: budget?.amount ?? null,
      note: "This is an estimate based on your spending so far, not a guaranteed outcome.",
    };
  }

  return {
    month,
    year,
    monthLabel: label,
    relation: timing.relation,
    daysInMonth: timing.daysInMonth,
    daysElapsed: timing.daysElapsed,
    daysLeft: timing.remainingDays,
    income,
    expenses: totals.expenses,
    recurringExpenses: bills,
    expenseByCategory: totals.expenseByCategory,
    averageDaily: averageDailySpending(totals.expenses, timing.daysElapsed),
    history: historyWithIncome,
    budget: budget ? presentBudget(budget) : null,
    remaining: progress?.remaining ?? null,
    percent: progress?.percent ?? null,
    status: progress?.status ?? null,
    statusMessage: progress ? statusMessage(progress.status, progress.remaining, label) : null,
    safeToSpend: safeToSpend({
      hasBudget: Boolean(budget),
      remaining: progress?.remaining ?? null,
      remainingDays: timing.remainingDays,
      relation: timing.relation,
      monthName: label,
    }),
    categoryBudgets,
    categoriesExceedBudget: budget !== null && categoryBudgetTotal > budget.amount,
    insights,
    emptyInsightsMessage:
      insights.length === 0
        ? "Not enough data yet. Keep adding transactions to see spending trends."
        : null,
    comparison: comparison
      ? {
          month: previous.month,
          year: previous.year,
          monthLabel: previousLabel,
          ...comparison,
        }
      : null,
    projection,
  };
}
