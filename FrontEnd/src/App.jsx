import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PageHome } from './components/PageHome.jsx';
import AdminPanel from './admin/AdminPanel.jsx';
import AdminLogin from './admin/AdminLogin.jsx';
import { AuthProvider, useAuth } from './admin/AuthContext.jsx';

function AdminRoute() {
  const { authed } = useAuth();
  return authed ? <AdminPanel /> : <AdminLogin />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"       element={<PageHome />} />
          <Route path="/admin"  element={<AdminRoute />} />
          <Route path="/admin/*" element={<AdminRoute />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
