import { Router } from "express";
import pool from "../db/pool.js";
import * as profileTX from "../db/tx.js"
// import { publish } from "../queues/sqs.js";
import { validate, validateParams, validateQuery } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import * as schema from "../schemas/profiles.schema.js";

const router = Router();

router.post ("/createProfile", requireAuth, validate(schema.createProfileSchema), async(req, res, next) => {
  try {
      const agentID = req.user?.id;

      if (!agentID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
      }

      const profileID = await profileTX.createProfile({
        ...req.validated, 
        agentID,
      });

      return res.status(201).json({ profileID });
    } catch (e) {
      next(e)
    }
});

// /:agentID for param, otherwise blank for query
router.get ("/findByID", requireAuth, validateQuery(schema.paramID), async(req, res, next) => {
  try {
      const agentID = req.user?.id;
      const id = req.validated.id;

      if (!agentID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
      }

      const client = await profileTX.getProfileByIDagentID({
        agentID, 
        id,
      });

      if (!client) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ client });
    } catch (e) {
      next(e)
    }
});

router.get ("/all", requireAuth, validateQuery(schema.pageAllClientSchema), async(req, res, next) => {
  try {
      const agentID = req.user?.id;
      console.log(agentID);

      if (!agentID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
      }

      const clients = await profileTX.getProfilePagesByAgentID({
        ...req.validated,
        agentID,
      });

      if (!clients || clients.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ clients });
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
      const agentID = req.user?.id;

      if (!agentID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
      }

      const clients = await profileTX.searchProfile({
        ...req.validatedQuery, 
        agentID,
      });

      if (!clients || clients.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(200).json({ clients });
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

router.put ("/updateProfile", requireAuth, validateQuery(schema.paramID), validate(schema.updateProfileSchema), async(req, res, next) => {
  try {
      const agentID = req.user?.id;
      const id = req.validatedQuery.id;

      if (!agentID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
      }

      const client = await profileTX.updateProfile({
        ...req.validated, 
        agentID,
        id
      });

      return res.status(201).json({ client });
    } catch (e) {
      next(e)
    }
});

router.delete ("/deleteProfile", requireAuth, validateQuery(schema.paramID), validate(schema.softDeleteSchema), async(req, res, next) => {
  try {
      const agentID = req.user?.id;
      const id = req.validatedQuery.id;

      if (!agentID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
      }

      const clientIDRes = await profileTX.softDeleteProfile({
        ...req.validated, 
        agentID,
        id
      });

      return res.status(201).json({ clientIDRes });
    } catch (e) {
      next(e)
    }
});

export default router;
