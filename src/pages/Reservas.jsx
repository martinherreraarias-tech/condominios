import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const fmtFecha = (f) => new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
const hhmm = (t) => (t || '').slice(0, 5)
const today = () => new Date().toISOString().slice(0, 10)

export default function Reservas() {
  const { user, memberships, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const m = memberships[0]
  const [areas, setAreas] = useState([])
  const [areaId, setAreaId] = useState('')
  const [ocupadas, setOcupadas] = useState([])
  const [misReservas, setMisReservas] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadAreas() {
    setLoading(true)
    const { data } = await supabase.from('areas_comunes').select('id, nombre, descripcion, capacidad')
      .eq('condominio_id', m.condominio_id).eq('activa', true).order('nombre')
    setAreas(data ?? [])
    setLoading(false)
  }
  async function loadMisReservas() {
    const { data } = await supabase.from('reservas')
      .select('id, fecha, hora_inicio, hora_fin, estado, areas_comunes(nombre)')
      .eq('solicitante_id', user.id).eq('estado', 'confirmada').gte('fecha', today())
      .order('fecha').order('hora_inicio')
    setMisReservas(data ?? [])
  }
  async function loadOcupadas(aId) {
    if (!aId) { setOcupadas([]); return }
    const { data } = await supabase.from('reservas')
      .select('id, fecha, hora_inicio, hora_fin, unidades(identificador)')
      .eq('area_id', aId).eq('estado', 'confirmada').gte('fecha', today())
      .order('fecha').order('hora_inicio')
    setOcupadas(data ?? [])
  }

  useEffect(() => { if (m) { loadAreas(); loadMisReservas() } }, [user])
  useEffect(() => { loadOcupadas(areaId) }, [areaId])

  async function cancelar(id) {
    if (!window.confirm('¿Cancelar esta reserva?')) return
    await supabase.from('reservas').delete().eq('id', id)
    loadMisReservas(); loadOcupadas(areaId)
  }

  function afterReserva() { loadMisReservas(); loadOcupadas(areaId) }

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__brand">Condominios</span>
        <div className="topbar__spacer" />
        <span className="topbar__user">{profile?.email}</span>
        <button className="btn btn--ghost" onClick={signOut}>Cerrar sesión</button>
      </header>

      <div className="container">
        <button className="back-link" onClick={() => navigate('/')}>← Volver</button>
        <div className="page-head">
          <div>
            <h1 className="page-title">Reservar áreas</h1>
            <p className="page-sub">Aparta el salón, la alberca u otra área común.</p>
          </div>
        </div>

        {!m?.unidad_id && (
          <div className="empty"><h3>Sin unidad asignada</h3><p>Pide a tu administrador que te asigne a una unidad para poder reservar.</p></div>
        )}

        {m?.unidad_id && (
          <>
            <section className="panel">
              <div className="panel__head"><span className="panel__title">Elige un área</span></div>
              <div style={{ padding: 18 }}>
                {loading ? 'Cargando…' : areas.length === 0 ? 'Este condominio aún no tiene áreas registradas.' : (
                  <div className="field">
                    <select className="input" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                      <option value="">Selecciona un área…</option>
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}{a.capacidad ? ` (cap. ${a.capacidad})` : ''}</option>)}
                    </select>
                  </div>
                )}
                {areaId && (
                  <ReservaForm
                    area={areas.find((a) => a.id === areaId)} condominioId={m.condominio_id}
                    unidadId={m.unidad_id} solicitanteId={user.id} onReserved={afterReserva}
                  />
                )}
              </div>
            </section>

            {areaId && (
              <section className="panel">
                <div className="panel__head"><span className="panel__title">Horarios ya reservados</span></div>
                {ocupadas.length === 0 ? <div className="panel-empty">Esta área está libre. ¡Reserva el primero!</div>
                  : ocupadas.map((r) => (
                    <div className="list-item" key={r.id}>
                      <div className="list-item__main">
                        <div className="list-item__name">{fmtFecha(r.fecha)}</div>
                        <div className="list-item__sub">{hhmm(r.hora_inicio)}–{hhmm(r.hora_fin)}</div>
                      </div>
                      <span className="pill">{r.unidades?.identificador || 'Ocupado'}</span>
                    </div>
                  ))}
              </section>
            )}

            <section className="panel">
              <div className="panel__head"><span className="panel__title">Mis reservas</span></div>
              {misReservas.length === 0 ? <div className="panel-empty">No tienes reservas próximas.</div>
                : misReservas.map((r) => (
                  <div className="list-item" key={r.id}>
                    <div className="list-item__main">
                      <div className="list-item__name">{r.areas_comunes?.nombre}</div>
                      <div className="list-item__sub">{fmtFecha(r.fecha)} · {hhmm(r.hora_inicio)}–{hhmm(r.hora_fin)}</div>
                    </div>
                    <button className="link-btn link-btn--danger" onClick={() => cancelar(r.id)}>Cancelar</button>
                  </div>
                ))}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function ReservaForm({ area, condominioId, unidadId, solicitanteId, onReserved }) {
  const [fecha, setFecha] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setOk('')
    if (fin <= inicio) { setError('La hora de fin debe ser mayor que la de inicio.'); return }
    setBusy(true)
    const { error } = await supabase.from('reservas').insert({
      condominio_id: condominioId, area_id: area.id, unidad_id: unidadId,
      solicitante_id: solicitanteId, fecha, hora_inicio: inicio, hora_fin: fin, estado: 'confirmada',
    })
    setBusy(false)
    if (error) {
      setError(error.message.includes('ya está reservado') ? 'Ese horario ya está reservado para esta área.' : error.message)
    } else {
      setOk('¡Reserva confirmada!'); setFecha(''); setInicio(''); setFin('')
      onReserved()
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
      <div className="field"><label>Fecha</label>
        <input className="input" type="date" min={today()} value={fecha} onChange={(e) => setFecha(e.target.value)} required /></div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="field" style={{ flex: 1 }}><label>Desde</label>
          <input className="input" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} required /></div>
        <div className="field" style={{ flex: 1 }}><label>Hasta</label>
          <input className="input" type="time" value={fin} onChange={(e) => setFin(e.target.value)} required /></div>
      </div>
      {error && <p className="form-error">{error}</p>}
      {ok && <p style={{ color: 'var(--brand-700)', fontSize: 14, marginBottom: 10 }}>{ok}</p>}
      <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Reservando…' : `Reservar ${area?.nombre || ''}`}</button>
    </form>
  )
}
