import express from "express";
import helmet from "helmet";
import pool from "./db/pool.js";
import agentsRouter from "./routes/agents.js"; 
import { requireAuth } from "./middlewares/auth.js";

import 'dotenv/config';

const app = express();
app.use(helmet());
app.use(express.json({ limit: "1mb" }));

app.get("/healthz", (_req, res) => res.send("ok"));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/readyz", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.send("ready"); }
  catch (e) { res.status(503).send("not ready"); console.log(e)}
});
app.get("/allz", async (_req, res) => {
  try { const agents = await pool.query("SELECT * FROM transactions.transaction_list"); res.status(200).json({ agents })}
  catch (e) { res.status(503).send(e); console.log(e)}
});

// Root route
app.get("/", (req, res) => res.send("API is running"));

// Actual
app.use("/v1/transactions", requireAuth, agentsRouter);

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error(err);

  // Filter bubbled errors into specific messages
  if (err.name === "ValidationError") {
    return res.status(400).json({ error: "ValidationError", details: err.message });
  }

  if (err.code === "23505") { // PostgreSQL unique violation
    return res.status(409).json({ error: "Conflict", details: "Email already exists" });
  }

  if (err.name === "UnauthorizedError") {
    return res.status(403).json({ error: "Forbidden" });
  }

  // res.status(500).json({ error: "InternalServerError" });
  res.status(500).json({ details: err.message });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Service listening on :${PORT}`));
