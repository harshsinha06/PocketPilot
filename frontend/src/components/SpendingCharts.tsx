"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPaise } from "@/lib/currency";
import type { MonthReport } from "@/lib/types";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function axisRupee(paise: number) {
  const rupees = paise / 100;
  if (Math.abs(rupees) >= 1000) {
    const thousands = rupees / 1000;
    const digits = Math.abs(thousands) >= 10 ? 0 : 1;
    return `₹${thousands.toFixed(digits)}k`;
  }
  return `₹${Math.round(rupees)}`;
}

function tooltipStyle() {
  return {
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: 0,
    color: "var(--ink)",
    fontSize: 13,
  };
}

export function categorySlices(categories: { category: string; amount: number }[]) {
  const sorted = categories.filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  if (sorted.length <= 5) return sorted.map((item) => ({ ...item }));
  const head = sorted.slice(0, 4).map((item) => ({ ...item }));
  const rest = sorted.slice(4).reduce((sum, item) => sum + item.amount, 0);
  const existing = head.find((item) => item.category === "Other");
  if (existing) existing.amount += rest;
  else head.push({ category: "Other", amount: rest });
  return head;
}

export function CategoryDonut({ categories, total }: { categories: { category: string; amount: number }[]; total: number }) {
  const slices = categorySlices(categories).map((item) => ({
    ...item,
    percent: total > 0 ? Math.round((item.amount * 100) / total) : 0,
  }));

  if (slices.length === 0 || total <= 0) {
    return <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">No expenses this month.</p>;
  }

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="amount"
            nameKey="category"
            cx="50%"
            cy="45%"
            innerRadius={58}
            outerRadius={88}
            stroke="var(--card)"
            paddingAngle={slices.length > 1 ? 1 : 0}
            isAnimationActive={false}
          >
            {slices.map((slice, index) => (
              <Cell key={slice.category} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle()}
            formatter={(value, name) => {
              const amount = typeof value === "number" ? value : 0;
              const percent = total > 0 ? Math.round((amount * 100) / total) : 0;
              return [`${formatPaise(amount)} · ${percent}%`, String(name)];
            }}
          />
          <Legend
            formatter={(value) => {
              const slice = slices.find((item) => item.category === value);
              return `${value} ${slice?.percent ?? 0}%`;
            }}
            wrapperStyle={{ fontSize: 13, color: "var(--chart-ink)" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpendingTrend({ history }: { history: MonthReport["history"] }) {
  if (history.length < 2) {
    return (
      <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
        Not enough history yet. Add expenses in at least two different months to see a trend.
      </p>
    );
  }

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--chart-ink)", fontSize: 13 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={axisRupee} tick={{ fill: "var(--chart-ink)", fontSize: 13 }} axisLine={false} tickLine={false} width={56} />
          <Tooltip contentStyle={tooltipStyle()} formatter={(value) => formatPaise(typeof value === "number" ? value : 0)} />
          <Line type="monotone" dataKey="expenses" name="Expenses" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function IncomeExpenseBars({ history }: { history: MonthReport["history"] }) {
  if (history.length === 0) {
    return (
      <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
        No income or expenses recorded yet.
      </p>
    );
  }

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={6}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--chart-ink)", fontSize: 13 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={axisRupee} tick={{ fill: "var(--chart-ink)", fontSize: 13 }} axisLine={false} tickLine={false} width={56} />
          <Tooltip contentStyle={tooltipStyle()} formatter={(value) => formatPaise(typeof value === "number" ? value : 0)} />
          <Legend wrapperStyle={{ fontSize: 13, color: "var(--chart-ink)" }} />
          <Bar dataKey="income" name="Income" fill="var(--chart-1)" maxBarSize={36} isAnimationActive={false} />
          <Bar dataKey="expenses" name="Expenses" fill="var(--chart-5)" maxBarSize={36} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
