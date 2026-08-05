import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PageHome } from './components/PageHome.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { AuthProvider, useAuth } from './admin/AuthContext.jsx';

// El panel admin (con el parser de Excel, xlsx incluido, ~500KB+) antes se
// importaba de forma estática y quedaba metido en el bundle principal, así
// que cualquier visitante del sitio público lo descargaba sin usarlo nunca.
// Con lazy() ese código solo se pide cuando alguien entra de verdad a /admin.
const AdminPanel = lazy(() => import('./admin/AdminPanel.jsx'));
const AdminLogin = lazy(() => import('./admin/AdminLogin.jsx'));

function AdminLoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#08101a', color: '#8899BB', fontFamily: "'Barlow Condensed',sans-serif",
    }}>
      Cargando…
    </div>
  );
}

function AdminRoute() {
  const { authed, loading } = useAuth();
  // Antes, mientras supabase.auth.getSession() todavía no resolvía, "authed"
  // arrancaba en false y un admin ya logueado veía un flash del formulario
  // de login antes de que la sesión se confirmara. Ahora se espera a loading.
  if (loading) return <AdminLoadingFallback />;
  return authed ? <AdminPanel /> : <AdminLogin />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<AdminLoadingFallback />}>
            <Routes>
              <Route path="/"       element={<PageHome />} />
              <Route path="/admin"  element={<AdminRoute />} />
              <Route path="/admin/*" element={<AdminRoute />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
