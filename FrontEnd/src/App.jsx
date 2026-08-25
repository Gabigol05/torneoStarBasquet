import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { PageHome } from './components/PageHome.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { AuthProvider, useAuth } from './admin/AuthContext.jsx';
import { TemporadaProvider } from './context/TemporadaContext.jsx';
import { initAnalytics, trackPageview } from './lib/analytics.js';

// Google Analytics: inicializa el script una vez y manda una "pageview"
// manual en cada cambio de ruta (necesario en una SPA, sino GA4 solo ve
// la carga inicial). No hace nada si no hay VITE_GA_MEASUREMENT_ID seteado.
function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => { initAnalytics(); }, []);

  useEffect(() => {
    trackPageview(location.pathname + location.search);
  }, [location]);

  return null;
}

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
  // El <Suspense> queda acotado solo a donde realmente hace falta (acá, para
  // el lazy-load del admin) y no envolviendo toda la app — mejor práctica,
  // aunque el crash real de masc/fem no era este (ver ToastSystem.jsx).
  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      {authed ? <AdminPanel /> : <AdminLogin />}
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          {/* Temporadas: compartido por el sitio público (elegir qué
              temporada mirar) y el panel admin (saber cuál es la activa,
              donde cae todo lo nuevo que se carga) — por eso va acá arriba,
              antes de las Routes, y no solo dentro de PageHome. */}
          <TemporadaProvider>
            <AnalyticsTracker />
            <Routes>
              <Route path="/"       element={<PageHome />} />
              <Route path="/admin"  element={<AdminRoute />} />
              <Route path="/admin/*" element={<AdminRoute />} />
            </Routes>
          </TemporadaProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
