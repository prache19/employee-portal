import { z } from 'zod';

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date');

export const createEmployeeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['EMPLOYEE', 'HR_ADMIN']).default('EMPLOYEE'),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  dateOfBirth: isoDate.optional(),
  dateOfJoining: isoDate,
  designation: z.string().min(1).max(120),
  department: z.string().min(1).max(120),
  phone: z.string().max(40).optional(),
  address: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().omit({ password: true, email: true });
export const updateSelfSchema = z.object({
  phone: z.string().max(40).optional(),
  address: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
});

export const idParam = z.object({ id: z.string().min(1) });

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type UpdateSelfInput = z.infer<typeof updateSelfSchema>;
