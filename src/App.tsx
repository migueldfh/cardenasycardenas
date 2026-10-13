import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sileo';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { InventoryLayout } from './modules/inventory/layouts/InventoryLayout';
import { Login } from './pages/Login';
import { Dashboard as AdminDashboard } from './pages/admin/Dashboard';
import { Orders } from './pages/admin/Orders';
import { CreateOrder } from './pages/admin/CreateOrder';
import { OrderDetail } from './pages/admin/OrderDetail';
import { Users } from './pages/admin/Users';
import { Settings } from './pages/admin/Settings';
import { InventoryDashboard } from './modules/inventory/pages/InventoryDashboard';
import { RackExplorer } from './modules/inventory/pages/RackExplorer';
import { ProductDetail } from './modules/inventory/pages/ProductDetail';
import { Clients } from './pages/admin/Clients';
import { ClientDetail } from './pages/admin/ClientDetail';
import { ClientStock } from './pages/ClientStock';
import { ProductionLine } from './pages/admin/ProductionLine';
import { Tracking } from './pages/admin/Tracking';
import { ProductionHistory } from './pages/admin/ProductionHistory';
import { MODULES_CONFIG } from './config/modules';
import { ThemeProvider } from './contexts/ThemeContext';

// Finances Module Layout & Pages
import { FinancesLayout } from './modules/finances/layouts/FinancesLayout';
import { FinancesDashboard } from './modules/finances/pages/FinancesDashboard';
import { ControlMensual } from './modules/finances/pages/ControlMensual';
import { Ingresos } from './modules/finances/pages/Ingresos';
import { Facturas } from './modules/finances/pages/Facturas';
import { Gastos } from './modules/finances/pages/Gastos';
import { CuentasPorPagar } from './modules/finances/pages/CuentasPorPagar';
import { CuentasPorCobrar } from './modules/finances/pages/CuentasPorCobrar';
import { Providers } from './pages/admin/Providers';
import { Categorias } from './modules/finances/pages/Categorias';
import { MetodosPago } from './modules/finances/pages/MetodosPago';
import { Transferencias } from './modules/finances/pages/Transferencias';
import { Reportes } from './modules/finances/pages/Reportes';
import { Configuracion } from './modules/finances/pages/Configuracion';
import { QuoteView } from './pages/QuoteView';
import { ReportPayment } from './pages/ReportPayment';
import { ProjectsPage } from './pages/admin/ProjectsPage';
import { Cotizaciones } from './modules/finances/pages/Cotizaciones';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/client-stock/:token" element={<ClientStock />} />
              <Route path="/quote/:token" element={<QuoteView />} />
              <Route path="/report-payment/:token" element={<ReportPayment />} />
              
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Admin Routes */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/projects" replace />} />
                <Route path="dashboard" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="orders" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Orders /></ProtectedRoute>} />
                <Route path="orders/new" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><CreateOrder /></ProtectedRoute>} />
                <Route path="orders/:id" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><OrderDetail /></ProtectedRoute>} />
                <Route path="users" element={<ProtectedRoute allowedRoles={['admin']}><Users /></ProtectedRoute>} />
                <Route path="settings" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><Settings /></ProtectedRoute>} />
                <Route path="clients" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><Clients /></ProtectedRoute>} />
                <Route path="clients/:id" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><ClientDetail /></ProtectedRoute>} />
                <Route path="projects" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><ProjectsPage /></ProtectedRoute>} />
                <Route path="providers" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Providers /></ProtectedRoute>} />
                <Route path="line" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><ProductionLine /></ProtectedRoute>} />
                <Route path="tracking" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><Tracking /></ProtectedRoute>} />
                <Route path="history" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}><ProductionHistory /></ProtectedRoute>} />
              </Route>

              {/* Inventory Routes (separate layout) */}
              {MODULES_CONFIG.inventory.enabled && (
                <Route
                  path="/inventory"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'operator']}>
                      <InventoryLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<InventoryDashboard />} />
                  <Route path="warehouse/:warehouseId" element={<RackExplorer />} />
                  <Route path="product/:productId" element={<ProductDetail />} />
                </Route>
              )}

              {/* Finances Routes (separate layout) */}
              {MODULES_CONFIG.finances.enabled && (
                <Route
                  path="/finances"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'operator', 'project_manager']}>
                      <FinancesLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<ProtectedRoute allowedRoles={['admin', 'operator']}><FinancesDashboard /></ProtectedRoute>} />
                  <Route path="control-mensual" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><ControlMensual /></ProtectedRoute>} />
                  <Route path="ingresos" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Ingresos /></ProtectedRoute>} />
                  <Route path="facturas" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Facturas /></ProtectedRoute>} />
                  <Route path="cotizaciones" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Cotizaciones /></ProtectedRoute>} />
                  <Route path="proyectos" element={<Navigate to="/projects" replace />} />
                  <Route path="gastos" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Gastos /></ProtectedRoute>} />
                  <Route path="cuentas-por-pagar" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><CuentasPorPagar /></ProtectedRoute>} />
                  <Route path="cuentas-por-cobrar" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><CuentasPorCobrar /></ProtectedRoute>} />
                  <Route path="categorias" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Categorias /></ProtectedRoute>} />
                  <Route path="metodos-pago" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><MetodosPago /></ProtectedRoute>} />
                  <Route path="transferencias" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Transferencias /></ProtectedRoute>} />
                  <Route path="reportes" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Reportes /></ProtectedRoute>} />
                  <Route path="configuracion" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><Configuracion /></ProtectedRoute>} />
                </Route>
              )}

              {/* Aliases for /admin/* paths */}
              <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<Navigate to="/dashboard" replace />} />
              <Route path="/admin/orders" element={<Navigate to="/orders" replace />} />
              <Route path="/admin/orders/new" element={<Navigate to="/orders/new" replace />} />
              <Route path="/admin/orders/:id" element={<Navigate to="/orders" replace />} />
              <Route path="/admin/users" element={<Navigate to="/users" replace />} />
              <Route path="/admin/settings" element={<Navigate to="/settings" replace />} />
              <Route path="/admin/clients" element={<Navigate to="/clients" replace />} />
              <Route path="/admin/projects" element={<Navigate to="/projects" replace />} />
              <Route path="/admin/providers" element={<Navigate to="/providers" replace />} />
              <Route path="/admin/line" element={<Navigate to="/line" replace />} />
              <Route path="/admin/tracking" element={<Navigate to="/tracking" replace />} />
              <Route path="/admin/history" element={<Navigate to="/history" replace />} />
              <Route path="/admin/inventory" element={<Navigate to="/inventory" replace />} />
              <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
