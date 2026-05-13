import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { User, Wallet, Laptop, Users, Upload, Boxes } from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  const isAdmin = user.role === 'HR_ADMIN';
  const name = user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Welcome, {name}</h1>
      <p className="mb-8 text-slate-500">
        {isAdmin ? 'Manage employees, payslips, and assets from one place.' : 'Your personal dashboard'}
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TileLink to="/profile" icon={<User size={20} />} title="Profile" subtitle="Your personal details" />
        <TileLink to="/finance" icon={<Wallet size={20} />} title="Finance" subtitle="View and download payslips" />
        <TileLink to="/assets" icon={<Laptop size={20} />} title="Assets" subtitle="Equipment assigned to you" />
        {isAdmin && (
          <>
            <TileLink to="/admin/employees" icon={<Users size={20} />} title="Employees" subtitle="Add and manage staff" />
            <TileLink to="/admin/payslips" icon={<Upload size={20} />} title="Upload Payslip" subtitle="Distribute monthly slips" />
            <TileLink to="/admin/assets" icon={<Boxes size={20} />} title="Manage Assets" subtitle="Inventory and assignments" />
          </>
        )}
      </div>
    </div>
  );
}

function TileLink({ to, icon, title, subtitle }: { to: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Link to={to}>
      <Card className="transition hover:border-brand-500 hover:shadow-md">
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-50 text-brand-600">
          {icon}
        </div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">{subtitle}</div>
      </Card>
    </Link>
  );
}
