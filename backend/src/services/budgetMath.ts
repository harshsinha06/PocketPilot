import { MonthRelation } from "../utils/dates";
import { formatPaise } from "../utils/money";
import { CategoryTotal } from "./monthTotals";

export type BudgetStatus = "under" | "approaching" | "over";

const APPROACHING_PERCENT = 75;

export function spendingStatus(budget: number, spent: number): {
  remaining: number;
  percent: number;
  status: BudgetStatus;
} {
  const remaining = budget - spent;
  const percent = Math.round((spent * 100) / budget);
  let status: BudgetStatus = "under";
  if (spent > budget) status = "over";
  else if (percent >= APPROACHING_PERCENT) status = "approaching";
  return { remaining, percent, status };
}

export function statusMessage(status: BudgetStatus, remaining: number, monthName: string): string {
  if (status === "over") {
    return `You've exceeded your monthly budget by ${formatPaise(-remaining)}.`;
  }
  if (remaining === 0) {
    return `You've reached your monthly budget. ${formatPaise(0)} remaining.`;
  }
  if (status === "approaching") {
    return `You're getting close to your monthly limit. ${formatPaise(remaining)} remaining.`;
  }
  return `You're within your budget. ${formatPaise(remaining)} left for ${monthName}.`;
}

export type SafeToSpend = {
  applicable: boolean;
  amount: number | null;
  perDay: number | null;
  daysLeft: number;
  message: string | null;
};

export function safeToSpend(input: {
  hasBudget: boolean;
  remaining: number | null;
  remainingDays: number;
  relation: MonthRelation;
  monthName: string;
}): SafeToSpend {
  if (!input.hasBudget || input.remaining === null) {
    return {
      applicable: false,
      amount: null,
      perDay: null,
      daysLeft: input.remainingDays,
      message: "Set a monthly budget to see how much you can spend each day.",
    };
  }

  if (input.relation === "past") {
    const message =
      input.remaining < 0
        ? `${input.monthName} has ended. You went over by ${formatPaise(-input.remaining)}.`
        : `${input.monthName} has ended. You had ${formatPaise(input.remaining)} left.`;
    return {
      applicable: false,
      amount: Math.max(0, input.remaining),
      perDay: null,
      daysLeft: 0,
      message,
    };
  }

  if (input.remainingDays <= 0) {
    return {
      applicable: false,
      amount: Math.max(0, input.remaining),
      perDay: null,
      daysLeft: 0,
      message: `${input.monthName} has ended.`,
    };
  }

  if (input.remaining < 0) {
    return {
      applicable: true,
      amount: 0,
      perDay: null,
      daysLeft: input.remainingDays,
      message: `₹0.00 safe to spend. You're ${formatPaise(-input.remaining)} over this month's budget.`,
    };
  }

  if (input.remaining === 0) {
    return {
      applicable: true,
      amount: 0,
      perDay: null,
      daysLeft: input.remainingDays,
      message: "₹0.00 safe to spend. Nothing left in this month's budget.",
    };
  }

  return {
    applicable: true,
    amount: input.remaining,
    perDay: Math.floor(input.remaining / input.remainingDays),
    daysLeft: input.remainingDays,
    message: null,
  };
}

export function averageDailySpending(spent: number, daysElapsed: number): number | null {
  if (spent <= 0 || daysElapsed <= 0) return null;
  return Math.round(spent / daysElapsed);
}

export function projectMonthEnd(spent: number, daysElapsed: number, days: number): number | null {
  if (spent <= 0 || daysElapsed <= 0 || days <= 0) return null;
  return Math.round((spent * days) / daysElapsed);
}

export type ComparisonSide = { current: number; previous: number; change: number };

export type CategoryComparison = {
  category: string;
  current: number;
  previous: number;
  change: number;
  percent: number | null;
};

