import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { router } from "./routes";
import { ApiError } from "./utils/ApiError";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", router);

  app.use((_req, _res, next) => {
    next(new ApiError(404, "Route not found"));
  });
  app.use(errorHandler);

  return app;
}
