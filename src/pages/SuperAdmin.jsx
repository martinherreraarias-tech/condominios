import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function SuperAdmin() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [condominios, setCondominios] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [assignFor, setAssignFor] = useState(null)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showReset, setShowReset] = useState(false)

  async function load() {
    setLoading(true)
    const { data: conds } = await supabase
      .from('condominios')
      .select('id, nombre, direccion, created_at')
      .order('created_at', { ascending: false })
    const { data: mems } = await supabase.from('membresias').select('condominio_id')
    const tally = {}
    ;(mems ?? []).forEach((m) => { tally[m.condominio_id] = (tally[m.condominio_id] || 0) + 1 })
    setCondominios(conds ?? [])
    setCounts(tally)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__brand"><Building size={20} color="#0E5A47" /> Condominios</span>
        <span className="badge">Super admin</span>
        <div className="topbar__spacer" />
        <span className="topbar__user">{profile?.email}</span>
        <button className="btn btn--ghost" onClick={signOut}>Cerrar sesión</button>
      </header>

      <div className="container">
        <div className="page-head">
          <div>
            <h1 className="page-title">Condominios</h1>
            <p className="page-sub">Administra todos los condominios y sus administradores.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn--ghost" onClick={() => setShowCreateUser(true)}>Crear usuario</button>
            <button className="btn btn--primary" onClick={() => setShowNew(true)}>+ Nuevo condominio</button>
          </div>
        </div>

        {loading ? (
          <p className="muted">Cargando…</p>
        ) : condominios.length === 0 ? (
          <div className="empty">
            <h3>Aún no hay condominios</h3>
            <p>Crea el primero para empezar a administrarlo.</p>
          </div>
        ) : (
          <div className="grid">
            {condominios.map((c) => (
              <div className="cond-card" key={c.id} onClick={() => navigate(`/condominio/${c.id}`)} style={{ cursor: 'pointer' }}>
                <div className="cond-card__top">
                  <span className="cond-icon"><Building size={20} color="#0E5A47" /></span>
                  <div>
                    <div className="cond-card__name">{c.nombre}</div>
                    <div className="cond-card__addr">{c.direccion || 'Sin dirección'}</div>
                  </div>
                </div>
                <div className="cond-card__meta">
                  <span className="badge">{counts[c.id] || 0} miembros</span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Creado {new Date(c.created_at).toLocaleDateString('es-MX')}
                  </span>
                </div>
                <div className="cond-card__actions">
                  <button className="link-btn" onClick={(e) => { e.stopPropagation(); setAssignFor(c) }}>
                    Asignar administrador →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="panel" style={{ marginTop: 24 }}>
          <div className="panel__head"><span className="panel__title">Zona de demostraciones</span></div>
          <div style={{ padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span className="muted" style={{ fontSize: 14 }}>
              Borra todos los condominios y usuarios de prueba para empezar una demo desde cero.
            </span>
            <button className="btn btn--ghost" onClick={() => setShowReset(true)} style={{ color: '#B23B3B', borderColor: '#B23B3B' }}>
              Resetear datos
            </button>
          </div>
        </div>
      </div>

      {showReset && (
        <ConfirmResetModal
          onClose={() => setShowReset(false)}
          onDone={(data) => { setShowReset(false); load(); alert(`Datos reseteados. Usuarios borrados: ${data?.usuarios_borrados ?? 0}.`) }}
        />
      )}

      {showNew && (
        <NewCondominioModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load() }}
        />
      )}
      {showCreateUser && (
        <CreateUserModal condominios={condominios} onClose={() => setShowCreateUser(false)} onCreated={load} />
      )}
      {assignFor && (
        <AssignAdminModal
          condominio={assignFor}
          onClose={() => setAssignFor(null)}
          onAssigned={() => { setAssignFor(null); load() }}
        />
      )}
    </div>
  )
}

function NewCondominioModal({ onClose, onCreated }) {
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.from('condominios').insert({ nombre, direccion: direccion || null })
    setBusy(false)
    if (error) setError(error.message)
    else onCreated()
  }

  return (
    <Modal onClose={onClose}>
      <h2>Nuevo condominio</h2>
      <p className="sub">Registra un condominio nuevo en la plataforma.</p>
      <form onSubmit={submit}>
        <div className="field">
          <label>Nombre</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Residencial Las Palmas" required />
        </div>
        <div className="field">
          <label>Dirección (opcional)</label>
          <input className="input" value={direccion} onChange={(e) => setDireccion(e.target.value)}
            placeholder="Calle, número, ciudad" />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Creando…' : 'Crear condominio'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function AssignAdminModal({ condominio, onClose, onAssigned }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError(''); setOk('')

    const { data: prof } = await supabase
      .from('profiles').select('id, email').eq('email', email.trim()).maybeSingle()

    if (!prof) {
      setBusy(false)
      setError('Ese correo aún no se ha registrado. Pídele a la persona que cree su cuenta primero y vuelve a intentarlo.')
      return
    }

    const { error: insErr } = await supabase.from('membresias').insert({
      condominio_id: condominio.id, user_id: prof.id, rol: 'admin', estado: 'activo',
    })
    setBusy(false)

    if (insErr) {
      if (insErr.code === '23505') setError('Esa persona ya es administradora de este condominio.')
      else setError(insErr.message)
      return
    }
    setOk('Administrador asignado correctamente.')
    setTimeout(onAssigned, 900)
  }

  return (
    <Modal onClose={onClose}>
      <h2>Asignar administrador</h2>
      <p className="sub">Para <strong>{condominio.nombre}</strong></p>
      <form onSubmit={submit}>
        <div className="field">
          <label>Correo del administrador</label>
          <input className="input" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="admin@correo.com" required />
        </div>
        {error && <p className="form-error">{error}</p>}
        {ok && <p className="form-ok">{ok}</p>}
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Asignando…' : 'Asignar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function CreateUserModal({ condominios = [], onClose, onCreated }) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState('residente')
  const [condominioId, setCondominioId] = useState('')
  const [unidadId, setUnidadId] = useState('')
  const [units, setUnits] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!condominioId) { setUnits([]); setUnidadId(''); return }
    supabase.from('unidades').select('id, identificador')
      .eq('condominio_id', condominioId).order('identificador')
      .then(({ data }) => setUnits(data ?? []))
  }, [condominioId])

  async function submit(e) {
    e.preventDefault()
    if (rol && !condominioId) { setError('Elige un condominio para el rol seleccionado.'); return }
    setBusy(true); setError('')
    const { data, error } = await supabase.functions.invoke('crear-usuario', {
      body: { email: email.trim(), nombre: nombre.trim() },
    })
    if (error) {
      setBusy(false)
      let msg = error.message
      try { const body = await error.context.json(); if (body?.error) msg = body.error } catch (_) {}
      setError(msg)
      return
    }
    if (rol && condominioId) {
      const { error: mErr } = await supabase.from('membresias').insert({
        condominio_id: condominioId, user_id: data.user_id, rol,
        unidad_id: rol === 'residente' ? (unidadId || null) : null, estado: 'activo',
      })
      if (mErr && mErr.code !== '23505') {
        setBusy(false)
        setError('Usuario creado, pero no se pudo asignar el rol: ' + mErr.message)
        setResult(data)
        return
      }
    }
    setBusy(false)
    if (onCreated) onCreated()
    setResult(data)
  }

  if (result) {
    return (
      <Modal onClose={onClose}>
        <h2>Usuario creado</h2>
        <p className="sub">Comparte estos datos. La contraseña solo se muestra una vez; al entrar, la persona deberá cambiarla.</p>
        <div className="field"><label>Correo</label><input className="input" readOnly value={result.email} /></div>
        <div className="field"><label>Contraseña temporal</label><input className="input" readOnly value={result.tempPassword} /></div>
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={() => navigator.clipboard?.writeText('Correo: ' + result.email + ' | Contrasena: ' + result.tempPassword)}>Copiar</button>
          <button className="btn btn--primary" onClick={onClose}>Listo</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose}>
      <h2>Crear usuario</h2>
      <p className="sub">Crea la cuenta y, si quieres, asignale su rol de una vez.</p>
      <form onSubmit={submit}>
        <div className="field"><label>Nombre</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la persona" required /></div>
        <div className="field"><label>Correo</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@correo.com" required /></div>
        <div className="field"><label>Rol</label>
          <select className="input" value={rol} onChange={(e) => setRol(e.target.value)}>
            <option value="residente">Residente</option>
            <option value="admin">Administrador</option>
            <option value="comite">Comite</option>
            <option value="vigilante">Vigilante</option>
            <option value="">Sin asignar por ahora</option>
          </select></div>
        {rol && (
          <div className="field"><label>Condominio</label>
            <select className="input" value={condominioId} onChange={(e) => setCondominioId(e.target.value)} required>
              <option value="">Elige un condominio...</option>
              {condominios.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select></div>
        )}
        {rol === 'residente' && condominioId && (
          <div className="field"><label>Unidad</label>
            <select className="input" value={unidadId} onChange={(e) => setUnidadId(e.target.value)}>
              <option value="">Sin unidad</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.identificador}</option>)}
            </select></div>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Creando...' : 'Crear usuario'}</button>
        </div>
      </form>
    </Modal>
  )
}

function ConfirmResetModal({ onClose, onDone }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function reset() {
    setBusy(true); setError('')
    const { data, error } = await supabase.functions.invoke('reset-demo')
    if (error) {
      setBusy(false)
      let msg = error.message
      try { const b = await error.context.json(); if (b?.error) msg = b.error } catch (_) {}
      setError(msg); return
    }
    setBusy(false)
    onDone(data)
  }

  return (
    <Modal onClose={onClose}>
      <h2>Resetear datos de demo</h2>
      <p className="sub">
        Esto borra <strong>todos los condominios</strong> y <strong>todos los usuarios</strong>
        (excepto los super admins). Esta acción no se puede deshacer.
      </p>
      <div className="field">
        <label>Para confirmar, escribe BORRAR</label>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="BORRAR" />
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="modal__actions">
        <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn--primary" disabled={busy || text !== 'BORRAR'} onClick={reset}
          style={text === 'BORRAR' ? { background: '#B23B3B', borderColor: '#B23B3B' } : undefined}>
          {busy ? 'Borrando…' : 'Borrar todo'}
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
      <line x1="8" y1="7" x2="8" y2="7" /><line x1="12" y1="7" x2="12" y2="7" /><line x1="16" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="8" y2="11" /><line x1="12" y1="11" x2="12" y2="11" /><line x1="16" y1="11" x2="16" y2="11" />
      <line x1="10" y1="21" x2="10" y2="17" /><line x1="14" y1="21" x2="14" y2="17" />
    </svg>
  )
}
