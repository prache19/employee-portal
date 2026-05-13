import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Employee } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const now = new Date();

interface Form {
  employeeId: string;
  month: number;
  year: number;
  grossSalary: string;
  deductions: string;
  netSalary: string;
  file: File | null;
}

const initial: Form = {
  employeeId: '',
  month: now.getMonth() + 1,
  year: now.getFullYear(),
  grossSalary: '',
  deductions: '',
  netSalary: '',
  file: null,
};

export function PayslipUpload() {
  const qc = useQueryClient();
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => (await api.get<Employee[]>('/employees')).data,
  });

  const [form, setForm] = useState<Form>(initial);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const upload = useMutation({
    mutationFn: async (f: Form) => {
      if (!f.file) throw new Error('Pick a PDF file');
      const fd = new FormData();
      fd.append('employeeId', f.employeeId);
      fd.append('month', String(f.month));
      fd.append('year', String(f.year));
      fd.append('grossSalary', f.grossSalary);
      fd.append('deductions', f.deductions);
      fd.append('netSalary', f.netSalary);
      fd.append('pdf', f.file);
      return (await api.post('/payslips', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
    },
    onSuccess: () => {
      setMsg({ kind: 'ok', text: 'Payslip uploaded.' });
      setForm({ ...initial });
      qc.invalidateQueries({ queryKey: ['payslips'] });
    },
    onError: (e: unknown) => {
      const text = (e as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error
        ?? (e as { message?: string }).message
        ?? 'Upload failed';
      setMsg({ kind: 'err', text });
    },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Upload Payslip</h1>
      <Card>
        <form
          onSubmit={(e) => { e.preventDefault(); upload.mutate(form); }}
          className="space-y-4"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Employee</span>
            <select
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            >
              <option value="">Select…</option>
              {employees?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} ({e.user?.email})
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Month"
              type="number"
              min={1}
              max={12}
              required
              value={form.month}
              onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
            />
            <Input
              label="Year"
              type="number"
              min={2000}
              max={2100}
              required
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Gross" type="number" step="0.01" required value={form.grossSalary} onChange={(e) => setForm({ ...form, grossSalary: e.target.value })} />
            <Input label="Deductions" type="number" step="0.01" required value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} />
            <Input label="Net" type="number" step="0.01" required value={form.netSalary} onChange={(e) => setForm({ ...form, netSalary: e.target.value })} />
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">PDF file</span>
            <input
              type="file"
              accept="application/pdf"
              required
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded file:border-0 file:bg-brand-500 file:px-3 file:py-2 file:text-sm file:text-white"
            />
          </label>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={upload.isPending}>
              {upload.isPending ? 'Uploading…' : 'Upload'}
            </Button>
            {msg && (
              <span className={msg.kind === 'ok' ? 'text-sm text-green-700' : 'text-sm text-red-600'}>
                {msg.text}
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
