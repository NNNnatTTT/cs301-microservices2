import { Router } from "express";
import pool from "../db/pool.js";
import * as agentTX from "../db/tx.js"
// import { publish } from "../queues/sqs.js";
import { validate, validateParams, validateQuery } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import * as schema from "../schemas/agents.schema.js";

const router = Router();

router.post ("/createAgent", requireAuth, validate(schema.createAgentSchema), async(req, res, next) => {
  try {
      const adminID = req.user?.id;

      if (!adminID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminID" });
      }

      const agentID = await agentTX.createAgent({
        ...req.validated, 
        adminID,
      });

      return res.status(201).json({ agentID });
    } catch (e) {
      next(e)
    }
});

// /:agentID for param, otherwise blank for query
router.get ("/findByID", requireAuth, validateQuery(schema.agentIdParams), async(req, res, next) => {
  try {
      const adminID = req.user?.id;
      const agentID = req.validated

      if (!adminID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminID" });
      }

      const agent = await agentTX.getAgentByIDByAdminID({
        agentID, 
        adminID,
      });

      if (!agent) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ agent });
    } catch (e) {
      next(e)
    }
});

router.get ("/all", requireAuth, validateQuery(schema.listAgentsQuery), async(req, res, next) => {
  try {
      const adminID = req.user?.id;

      if (!adminID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminID" });
      }

      const agents = await agentTX.getAllAgentByAdminID({
        ...req.validated,
        adminID,
      });

      if (!agents || agents.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ agents });
    } catch (e) {
      next(e)
    }
});

router.get ("/test/all", requireAuth, async(req, res, next) => {
  try {
      // const adminID = req.user?.id;

      // if (!adminID) {
      //   return res.status(403).json({ error: "Forbidden", message: "Missing adminID" });
      // }

      const agents = await agentTX.getAllAgent({});

      if (!agents || agents.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ agents });
    } catch (e) {
      next(e)
    }
});

router.get ("/testAdminID/:adminID", requireAuth, validateParams(schema.getAllAgentByAdminID), async(req, res, next) => {
  try {
      const adminID = req.user?.id;

      if (!adminID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminID" });
      }

      const agents = await agentTX.getAllAgent({});

      if (!agents || agents.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ agents });
    } catch (e) {
      next(e)
    }
});

router.get ("/strict", requireAuth, validateQuery(schema.getschema), async(req, res, next) => {
  try {
      const adminID = req.user?.id;

      if (!adminID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminID" });
      }

      const agents = await agentTX.strictGetAgentByAdminID({
        ...req.validated, 
        adminID,
      });

      if (!agents || agents.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(200).json({ agents });
    } catch (e) {
      next(e)
    }
});

router.get ("/search", requireAuth, validateQuery(schema.searchSchema), async(req, res, next) => {
  try {
      const adminID = req.user?.id;

      if (!adminID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminID" });
      }

      const agents = await agentTX.searchAgentWithAdminID({
        ...req.validated, 
        adminID,
      });

      if (!agents || agents.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(200).json({ agents });
    } catch (e) {
      next(e)
    }
});

router.get ("/loose", requireAuth, validateQuery(schema.getschema), async(req, res, next) => {
  try {
      const adminID = req.user?.id;

      if (!adminID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminID" });
      }

      const agents = await agentTX.looseGetAgentByAdminID({
        ...req.validated, 
        adminID,
      });

      if (!agents || agents.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ agents });
    } catch (e) {
      next(e)
    }
});

router.put ("/updateAgent", requireAuth, validate(schema.updateAgentSchema), async(req, res, next) => {
  try {
      const adminID = req.user?.id;

      if (!adminID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminID" });
      }

      const agentID = await agentTX.updateAgentByAdminID({
        ...req.validated, 
        adminID,
      });

      return res.status(201).json({ agentID });
    } catch (e) {
      next(e)
    }
});

router.delete ("/deleteAgent", requireAuth, validate(schema.softDeleteSchema), async(req, res, next) => {
  try {
      const adminID = req.user?.id;

      if (!adminID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminID" });
      }

      const agentID = await agentTX.softDeleteAgent({
        ...req.validated, 
        adminID,
      });

      return res.status(201).json({ agentID });
    } catch (e) {
      next(e)
    }
});

export default router;
