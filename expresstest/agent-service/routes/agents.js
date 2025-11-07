import { Router } from "express";
import * as agentTX from "../db/tx.js"
// import { publish } from "../queues/sqs.js";
import { validate, validateParams, validateQuery } from "../middlewares/validate.js";
import { authenticateCognito, authorizeAdmin } from "../middlewares/auth.js";
import * as schema from "../schemas/agents.schema.js";

const router = Router();

router.use(authenticateCognito, authorizeAdmin)

router.post("/", validate(schema.createAgentSchema), async(req, res, next) => {
  try {
    const adminSub = req.user?.sub;

    if (!adminSub) {
      return res.status(403).json({ error: "Forbidden", message: "Missing adminSub" });
    }

    const agentID = await agentTX.createAgent({
      ...req.validated,
      adminSub,
    });

    return res.status(201).json({ agentID });
  } catch (e) {
    next(e);
  }
});

// /:agentID for param, otherwise blank for query
router.get("/", validateQuery(schema.agentIdParams), async(req, res, next) => {
  try {
      const adminSub = req.user?.sub;
      const agentID = req.validatedQuery;

      if (!adminSub) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminSub" });
      }

      const agent = await agentTX.getAgentByIDByAdminSub({
        agentID,
        adminSub,
      });

      if (!agent) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ agent });
    } catch (e) {
      next(e)
    }
});

router.get("/all", validateQuery(schema.listAgentsQuery), async(req, res, next) => {
  try {
      const adminSub = req.user?.sub;

      if (!adminSub) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminSub" });
      }

      const agents = await agentTX.getAllAgentByAdminSub({
        ...req.validatedQuery,
        adminSub,
      });

      if (!agents || agents.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ agents });
    } catch (e) {
      next(e)
    }
});

router.get("/test/all", async(req, res, next) => {
  try {
      const agents = await agentTX.getAllAgent({});

      if (!agents || agents.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ agents });
    } catch (e) {
      next(e)
    }
});

router.get("/testAdminSub/:adminSub", validateParams(schema.getAllAgentByAdminSub), async(req, res, next) => {
  try {
      const adminSub = req.user?.sub;

      if (!adminSub) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminSub" });
      }

      const agents = await agentTX.getAllAgent({});

      if (!agents || agents.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ agents });
    } catch (e) {
      next(e)
    }
});

router.get("/strict", validateQuery(schema.getschema), async(req, res, next) => {
  try {
      const adminSub = req.user?.sub;

      if (!adminSub) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminSub" });
      }

      const agents = await agentTX.strictGetAgentByAdminSub({
        ...req.validated,
        adminSub,
      });

      if (!agents || agents.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(200).json({ agents });
    } catch (e) {
      next(e)
    }
});

router.get("/search", validateQuery(schema.searchSchema), async(req, res, next) => {
  try {
      const adminSub = req.user?.sub;

      if (!adminSub) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminSub" });
      }

      const agents = await agentTX.searchAgentWithAdminSub({
        ...req.validatedQuery,
        adminSub,
      });

      if (!agents || agents.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(200).json({ agents });
    } catch (e) {
      next(e)
    }
});

router.get("/loose", validateQuery(schema.getschema), async(req, res, next) => {
  try {
      const adminSub = req.user?.sub;

      if (!adminSub) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminSub" });
      }

      const agents = await agentTX.looseGetAgentByAdminSub({
        ...req.validated,
        adminSub,
      });

      if (!agents || agents.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ agents });
    } catch (e) {
      next(e)
    }
});

router.put("/updateAgent", validate(schema.updateAgentSchema), async(req, res, next) => {
  try {
      const adminSub = req.user?.sub;

      if (!adminSub) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminSub" });
      }

      const agentID = await agentTX.updateAgentByAdminSub({
        ...req.validated,
        adminSub,
      });

      return res.status(201).json({ agentID });
    } catch (e) {
      next(e)
    }
});

router.delete("/deleteAgent", validate(schema.softDeleteSchema), async(req, res, next) => {
  try {
      const adminSub = req.user?.sub;

      if (!adminSub) {
        return res.status(403).json({ error: "Forbidden", message: "Missing adminSub" });
      }

      const agentID = await agentTX.softDeleteAgent({
        ...req.validated,
        adminSub,
      });

      return res.status(201).json({ agentID });
    } catch (e) {
      next(e)
    }
});

export default router;
