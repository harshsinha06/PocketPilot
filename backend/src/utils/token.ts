import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export function signToken(userId: string): string {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign({ userId }, env.jwtSecret, options);
}

/** Cookie lifetime stays aligned with values like 7d, 12h, or 30m. */
export function tokenMaxAgeMs(value: string): number {
  const match = /^(\d+)([dhms])$/.exec(value.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    d: 24 * 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    m: 60 * 1000,
    s: 1000,
  };

  return amount * multipliers[unit];
}
