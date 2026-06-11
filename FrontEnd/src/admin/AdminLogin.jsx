import { useState } from 'react';
import { useAuth } from './AuthContext';

export default function AdminLogin() {
  const { login, error } = useAuth();
  const [pw, setPw] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    login(pw);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080C12',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Barlow Condensed', sans-serif",
    }}>
      <div style={{
        background: '#0E1420',
        border: '1px solid rgba(240,180,41,0.2)',
        borderRadius: 16,
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: 380,
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ fontSize: 42, marginBottom: 8 }}>🏀</div>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          color: '#F0B429',
          fontSize: 28,
          letterSpacing: 2,
          marginBottom: 4,
        }}>
          TORNEO STAR
        </h1>
        <p style={{ color: '#6B7A99', fontSize: 14, marginBottom: 32 }}>
          Panel de Administración
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Contraseña"
            value={pw}
            onChange={e => setPw(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141C2A',
              border: error ? '1px solid #F04060' : '1px solid #1C2535',
              borderRadius: 8,
              color: '#EEF2F8',
              fontSize: 16,
              marginBottom: 12,
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          {error && (
            <p style={{ color: '#F04060', fontSize: 13, marginBottom: 12 }}>{error}</p>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #F0B429, #FF6B2B)',
              border: 'none',
              borderRadius: 8,
              color: '#080C12',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 18,
              letterSpacing: 1,
              cursor: 'pointer',
            }}
          >
            INGRESAR
          </button>
        </form>
      </div>
    </div>
  );
}
