import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

// Configura tus credenciales reales que ya probamos
const SUPABASE_URL = 'https://weveobptegokulxsqsuf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_S_ajr8bsxkMaSeUalyhkSA_Jo591cyp'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function ListaFechas() {
  const [fechas, setFechas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function obtenerFechas() {
      try {
        // Hacemos la consulta a la tabla 'fechas_femenino' ordenada por el número de fecha
        const { data, error } = await supabase
          .from('fechas_femenino')
          .select('*')
          .order('numero', { ascending: true })

        if (error) throw error

        setFechas(data)
      } catch (error) {
        console.error('Error al traer las fechas de Supabase:', error.message)
      } finally {
        setCargando(false)
      }
    }

    obtenerFechas()
  }, [])

  if (cargando) return <p>Cargando calendario del torneo...</p>

  return (
    <div style={{ padding: '20px' }}>
      <h2>📅 Fixture - Torneo Star Básquet</h2>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {fechas.map((fecha) => (
          <li 
            key={fecha.id} 
            style={{ 
              background: '#f3f4f6', 
              margin: '10px 0', 
              padding: '15px', 
              borderRadius: '8px',
              borderLeft: '5px solid #ff6b6b' 
            }}
          >
            <strong>{fecha.descripcion}</strong> (Número de fecha: {fecha.numero})
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ListaFechas;