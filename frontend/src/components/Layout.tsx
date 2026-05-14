import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogOut,
  User,
  Wallet,
  Laptop,
  Users,
  Upload,
  Boxes,
  LayoutDashboard,
  Building2,
} from 'lucide-react';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const isAdmin = user.role === 'HR_ADMIN';

  const name = user.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user.email;
  const initials = (user.employee
    ? `${user.employee.firstName?.[0] ?? ''}${user.employee.lastName?.[0] ?? ''}`
    : user.email.slice(0, 2)
  ).toUpperCase();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-navy-50 text-navy-800'
        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
    }`;

  const renderActiveRail = ({ isActive }: { isActive: boolean }) =>
    isActive ? (
      <span
        aria-hidden
        className="absolute inset-y-1 left-0 w-1 rounded-full bg-brand-gradient"
      />
    ) : null;

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="app-bg flex min-h-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white/80 px-4 py-5 backdrop-blur">
        <div className="mb-6 flex items-center gap-3 px-1">
          <span className="brand-mark">
            <Building2 size={18} />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">Employee Portal</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400">
              {isAdmin ? 'HR Admin' : 'Employee'}
            </div>
          </div>
        </div>

        <nav className="space-y-0.5">
          <NavLink to="/" end className={linkClass}>
            {(state) => (
              <>
                {renderActiveRail(state)}
                <LayoutDashboard size={16} /> Dashboard
              </>
            )}
          </NavLink>
          <NavLink to="/profile" className={linkClass}>
            {(state) => (
              <>
                {renderActiveRail(state)}
                <User size={16} /> Profile
              </>
            )}
          </NavLink>
          <NavLink to="/finance" className={linkClass}>
            {(state) => (
              <>
                {renderActiveRail(state)}
                <Wallet size={16} /> Finance
              </>
            )}
          </NavLink>
          <NavLink to="/assets" className={linkClass}>
            {(state) => (
              <>
                {renderActiveRail(state)}
                <Laptop size={16} /> My Assets
              </>
            )}
          </NavLink>

          {isAdmin && (
            <>
              <div className="mt-5 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                HR Admin
              </div>
              <NavLink to="/admin/employees" className={linkClass}>
                {(state) => (
                  <>
                    {renderActiveRail(state)}
                    <Users size={16} /> Employees
                  </>
                )}
              </NavLink>
              <NavLink to="/admin/payslips" className={linkClass}>
                {(state) => (
                  <>
                    {renderActiveRail(state)}
                    <Upload size={16} /> Upload Payslip
                  </>
                )}
              </NavLink>
              <NavLink to="/admin/assets" className={linkClass}>
                {(state) => (
                  <>
                    {renderActiveRail(state)}
                    <Boxes size={16} /> Manage Assets
                  </>
                )}
              </NavLink>
            </>
          )}
        </nav>

        <div className="mt-auto pt-6">
          <div className="rounded-lg border border-slate-200/70 bg-white p-3 text-xs text-slate-500 shadow-card">
            Signed in as
            <div className="mt-0.5 truncate text-slate-700">{user.email}</div>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-end border-b border-slate-200/70 bg-white/70 px-8 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium leading-tight text-slate-800">{name}</div>
              <div className="text-xs leading-tight text-slate-500">
                {isAdmin ? 'HR Admin' : 'Employee'}
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white shadow-card">
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40"
            >
              <LogOut size={14} /> Log out
            </button>
          </div>
        </header>

        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
