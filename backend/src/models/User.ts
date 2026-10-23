import bcrypt from "bcryptjs";
import mongoose, { Document, Schema, Types } from "mongoose";

export interface IRecurringExpense extends Types.Subdocument {
  name: string;
  amount: number;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  monthlyIncome: number;
  bonus: number;
  recurringExpenses: Types.DocumentArray<IRecurringExpense>;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const recurringExpenseSchema = new Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minlength: [1, "Name is required"],
    maxlength: [40, "Name must be at most 40 characters"],
  },
  amount: {
    type: Number,
    required: [true, "Amount is required"],
    min: [1, "Amount must be greater than 0"],
    validate: {
      validator: Number.isInteger,
      message: "Amount must be a whole number of paise",
    },
  },
});

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name must be at most 80 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    monthlyIncome: {
      type: Number,
      default: 0,
      min: [0, "Income cannot be negative"],
    },
    bonus: {
      type: Number,
      default: 0,
      min: [0, "Bonus cannot be negative"],
    },
    recurringExpenses: { type: [recurringExpenseSchema], default: [] },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set("toJSON", {
  versionKey: false,
  transform(_doc, ret) {
    const { password: _password, ...safe } = ret;
    return safe;
  },
});

export const User = mongoose.model<IUser>("User", userSchema);
