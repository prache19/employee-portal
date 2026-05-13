import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRoute } from './components/RoleRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Finance } from './pages/Finance';
import { Assets } from './pages/Assets';
import { AdminEmployees } from './pages/admin/Employees';
import { PayslipUpload } from './pages/admin/PayslipUpload';
import { AssetsAdmin } from './pages/admin/AssetsAdmin';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/assets" element={<Assets />} />
                <Route element={<RoleRoute roles={['HR_ADMIN']} />}>
                  <Route path="/admin/employees" element={<AdminEmployees />} />
                  <Route path="/admin/payslips" element={<PayslipUpload />} />
                  <Route path="/admin/assets" element={<AssetsAdmin />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
