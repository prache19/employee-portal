import { z } from 'zod';

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date');

export const assetStatusEnum = z.enum(['AVAILABLE', 'ASSIGNED', 'RETIRED', 'IN_REPAIR']);

export const createAssetSchema = z.object({
  assetTag: z.string().min(1).max(80),
  type: z.string().min(1).max(60),
  brand: z.string().min(1).max(80),
  model: z.string().min(1).max(120),
  serialNumber: z.string().max(120).optional(),
  purchaseDate: isoDate.optional(),
  status: assetStatusEnum.optional(),
});

export const updateAssetSchema = createAssetSchema.partial();

export const assignAssetSchema = z.object({
  employeeId: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export const returnAssetSchema = z.object({
  notes: z.string().max(500).optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type AssignAssetInput = z.infer<typeof assignAssetSchema>;
