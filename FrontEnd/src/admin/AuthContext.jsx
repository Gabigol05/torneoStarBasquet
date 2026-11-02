import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// ⚠️ Seguridad (revisión general): antes el panel dejaba entrar a CUALQUIER
// cuenta logueada. Ahora además se pregunta a la base si la cuenta está en
// la lista de administradores (función is_admin(), seguridad_paso1.sql). Si
// esa función todavía no existe (SQL sin aplicar), se deja pasar como antes
// para no trabar a nadie; la base igual bloquea cualquier cambio de una
// cuenta que no sea admin.
async function esAdmin() {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) {
    const falta = error.code === 'PGRST202' || /Could not find the function/i.test(error.message ?? '');
    return falta ? true : false;
  }
  return data === true;
}

export function AuthProvider({ children }) {
  const [authed,  setAuthed]  = useState(false);
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session && !(await esAdmin())) {
        await supabase.auth.signOut();
        setError('Esta cuenta no tiene permiso de administrador');
        setAuthed(false);
        setUser(null);
      } else {
        setAuthed(!!data.session);
        setUser(data.session?.user ?? null);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    setError('');
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError('Email o contrasena incorrectos');
      return false;
    }
    if (!(await esAdmin())) {
      await supabase.auth.signOut();
      setError('Esta cuenta no tiene permiso de administrador');
      return false;
    }
    setAuthed(true);
    setUser(data.user ?? null);
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthed(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ authed, user, loading, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
