import { z } from "zod";

const uuid = z.string().uuid();

// CREATE (POST /agents)
// DB sets: agent_id, created_at
// Me sets: deleted_* ONLY via DELETE endpoint
export const createAgentSchema = z.object({
  firstName: z.string().trim().min(1, "first_name is required"),
  lastName: z.string().trim().min(1, "last_name is required"),
  email: z.string().trim().email().transform(v => v.toLowerCase()),
  // role: z.literal("agent").default("agent"),
  // admin_id: uuid, 
});

// UPDATE (PATCH /agents/:agent_id)
export const updateAgentSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  email: z.string().trim().email().transform(v => v.toLowerCase()).optional(),
  agentID: uuid,
}).refine(obj => Object.keys(obj).length > 0, {
  message: "Provide at least one field to update",
});

// PARAMS (/agents/:agent_id)
export const agentIdParams = z.object({
  agentID: uuid,
});

// SOFT DELETE (PATCH /agents/:agent_id/delete or similar)
export const softDeleteSchema = z.object({
  agentID: uuid,
  deleteReason: z.string().trim().default("HR"),
});

export const getallschema = z.object({
  
});

export const searchSchema = z.object({
  searchValue: z.string().trim().min(1).optional(),
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
export const listAgentsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(40).default(20),
  // include_deleted: z.coerce.boolean().default(false),
  offset: z.coerce.number().int().min(0).default(20)
}).transform((data) => ({
  ...data,
  offset: data.offset ?? (data.limit - 20), // computed fallback
}));
