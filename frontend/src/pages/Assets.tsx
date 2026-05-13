import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Asset } from '../types';
import { Card } from '../components/ui/Card';

export function Assets() {
  const { data, isLoading } = useQuery({
    queryKey: ['assets', 'me'],
    queryFn: async () => (await api.get<Asset[]>('/assets')).data,
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">My Assets</h1>
      <p className="mb-6 text-slate-500">Equipment currently assigned to you</p>

      {isLoading && <div className="text-slate-500">Loading…</div>}
      {!isLoading && data && data.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">No assets are currently assigned to you.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.map((a) => (
          <Card key={a.id}>
            <div className="text-xs font-mono text-slate-500">{a.assetTag}</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{a.brand} {a.model}</div>
            <div className="text-sm text-slate-600">{a.type}</div>
            {a.serialNumber && <div className="mt-2 text-xs text-slate-500">S/N: {a.serialNumber}</div>}
            {a.assignedAt && (
              <div className="mt-1 text-xs text-slate-500">
                Assigned: {new Date(a.assignedAt).toLocaleDateString()}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
