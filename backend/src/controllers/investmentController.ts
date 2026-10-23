import { Request } from "express";
import mongoose from "mongoose";
import { isInvestmentKind } from "../constants/investments";
import { Contribution, Holding, Sip } from "../models/Investment";
import { ApiError, FieldError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { currentMonthInIst, istMonthRange, monthLabel } from "../utils/dates";
import { MAX_PAISE, readPaise } from "../utils/money";

function userIdFrom(req: Request) {
  if (!req.user) throw new ApiError(401, "Authentication required");
  return req.user._id;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseObjectId(id: string, label: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new ApiError(400, `Invalid ${label}`);
  return new mongoose.Types.ObjectId(id);
}

function readEntry(body: unknown) {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const errors: FieldError[] = [];
  const name = readString(source.name);
  const kind = readString(source.kind);
  const amount = readPaise(source.amount);

  if (name.length < 1) errors.push({ field: "name", message: "Name is required" });
  else if (name.length > 80) errors.push({ field: "name", message: "Name must be at most 80 characters" });

  if (!isInvestmentKind(kind)) {
    errors.push({ field: "kind", message: "Choose a valid investment type" });
  }

  if (amount === null || amount < 1 || amount > MAX_PAISE) {
    errors.push({ field: "amount", message: "Enter an amount greater than 0" });
  }

  return { errors, name, kind, amount };
}

function readHolding(body: unknown) {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const errors: FieldError[] = [];
  const name = readString(source.name);
  const kind = readString(source.kind);
  const invested = readPaise(source.invested);
  const current = readPaise(source.current);

  if (name.length < 1) errors.push({ field: "name", message: "Name is required" });
  else if (name.length > 80) errors.push({ field: "name", message: "Name must be at most 80 characters" });

  if (!isInvestmentKind(kind)) {
    errors.push({ field: "kind", message: "Choose a valid investment type" });
  }

  if (invested === null || invested < 1 || invested > MAX_PAISE) {
    errors.push({ field: "invested", message: "Enter an amount greater than 0" });
  }
  if (current === null || current < 1 || current > MAX_PAISE) {
    errors.push({ field: "current", message: "Enter an amount greater than 0" });
  }

  return { errors, name, kind, invested, current };
}

export const getInvestments = asyncHandler(async (req, res) => {
  const userId = userIdFrom(req);
  const { year, month } = currentMonthInIst();

  const [holdings, contributions, sips] = await Promise.all([
    Holding.find({ userId }).sort({ createdAt: -1 }),
    Contribution.find({ userId, year, month }).sort({ createdAt: -1 }),
    Sip.find({ userId, active: true }).sort({ createdAt: -1 }),
  ]);

  const holdingsTotal = holdings.reduce((sum, item) => sum + item.current, 0);
  const { start, end } = istMonthRange(year, month);
  const contributedThisMonth = holdings.reduce((sum, item) => {
    if (item.createdAt >= start && item.createdAt < end) return sum + item.invested;
    return sum;
  }, 0);
  const sipMonthlyTotal = sips.reduce((sum, item) => sum + item.amount, 0);

  res.status(200).json({
    success: true,
    data: {
      month,
      year,
      monthLabel: monthLabel(year, month),
      holdings,
      holdingsTotal,
      contributions,
      contributedThisMonth,
      sips,
      sipMonthlyTotal,
    },
  });
});

export const createHolding = asyncHandler(async (req, res) => {
  const parsed = readHolding(req.body);
  if (parsed.errors.length > 0 || parsed.invested === null || parsed.current === null) {
    throw new ApiError(400, "Please fix the highlighted fields", parsed.errors);
  }

  const holding = await Holding.create({
    userId: userIdFrom(req),
    name: parsed.name,
    kind: parsed.kind,
    invested: parsed.invested,
    current: parsed.current,
  });

  res.status(201).json({ success: true, message: "Investment added", data: { holding } });
});

export const updateHolding = asyncHandler(async (req, res) => {
  const parsed = readHolding(req.body);
  if (parsed.errors.length > 0 || parsed.invested === null || parsed.current === null) {
    throw new ApiError(400, "Please fix the highlighted fields", parsed.errors);
  }

  const holding = await Holding.findOneAndUpdate(
    { _id: parseObjectId(req.params.id, "holding"), userId: userIdFrom(req) },
    { name: parsed.name, kind: parsed.kind, invested: parsed.invested, current: parsed.current },
    { new: true, runValidators: true }
  );
  if (!holding) throw new ApiError(404, "Holding not found");

  res.status(200).json({ success: true, message: "Holding updated", data: { holding } });
});

export const deleteHolding = asyncHandler(async (req, res) => {
  const holding = await Holding.findOneAndDelete({
    _id: parseObjectId(req.params.id, "holding"),
    userId: userIdFrom(req),
  });
  if (!holding) throw new ApiError(404, "Holding not found");
  res.status(200).json({ success: true, message: "Holding removed" });
});

export const createContribution = asyncHandler(async (req, res) => {
  const parsed = readEntry(req.body);
  if (parsed.errors.length > 0 || parsed.amount === null) {
    throw new ApiError(400, "Please fix the highlighted fields", parsed.errors);
  }

  const { year, month } = currentMonthInIst();
  const contribution = await Contribution.create({
    userId: userIdFrom(req),
    name: parsed.name,
    kind: parsed.kind,
    amount: parsed.amount,
    month,
    year,
  });

  res.status(201).json({ success: true, message: "Investment added", data: { contribution } });
});

export const deleteContribution = asyncHandler(async (req, res) => {
  const contribution = await Contribution.findOneAndDelete({
    _id: parseObjectId(req.params.id, "investment"),
    userId: userIdFrom(req),
  });
  if (!contribution) throw new ApiError(404, "Investment not found");
  res.status(200).json({ success: true, message: "Investment removed" });
});

export const createSip = asyncHandler(async (req, res) => {
  const parsed = readEntry(req.body);
  if (parsed.errors.length > 0 || parsed.amount === null) {
    throw new ApiError(400, "Please fix the highlighted fields", parsed.errors);
  }

  const sip = await Sip.create({
    userId: userIdFrom(req),
    name: parsed.name,
    kind: parsed.kind,
    amount: parsed.amount,
    active: true,
  });

  res.status(201).json({ success: true, message: "SIP added", data: { sip } });
});

export const stopSip = asyncHandler(async (req, res) => {
  const sip = await Sip.findOneAndUpdate(
    { _id: parseObjectId(req.params.id, "SIP"), userId: userIdFrom(req), active: true },
    { active: false },
    { new: true }
  );
  if (!sip) throw new ApiError(404, "SIP not found");
  res.status(200).json({ success: true, message: "SIP stopped" });
});
