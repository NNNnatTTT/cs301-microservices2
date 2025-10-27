import { Router } from "express";
import pool from "../db/pool.js";
import * as requestTX from "../db/tx.js"
// import { publish } from "../queues/sqs.js";
import { validate, validateParams, validateQuery } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import * as schema from "../schemas/requests.schema.js";

const router = Router();

router.post ("/submitRequest", requireAuth, validate(schema.createRequestSchema), async(req, res, next) => {
  try {
      const agentID = req.user?.id;

      if (!agentID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
      }

      const profileID = await requestTX.createRequest({
        ...req.validated, 
        agentID,
      });

      return res.status(201).json({ profileID });
    } catch (e) {
      next(e)
    }
});

router.get ("/findByID", requireAuth, validateQuery(schema.paramID), async(req, res, next) => {
  try {
      const agentID = req.user?.id;
      const id = req.validated.id;

      if (!agentID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
      }

      const client = await requestTX.getRequestByIDagentID({
        agentID, 
        id,
      });

      if (!client) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ client });
    } catch (e) {
      next(e)
    }
});

router.get ("/all", requireAuth, validateQuery(schema.pageAllSchema), async(req, res, next) => {
  try {
      const agentID = req.user?.id;
      console.log(agentID);

      if (!agentID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
      }

      const clients = await requestTX.getRequestPagesByAgentID({
        ...req.validated,
        agentID,
      });

      if (!clients || clients.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ clients });
    } catch (e) {
      next(e)
    }
});

// router.get ("/search", requireAuth, validateQuery(schema.searchSchema), async(req, res, next) => {
//   try {
//       const agentID = req.user?.id;

//       if (!agentID) {
//         return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
//       }

//       const clients = await profileTX.searchProfile({
//         ...req.validatedQuery, 
//         agentID,
//       });

//       if (!clients || clients.length === 0) return res.status(404).json({ error: "NotFound" });
//       return res.status(200).json({ clients });
//     } catch (e) {
//       next(e)
//     }
// });

// router.put ("/updateRequest", requireAuth, validateQuery(schema.paramID), validate(schema.updateProfile), async(req, res, next) => {
//   try {
//       const agentID = req.user?.id;
//       const id = req.validatedQuery.id;

//       if (!agentID) {
//         return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
//       }

//       const client = await profileTX.updateProfile({
//         ...req.validated, 
//         agentID,
//         id
//       });

//       return res.status(201).json({ client });
//     } catch (e) {
//       next(e)
//     }
// });

router.put ("/verifyProfile", requireAuth, validateQuery(schema.paramID), async(req, res, next) => {
  try {
      const agentID = req.user?.id;
      const id = req.validatedQuery.id;

      if (!agentID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
      }

      const profileID = await requestTX.verifyRequest({
        agentID,
        id
      });

      return res.status(201).json({ profileID });
    } catch (e) {
      next(e)
    }
});

router.delete ("/rejectRequest", requireAuth, validateQuery(schema.paramID), validate(schema.rejectRequestSchema), async(req, res, next) => {
  try {
      const agentID = req.user?.id;
      const id = req.validatedQuery.id;

      if (!agentID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
      }

      const requestIDRes = await requestTX.rejectRequest({
        ...req.validated, 
        agentID,
        id
      });

      return res.status(201).json({ requestIDRes });
    } catch (e) {
      next(e)
    }
});

export default router;
