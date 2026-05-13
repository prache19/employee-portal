import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Employee } from '../types';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export function Profile() {
  const { user } = useAuth();
  const empId = user?.employee?.id;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['employee', empId],
    queryFn: async () => (await api.get<Employee>(`/employees/${empId}`)).data,
    enabled: !!empId,
  });

  const [form, setForm] = useState({ phone: '', address: '' });
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (data) setForm({ phone: data.phone ?? '', address: data.address ?? '' });
  }, [data]);

  const update = useMutation({
    mutationFn: async (body: { phone: string; address: string }) =>
      (await api.put<Employee>(`/employees/${empId}`, body)).data,
    onSuccess: () => {
      setSavedMsg('Saved!');
      qc.invalidateQueries({ queryKey: ['employee', empId] });
      setTimeout(() => setSavedMsg(''), 2000);
    },
  });

  if (isLoading || !data) return <div className="text-slate-500">Loading profile…</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">My Profile</h1>
      <Card>
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
          <Field label="Name" value={`${data.firstName} ${data.lastName}`} />
          <Field label="Email" value={data.user?.email ?? '—'} />
          <Field label="Designation" value={data.designation} />
          <Field label="Department" value={data.department} />
          <Field label="Date of Joining" value={data.dateOfJoining?.slice(0, 10) ?? '—'} />
          <Field label="Date of Birth" value={data.dateOfBirth?.slice(0, 10) ?? '—'} />
        </div>
      </Card>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-slate-900">Contact Details</h2>
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate(form);
          }}
          className="space-y-4"
        >
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
            <textarea
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              rows={3}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            {savedMsg && <span className="text-sm text-green-700">{savedMsg}</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm text-slate-900">{value}</div>
    </div>
  );
}
