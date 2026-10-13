import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sileo';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { Login } from './pages/Login';
import { Users } from './pages/admin/Users';
import { Settings } from './pages/admin/Settings';
import { Clients } from './pages/admin/Clients';
import { ClientDetail } from './pages/admin/ClientDetail';
import { ClientStock } from './pages/ClientStock';
import { ThemeProvider } from './contexts/ThemeContext';

// Finances & Operations Pages (Cárdenas & Cárdenas)
import { FinancesDashboard } from './modules/finances/pages/FinancesDashboard';
import { ControlMensual } from './modules/finances/pages/ControlMensual';
import { Contabilidades } from './modules/finances/pages/Contabilidades';
import { OpinionesCumplimiento } from './modules/finances/pages/OpinionesCumplimiento';
import { PendientesFiscales } from './modules/finances/pages/PendientesFiscales';
import { CalendarioFiscal } from './modules/finances/pages/CalendarioFiscal';
import { Ingresos } from './modules/finances/pages/Ingresos';
import { Facturas } from './modules/finances/pages/Facturas';
import { Gastos } from './modules/finances/pages/Gastos';
import { CuentasPorPagar } from './modules/finances/pages/CuentasPorPagar';
import { CuentasPorCobrar } from './modules/finances/pages/CuentasPorCobrar';
import { Categorias } from './modules/finances/pages/Categorias';
import { MetodosPago } from './modules/finances/pages/MetodosPago';
import { Transferencias } from './modules/finances/pages/Transferencias';
import { Reportes } from './modules/finances/pages/Reportes';
import { Configuracion } from './modules/finances/pages/Configuracion';
import { QuoteView } from './pages/QuoteView';
import { ReportPayment } from './pages/ReportPayment';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/client-stock/:token" element={<ClientStock />} />
              <Route path="/quote/:token" element={<QuoteView />} />
              <Route path="/report-payment/:token" element={<ReportPayment />} />
              
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Main Application Routes (Unified Single Sidebar Layout) */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                
                {/* 1. Inicio / Dashboard */}
                <Route path="dashboard" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><FinancesDashboard /></ProtectedRoute>} />
                
                {/* 2. Operaciones */}
                <Route path="control-mensual" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><ControlMensual /></ProtectedRoute>} />
                <Route path="contabilidades" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><Contabilidades /></ProtectedRoute>} />
                <Route path="opiniones" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><OpinionesCumplimiento /></ProtectedRoute>} />
                <Route path="pendientes" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><PendientesFiscales /></ProtectedRoute>} />
                <Route path="calendario-fiscal" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><CalendarioFiscal /></ProtectedRoute>} />
                
                {/* 3. Clientes */}
                <Route path="clients" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><Clients /></ProtectedRoute>} />
                <Route path="clients/:id" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><ClientDetail /></ProtectedRoute>} />
                
                {/* 4. Finanzas (In the same unified sidebar layout!) */}
                <Route path="finances" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><FinancesDashboard /></ProtectedRoute>} />
                <Route path="finances/ingresos" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Ingresos /></ProtectedRoute>} />
                <Route path="finances/gastos" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Gastos /></ProtectedRoute>} />
                <Route path="finances/cuentas-por-cobrar" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><CuentasPorCobrar /></ProtectedRoute>} />
                <Route path="finances/cuentas-por-pagar" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><CuentasPorPagar /></ProtectedRoute>} />
                <Route path="finances/transferencias" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Transferencias /></ProtectedRoute>} />
                <Route path="finances/categorias" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Categorias /></ProtectedRoute>} />
                <Route path="finances/metodos-pago" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><MetodosPago /></ProtectedRoute>} />
                <Route path="finances/control-mensual" element={<Navigate to="/control-mensual" replace />} />
                <Route path="finances/facturas" element={<Navigate to="/facturas" replace />} />
                <Route path="finances/reportes" element={<Navigate to="/reportes" replace />} />
                <Route path="finances/configuracion" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Configuracion /></ProtectedRoute>} />
                
                {/* 5. Facturación */}
                <Route path="facturas" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Facturas /></ProtectedRoute>} />
                
                {/* 6. Reportes */}
                <Route path="reportes" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Reportes /></ProtectedRoute>} />
                
                {/* 7. Administración */}
                <Route path="users" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Users /></ProtectedRoute>} />
                <Route path="settings" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><Settings /></ProtectedRoute>} />

                {/* Operations URL Aliases */}
                <Route path="operations/control-mensual" element={<Navigate to="/control-mensual" replace />} />
                <Route path="operations/contabilidades" element={<Navigate to="/contabilidades" replace />} />
                <Route path="operations/opiniones" element={<Navigate to="/opiniones" replace />} />
                <Route path="operations/pendientes" element={<Navigate to="/pendientes" replace />} />
                <Route path="operations/calendario-fiscal" element={<Navigate to="/calendario-fiscal" replace />} />
                <Route path="operations/contadores" element={<Navigate to="/users" replace />} />
              </Route>

              {/* Aliases for /admin/* paths */}
              <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<Navigate to="/dashboard" replace />} />
              <Route path="/admin/users" element={<Navigate to="/users" replace />} />
              <Route path="/admin/settings" element={<Navigate to="/settings" replace />} />
              <Route path="/admin/clients" element={<Navigate to="/clients" replace />} />
              <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
