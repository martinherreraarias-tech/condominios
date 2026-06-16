import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function CondominioDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  const [cond, setCond] = useState(null)
  const [units, setUnits] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewUnit, setShowNewUnit] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [editMember, setEditMember] = useState(null)
  const [deleteMember, setDeleteMember] = useState(null)

  async function load() {
    setLoading(true)
    const { data: c } = await supabase
      .from('condominios').select('id, nombre, direccion').eq('id', id).maybeSingle()

    const { data: u } = await supabase
      .from('unidades').select('id, identificador, tipo, cuota_base')
      .eq('condominio_id', id).order('identificador')

    const { data: m } = await supabase
      .from('membresias').select('id, rol, estado, unidad_id, user_id')
      .eq('condominio_id', id)

    const userIds = [...new Set((m ?? []).map((x) => x.user_id))]
    let profById = {}
    if (userIds.length) {
      const { data: profs } = await supabase
        .from('profiles').select('id, nombre, email').in('id', userIds)
      ;(profs ?? []).forEach((p) => { profById[p.id] = p })
    }

    setCond(c)
    setUnits(u ?? [])
    setMembers((m ?? []).map((x) => ({ ...x, persona: profById[x.user_id] })))
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const unitById = Object.fromEntries(units.map((u) => [u.id, u]))
  const existingTypes = [...new Set(units.map((u) => u.tipo).filter(Boolean))]

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__brand"><Building size={20} color="#0E5A47" /> Condominios</span>
        <div className="topbar__spacer" />
        <span className="topbar__user">{profile?.email}</span>
        <button className="btn btn--ghost" onClick={signOut}>Cerrar sesión</button>
      </header>

      <div className="container">
        <button className="back-link" onClick={() => navigate('/')}>← Volver a condominios</button>

        {loading ? (
          <p className="muted">Cargando…</p>
        ) : !cond ? (
          <div className="empty"><h3>Sin acceso</h3><p>Este condominio no existe o no tienes permiso para verlo.</p></div>
        ) : (
          <>
            <div className="page-head">
              <div>
                <h1 className="page-title">{cond.nombre}</h1>
                <p className="page-sub">{cond.direccion || 'Sin dirección'}</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn--ghost" onClick={() => navigate(`/condominio/${id}/avisos`)}>Avisos →</button>
                <button className="btn btn--ghost" onClick={() => navigate(`/condominio/${id}/areas`)}>Áreas →</button>
                <button className="btn btn--ghost" onClick={() => navigate(`/condominio/${id}/notificaciones`)}>Notificaciones →</button>
                <button className="btn btn--primary" onClick={() => navigate(`/condominio/${id}/cobranza`)}>Cobranza →</button>
              </div>
            </div>

            <section className="panel">
              <div className="panel__head">
                <span className="panel__title">Unidades ({units.length})</span>
                <button className="btn btn--primary" onClick={() => setShowNewUnit(true)}>+ Agregar unidad</button>
              </div>
              {units.length === 0 ? (
                <div className="panel-empty">Aún no hay unidades. Agrega la primera para empezar.</div>
              ) : (
                units.map((u) => (
                  <div className="list-item" key={u.id}>
                    <div className="list-item__main">
                      <div className="list-item__name">{u.identificador}</div>
                      <div className="list-item__sub">{u.tipo || 'Sin tipo'}</div>
                    </div>
                    <span className="pill pill--accent">
                      Cuota ${Number(u.cuota_base).toLocaleString('es-MX')}
                    </span>
                  </div>
                ))
              )}
            </section>

            <section className="panel">
              <div className="panel__head">
                <span className="panel__title">Miembros ({members.length})</span>
                <button className="btn btn--primary" onClick={() => setShowAssign(true)}>+ Asignar residente</button>
              </div>
              {members.length === 0 ? (
                <div className="panel-empty">Todavía no hay miembros asignados.</div>
              ) : (
                members.map((m) => (
                  <div className="list-item" key={m.id}>
                    <div className="list-item__main">
                      <div className="list-item__name">{m.persona?.nombre || m.persona?.email || 'Usuario'}</div>
                      <div className="list-item__sub">
                        {m.persona?.email}
                        {m.unidad_id && unitById[m.unidad_id] ? ` · ${unitById[m.unidad_id].identificador}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="pill pill--brand">{m.rol}</span>
                      {m.rol === 'residente' && (
                        <>
                          <button className="btn btn--ghost" style={{ padding: '6px 10px', fontSize: 13 }}
                            onClick={() => setEditMember(m)}>Editar</button>
                          <button className="btn btn--ghost" style={{ padding: '6px 10px', fontSize: 13, color: '#B23B3B', borderColor: '#B23B3B' }}
                            onClick={() => setDeleteMember(m)}>Eliminar</button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </div>

      {editMember && (
        <EditResidenteModal
          member={editMember}
          units={units}
          onClose={() => setEditMember(null)}
          onSaved={() => { setEditMember(null); load() }}
        />
      )}

      {deleteMember && (
        <ConfirmDeleteMemberModal
          member={deleteMember}
          onClose={() => setDeleteMember(null)}
          onDone={() => { setDeleteMember(null); load() }}
        />
      )}

      {showNewUnit && (
        <NewUnitModal
          condominioId={id}
          existingTypes={existingTypes}
          onClose={() => setShowNewUnit(false)}
          onCreated={() => { setShowNewUnit(false); load() }}
        />
      )}
      {showAssign && (
        <AssignResidentModal
          condominioId={id}
          units={units}
          onClose={() => setShowAssign(false)}
          onAssigned={() => { setShowAssign(false); load() }}
        />
      )}
    </div>
  )
}

function NewUnitModal({ condominioId, existingTypes = [], onClose, onCreated }) {
  const DEFAULTS = ['Departamento', 'Casa', 'Oficina']
  const options = []
  const seen = new Set()
  ;[...DEFAULTS, ...existingTypes].forEach((t) => {
    const k = String(t).toLowerCase()
    if (!seen.has(k)) { seen.add(k); options.push(t) }
  })

  const [identificador, setIdentificador] = useState('')
  const [tipo, setTipo] = useState('')          // '' = sin especificar, '__otro__' = nuevo tipo
  const [customTipo, setCustomTipo] = useState('')
  const [cuotaBase, setCuotaBase] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const tipoFinal = (tipo === '__otro__' ? customTipo.trim() : tipo.trim()) || null
    setBusy(true); setError('')
    const { error } = await supabase.from('unidades').insert({
      condominio_id: condominioId,
      identificador: identificador.trim(),
      tipo: tipoFinal,
      cuota_base: cuotaBase === '' ? 0 : Number(cuotaBase),
    })
    setBusy(false)
    if (error) {
      if (error.code === '23505') setError('Ya existe una unidad con ese identificador.')
      else setError(error.message)
      return
    }
    onCreated()
  }

  return (
    <Modal onClose={onClose}>
      <h2>Agregar unidad</h2>
      <p className="sub">Un departamento o casa del condominio.</p>
      <form onSubmit={submit}>
        <div className="field">
          <label>Identificador</label>
          <input className="input" value={identificador} onChange={(e) => setIdentificador(e.target.value)}
            placeholder="Ej. Torre A-301" required />
        </div>

        <div className="field">
          <label>Tipo (opcional)</label>
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Sin especificar</option>
            {options.map((t) => <option key={t} value={t}>{t}</option>)}
            <option value="__otro__">Otro (especificar)…</option>
          </select>
        </div>

        {tipo === '__otro__' && (
          <div className="field">
            <label>Nuevo tipo</label>
            <input className="input" value={customTipo} onChange={(e) => setCustomTipo(e.target.value)}
              placeholder="Ej. Local comercial, Bodega, Penthouse" required />
          </div>
        )}

        <div className="field">
          <label>Cuota base mensual (opcional)</label>
          <input className="input" type="number" min="0" step="0.01" value={cuotaBase}
            onChange={(e) => setCuotaBase(e.target.value)} placeholder="0" />
        </div>

        {error && <p className="form-error">{error}</p>}
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Agregar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function AssignResidentModal({ condominioId, units, onClose, onAssigned }) {
  const [email, setEmail] = useState('')
  const [unidadId, setUnidadId] = useState(units[0]?.id || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { data: prof } = await supabase
      .from('profiles').select('id').eq('email', email.trim()).maybeSingle()
    if (!prof) {
      setBusy(false)
      setError('Ese correo aún no se ha registrado. Pídele a la persona que cree su cuenta primero.')
      return
    }
    const { error: insErr } = await supabase.from('membresias').insert({
      condominio_id: condominioId, user_id: prof.id, rol: 'residente',
      unidad_id: unidadId || null, estado: 'activo',
    })
    setBusy(false)
    if (insErr) {
      if (insErr.code === '23505') setError('Esa persona ya es residente de este condominio.')
      else setError(insErr.message)
      return
    }
    onAssigned()
  }

  return (
    <Modal onClose={onClose}>
      <h2>Asignar residente</h2>
      <p className="sub">Vincula a una persona con una unidad.</p>
      <form onSubmit={submit}>
        <div className="field"><label>Correo del residente</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="residente@correo.com" required /></div>
        <div className="field"><label>Unidad</label>
          <select className="input" value={unidadId} onChange={(e) => setUnidadId(e.target.value)} required>
            {units.length === 0 && <option value="">No hay unidades</option>}
            {units.map((u) => <option key={u.id} value={u.id}>{u.identificador}</option>)}
          </select></div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy || units.length === 0}>
            {busy ? 'Asignando…' : 'Asignar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function EditResidenteModal({ member, units, onClose, onSaved }) {
  const [nombre, setNombre] = useState(member.persona?.nombre || '')
  const [unidadId, setUnidadId] = useState(member.unidad_id || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error: e1 } = await supabase.rpc('editar_residente', { p_user_id: member.user_id, p_nombre: nombre.trim() })
    if (e1) { setBusy(false); setError(e1.message); return }
    const { error: e2 } = await supabase.from('membresias').update({ unidad_id: unidadId || null }).eq('id', member.id)
    setBusy(false)
    if (e2) { setError(e2.message); return }
    onSaved()
  }

  return (
    <Modal onClose={onClose}>
      <h2>Editar residente</h2>
      <p className="sub">Cambia su nombre o la unidad asignada.</p>
      <form onSubmit={save}>
        <div className="field"><label>Nombre</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
        <div className="field"><label>Unidad</label>
          <select className="input" value={unidadId} onChange={(e) => setUnidadId(e.target.value)}>
            <option value="">Sin unidad</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.identificador}</option>)}
          </select></div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  )
}

function ConfirmDeleteMemberModal({ member, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function del() {
    setBusy(true); setError('')
    const { error } = await supabase.from('membresias').delete().eq('id', member.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    onDone()
  }
  return (
    <Modal onClose={onClose}>
      <h2>Quitar residente</h2>
      <p className="sub">
        Esto quita a <strong>{member.persona?.nombre || member.persona?.email}</strong> de este condominio.
        Su cuenta de acceso no se borra; podrás volver a asignarlo después con su correo.
      </p>
      {error && <p className="form-error">{error}</p>}
      <div className="modal__actions">
        <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn--primary" disabled={busy} onClick={del}
          style={{ background: '#B23B3B', borderColor: '#B23B3B' }}>
          {busy ? 'Quitando…' : 'Quitar del condominio'}
        </button>
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

function Building({ size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <line x1="10" y1="21" x2="10" y2="17" /><line x1="14" y1="21" x2="14" y2="17" />
    </svg>
  )
}
