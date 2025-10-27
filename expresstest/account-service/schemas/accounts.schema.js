import { z } from "zod";

// Whitelist ISO 4217 codes 
const ISO4217 = new Set([
  "USD","SGD","EUR","MYR","GBP","JPY","AUD","CAD","CNY","INR"
]);

export const createAccountSchema = z.object({
  clientID: z.coerce.string().uuid().optional(),
  accountType: z.enum(["Savings", "Checking","Business"]),
  // accountStatus: z.enum(["Inactive", "Active", "Disabled"]),
  openingDate: z
    .preprocess((val) => {
      if (val === "" || val === undefined || val === null) return new Date();
      return val;
    }, z.coerce.date())
  .refine(d => d <= new Date(), "Date cannot be in the future"),
  initialDeposit: z.string()
  .transform(val => Number(val))
  .refine(val => !isNaN(val) && val >= 0),
  currency: z.string().min(1, "currency is required"),
  branchID: z.coerce.string().uuid().min(1, "branch id is required"),
  // agentID: z.coerce.string().uuid().min(1, "agentID is required"),
});

export const draftAccountSchema = z.object({
  clientID: z.coerce.string().uuid(),
  accountType: z.enum(["Savings", "Deposit","Business"]),
  openingDate: z
    .preprocess((val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      return val;
    }, z.coerce.date()
  .refine(d => d <= new Date(), "Date cannot be in the future"))
  .optional(),
  initialDeposit: z.preprocess((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      return val;
    }, z.coerce.number())
    .refine(v => v === undefined || (Number.isFinite(v) && v >= 0), "initialDeposit must be >= 0")
    .optional(),
  currency: z.preprocess((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      return String(val).toUpperCase();
    }, z.string()
        .regex(/^[A-Z]{3}$/, "Invalid currency code")
        .refine(v => v === undefined || ISO4217.has(v), "Unsupported currency code"))
    .optional(),
  branchID: z.coerce.string().uuid().min(1, "branch id is required"),
});

export const updateAccountSchema = z.object({
  accountType: z.enum(["Savings", "Deposit","Business"]).optional(),
  accountStatus: z.enum(["Inactive", "Active", "Disabled"]).optional(),
  currency: z.string().min(1, "currency is required").optional(),
  branchID: z.coerce.string().uuid().min(1, "branch id is required").optional(),
  agentID: z.coerce.string().uuid().min(1, "agentID is required").optional(),
}).refine(obj => Object.keys(obj).length > 0, {
  message: "Provide at least one field to update",
});

// QUERY (/accounts/?id=)
export const paramID = z.object({
  id: z.coerce.string().uuid(),
});

export const paramClientID = z.object({
  clientID: z.coerce.string().uuid(),
});

export const paramBranchID = z.object({
  branchID: z.coerce.string().uuid(),
});

// (Optional) LIST QUERY (/agents?page=&limit=&include_deleted=)
export const pageAllClientSchema = z.object({
  // page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(40).default(20),
  // include_deleted: z.coerce.boolean().default(false),
  offset: z.coerce.number().int().min(0).default(20)
}).transform((data) => ({
  ...data,
  offset: data.offset ?? (data.limit - 20), // computed fallback
}));

// SOFT DELETE (PATCH /agents/:agent_id/delete or similar)
export const softDeleteSchema = z.object({
  // id: z.coerce.string().uuid(),
  deleteReason: z.string().trim().default("HR"),
});

// export const getallschema = z.object({
  
// });

// export const searchSchema = z.object({
//   searchValue: z.string().trim().min(1).optional(),
//   limit: z.coerce.number().int().min(1).max(40).default(20),
//   offset: z.coerce.number().int().min(0).default(0)
// }).refine(
//   // obj => Object.keys(obj).length > 0, 
//   // { message: "Provide at least one field to search",}
//   d => d.searchValue,
//   { message: "No search was entered" }
// );

// export const getschema = z.object({
//   firstName: z.string().trim().min(1).optional(),
//   lastName: z.string().trim().min(1).optional(),
//   email: z.string().trim().email().transform(v => v.toLowerCase()).optional(),
// }).refine(
//   // obj => Object.keys(obj).length > 0, 
//   // { message: "Provide at least one field to search",}
//   d => d.firstName || d.lastName || d.email,
//   { message: "Provide at least one field to search" }
// );


