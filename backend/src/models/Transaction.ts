import mongoose, { Document, Schema, Types } from "mongoose";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../constants/categories";

export interface ITransaction extends Document {
  userId: Types.ObjectId;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const categories = [...new Set<string>([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];

const transactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
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
    category: {
      type: String,
      enum: categories,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [140, "Description must be at most 140 characters"],
    },
    date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, date: -1, createdAt: -1 });

export const Transaction = mongoose.model<ITransaction>("Transaction", transactionSchema);
