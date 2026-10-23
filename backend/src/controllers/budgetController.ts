import { Request } from "express";
import mongoose from "mongoose";
import { EXPENSE_CATEGORIES } from "../constants/categories";
import { Budget, ICategoryBudget } from "../models/Budget";
import { expenseTotalsByMonth } from "../services/monthTotals";
import { buildMonthReport } from "../services/monthReport";
import { recurringForMonth } from "../services/statedIncome";
import { ApiError, FieldError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { parseMonthYear } from "../utils/dates";
import { MAX_PAISE, readPaise } from "../utils/money";

const expenseCategories = new Set<string>(EXPENSE_CATEGORIES);

function userIdFrom(req: Request) {
  if (!req.user) throw new ApiError(401, "Authentication required");
  return req.user._id;
}

function queryValue(value: unknown): unknown {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseObjectId(id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new ApiError(400, "Invalid budget id");
  return new mongoose.Types.ObjectId(id);
}

function isDuplicateKey(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000);
}

function readCategoryBudgets(value: unknown): {
  errors: FieldError[];
  categories?: ICategoryBudget[];
} {
  if (value === undefined) return { errors: [], categories: [] };
  if (!Array.isArray(value)) {
    return { errors: [{ field: "categories", message: "Category budgets must be a list" }] };
  }
  if (value.length > EXPENSE_CATEGORIES.length) {
    return { errors: [{ field: "categories", message: "Too many category budgets" }] };
  }

  const errors: FieldError[] = [];
  const categories: ICategoryBudget[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") {
      errors.push({ field: "categories", message: "Each category budget needs a category and an amount" });
      continue;
    }
    const record = item as Record<string, unknown>;
    const category = typeof record.category === "string" ? record.category.trim() : "";
    const amount = readPaise(record.amount);

    if (!expenseCategories.has(category)) {
      errors.push({ field: "categories", message: "Choose an expense category" });
    } else if (seen.has(category)) {
      errors.push({ field: "categories", message: `${category} is listed more than once` });
    } else {
      seen.add(category);
    }

    if (amount === null || amount > MAX_PAISE) {
      errors.push({ field: "categories", message: "Enter a valid category amount" });
    } else if (amount <= 0) {
      errors.push({ field: "categories", message: "Category amount must be greater than 0" });
    }

    if (expenseCategories.has(category) && amount !== null && amount > 0 && amount <= MAX_PAISE && !categories.some((entry) => entry.category === category)) {
      categories.push({ category, amount });
    }
  }

  if (errors.length > 0) return { errors };
  return { errors, categories };
}

function readAmount(value: unknown, errors: FieldError[]): number | null {
  const amount = readPaise(value);
  if (amount === null || amount > MAX_PAISE) {
    errors.push({ field: "amount", message: "Enter a valid amount" });
    return null;
  }
  if (amount <= 0) {
    errors.push({ field: "amount", message: "Amount must be greater than 0" });
    return null;
  }
  return amount;
}

function present(budget: {
  _id: unknown;
  month: number;
  year: number;
  amount: number;
  categories: ICategoryBudget[];
  createdAt: Date;
  updatedAt: Date;
}) {
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

export const getMonthReport = asyncHandler(async (req, res) => {
  const parsed = parseMonthYear(queryValue(req.query.month), queryValue(req.query.year));
  if (!parsed) throw new ApiError(400, "Enter a valid month and year");
  const report = await buildMonthReport(userIdFrom(req), parsed.year, parsed.month, new Date(), req.user);
  res.status(200).json({ success: true, data: report });
});

export const listBudgets = asyncHandler(async (req, res) => {
  const userId = userIdFrom(req);
  const [budgets, spentByMonth] = await Promise.all([
    Budget.find({ userId }).sort({ year: -1, month: -1 }).limit(36),
    expenseTotalsByMonth(userId),
  ]);

  res.status(200).json({
    success: true,
    data: {
      budgets: budgets.map((budget) => {
        const spent =
          (spentByMonth.get(`${budget.year}-${budget.month}`) ?? 0) +
          recurringForMonth(req.user, budget.year, budget.month);
        return {
          ...present(budget),
          spent,
          remaining: budget.amount - spent,
        };
      }),
    },
  });
});

export const createBudget = asyncHandler(async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  const amount = readAmount(body.amount, errors);
  const parsed = parseMonthYear(body.month, body.year);
  if (!parsed) errors.push({ field: "month", message: "Enter a valid month and year" });
  const categoryResult = readCategoryBudgets(body.categories);
  errors.push(...categoryResult.errors);

  if (!parsed || amount === null || !categoryResult.categories || errors.length > 0) {
    throw new ApiError(400, "Please fix the highlighted fields", errors);
  }

  const userId = userIdFrom(req);
  const existing = await Budget.findOne({ userId, month: parsed.month, year: parsed.year });
  if (existing) throw new ApiError(409, "You already have a budget for that month");

  try {
    const budget = await Budget.create({
      userId,
      month: parsed.month,
      year: parsed.year,
      amount,
      categories: categoryResult.categories,
    });
    res.status(201).json({
      success: true,
      message: "Budget saved",
      data: { budget: present(budget) },
    });
  } catch (error) {
    if (isDuplicateKey(error)) throw new ApiError(409, "You already have a budget for that month");
    throw error;
  }
});

export const updateBudget = asyncHandler(async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  if (body.month !== undefined || body.year !== undefined) {
    errors.push({ field: "month", message: "Create a separate budget to use a different month" });
  }
  const amount = readAmount(body.amount, errors);
  const categoryResult = readCategoryBudgets(body.categories);
  errors.push(...categoryResult.errors);

  if (amount === null || !categoryResult.categories || errors.length > 0) {
    throw new ApiError(400, "Please fix the highlighted fields", errors);
  }

  const budget = await Budget.findOne({ _id: parseObjectId(req.params.id), userId: userIdFrom(req) });
  if (!budget) throw new ApiError(404, "Budget not found");

  budget.amount = amount;
  budget.categories = categoryResult.categories;
  await budget.save();

  res.status(200).json({
    success: true,
    message: "Budget updated",
    data: { budget: present(budget) },
  });
});

export const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: parseObjectId(req.params.id), userId: userIdFrom(req) });
  if (!budget) throw new ApiError(404, "Budget not found");
  await budget.deleteOne();
  res.status(200).json({ success: true, message: "Budget removed" });
});
