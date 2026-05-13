import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const API = 'http://localhost:4000/api';

export const handlers = [
  http.post(`${API}/auth/refresh`, () => HttpResponse.json({}, { status: 401 })),

  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === 'emp1@company.com' && body.password === 'Emp@123') {
      return HttpResponse.json({
        accessToken: 'fake-emp-token',
        user: { id: 'u1', email: body.email, role: 'EMPLOYEE', employee: { id: 'e1', firstName: 'Alex', lastName: 'Chen' } },
      });
    }
    if (body.email === 'hr@company.com' && body.password === 'Admin@123') {
      return HttpResponse.json({
        accessToken: 'fake-hr-token',
        user: { id: 'u0', email: body.email, role: 'HR_ADMIN', employee: { id: 'e0', firstName: 'HR', lastName: 'Admin' } },
      });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  http.get(`${API}/auth/me`, ({ request }) => {
    const auth = request.headers.get('authorization') ?? '';
    if (auth.includes('fake-emp-token')) {
      return HttpResponse.json({ id: 'u1', email: 'emp1@company.com', role: 'EMPLOYEE', employee: { id: 'e1', firstName: 'Alex', lastName: 'Chen' } });
    }
    if (auth.includes('fake-hr-token')) {
      return HttpResponse.json({ id: 'u0', email: 'hr@company.com', role: 'HR_ADMIN', employee: { id: 'e0', firstName: 'HR', lastName: 'Admin' } });
    }
    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }),

  http.post(`${API}/auth/logout`, () => HttpResponse.json({ ok: true })),

  http.get(`${API}/employees/:id`, ({ params }) => HttpResponse.json({
    id: params.id,
    userId: 'u1',
    firstName: 'Alex',
    lastName: 'Chen',
    dateOfBirth: null,
    dateOfJoining: '2021-08-15T00:00:00.000Z',
    designation: 'Senior Software Engineer',
    department: 'Engineering',
    phone: '+1-555-0111',
    address: null,
    photoUrl: null,
    user: { id: 'u1', email: 'emp1@company.com', role: 'EMPLOYEE' },
  })),

  http.get(`${API}/payslips`, () => HttpResponse.json([
    { id: 'p1', employeeId: 'e1', month: 4, year: 2026, grossSalary: 8500, deductions: 1700, netSalary: 6800, pdfPath: 'x.pdf', createdAt: '2026-05-01T00:00:00Z' },
  ])),

  http.get(`${API}/assets`, () => HttpResponse.json([
    { id: 'a1', assetTag: 'LAP-001', type: 'LAPTOP', brand: 'Dell', model: 'XPS 15', serialNumber: 'SN-1', purchaseDate: null, status: 'ASSIGNED', currentEmployeeId: 'e1', assignedAt: '2026-04-01T00:00:00Z' },
  ])),
];

export const server = setupServer(...handlers);
