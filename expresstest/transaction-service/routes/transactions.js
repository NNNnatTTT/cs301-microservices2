import { Router } from "express";
import pool from "../db/pool.js";
import * as transactionTX from "../db/tx.js"
// import { publish } from "../queues/sqs.js";
import { validate, validateParams, validateQuery } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import * as schema from "../schemas/transactions.schema.js";

const router = Router();

router.post ("/createTransaction", requireAuth, validate(schema.createTransactionSchema), async(req, res, next) => {
  try {
      const id = await transactionTX.createTransaction({
        ...req.validated, 
      });

      return res.status(201).json({ id });
    } catch (e) {
      next(e)
    }
});

// /:agentID for param, otherwise blank for query
router.get ("/findByTID", requireAuth, validateQuery(schema.agentIdParams), async(req, res, next) => {
  try {
      // const adminID = req.user?.id;
      // const agentID = 

      // if (!adminID) {
      //   return res.status(403).json({ error: "Forbidden", message: "Missing adminID" });
      // }

      const agent = await transactionTX.getTransactionByTID({
        ...req.validated, 
      });

      if (!agent) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ agent });
    } catch (e) {
      next(e)
    }
});

router.get ("/findByBID", requireAuth, validateQuery(schema.getByBIDSchema), async(req, res, next) => {
  try {
      const role = req.user?.role;

      if (role !== "admin") {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminID" });
      }

      const transactions = await transactionTX.getTransactionByBID({
        ...req.validated,
      });

      if (!transactions || transactions.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ transactions });
    } catch (e) {
      next(e)
    }
});

router.get("/findByClient", requireAuth, validateQuery(schema.getByClientSchema), async(req, res, next) => {
  try{
    const transactions = await transactionTX.getTransactionsByClientID({
        ...req.validated,
      });

      if (!transactions || transactions.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ transactions });
  } catch (e) {
    next(e);
  }
});

router.get("/filterByType", requireAuth, validateQuery(schema.getByClientFilterTypeSchema), async(req, res, next) => {
  try{
    const transactions = await transactionTX.getTransactionsByClientIDFilterType({
        ...req.validated,
      });

      if (!transactions || transactions.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ transactions });
  } catch (e) {
    next(e);
  }
});

export default router;
