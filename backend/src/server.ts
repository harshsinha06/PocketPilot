import { createApp } from "./app";
import { connectDb } from "./config/db";
import { env } from "./config/env";
import "./models/User";
import "./models/Transaction";
import "./models/Budget";
import "./models/Investment";

async function start() {
  await connectDb();
  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
  server.on("error", (error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
