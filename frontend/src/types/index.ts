export type Role = 'EMPLOYEE' | 'HR_ADMIN';
export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'RETIRED' | 'IN_REPAIR';

export interface User {
  id: string;
  email: string;
  role: Role;
  employee?: Employee | null;
}

export interface Employee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  dateOfJoining: string;
  designation: string;
  department: string;
  phone: string | null;
  address: string | null;
  photoUrl: string | null;
  user?: { id: string; email: string; role: Role };
}

export interface Payslip {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  pdfPath: string;
  createdAt: string;
  employee?: { id: string; firstName: string; lastName: string };
}

export interface Asset {
  id: string;
  assetTag: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  purchaseDate: string | null;
  status: AssetStatus;
  currentEmployeeId: string | null;
  assignedAt: string | null;
  currentEmployee?: { id: string; firstName: string; lastName: string } | null;
}
