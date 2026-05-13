import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Wallet, Laptop, Users, Upload, Boxes, LayoutDashboard } from 'lucide-react';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const isAdmin = user.role === 'HR_ADMIN';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
      isActive ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'
    }`;

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-full">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="mb-6 px-3">
          <div className="text-lg font-semibold text-slate-900">Employee Portal</div>
          <div className="text-xs text-slate-500">{user.email}</div>
          <div className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
            {isAdmin ? 'HR Admin' : 'Employee'}
          </div>
        </div>
        <nav className="space-y-1">
          <NavLink to="/" end className={linkClass}><LayoutDashboard size={16}/> Dashboard</NavLink>
          <NavLink to="/profile" className={linkClass}><User size={16}/> Profile</NavLink>
          <NavLink to="/finance" className={linkClass}><Wallet size={16}/> Finance</NavLink>
          <NavLink to="/assets" className={linkClass}><Laptop size={16}/> My Assets</NavLink>
          {isAdmin && (
            <>
              <div className="mt-4 px-3 text-xs uppercase tracking-wide text-slate-400">HR Admin</div>
              <NavLink to="/admin/employees" className={linkClass}><Users size={16}/> Employees</NavLink>
              <NavLink to="/admin/payslips" className={linkClass}><Upload size={16}/> Upload Payslip</NavLink>
              <NavLink to="/admin/assets" className={linkClass}><Boxes size={16}/> Manage Assets</NavLink>
            </>
          )}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-6 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          <LogOut size={16}/> Log out
        </button>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
