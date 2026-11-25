// Estilos compartidos del panel admin (rediseño 24/11). Todas las secciones
// toman de acá inputs, botones, tarjetas y tablas, así el panel entero tiene
// el mismo lenguaje que el Resumen nuevo y que la web.
const FONT = "'Barlow Condensed',sans-serif";
const BEBAS = "'Bebas Neue',sans-serif";

export const COLORES = {
  fondo: '#06080d', card: '#0b0f18', borde: 'rgba(255,255,255,.08)', texto: '#EEF2F8',
  gris: '#7A879E', grisOsc: '#6B7A99', oro: '#F0B429', azul: '#3b82f6', azulClaro: '#7FB2FF',
  verde: '#2EE08A', rojo: '#FF6B6B', violeta: '#A78BFA',
};

export const UI = {
  label: { display: 'block', marginBottom: 6, fontFamily: FONT, fontSize: 11.5, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: '#7A879E' },
  input: { width: '100%', minHeight: 42, padding: '10px 12px', boxSizing: 'border-box', background: '#0E1420', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: '#EEF2F8', fontFamily: FONT, fontSize: 15, fontWeight: 600, outline: 'none', transition: 'border-color .2s, box-shadow .2s' },
  card: { background: 'linear-gradient(165deg,#111827,#0b0f18)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 18, padding: '18px 20px', marginBottom: 18 },
  cardSuave: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '14px 16px' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 20px', background: 'linear-gradient(135deg,#F0B429,#e8731a)', border: 'none', borderRadius: 10, color: '#0B1018', fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: .6, textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 6px 18px rgba(240,180,41,.18)', whiteSpace: 'nowrap' },
  btnBlue: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 18px', background: '#3b82f6', border: 'none', borderRadius: 10, color: '#fff', fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: .6, textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 6px 18px rgba(59,130,246,.22)', whiteSpace: 'nowrap' },
  btnSec: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, color: '#C7D1DD', fontFamily: FONT, fontSize: 14.5, fontWeight: 700, letterSpacing: .4, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnDanger: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 22px', background: 'linear-gradient(135deg,#F04060,#B8203E)', border: 'none', borderRadius: 10, color: '#fff', fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: .6, textTransform: 'uppercase', cursor: 'pointer' },
  btnDangerSoft: { padding: '6px 12px', background: 'rgba(255,90,90,.1)', border: '1px solid rgba(255,90,90,.28)', borderRadius: 8, color: '#FF6B6B', fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  quickBtn: { padding: '6px 12px', background: 'rgba(255,255,255,.03)', border: '1px solid', borderRadius: 8, fontFamily: FONT, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  iconBtn: { width: 34, height: 34, padding: 0, background: 'rgba(255,255,255,.04)', border: '1px solid', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  th: { padding: '10px 12px', background: 'rgba(255,255,255,.03)', color: '#7A879E', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,.07)' },
  td: { padding: '10px 12px', color: '#EEF2F8', fontFamily: FONT, fontSize: 14.5, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,.05)' },
  tableWrap: { background: 'linear-gradient(165deg,#111827,#0b0f18)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, overflow: 'auto' },
  title: { margin: '0 0 6px', fontFamily: BEBAS, fontWeight: 400, fontSize: 28, letterSpacing: 1, color: '#EEF2F8' },
  hint: { color: '#7A879E', fontFamily: FONT, fontSize: 15, fontWeight: 500, lineHeight: 1.5, marginBottom: 16, maxWidth: 760 },
  warning: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', marginBottom: 16, borderRadius: 12, background: 'rgba(240,180,41,.07)', border: '1px solid rgba(240,180,41,.28)', color: '#E8D9A8', fontFamily: FONT, fontSize: 14.5, fontWeight: 600, lineHeight: 1.45 },
  warningRojo: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', marginBottom: 16, borderRadius: 12, background: 'rgba(255,90,90,.07)', border: '1px solid rgba(255,90,90,.28)', color: '#F5C2C2', fontFamily: FONT, fontSize: 14.5, fontWeight: 600, lineHeight: 1.45 },
  msgOk: { background: 'rgba(46,224,138,.1)', color: '#2EE08A', border: '1px solid rgba(46,224,138,.3)' },
  msgErr: { background: 'rgba(255,90,90,.1)', color: '#FF6B6B', border: '1px solid rgba(255,90,90,.3)' },
  empty: { textAlign: 'center', padding: '3rem 1.5rem', color: '#7A879E', fontFamily: FONT, fontSize: 15 },
  logBox: { marginTop: 20, background: '#080b12', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: '14px 16px', fontFamily: "ui-monospace,Consolas,monospace", fontSize: 12.5, color: '#AEB8CB', maxHeight: 360, overflow: 'auto' },
  chip: on => ({ padding: '7px 14px', borderRadius: 999, border: `1px solid ${on ? '#3b82f6' : 'rgba(255,255,255,.1)'}`, background: on ? '#3b82f6' : 'rgba(255,255,255,.03)', color: on ? '#fff' : '#AEB8CB', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, letterSpacing: .4, cursor: 'pointer', whiteSpace: 'nowrap' }),
};
