import { Types } from "mongoose";
import { Transaction } from "../models/Transaction";
import { istMonthRange, monthShortLabel } from "../utils/dates";

export type CategoryTotal = { category: string; amount: number };

type MonthlyRow = {
  _id: { type: "income" | "expense"; category: string };
  total: number;
};

export type MonthTotals = {
  income: number;
  expenses: number;
  expenseByCategory: CategoryTotal[];
};

export async function monthTotals(
  userId: Types.ObjectId,
  year: number,
  month: number
): Promise<MonthTotals> {
  const range = istMonthRange(year, month);
  const rows = await Transaction.aggregate<MonthlyRow>([
    { $match: { userId, date: { $gte: range.start, $lt: range.end } } },
    {
      $group: {
        _id: { type: "$type", category: "$category" },
        total: { $sum: "$amount" },
      },
    },
  ]);

  let income = 0;
  let expenses = 0;
  const expenseByCategory: CategoryTotal[] = [];
  for (const row of rows) {
    if (row._id.type === "income") income += row.total;
    if (row._id.type === "expense") {
      expenses += row.total;
      expenseByCategory.push({ category: row._id.category, amount: row.total });
    }
  }
  expenseByCategory.sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
  return { income, expenses, expenseByCategory };
}

export async function allTimeTotals(userId: Types.ObjectId): Promise<{ income: number; expenses: number }> {
  const rows = await Transaction.aggregate<{ _id: "income" | "expense"; total: number }>([
    { $match: { userId } },
    { $group: { _id: "$type", total: { $sum: "$amount" } } },
  ]);

  let income = 0;
  let expenses = 0;
  for (const row of rows) {
    if (row._id === "income") income = row.total;
    if (row._id === "expense") expenses = row.total;
  }
  return { income, expenses };
}

export async function expenseTotalsByMonth(userId: Types.ObjectId): Promise<Map<string, number>> {
  const rows = await Transaction.aggregate<{
    _id: { year: number; month: number };
    total: number;
  }>([
    { $match: { userId, type: "expense" } },
    {
      $group: {
        _id: {
          year: { $year: { date: "$date", timezone: "Asia/Kolkata" } },
          month: { $month: { date: "$date", timezone: "Asia/Kolkata" } },
        },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const totals = new Map<string, number>();
  for (const row of rows) totals.set(`${row._id.year}-${row._id.month}`, row.total);
  return totals;
}

export type MonthPoint = {
  year: number;
  month: number;
  label: string;
  income: number;
  expenses: number;
};

export async function monthHistory(
  userId: Types.ObjectId,
  throughYear: number,
  throughMonth: number,
  limit = 6
): Promise<MonthPoint[]> {
  const rows = await Transaction.aggregate<{
    _id: { year: number; month: number; type: "income" | "expense" };
    total: number;
  }>([
    { $match: { userId } },
    {
      $group: {
        _id: {
          year: { $year: { date: "$date", timezone: "Asia/Kolkata" } },
          month: { $month: { date: "$date", timezone: "Asia/Kolkata" } },
          type: "$type",
        },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const byMonth = new Map<string, MonthPoint>();
  const through = throughYear * 12 + throughMonth;
  for (const row of rows) {
    const cursor = row._id.year * 12 + row._id.month;
    if (cursor > through) continue;
    const key = `${row._id.year}-${row._id.month}`;
    const point = byMonth.get(key) ?? {
      year: row._id.year,
      month: row._id.month,
      label: monthShortLabel(row._id.year, row._id.month),
      income: 0,
      expenses: 0,
    };
    if (row._id.type === "income") point.income += row.total;
    if (row._id.type === "expense") point.expenses += row.total;
    byMonth.set(key, point);
  }

  return [...byMonth.values()]
    .filter((point) => point.income > 0 || point.expenses > 0)
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .slice(0, limit)
    .sort((a, b) => a.year - b.year || a.month - b.month);
}
