import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const fmtFecha = (f) => new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
const hhmm = (t) => (t || '').slice(0, 5)
const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })

function reglasResumen(a) {
  const parts = []
  if (a.capacidad) parts.push(`cap. ${a.capacidad}`)
  if (a.dias_repetibilidad > 0) parts.push(`cada ${a.dias_repetibilidad} días`)
  parts.push(a.permite_con_adeudo ? 'permite con adeudo' : 'bloquea con adeudo')
  if (Number(a.costo_uso) > 0) parts.push(`uso ${money(a.costo_uso)}`)
  return parts.join(' · ')
}

export default function CondominioAreas() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [cond, setCond] = useState(null)
  const [areas, setAreas] = useState([])
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)
  const [editArea, setEditArea] = useState(null)   // objeto area o {} para nueva
  const [bloqArea, setBloqArea] = useState(null)

  async function load() {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const { data: c } = await supabase.from('condominios').select('id, nombre').eq('id', id).maybeSingle()
    const { data: ar } = await supabase.from('areas_comunes').select('*').eq('condominio_id', id).order('nombre')
    const { data: re } = await supabase.from('reservas')
      .select('id, fecha, hora_inicio, hora_fin, areas_comunes(nombre), unidades(identificador)')
      .eq('condominio_id', id).eq('estado', 'confirmada').gte('fecha', today)
      .order('fecha').order('hora_inicio')
    setCond(c); setAreas(ar ?? []); setReservas(re ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [id])

  async function toggleActiva(area) {
    await supabase.from('areas_comunes').update({ activa: !area.activa }).eq('id', area.id); load()
  }
  async function borrarArea(area) {
    if (!window.confirm(`¿Borrar el área "${area.nombre}"? Se eliminarán también sus reservas.`)) return
    const { error } = await supabase.from('areas_comunes').delete().eq('id', area.id)
    if (error) alert('No se pudo borrar: ' + error.message); else load()
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__brand">Condominios</span>
        <div className="topbar__spacer" />
        <span className="topbar__user">{profile?.email}</span>
        <button className="btn btn--ghost" onClick={signOut}>Cerrar sesión</button>
      </header>

      <div className="container">
        <button className="back-link" onClick={() => navigate(`/condominio/${id}`)}>← Volver al condominio</button>
        <div className="page-head">
          <div>
            <h1 className="page-title">Áreas comunes</h1>
            <p className="page-sub">{cond?.nombre}</p>
          </div>
          <button className="btn btn--primary" onClick={() => setEditArea({})}>+ Nueva área</button>
        </div>

        <section className="panel">
          <div className="panel__head"><span className="panel__title">Áreas y reglas</span></div>
          {loading ? <div className="panel-empty">Cargando…</div>
            : areas.length === 0 ? <div className="panel-empty">Aún no hay áreas. Crea la primera.</div>
            : areas.map((a) => (
              <div className="list-item" key={a.id}>
                <div className="list-item__main">
                  <div className="list-item__name">{a.nombre}</div>
                  <div className="list-item__sub">{reglasResumen(a)}</div>
                </div>
                <span className={`pill ${a.activa ? 'pill--ok' : 'pill--danger'}`}>{a.activa ? 'Activa' : 'Inactiva'}</span>
                <button className="link-btn" onClick={() => setEditArea(a)}>Editar</button>
                <button className="link-btn" onClick={() => setBloqArea(a)}>Bloqueos</button>
                <button className="link-btn" onClick={() => toggleActiva(a)}>{a.activa ? 'Desactivar' : 'Activar'}</button>
                <button className="link-btn link-btn--danger" onClick={() => borrarArea(a)}>Borrar</button>
              </div>
            ))}
        </section>

        <section className="panel">
          <div className="panel__head"><span className="panel__title">Próximas reservas</span></div>
          {reservas.length === 0 ? <div className="panel-empty">No hay reservas próximas.</div>
            : reservas.map((r) => (
              <div className="list-item" key={r.id}>
                <div className="list-item__main">
                  <div className="list-item__name">{r.areas_comunes?.nombre}</div>
                  <div className="list-item__sub">{fmtFecha(r.fecha)} · {hhmm(r.hora_inicio)}–{hhmm(r.hora_fin)}</div>
                </div>
                <span className="pill pill--brand">{r.unidades?.identificador || 'Unidad'}</span>
              </div>
            ))}
        </section>
      </div>

      {editArea && (
        <AreaModal condominioId={id} area={editArea.id ? editArea : null}
          onClose={() => setEditArea(null)} onSaved={() => { setEditArea(null); load() }} />
      )}
      {bloqArea && (
        <BloqueosModal condominioId={id} area={bloqArea} onClose={() => setBloqArea(null)} />
      )}
    </div>
  )
}

