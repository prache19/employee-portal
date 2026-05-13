import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Employee } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Trash2 } from 'lucide-react';

interface CreateForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  phone: string;
}

const empty: CreateForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  designation: '',
  department: '',
  dateOfJoining: new Date().toISOString().slice(0, 10),
  phone: '',
};

export function AdminEmployees() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => (await api.get<Employee[]>('/employees')).data,
  });

  const [form, setForm] = useState<CreateForm>(empty);
  const [err, setErr] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async (body: CreateForm) => (await api.post('/employees', body)).data,
    onSuccess: () => {
      setForm(empty);
      setErr(null);
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Create failed';
      setErr(msg);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/employees/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Employees</h1>

      <Card className="mb-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Add new employee</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Input label="First name" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <Input label="Last name" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <Input label="Designation" required value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          <Input label="Department" required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <Input label="Date of joining" type="date" required value={form.dateOfJoining} onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Adding…' : 'Add employee'}
            </Button>
            {err && <span className="text-sm text-red-600">{err}</span>}
          </div>
        </form>
      </Card>

      {isLoading ? (
        <div className="text-slate-500">Loading…</div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Designation</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.map((e) => (
                <tr key={e.id}>
                  <td className="px-6 py-3 font-medium text-slate-900">{e.firstName} {e.lastName}</td>
                  <td className="px-6 py-3 text-slate-700">{e.user?.email}</td>
                  <td className="px-6 py-3 text-slate-700">{e.designation}</td>
                  <td className="px-6 py-3 text-slate-700">{e.department}</td>
                  <td className="px-6 py-3 text-slate-700">{e.user?.role}</td>
                  <td className="px-6 py-3 text-right">
                    <Button
                      variant="danger"
                      onClick={() => { if (confirm('Delete this employee and their user account?')) remove.mutate(e.id); }}
                    >
                      <Trash2 size={14}/> Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
