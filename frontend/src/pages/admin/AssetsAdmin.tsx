import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Asset, Employee } from '../../types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

interface CreateForm {
  assetTag: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
}

const empty: CreateForm = { assetTag: '', type: 'LAPTOP', brand: '', model: '', serialNumber: '' };

export function AssetsAdmin() {
  const qc = useQueryClient();
  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets', 'all'],
    queryFn: async () => (await api.get<Asset[]>('/assets')).data,
  });
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => (await api.get<Employee[]>('/employees')).data,
  });

  const [form, setForm] = useState<CreateForm>(empty);

  const create = useMutation({
    mutationFn: async (b: CreateForm) => (await api.post('/assets', b)).data,
    onSuccess: () => {
      setForm(empty);
      qc.invalidateQueries({ queryKey: ['assets', 'all'] });
    },
  });
  const assign = useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) =>
      (await api.post(`/assets/${id}/assign`, { employeeId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', 'all'] }),
  });
  const ret = useMutation({
    mutationFn: async (id: string) => (await api.post(`/assets/${id}/return`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', 'all'] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/assets/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', 'all'] }),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Manage Assets</h1>

      <Card className="mb-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Add asset</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}
          className="grid grid-cols-1 gap-4 md:grid-cols-5"
        >
          <Input label="Asset tag" required value={form.assetTag} onChange={(e) => setForm({ ...form, assetTag: e.target.value })} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Type</span>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option>LAPTOP</option>
              <option>MONITOR</option>
              <option>PHONE</option>
              <option>HEADSET</option>
              <option>OTHER</option>
            </select>
          </label>
          <Input label="Brand" required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <Input label="Model" required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <Input label="Serial #" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
          <div className="md:col-span-5">
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Adding…' : 'Add asset'}</Button>
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
                <th className="px-6 py-3">Tag</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Brand / Model</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Holder</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets?.map((a) => (
                <AssetRow
                  key={a.id}
                  asset={a}
                  employees={employees ?? []}
                  onAssign={(employeeId) => assign.mutate({ id: a.id, employeeId })}
                  onReturn={() => ret.mutate(a.id)}
                  onDelete={() => { if (confirm('Delete this asset?')) remove.mutate(a.id); }}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function AssetRow({
  asset,
  employees,
  onAssign,
  onReturn,
  onDelete,
}: {
  asset: Asset;
  employees: Employee[];
  onAssign: (employeeId: string) => void;
  onReturn: () => void;
  onDelete: () => void;
}) {
  const [pick, setPick] = useState('');
  return (
    <tr>
      <td className="px-6 py-3 font-mono text-xs text-slate-600">{asset.assetTag}</td>
      <td className="px-6 py-3 text-slate-700">{asset.type}</td>
      <td className="px-6 py-3 text-slate-900">{asset.brand} {asset.model}</td>
      <td className="px-6 py-3">
        <span className={
          asset.status === 'ASSIGNED' ? 'rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700' :
          asset.status === 'AVAILABLE' ? 'rounded bg-green-50 px-2 py-0.5 text-xs text-green-700' :
          'rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700'
        }>
          {asset.status}
        </span>
      </td>
      <td className="px-6 py-3 text-slate-700">
        {asset.currentEmployee ? `${asset.currentEmployee.firstName} ${asset.currentEmployee.lastName}` : '—'}
      </td>
      <td className="px-6 py-3">
        {asset.status === 'ASSIGNED' ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onReturn}>Return</Button>
            <Button variant="danger" onClick={onDelete}>Delete</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <select
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
            >
              <option value="">Assign to…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
              ))}
            </select>
            <Button disabled={!pick} onClick={() => pick && onAssign(pick)}>Assign</Button>
            <Button variant="danger" onClick={onDelete}>Delete</Button>
          </div>
        )}
      </td>
    </tr>
  );
}
