import { Response } from "express";
import { User } from "../models/User";
import { ApiError, FieldError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { clearAuthCookie, setAuthCookie } from "../utils/cookies";
import { MAX_PAISE, readPaise } from "../utils/money";
import { signToken } from "../utils/token";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export const register = asyncHandler(async (req, res) => {
  const name = readString(req.body?.name).trim();
  const email = readString(req.body?.email).trim().toLowerCase();
  const password = readString(req.body?.password);
  const errors: FieldError[] = [];

  if (name.length < 2) {
    errors.push({ field: "name", message: "Name must be at least 2 characters" });
  } else if (name.length > 80) {
    errors.push({ field: "name", message: "Name must be at most 80 characters" });
  }

  if (!EMAIL_PATTERN.test(email)) {
    errors.push({ field: "email", message: "Enter a valid email" });
  }

  if (password.length < 8) {
    errors.push({
      field: "password",
      message: "Password must be at least 8 characters",
    });
  } else if (password.length > 72) {
    errors.push({
      field: "password",
      message: "Password must be at most 72 characters",
    });
  }

  if (errors.length > 0) {
    throw new ApiError(400, "Please fix the highlighted fields", errors);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const user = await User.create({ name, email, password });
  setAuthCookie(res, signToken(user.id));

  res.status(201).json({
    success: true,
    message: "Account created",
    data: { user },
  });
});

export const login = asyncHandler(async (req, res) => {
  const email = readString(req.body?.email).trim().toLowerCase();
  const password = readString(req.body?.password);
  const errors: FieldError[] = [];

  if (!email) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push({ field: "email", message: "Enter a valid email" });
  }

  if (!password) {
    errors.push({ field: "password", message: "Password is required" });
  }

  if (errors.length > 0) {
    throw new ApiError(400, "Please fix the highlighted fields", errors);
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  setAuthCookie(res, signToken(user.id));

  res.status(200).json({
    success: true,
    message: "Logged in",
    data: { user },
  });
});

export const logout = asyncHandler(async (_req, res: Response) => {
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    message: "Logged out",
  });
});

function readAmount(value: unknown, field: string, label: string, errors: FieldError[]) {
  const amount = readPaise(value);
  if (amount === null || amount < 0 || amount > MAX_PAISE) {
    errors.push({ field, message: `Enter a valid ${label}` });
    return null;
  }
  return amount;
}

export const updateProfile = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  const errors: FieldError[] = [];
  const monthlyIncome = readAmount(req.body?.monthlyIncome, "monthlyIncome", "income", errors);
  const bonus = readAmount(req.body?.bonus, "bonus", "bonus", errors);
  if (errors.length > 0 || monthlyIncome === null || bonus === null) {
    throw new ApiError(400, "Please fix the highlighted fields", errors);
  }

  req.user.monthlyIncome = monthlyIncome;
  req.user.bonus = bonus;
  await req.user.save();

  res.status(200).json({
    success: true,
    message: "Monthly income saved",
    data: { user: req.user },
  });
});

function readRecurring(body: unknown) {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const errors: FieldError[] = [];
  const name = readString(source.name).trim();
  const amount = readPaise(source.amount);
  if (name.length < 1) errors.push({ field: "name", message: "Name is required" });
  else if (name.length > 40) errors.push({ field: "name", message: "Name must be at most 40 characters" });
  if (amount === null || amount < 1 || amount > MAX_PAISE) {
    errors.push({ field: "amount", message: "Enter an amount greater than 0" });
  }
  return { errors, name, amount };
}

function recurringById(user: NonNullable<Express.Request["user"]>, id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new ApiError(400, "Invalid recurring expense");
  const item = user.recurringExpenses?.find((entry) => String(entry._id) === id);
  if (!item) throw new ApiError(404, "Recurring expense not found");
  return item;
}

export const addRecurring = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Authentication required");
  const parsed = readRecurring(req.body);
  if (parsed.errors.length > 0 || parsed.amount === null) {
    throw new ApiError(400, "Please fix the highlighted fields", parsed.errors);
  }
  if ((req.user.recurringExpenses?.length ?? 0) >= 20) {
    throw new ApiError(400, "You can save up to 20 recurring expenses");
  }
  req.user.recurringExpenses.push({ name: parsed.name, amount: parsed.amount });
  await req.user.save();
  res.status(201).json({ success: true, message: "Recurring expense added", data: { user: req.user } });
});

export const updateRecurring = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Authentication required");
  const parsed = readRecurring(req.body);
  if (parsed.errors.length > 0 || parsed.amount === null) {
    throw new ApiError(400, "Please fix the highlighted fields", parsed.errors);
  }
  const item = recurringById(req.user, req.params.id);
  item.name = parsed.name;
  item.amount = parsed.amount;
  await req.user.save();
  res.status(200).json({ success: true, message: "Recurring expense updated", data: { user: req.user } });
});

export const deleteRecurring = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Authentication required");
  const item = recurringById(req.user, req.params.id);
  req.user.recurringExpenses.pull(item._id);
  await req.user.save();
  res.status(200).json({ success: true, message: "Recurring expense removed", data: { user: req.user } });
});

export const me = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
});
