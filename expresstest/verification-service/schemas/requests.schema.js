import { z } from "zod";

const uuid = z.string().uuid();

// CREATE (POST /profiles)
export const createRequestSchema = z.object({
  enttiyID: z.coerce.string().uuid(),
  supportingDocs: z.coerce.boolean(),
  isReady: z.coerce.boolean(),
});

// UPDATE (PATCH /profiles/)
// export const updateRequestSchema = z.object({
//   // enttiyID: z.coerce.string().uuid(),
//   supportingDocs: z.coerce.boolean(),


//   firstName: z.string().trim().min(1).optional(),
//   lastName: z.string().trim().min(1).optional(),
//   dateOfBirth: z.coerce.date() // Accepts "1999-04-12"
//     .refine(d => d <= new Date(), "date_of_birth cannot be in the future")
//     .refine(d => {
//       const now = new Date();
//       let age = now.getFullYear() - d.getFullYear();
//       const m = now.getMonth() - d.getMonth();
//       if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
//       return age >= 18;
//     }, "Must be at least 18 years old").optional(),
//   gender: z.enum(["F", "M"]).optional(),
//   email: z.string().trim().toLowerCase().email("Invalid email address").optional(),
//   phoneNumber: z.string() // Format: + | country code | digits (10–15 digits)
//     .trim()
//     .transform((val) => val.replace(/[\s-]+/g, '')) // Space and - so that +65 8293 8737 or 92-3749-93872 works?
//     .refine((val) => /^\+?[1-9]\d{9,14}$/.test(val), {
//       message: "Invalid phone number."
//     }).optional(),
//     // .regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number"),
//   address: z.string().trim()
//     .min(5, "Address must be at least 5 characters")
//     .max(100, "Address cannot exceed 100 characters").optional(),
//   city: z.string().trim()
//     .min(2, "City must be at least 2 characters")
//     .max(50, "City cannot exceed 50 characters").optional(),
//   state: z.string().trim()
//     .min(2, "State must be at least 2 characters")
//     .max(50, "State cannot exceed 50 characters").optional(),
//   country: z.string().trim()
//     .min(2, "Country must be at least 2 characters")
//     .max(50, "Country cannot exceed 50 characters").optional(),
//   postal: z.string()
//     .trim()
//     .min(4, "Postal must be at least 4 characters")
//     .max(10, "Postal must be at most 10 characters")
//     .regex(/^[A-Za-z0-9\- ]+$/, "Invalid postal code").optional(), // letters, digits, space, hyphens
//   status: z.enum(["Inactive", "Active", "Disabled"]).optional(),
//   newAgentID: z.coerce.string().uuid().optional(),
// }).refine(obj => Object.keys(obj).length > 0, {
//   message: "Provide at least one field to update",
// });

// PARAMS (/requests/?id=)
export const paramID = z.object({
  id: z.coerce.string().uuid(),
});

export const rejectRequestSchema = z.object({
  rejectReason: z.coerce.string().default("Poor supporting Docs"),
})


// SOFT DELETE (PATCH /agents/:agent_id/delete or similar)
export const softDeleteSchema = z.object({
  // agentID: z.coerce.string().uuid(),
  deleteReason: z.string().trim().default("HR"),
});

export const getallschema = z.object({
  
});

export const searchSchema = z.object({
  searchValue: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(40).default(20),
  offset: z.coerce.number().int().min(0).default(0)
}).refine(
  // obj => Object.keys(obj).length > 0, 
  // { message: "Provide at least one field to search",}
  d => d.searchValue,
  { message: "No search was entered" }
);

export const getschema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  email: z.string().trim().email().transform(v => v.toLowerCase()).optional(),
}).refine(
  // obj => Object.keys(obj).length > 0, 
  // { message: "Provide at least one field to search",}
  d => d.firstName || d.lastName || d.email,
  { message: "Provide at least one field to search" }
);

// (Optional) LIST QUERY (/agents?page=&limit=&include_deleted=)
export const pageAllSchema = z.object({
  // page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(40).default(20),
  // include_deleted: z.coerce.boolean().default(false),
  offset: z.coerce.number().int().min(0).default(20)
}).transform((data) => ({
  ...data,
  offset: data.offset ?? (data.limit - 20), // computed fallback
}));
