import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { User, Wallet, Laptop, Users, Upload, Boxes, ChevronRight } from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  const isAdmin = user.role === 'HR_ADMIN';
  const name = user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome, {name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin ? 'Manage employees, payslips, and assets from one place.' : 'Your personal dashboard'}
        </p>
        <div className="mt-4 h-1 w-16 rounded-full bg-brand-gradient" />
      </div>

      {!isAdmin ? (
        <Section title="My workspace">
          <TileLink to="/profile" icon={<User size={20} />} title="Profile" subtitle="Your personal details" />
          <TileLink to="/finance" icon={<Wallet size={20} />} title="Finance" subtitle="View and download payslips" />
          <TileLink to="/assets" icon={<Laptop size={20} />} title="Assets" subtitle="Equipment assigned to you" />
        </Section>
      ) : (
        <>
          <Section title="My workspace">
            <TileLink to="/profile" icon={<User size={20} />} title="Profile" subtitle="Your personal details" />
            <TileLink to="/finance" icon={<Wallet size={20} />} title="Finance" subtitle="View and download payslips" />
            <TileLink to="/assets" icon={<Laptop size={20} />} title="Assets" subtitle="Equipment assigned to you" />
          </Section>
          <Section title="HR administration" className="mt-8">
            <TileLink to="/admin/employees" icon={<Users size={20} />} title="Employees" subtitle="Add and manage staff" />
            <TileLink to="/admin/payslips" icon={<Upload size={20} />} title="Upload Payslip" subtitle="Distribute monthly slips" />
            <TileLink to="/admin/assets" icon={<Boxes size={20} />} title="Manage Assets" subtitle="Inventory and assignments" />
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{children}</div>
    </section>
  );
}

function TileLink({
  to,
  icon,
  title,
  subtitle,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link to={to} className="group block">
      <Card className="relative transition duration-200 group-hover:-translate-y-0.5 group-hover:border-navy-300 group-hover:shadow-elevated">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-card">
          {icon}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>
          </div>
          <ChevronRight
            size={16}
            className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-navy-500"
          />
        </div>
      </Card>
    </Link>
  );
}