function AreaModal({ condominioId, area, onClose, onSaved }) {
  const editing = !!area
  const [nombre, setNombre] = useState(area?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(area?.descripcion ?? '')
  const [capacidad, setCapacidad] = useState(area?.capacidad ?? '')
  const [rep, setRep] = useState(area?.dias_repetibilidad ?? 0)
  const [adeudo, setAdeudo] = useState(area ? (area.permite_con_adeudo ? 'si' : 'no') : 'si')
  const [costo, setCosto] = useState(area?.costo_uso ?? 0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      capacidad: capacidad ? parseInt(capacidad, 10) : null,
      dias_repetibilidad: parseInt(rep, 10) || 0,
      permite_con_adeudo: adeudo === 'si',
      costo_uso: costo ? Number(costo) : 0,
    }
    let error
    if (editing) {
      ({ error } = await supabase.from('areas_comunes').update(payload).eq('id', area.id))
    } else {
      ({ error } = await supabase.from('areas_comunes').insert({ condominio_id: condominioId, ...payload }))
    }
    setBusy(false)
    if (error) setError(error.message); else onSaved()
  }

  return (
    <Modal onClose={onClose}>
      <h2>{editing ? 'Editar área' : 'Nueva área'}</h2>
      <p className="sub">Define el espacio y sus reglas de reserva.</p>
      <form onSubmit={submit}>
        <div className="field"><label>Nombre</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Salón de eventos" required /></div>
        <div className="field"><label>Descripción (opcional)</label>
          <input className="input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Incluye cocina" /></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="field" style={{ flex: 1 }}><label>Capacidad</label>
            <input className="input" type="number" min="1" value={capacidad} onChange={(e) => setCapacidad(e.target.value)} placeholder="opcional" /></div>
          <div className="field" style={{ flex: 1 }}><label>Costo de uso</label>
            <input className="input" type="number" min="0" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="ej. 300 (limpieza)" /></div>
        </div>
        <div className="field"><label>Repetibilidad (días entre reservas del mismo usuario)</label>
          <input className="input" type="number" min="0" value={rep} onChange={(e) => setRep(e.target.value)} placeholder="0 = sin límite" /></div>
        <div className="field"><label>¿Permitir reservar con adeudo vencido?</label>
          <select className="input" value={adeudo} onChange={(e) => setAdeudo(e.target.value)}>
            <option value="si">Sí, permitir</option>
            <option value="no">No, bloquear si debe</option>
          </select></div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Guardando…' : (editing ? 'Guardar' : 'Crear área')}</button>
        </div>
      </form>
    </Modal>
  )
}

function BloqueosModal({ condominioId, area, onClose }) {
  const [miembros, setMiembros] = useState([])
  const [bloqueados, setBloqueados] = useState(new Set())
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data: mem } = await supabase.from('membresias')
      .select('user_id, rol, profiles(nombre, email)')
      .eq('condominio_id', condominioId).eq('estado', 'activo')
    const { data: bl } = await supabase.from('area_bloqueos').select('user_id').eq('area_id', area.id)
    setMiembros((mem ?? []).filter((m) => m.rol === 'residente'))
    setBloqueados(new Set((bl ?? []).map((x) => x.user_id)))
    setLoading(false)
  }
  useEffect(() => { load() }, [area.id])

  async function toggle(userId) {
    if (bloqueados.has(userId)) {
      await supabase.from('area_bloqueos').delete().eq('area_id', area.id).eq('user_id', userId)
    } else {
      await supabase.from('area_bloqueos').insert({ area_id: area.id, user_id: userId })
    }
    load()
  }

  return (
    <Modal onClose={onClose}>
      <h2>Bloqueos · {area.nombre}</h2>
      <p className="sub">Marca a quién NO se le permite reservar esta área.</p>
      {loading ? <div className="panel-empty">Cargando…</div>
        : miembros.length === 0 ? <div className="panel-empty">No hay residentes en este condominio.</div>
        : (
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {miembros.map((m) => (
              <label key={m.user_id} className="list-item" style={{ cursor: 'pointer' }}>
                <div className="list-item__main">
                  <div className="list-item__name">{m.profiles?.nombre || m.profiles?.email}</div>
                  <div className="list-item__sub">{m.profiles?.email}</div>
                </div>
                <span className={`pill ${bloqueados.has(m.user_id) ? 'pill--danger' : 'pill--ok'}`}>
                  {bloqueados.has(m.user_id) ? 'Bloqueado' : 'Permitido'}
                </span>
                <input type="checkbox" checked={bloqueados.has(m.user_id)} onChange={() => toggle(m.user_id)}
                  style={{ width: 20, height: 20 }} />
              </label>
            ))}
          </div>
        )}
      <div className="modal__actions">
        <button className="btn btn--primary" onClick={onClose}>Listo</button>
      </div>
    </Modal>
  )
}

function Modal({ children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  )
}
