import { Request } from "express";
import mongoose from "mongoose";
import {
  TransactionType,
  categoriesFor,
  isValidCategory,
} from "../constants/categories";
import { Transaction } from "../models/Transaction";
import { ApiError, FieldError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { istMonthRange, parseIstDate } from "../utils/dates";
import { MAX_PAISE, readPaise } from "../utils/money";

const DESCRIPTION_LIMIT = 140;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type TransactionBody = {
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: Date;
};

function userIdFrom(req: Request) {
  if (!req.user) throw new ApiError(401, "Authentication required");
  return req.user._id;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function queryValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return "";
}

function present(transaction: {
  _id: unknown;
  type: string;
  amount: number;
  category: string;
  description?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    _id: transaction._id,
    type: transaction.type,
    amount: transaction.amount,
    category: transaction.category,
    description: transaction.description ?? "",
    date: transaction.date,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}

function validateBody(body: Record<string, unknown> | undefined): {
  errors: FieldError[];
  value?: TransactionBody;
} {
  const source = body ?? {};
  const errors: FieldError[] = [];
  const type = readString(source.type);
  const category = readString(source.category);
  const description = readString(source.description);
  const amount = readPaise(source.amount);
  const date = parseIstDate(source.date);

  if (type !== "income" && type !== "expense") {
    errors.push({ field: "type", message: "Type must be income or expense" });
  }
  if (amount === null) {
    errors.push({ field: "amount", message: "Enter a valid amount" });
  } else if (amount <= 0) {
    errors.push({ field: "amount", message: "Amount must be greater than 0" });
  } else if (amount > MAX_PAISE) {
    errors.push({ field: "amount", message: "Amount is too large" });
  }
  if (type === "income" || type === "expense") {
    if (!category) {
      errors.push({ field: "category", message: "Category is required" });
    } else if (!isValidCategory(type, category)) {
      errors.push({
        field: "category",
        message: `Choose one of: ${categoriesFor(type).join(", ")}`,
      });
    }
  } else if (!category) {
    errors.push({ field: "category", message: "Category is required" });
  }
  if (description.length > DESCRIPTION_LIMIT) {
    errors.push({
      field: "description",
      message: "Description must be at most 140 characters",
    });
  }
  if (!date) {
    errors.push({ field: "date", message: "Enter a valid date" });
  }

  if (
    errors.length > 0 ||
    amount === null ||
    amount <= 0 ||
    amount > MAX_PAISE ||
    !date ||
    (type !== "income" && type !== "expense")
  ) {
    return { errors };
  }

  return {
    errors,
    value: { type, amount, category, description, date },
  };
}

function parseObjectId(id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new ApiError(400, "Invalid transaction id");
  }
  return new mongoose.Types.ObjectId(id);
}

async function findOwned(req: Request) {
  const id = parseObjectId(req.params.id);
  const transaction = await Transaction.findOne({
    _id: id,
    userId: userIdFrom(req),
  });
  if (!transaction) throw new ApiError(404, "Transaction not found");
  return transaction;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const createTransaction = asyncHandler(async (req, res) => {
  const { errors, value } = validateBody(req.body);
  if (!value) {
    throw new ApiError(400, "Please fix the highlighted fields", errors);
  }

  const transaction = await Transaction.create({
    userId: userIdFrom(req),
    ...value,
  });

  res.status(201).json({
    success: true,
    message: "Transaction added",
    data: { transaction: present(transaction) },
  });
});

export const listTransactions = asyncHandler(async (req, res) => {
  const errors: FieldError[] = [];
  const typeQuery = queryValue(req.query.type);
  const category = queryValue(req.query.category);
  const search = queryValue(req.query.search);
  const sort = queryValue(req.query.sort) || "newest";
  const monthRaw = queryValue(req.query.month);
  const yearRaw = queryValue(req.query.year);
  const page = Number(queryValue(req.query.page) || "1");
  const limit = Number(queryValue(req.query.limit) || String(DEFAULT_LIMIT));

  let type: TransactionType | undefined;
  if (typeQuery) {
    if (typeQuery !== "income" && typeQuery !== "expense") {
      errors.push({ field: "type", message: "Type must be income or expense" });
    } else {
      type = typeQuery;
    }
  }

  if (category) {
    const allowed = type ? categoriesFor(type) : [...categoriesFor("expense"), ...categoriesFor("income")];
    if (!allowed.includes(category)) {
      errors.push({ field: "category", message: "Unknown category" });
    }
  }

  if (search.length > 80) {
    errors.push({ field: "search", message: "Search must be at most 80 characters" });
  }

  if (sort !== "newest" && sort !== "oldest") {
    errors.push({ field: "sort", message: "Sort must be newest or oldest" });
  }

  if (!Number.isInteger(page) || page < 1 || page > 1000) {
    errors.push({ field: "page", message: "Page must be a positive number" });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    errors.push({ field: "limit", message: `Limit must be between 1 and ${MAX_LIMIT}` });
  }

  const hasMonth = monthRaw !== "";
  const hasYear = yearRaw !== "";
  let range: { start: Date; end: Date } | undefined;
  if (hasMonth !== hasYear) {
    errors.push({ field: "month", message: "Provide both a month and a year" });
  } else if (hasMonth && hasYear) {
    const month = Number(monthRaw);
    const year = Number(yearRaw);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !/^\d{4}$/.test(yearRaw)) {
      errors.push({ field: "month", message: "Enter a valid month and year" });
    } else if (year < 2000 || year > 2100) {
      errors.push({ field: "month", message: "Enter a valid month and year" });
    } else {
      range = istMonthRange(year, month);
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, "Please fix the highlighted fields", errors);
  }

  const filter: Record<string, unknown> = { userId: userIdFrom(req) };
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (search) filter.description = { $regex: escapeRegex(search), $options: "i" };
  if (range) filter.date = { $gte: range.start, $lt: range.end };

  const direction = sort === "oldest" ? 1 : -1;
  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ date: direction, createdAt: direction })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      transactions: transactions.map(present),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    },
  });
});

export const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await findOwned(req);
  res.status(200).json({
    success: true,
    data: { transaction: present(transaction) },
  });
});

export const updateTransaction = asyncHandler(async (req, res) => {
  const { errors, value } = validateBody(req.body);
  if (!value) {
    throw new ApiError(400, "Please fix the highlighted fields", errors);
  }

  const transaction = await findOwned(req);
  transaction.type = value.type;
  transaction.amount = value.amount;
  transaction.category = value.category;
  transaction.description = value.description;
  transaction.date = value.date;
  await transaction.save();

  res.status(200).json({
    success: true,
    message: "Transaction updated",
    data: { transaction: present(transaction) },
  });
});

export const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await findOwned(req);
  await transaction.deleteOne();
  res.status(200).json({
    success: true,
    message: "Transaction deleted",
  });
});
