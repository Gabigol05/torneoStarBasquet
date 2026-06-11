import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';

// Mapa nombre→id para buscar jugadoras
const JUGADORAS_MAP = {};
for (const eq of equiposFemenino) {
  for (const j of eq.jugadoras) {
    JUGADORAS_MAP[j.nombre.toLowerCase().trim()] = j.id;
  }
}

const COLUMNAS_REQUERIDAS = ['jugadora', 'pj', 'pts', 'reb', 'ast'];
const COLUMNAS_OPCIONALES  = ['rob', 'tap', 'fgp', 'tpp', 'tlp'];

function normalizar(val) {
  return val === undefined || val === null || val === '' ? 0 : Number(val);
}

export default function ExcelUpload() {
  const [rows, setRows]           = useState([]);
  const [errors, setErrors]       = useState([]);
  const [warnings, setWarnings]   = useState([]);
  const [fileName, setFileName]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [published, setPublished] = useState(false);
  const fileRef                   = useRef();

  const reset = () => {
    setRows([]); setErrors([]); setWarnings([]);
    setFileName(''); setPublished(false);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    reset();
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb   = XLSX.read(ev.target.result, { type: 'binary' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (data.length === 0) {
        setErrors(['El archivo está vacío o no tiene datos en la primera hoja.']);
        return;
      }

      // Normalizar headers a minúsculas sin espacios
      const normalized = data.map(row => {
        const n = {};
        for (const k of Object.keys(row)) {
          n[k.toLowerCase().trim()] = row[k];
        }
        return n;
      });

      // Validar columnas requeridas
      const cols = Object.keys(normalized[0]);
      const missing = COLUMNAS_REQUERIDAS.filter(c => !cols.includes(c));
      if (missing.length > 0) {
        setErrors([`Faltan columnas requeridas: ${missing.join(', ')}`]);
        return;
      }

      const errs = [], warns = [], parsed = [];
      normalized.forEach((row, i) => {
        const nombreRaw = String(row['jugadora'] || '').trim();
        if (!nombreRaw) { warns.push(`Fila ${i+2}: jugadora vacía, ignorada`); return; }

        const jugId = JUGADORAS_MAP[nombreRaw.toLowerCase()];
        if (!jugId) {
          warns.push(`Fila ${i+2}: "${nombreRaw}" no encontrada en el plantel (se ignorará)`);
          return;
        }

        parsed.push({
          jugadora_id: jugId,
          nombre:      nombreRaw,
          pj:  normalizar(row.pj),
          pts: normalizar(row.pts),
          reb: normalizar(row.reb),
          ast: normalizar(row.ast),
          rob: normalizar(row.rob),
          tap: normalizar(row.tap),
          fgp: normalizar(row.fgp),
          tpp: normalizar(row.tpp),
          tlp: normalizar(row.tlp),
        });
      });

      setErrors(errs);
      setWarnings(warns);
      setRows(parsed);
    };
    reader.readAsBinaryString(file);
  };

  const handlePublish = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      const upsertData = rows.map(r => ({
        jugadora_id: r.jugadora_id,
        pj: r.pj, pts: r.pts, reb: r.reb, ast: r.ast,
        rob: r.rob, tap: r.tap, fgp: r.fgp, tpp: r.tpp, tlp: r.tlp,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('estadisticas_femenino')
        .upsert(upsertData, { onConflict: 'jugadora_id' });

      if (error) throw error;
      setPublished(true);
    } catch (err) {
      setErrors([`Error al publicar: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={styles.sectionTitle}>📊 Cargar estadísticas desde Excel</h2>
      <p style={styles.hint}>
        El Excel debe tener una columna <code>jugadora</code> con el nombre exacto,
        y columnas: <code>pj, pts, reb, ast</code> (obligatorias) +
        <code> rob, tap, fgp, tpp, tlp</code> (opcionales).
      </p>

      {/* Drop zone */}
      {!published && (
        <div
          style={styles.dropZone}
          onClick={() => fileRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); fileRef.current.files = e.dataTransfer.files; handleFile({ target: e.dataTransfer }); }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
          <p style={{ color: '#EEF2F8', margin: 0 }}>
            {fileName || 'Arrastrá el Excel acá o hacé click para seleccionar'}
          </p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
        </div>
      )}

      {/* Errores */}
      {errors.length > 0 && (
        <div style={styles.errorBox}>
          {errors.map((e, i) => <p key={i} style={{ margin: '4px 0' }}>❌ {e}</p>)}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={styles.warnBox}>
          <p style={{ margin: '0 0 6px', fontWeight: 600 }}>⚠️ Advertencias ({warnings.length})</p>
          {warnings.map((w, i) => <p key={i} style={{ margin: '2px 0', fontSize: 13 }}>{w}</p>)}
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && !published && (
        <>
          <div style={styles.previewHeader}>
            <span style={{ color: '#22D07A', fontWeight: 600 }}>✅ {rows.length} jugadoras listas para publicar</span>
            <button onClick={reset} style={styles.btnSecondary}>Cancelar</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Jugadora','PJ','PTS','REB','AST','ROB','TAP','FG%','3P%','TL%'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#0E1420' : '#141C2A' }}>
                    <td style={{...styles.td, textAlign:'left', color:'#EEF2F8'}}>{r.nombre}</td>
                    <td style={styles.td}>{r.pj}</td>
                    <td style={{...styles.td, color:'#F0B429', fontWeight:600}}>{r.pts}</td>
                    <td style={styles.td}>{r.reb}</td>
                    <td style={styles.td}>{r.ast}</td>
                    <td style={styles.td}>{r.rob}</td>
                    <td style={styles.td}>{r.tap}</td>
                    <td style={styles.td}>{r.fgp}</td>
                    <td style={styles.td}>{r.tpp}</td>
                    <td style={styles.td}>{r.tlp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handlePublish}
            disabled={loading}
            style={styles.btnPublish}
          >
            {loading ? 'Publicando...' : `🚀 PUBLICAR ${rows.length} JUGADORAS`}
          </button>
        </>
      )}

      {/* Éxito */}
      {published && (
        <div style={styles.successBox}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h3 style={{ color: '#22D07A', margin: '0 0 8px' }}>¡Publicado exitosamente!</h3>
          <p style={{ color: '#6B7A99', margin: '0 0 20px' }}>
            {rows.length} jugadoras actualizadas. El sitio ya muestra los nuevos datos.
          </p>
          <button onClick={reset} style={styles.btnSecondary}>Cargar otro archivo</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  sectionTitle: { color: '#F0B429', fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 1, marginBottom: 8 },
  hint:         { color: '#6B7A99', fontSize: 13, marginBottom: 24, lineHeight: 1.6 },
  dropZone: {
    border: '2px dashed #1C2535', borderRadius: 12, padding: '2.5rem 1rem',
    textAlign: 'center', cursor: 'pointer', marginBottom: 20,
    transition: 'border-color 0.2s',
  },
  errorBox: { background: 'rgba(240,64,96,0.1)', border: '1px solid rgba(240,64,96,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#F04060', fontSize: 14 },
  warnBox:  { background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#F0B429', fontSize: 14 },
  previewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  table:    { width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 20 },
  th:       { background: '#141C2A', color: '#6B7A99', padding: '8px 12px', textAlign: 'center', fontSize: 12, letterSpacing: 0.5 },
  td:       { padding: '8px 12px', textAlign: 'center', color: '#EEF2F8', borderBottom: '1px solid #1C2535' },
  btnPublish: {
    width: '100%', padding: '14px', background: 'linear-gradient(135deg, #F0B429, #FF6B2B)',
    border: 'none', borderRadius: 10, color: '#080C12',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 1,
    cursor: 'pointer', marginTop: 8,
  },
  btnSecondary: {
    padding: '8px 20px', background: 'transparent', border: '1px solid #4A566E',
    borderRadius: 8, color: '#6B7A99', cursor: 'pointer', fontSize: 14,
  },
  successBox: {
    textAlign: 'center', padding: '3rem 1rem',
    background: 'rgba(34,208,122,0.05)', border: '1px solid rgba(34,208,122,0.2)',
    borderRadius: 12,
  },
};
