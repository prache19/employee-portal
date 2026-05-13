import { useQuery } from '@tanstack/react-query';
import { api, getAccessToken } from '../lib/api';
import type { Payslip } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Download } from 'lucide-react';

const monthName = (m: number) =>
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] ?? `M${m}`;

export function Finance() {
  const { data, isLoading } = useQuery({
    queryKey: ['payslips', 'me'],
    queryFn: async () => (await api.get<Payslip[]>('/payslips')).data,
  });

  async function download(id: string, label: string) {
    const token = getAccessToken();
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'}/payslips/${id}/download`,
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined, credentials: 'include' },
    );
    if (!res.ok) {
      alert('Failed to download payslip');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${label}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Finance</h1>
      <p className="mb-6 text-slate-500">Your salary slips</p>

      {isLoading && <div className="text-slate-500">Loading…</div>}
      {!isLoading && data && data.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">No payslips available yet.</p>
        </Card>
      )}

      {data && data.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3">Period</th>
                <th className="px-6 py-3 text-right">Gross</th>
                <th className="px-6 py-3 text-right">Deductions</th>
                <th className="px-6 py-3 text-right">Net</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {data.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {monthName(p.month)} {p.year}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-700">{p.grossSalary.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right text-slate-700">{p.deductions.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right font-semibold text-slate-900">{p.netSalary.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right">
                    <Button
                      variant="secondary"
                      onClick={() => download(p.id, `payslip_${p.year}_${String(p.month).padStart(2, '0')}`)}
                    >
                      <Download size={14}/> PDF
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
