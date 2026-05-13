import { z } from 'zod';

export const createPayslipSchema = z.object({
  employeeId: z.string().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  grossSalary: z.coerce.number().nonnegative(),
  deductions: z.coerce.number().nonnegative(),
  netSalary: z.coerce.number().nonnegative(),
});

export const listPayslipsQuery = z.object({
  employeeId: z.string().optional(),
  year: z.coerce.number().int().optional(),
});

export type CreatePayslipInput = z.infer<typeof createPayslipSchema>;
