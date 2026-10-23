import mongoose, { Document, Schema, Types } from "mongoose";
import { INVESTMENT_KINDS } from "../constants/investments";

function amountField() {
  return {
    type: Number,
    required: true,
    min: [1, "Amount must be greater than 0"] as [number, string],
    validate: {
      validator: Number.isInteger,
      message: "Amount must be a whole number of paise",
    },
  };
}

function nameField() {
  return {
    type: String,
    required: [true, "Name is required"] as [boolean, string],
    trim: true,
    minlength: [1, "Name is required"] as [number, string],
    maxlength: [80, "Name must be at most 80 characters"] as [number, string],
  };
}

function kindField() {
  return {
    type: String,
    enum: INVESTMENT_KINDS,
    required: [true, "Choose a type"] as [boolean, string],
  };
}

export interface IHolding extends Document {
  userId: Types.ObjectId;
  name: string;
  kind: string;
  invested: number;
  current: number;
  createdAt: Date;
  updatedAt: Date;
}

const holdingSchema = new Schema<IHolding>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: nameField(),
    kind: kindField(),
    invested: amountField(),
    current: amountField(),
  },
  { timestamps: true }
);

export interface IContribution extends Document {
  userId: Types.ObjectId;
  name: string;
  kind: string;
  amount: number;
  month: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const contributionSchema = new Schema<IContribution>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: nameField(),
    kind: kindField(),
    amount: amountField(),
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true, min: 2000, max: 2100 },
  },
  { timestamps: true }
);

contributionSchema.index({ userId: 1, year: 1, month: 1, createdAt: -1 });

export interface ISip extends Document {
  userId: Types.ObjectId;
  name: string;
  kind: string;
  amount: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sipSchema = new Schema<ISip>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: nameField(),
    kind: kindField(),
    amount: amountField(),
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Holding = mongoose.model<IHolding>("Holding", holdingSchema);
export const Contribution = mongoose.model<IContribution>("Contribution", contributionSchema);
export const Sip = mongoose.model<ISip>("Sip", sipSchema);
