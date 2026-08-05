import { Component } from 'react';

// Red de contención para toda la app: si algún componente revienta al
// renderizar (undefined.algo, un hook mal usado, datos inesperados de
// Supabase, etc.), antes esto tiraba la SPA entera a pantalla blanca sin
// ninguna forma de recuperarse salvo que el usuario supiera recargar a mano.
// Ahora se muestra una pantalla de "algo salió mal" con botón para reintentar.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Error atrapado:', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Si se pasa un fallback (para envolver una sección puntual, como un
      // gráfico), se usa eso en vez de tumbar toda la pantalla — así un error
      // aislado (por ej. de una librería de terceros) no rompe el resto del sitio.
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          background: '#08101a', color: '#EEF2F8', padding: '32px 20px', gap: 14,
        }}>
          <div style={{ fontSize: 44 }}>🏀</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: 1 }}>
            Algo salió mal
          </div>
          <div style={{ color: '#8899BB', fontSize: 14, maxWidth: 360 }}>
            Hubo un error inesperado al cargar esta sección. Probá recargar la página.
          </div>
          <button
            onClick={this.handleReload}
            style={{
              marginTop: 8, background: '#F0B429', color: '#08101a', border: 'none',
              borderRadius: 8, padding: '10px 22px', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 0.5,
            }}>
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
