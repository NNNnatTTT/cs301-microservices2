import { Router } from "express";
import pool from "../db/pool.js";
import * as accountTX from "../db/tx.js"
// import { publish } from "../queues/sqs.js";
import { validate, validateParams, validateQuery } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import * as schema from "../schemas/accounts.schema.js";

const router = Router();

router.post ("/createAccount", requireAuth, validate(schema.createAccountSchema), async(req, res, next) => {
  try {
      const agentID = req.user?.id;

      if (!agentID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
      }

      const accountID = await accountTX.createAccount({
        ...req.validated, 
        agentID,
      });

      return res.status(201).json({ accountID });
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

      const client = await accountTX.getAccountByID({
        agentID, 
        id,
      });

      if (!client) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ client });
    } catch (e) {
      next(e)
    }
});

router.get ("/pageByClientID", requireAuth, validateQuery(schema.paramClientID), async(req, res, next) => {
  try {
      const agentID = req.user?.id;

      if (!agentID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
      }

      const client = await accountTX.getAccountPagesByClientID({
        ...req.validatedQuery,
        agentID, 
      });

      if (!client) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ client });
    } catch (e) {
      next(e)
    }
});

router.get ("/pageByBranchID", requireAuth, validateQuery(schema.paramBranchID), async(req, res, next) => {
  try {
      const agentID = req.user?.id;

      if (!agentID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
      }

      const client = await accountTX.getAccountPagesByBranchID({
        ...req.validatedQuery,
        agentID, 
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

      const clients = await accountTX.getAccountPagesByAgentID({
        ...req.validated,
        agentID,
      });

      if (!clients || clients.length === 0) return res.status(404).json({ error: "NotFound" });
      return res.status(201).json({ clients });
    } catch (e) {
      next(e)
    }
});

// router.get ("/test/all", requireAuth, async(req, res, next) => {
//   try {
//       // const adminID = req.user?.id;

//       // if (!adminID) {
//       //   return res.status(403).json({ error: "Forbidden", message: "Missing adminID" });
//       // }

//       const agents = await agentTX.getAllAgent({});

//       if (!agents || agents.length === 0) return res.status(404).json({ error: "NotFound" });
//       return res.status(201).json({ agents });
//     } catch (e) {
//       next(e)
//     }
// });
// router.get ("/testAdminID/:adminID", requireAuth, validateParams(schema.getAllAgentByAdminID), async(req, res, next) => {
//   try {
//       const adminID = req.user?.id;

//       if (!adminID) {
//         return res.status(403).json({ error: "Forbidden", message: "Missing adminID" });
//       }

//       const agents = await agentTX.getAllAgent({});

//       if (!agents || agents.length === 0) return res.status(404).json({ error: "NotFound" });
//       return res.status(201).json({ agents });
//     } catch (e) {
//       next(e)
//     }
// });
// router.get ("/strict", requireAuth, validateQuery(schema.getschema), async(req, res, next) => {
//   try {
//       const adminID = req.user?.id;

//       if (!adminID) {
//         return res.status(403).json({ error: "Forbidden", message: "Missing adminID" });
//       }

//       const agents = await agentTX.strictGetAgentByAdminID({
//         ...req.validated, 
//         adminID,
//       });

//       if (!agents || agents.length === 0) return res.status(404).json({ error: "NotFound" });
//       return res.status(200).json({ agents });
//     } catch (e) {
//       next(e)
//     }
// });
// router.get ("/loose", requireAuth, validateQuery(schema.getschema), async(req, res, next) => {
//   try {
//       const adminID = req.user?.id;

//       if (!adminID) {
//         return res.status(403).json({ error: "Forbidden", message: "Missing adminID" });
//       }

//       const agents = await agentTX.looseGetAgentByAdminID({
//         ...req.validated, 
//         adminID,
//       });

//       if (!agents || agents.length === 0) return res.status(404).json({ error: "NotFound" });
//       return res.status(201).json({ agents });
//     } catch (e) {
//       next(e)
//     }
// });

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

router.put ("/updateAccount", requireAuth, validateQuery(schema.paramID), validate(schema.updateAccountSchema), async(req, res, next) => {
  try {
      const agentID = req.user?.id;
      const id = req.validatedQuery.id;

      if (!agentID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
      }

      const client = await accountTX.updateAccount({
        ...req.validated, 
        agentID,
        id
      });

      return res.status(201).json({ client });
    } catch (e) {
      next(e)
    }
});

router.delete ("/deleteAccount", requireAuth, validateQuery(schema.paramID), validate(schema.softDeleteSchema), async(req, res, next) => {
  try {
      const agentID = req.user?.id;
      const id = req.validatedQuery.id;

      if (!agentID) {
        return res.status(403).json({ error: "Forbidden", message: "Missing agentID" });
      }

      const clientIDRes = await accountTX.softDeleteAccount({
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
