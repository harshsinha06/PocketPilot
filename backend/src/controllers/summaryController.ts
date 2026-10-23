import { Transaction } from "../models/Transaction";
import { allTimeTotals, monthTotals } from "../services/monthTotals";
import { recurringForMonth, statedIncomeForMonth } from "../services/statedIncome";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { parseMonthYear } from "../utils/dates";

export const getSummary = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Authentication required");

  const monthQuery = Array.isArray(req.query.month) ? req.query.month[0] : req.query.month;
  const yearQuery = Array.isArray(req.query.year) ? req.query.year[0] : req.query.year;
  const parsed = parseMonthYear(monthQuery, yearQuery);
  if (!parsed) throw new ApiError(400, "Enter a valid month and year");

  const userId = req.user._id;
  const [totals, monthly, recent] = await Promise.all([
    allTimeTotals(userId),
    monthTotals(userId, parsed.year, parsed.month),
    Transaction.find({ userId }).sort({ date: -1, createdAt: -1 }).limit(5),
  ]);

  const { month, year } = parsed;
  const stated = statedIncomeForMonth(req.user, year, month);
  const bills = recurringForMonth(req.user, year, month);
  const monthlyIncome = monthly.income + stated;
  const monthlyExpenses = monthly.expenses + bills;
  const expenseByCategory = monthly.expenseByCategory;
  const allIncome = totals.income + statedIncomeForMonth(req.user);
  const allExpenses = totals.expenses + recurringForMonth(req.user);

  res.status(200).json({
    success: true,
    data: {
      month,
      year,
      balance: allIncome - allExpenses,
      monthlyIncome,
      monthlyExpenses,
      recurringExpenses: bills,
      monthlyBalance: monthlyIncome - monthlyExpenses,
      expenseByCategory,
      recent: recent.map((transaction) => ({
        _id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description,
        date: transaction.date,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      })),
    },
  });
});
