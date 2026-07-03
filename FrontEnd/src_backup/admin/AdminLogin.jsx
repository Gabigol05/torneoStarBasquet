import { useState } from 'react';
import { useAuth } from './AuthContext';
import logoTorneo from '../assets/logo_torneo.jpg';

export default function AdminLogin() {
  const { login, error } = useAuth();
  const [pw,      setPw]      = useState('');
  const [loading, setLoading] = useState(false);
  const [shake,   setShake]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = login(pw);
    if (!ok) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    setLoading(false);
  };

  return (
    <div style={S.page}>
      {/* Fondo animado */}
      <div style={S.bgOrb1}/>
      <div style={S.bgOrb2}/>
      <div style={S.grid}/>

      <div style={{ ...S.card, animation: shake ? 'shake 0.4s ease' : 'none' }}>
        {/* Logo real */}
        <div style={S.logoWrap}>
          <div style={S.logoRing}>
            <img src={logoTorneo} alt="Torneo Star Básquet" style={S.logoImg}/>
          </div>
        </div>

        <h1 style={S.title}>TORNEO STAR</h1>
        <p style={S.sub}>Panel de Administración</p>
        <div style={S.divider}/>

        <form onSubmit={handleSubmit} style={{ width:'100%' }}>
          <label style={S.label}>CONTRASEÑA</label>
          <div style={S.inputWrap}>
            <svg style={S.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              type="password"
              placeholder="••••••••"
              value={pw}
              onChange={e => setPw(e.target.value)}
              autoFocus
              style={{ ...S.input, borderColor: error ? '#F04060' : pw ? 'rgba(240,180,41,.4)' : '#1C2535' }}
            />
          </div>

          {error && (
            <div style={S.errorMsg}>
              <span>⚠️</span> {error}
            </div>
          )}

          <button type="submit" disabled={loading || !pw} style={{
            ...S.btn,
            opacity: pw && !loading ? 1 : 0.5,
            transform: loading ? 'scale(0.98)' : 'scale(1)',
          }}>
            {loading ? (
              <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <span style={S.spinner}/>INGRESANDO...
              </span>
            ) : 'INGRESAR →'}
          </button>
        </form>

        <p style={S.footer}>Torneo Star Básquet · Córdoba 2026</p>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-5px)}
          80%{transform:translateX(5px)}
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes orbFloat {
          0%,100%{transform:translate(0,0) scale(1)}
          50%{transform:translate(20px,-20px) scale(1.05)}
        }
        @keyframes logoGlow {
          0%,100%{box-shadow:0 0 20px rgba(240,180,41,.3)}
          50%{box-shadow:0 0 40px rgba(240,180,41,.6)}
        }
      `}</style>
    </div>
  );
}

const S = {
  page: {
    minHeight:'100vh', background:'#080C12',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontFamily:"'Barlow Condensed',sans-serif",
    position:'relative', overflow:'hidden', padding:'20px',
  },
  bgOrb1: {
    position:'absolute', top:'-20%', left:'-10%',
    width:500, height:500, borderRadius:'50%',
    background:'radial-gradient(circle, rgba(240,180,41,.12) 0%, transparent 70%)',
    animation:'orbFloat 8s ease-in-out infinite',
    pointerEvents:'none',
  },
  bgOrb2: {
    position:'absolute', bottom:'-20%', right:'-10%',
    width:400, height:400, borderRadius:'50%',
    background:'radial-gradient(circle, rgba(255,107,43,.1) 0%, transparent 70%)',
    animation:'orbFloat 10s ease-in-out infinite reverse',
    pointerEvents:'none',
  },
  grid: {
    position:'absolute', inset:0,
    backgroundImage:'linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)',
    backgroundSize:'40px 40px',
    pointerEvents:'none',
  },
  card: {
    position:'relative', zIndex:1,
    background:'linear-gradient(135deg, #0E1420 0%, #111827 100%)',
    border:'1px solid rgba(240,180,41,.2)',
    borderRadius:20, padding:'2.5rem 2rem',
    width:'100%', maxWidth:400,
    display:'flex', flexDirection:'column', alignItems:'center',
    boxShadow:'0 24px 80px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.05)',
  },
  logoWrap: { marginBottom:20, position:'relative' },
  logoRing: {
    width:100, height:100, borderRadius:'50%',
    border:'3px solid rgba(240,180,41,.5)',
    padding:3,
    animation:'logoGlow 3s ease-in-out infinite',
    background:'linear-gradient(135deg, rgba(240,180,41,.1), transparent)',
  },
  logoImg:  { width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover', display:'block' },
  title: {
    fontFamily:"'Bebas Neue',sans-serif",
    fontSize:32, letterSpacing:3,
    background:'linear-gradient(135deg, #F0B429, #FF6B2B)',
    WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
    margin:'0 0 4px',
  },
  sub:     { color:'#6B7A99', fontSize:13, margin:'0 0 20px', letterSpacing:1 },
  divider: { width:'100%', height:1, background:'linear-gradient(90deg,transparent,rgba(240,180,41,.3),transparent)', marginBottom:24 },
  label:   { alignSelf:'flex-start', fontSize:10, fontWeight:700, letterSpacing:2, color:'#4A566E', marginBottom:6 },
  inputWrap:{ width:'100%', position:'relative', marginBottom:12 },
  inputIcon:{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'#4A566E' },
  input: {
    width:'100%', padding:'13px 14px 13px 40px',
    background:'#141C2A', border:'1px solid #1C2535',
    borderRadius:10, color:'#EEF2F8', fontSize:16, outline:'none',
    boxSizing:'border-box', transition:'border-color .2s',
    fontFamily:"'Barlow Condensed',sans-serif",
  },
  errorMsg:{ width:'100%', padding:'8px 12px', background:'rgba(240,64,96,.1)', border:'1px solid rgba(240,64,96,.3)', borderRadius:8, color:'#F04060', fontSize:13, marginBottom:12, display:'flex', gap:6, alignItems:'center' },
  btn: {
    width:'100%', padding:'14px',
    background:'linear-gradient(135deg, #F0B429 0%, #FF6B2B 100%)',
    border:'none', borderRadius:10,
    color:'#080C12', fontFamily:"'Bebas Neue',sans-serif",
    fontSize:20, letterSpacing:2, cursor:'pointer',
    transition:'opacity .2s, transform .15s',
    boxShadow:'0 4px 20px rgba(240,180,41,.3)',
  },
  spinner:{ width:16, height:16, border:'2px solid rgba(0,0,0,.3)', borderTopColor:'#080C12', borderRadius:'50%', animation:'spin .8s linear infinite', display:'inline-block' },
  footer:{ marginTop:20, fontSize:11, color:'#2C3A52', letterSpacing:1, textTransform:'uppercase' },
};
