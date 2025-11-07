import { Router } from "express";
// import pool from "../db/pool.js";
import * as profileTX from "../db/tx.js"
// import { publish } from "../queues/sqs.js";
import { validate, validateParams, validateQuery } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import * as schema from "../schemas/profiles.schema.js";

const router = Router();

router.post ("/createProfile", requireAuth, validate(schema.createProfileSchema), async(req, res, next) => {
  try {
      const agentSUB = req.user?.sub;

      if (!agentSUB) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentSUB" });
      }

      const profileID = await profileTX.createProfile({
        ...req.validated, 
        agentSUB,
      });

      return res.status(201).json({ profileID });
    } catch (e) {
      next(e)
    }
});

// /:agentSUB for param, otherwise blank for query
router.get ("/findByID", requireAuth, validateQuery(schema.paramID), async(req, res, next) => {
  try {
      const agentSUB = req.user?.sub;
      const id = req.validatedQuery.id;

      if (!agentSUB) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentSUB" });
      }

      const client = await profileTX.getProfileByIDagentSUB({
        agentSUB, 
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
      const agentSUB = req.user?.sub;
      console.log(agentSUB);

      if (!agentSUB) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentSUB" });
      }

      const clients = await profileTX.getProfilePagesByagentSUB({
        ...req.validatedQuery,
        agentSUB,
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
      const agentSUB = req.user?.id;

      if (!agentSUB) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentSUB" });
      }

      const clients = await profileTX.searchProfile({
        ...req.validatedQuery, 
        agentSUB,
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
      const agentSUB = req.user?.id;
      const id = req.validatedQuery.id;

      if (!agentSUB) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentSUB" });
      }

      const client = await profileTX.updateProfile({
        ...req.validated, 
        agentSUB,
        id
      });

      return res.status(201).json({ client });
    } catch (e) {
      next(e)
    }
});

router.put ("/verifyProfile", requireAuth, validateQuery(schema.paramID), async(req, res, next) => {
  try {
      const agentSUB = req.user?.id;
      const id = req.validatedQuery.id;

      if (!agentSUB) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentSUB" });
      }

      const profileID = await profileTX.verifyProfile({
        agentSUB,
        id
      });

      return res.status(201).json({ profileID });
    } catch (e) {
      next(e)
    }
});

router.delete ("/deleteProfile", requireAuth, validateQuery(schema.paramID), validate(schema.softDeleteSchema), async(req, res, next) => {
  try {
      const agentSUB = req.user?.id;
      const id = req.validatedQuery.id;

      if (!agentSUB) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentSUB" });
      }

      const profileIDRes = await profileTX.softDeleteProfile({
        ...req.validated, 
        agentSUB,
        id
      });

      return res.status(201).json({ profileIDRes });
    } catch (e) {
      next(e)
    }
});

export default router;
