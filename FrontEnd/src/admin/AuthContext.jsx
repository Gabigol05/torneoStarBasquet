import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authed,  setAuthed]  = useState(false);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError('Email o contrasena incorrectos');
      return false;
    }
    setAuthed(true);
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthed(false);
  };

  return (
    <AuthContext.Provider value={{ authed, loading, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
