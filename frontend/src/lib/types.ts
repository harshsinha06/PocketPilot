export type RecurringExpense = {
  _id: string;
  name: string;
  amount: number;
};

export type User = {
  _id: string;
  name: string;
  email: string;
  monthlyIncome: number;
  bonus: number;
  recurringExpenses: RecurringExpense[];
  createdAt: string;
  updatedAt: string;
};

export type FieldError = {
  field: string;
  message: string;
};

export type AuthResponse = {
  success: boolean;
  message: string;
  data: {
    user: User;
  };
};

export type TransactionType = "income" | "expense";

export type Transaction = {
  _id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
};

export type TransactionInput = {
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
};

export type TransactionList = {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type Summary = {
  month: number;
  year: number;
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  recurringExpenses: number;
  monthlyBalance: number;
  expenseByCategory: { category: string; amount: number }[];
  recent: Transaction[];
};

export type BudgetStatus = "under" | "approaching" | "over";

export type BudgetRecord = {
  _id: string;
  month: number;
  year: number;
  amount: number;
  categories: { category: string; amount: number }[];
  createdAt: string;
  updatedAt: string;
};

export type BudgetListItem = BudgetRecord & {
  spent: number;
  remaining: number;
};

export type CategoryBudgetProgress = {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
};

export type SafeToSpend = {
  applicable: boolean;
  amount: number | null;
  perDay: number | null;
  daysLeft: number;
  message: string | null;
};

export type MonthComparison = {
  month: number;
  year: number;
  monthLabel: string;
  expenses: { current: number; previous: number; change: number };
  income: { current: number; previous: number; change: number };
  categories: {
    category: string;
    current: number;
    previous: number;
    change: number;
    percent: number | null;
  }[];
};

export type MonthProjection =
  | {
      kind: "estimate";
      spent: number;
      averageDaily: number;
      projected: number;
      budgetAmount: number | null;
      note: string;
    }
  | {
      kind: "complete" | "empty" | "future";
      spent?: number;
      budgetAmount: number | null;
      note: string;
    };

export type MonthReport = {
  month: number;
  year: number;
  monthLabel: string;
  relation: "past" | "current" | "future";
  daysInMonth: number;
  daysElapsed: number;
  daysLeft: number;
  income: number;
  expenses: number;
  recurringExpenses: number;
  expenseByCategory: { category: string; amount: number }[];
  averageDaily: number | null;
  history: { year: number; month: number; label: string; income: number; expenses: number }[];
  budget: BudgetRecord | null;
  remaining: number | null;
  percent: number | null;
  status: BudgetStatus | null;
  statusMessage: string | null;
  safeToSpend: SafeToSpend;
  categoryBudgets: CategoryBudgetProgress[];
  categoriesExceedBudget: boolean;
  insights: string[];
  emptyInsightsMessage: string | null;
  comparison: MonthComparison | null;
  projection: MonthProjection;
};

export type InvestmentKind =
  | "Stocks"
  | "Mutual Funds"
  | "Gold"
  | "Fixed Deposits"
  | "US Stocks"
  | "EPF"
  | "NPS";

export type Holding = {
  _id: string;
  name: string;
  kind: InvestmentKind;
  invested: number;
  current: number;
  createdAt: string;
};

export type Contribution = {
  _id: string;
  name: string;
  kind: InvestmentKind;
  amount: number;
  month: number;
  year: number;
};

export type Sip = {
  _id: string;
  name: string;
  kind: InvestmentKind;
  amount: number;
  active: boolean;
};

export type InvestmentOverview = {
  month: number;
  year: number;
  monthLabel: string;
  holdings: Holding[];
  holdingsTotal: number;
  contributions: Contribution[];
  contributedThisMonth: number;
  sips: Sip[];
  sipMonthlyTotal: number;
};