export function compareMonths(
  current: { income: number; expenses: number; expenseByCategory: CategoryTotal[] },
  previous: { income: number; expenses: number; expenseByCategory: CategoryTotal[] }
): {
  expenses: ComparisonSide;
  income: ComparisonSide;
  categories: CategoryComparison[];
} | null {
  if (previous.income === 0 && previous.expenses === 0) return null;

  const previousByCategory = new Map(previous.expenseByCategory.map((item) => [item.category, item.amount]));
  const currentByCategory = new Map(current.expenseByCategory.map((item) => [item.category, item.amount]));
  const names = new Set<string>([...currentByCategory.keys(), ...previousByCategory.keys()]);

  const categories = [...names]
    .map((category) => {
      const currentAmount = currentByCategory.get(category) ?? 0;
      const previousAmount = previousByCategory.get(category) ?? 0;
      return {
        category,
        current: currentAmount,
        previous: previousAmount,
        change: currentAmount - previousAmount,
        percent:
          previousAmount > 0
            ? Math.round(((currentAmount - previousAmount) * 100) / previousAmount)
            : null,
      };
    })
    .filter((item) => item.current > 0 || item.previous > 0)
    .sort((a, b) => b.current - a.current || a.category.localeCompare(b.category));

  return {
    expenses: {
      current: current.expenses,
      previous: previous.expenses,
      change: current.expenses - previous.expenses,
    },
    income: {
      current: current.income,
      previous: previous.income,
      change: current.income - previous.income,
    },
    categories,
  };
}

export function spendingInsights(input: {
  monthName: string;
  relation: MonthRelation;
  expenses: number;
  daysElapsed: number;
  expenseByCategory: CategoryTotal[];
  previousExpenseByCategory: CategoryTotal[] | null;
  hasBudget: boolean;
  percent: number | null;
  projected: number | null;
}): string[] {
  const lines: string[] = [];
  const ranked = input.expenseByCategory.filter((item) => item.amount > 0);

  if (ranked.length > 0) {
    const top = ranked[0].amount;
    const leaders = ranked.filter((item) => item.amount === top).map((item) => item.category);
    if (leaders.length === 1) {
      lines.push(`${leaders[0]} is your highest spending category this month.`);
    } else if (leaders.length === 2) {
      lines.push(`${leaders[0]} and ${leaders[1]} are your highest spending categories this month.`);
    } else {
      const listed = [...leaders.slice(0, -1), `and ${leaders[leaders.length - 1]}`].join(", ");
      lines.push(`${listed} are your highest spending categories this month.`);
    }
  }

  if (input.previousExpenseByCategory) {
    const previousByCategory = new Map(
      input.previousExpenseByCategory.map((item) => [item.category, item.amount])
    );
    const currentByCategory = new Map(input.expenseByCategory.map((item) => [item.category, item.amount]));
    const names = new Set<string>([...previousByCategory.keys(), ...currentByCategory.keys()]);
    let best: { category: string; delta: number } | null = null;
    for (const category of names) {
      const previousAmount = previousByCategory.get(category) ?? 0;
      if (previousAmount <= 0) continue;
      const delta = (currentByCategory.get(category) ?? 0) - previousAmount;
      if (delta === 0) continue;
      if (!best || Math.abs(delta) > Math.abs(best.delta)) best = { category, delta };
    }
    if (best) {
      const direction = best.delta > 0 ? "more" : "less";
      lines.push(
        `You spent ${formatPaise(Math.abs(best.delta))} ${direction} on ${best.category} than last month.`
      );
    }
  }

  const daily = averageDailySpending(input.expenses, input.daysElapsed);
  if (daily !== null && input.relation !== "future") {
    const when = input.relation === "past" ? `in ${input.monthName} was` : "this month is";
    lines.push(`Your average daily spending ${when} ${formatPaise(daily)}.`);
  }

  if (input.hasBudget && input.percent !== null) {
    lines.push(`You have spent ${input.percent}% of your monthly budget.`);
  }

  if (input.relation === "current" && input.projected !== null) {
    lines.push(
      `Based on your spending so far, ${input.monthName} may end around ${formatPaise(input.projected)}. This is an estimate.`
    );
  }

  return lines;
}
