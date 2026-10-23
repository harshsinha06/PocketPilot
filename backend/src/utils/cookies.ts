import { CookieOptions, Response } from "express";
import { env } from "../config/env";
import { tokenMaxAgeMs } from "./token";

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/",
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie("token", token, {
    ...baseOptions(),
    maxAge: tokenMaxAgeMs(env.jwtExpiresIn),
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie("token", baseOptions());
}
