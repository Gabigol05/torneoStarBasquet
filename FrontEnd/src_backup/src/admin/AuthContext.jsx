import { createContext, useContext, useState, useEffect } from 'react';

const ADMIN_PASSWORD = 'torneo2026'; // cambialo cuando quieras
const SESSION_KEY    = 'ts_admin_auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  });
  const [error, setError] = useState('');

  const login = (password) => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setAuthed(true);
      setError('');
      return true;
    }
    setError('Contraseña incorrecta');
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  };

  return (
    <AuthContext.Provider value={{ authed, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
