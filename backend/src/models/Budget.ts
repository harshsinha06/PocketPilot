import mongoose, { Document, Schema, Types } from "mongoose";
import { EXPENSE_CATEGORIES } from "../constants/categories";

export interface ICategoryBudget {
  category: string;
  amount: number;
}

export interface IBudget extends Document {
  userId: Types.ObjectId;
  month: number;
  year: number;
  amount: number;
  categories: ICategoryBudget[];
  createdAt: Date;
  updatedAt: Date;
}

const categoryBudgetSchema = new Schema<ICategoryBudget>(
  {
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, "Amount must be greater than 0"],
      validate: {
        validator: Number.isInteger,
        message: "Amount must be a whole number of paise",
      },
    },
  },
  { _id: false }
);

const budgetSchema = new Schema<IBudget>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, "Amount must be greater than 0"],
      validate: {
        validator: Number.isInteger,
        message: "Amount must be a whole number of paise",
      },
    },
    categories: {
      type: [categoryBudgetSchema],
      default: [],
      validate: {
        validator(items: ICategoryBudget[]) {
          const names = items.map((item) => item.category);
          return names.length === new Set(names).size && names.length <= EXPENSE_CATEGORIES.length;
        },
        message: "Each expense category can only be budgeted once",
      },
    },
  },
  { timestamps: true }
);

budgetSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

export const Budget = mongoose.model<IBudget>("Budget", budgetSchema);
