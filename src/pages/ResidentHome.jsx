import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const money = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

export default function ResidentHome() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [cuotas, setCuotas] = useState([])
  const [units, setUnits] = useState({})
  const [approvedByCuota, setApprovedByCuota] = useState({})
  const [pendingCuotas, setPendingCuotas] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [upFor, setUpFor] = useState(null)
  const [avisos, setAvisos] = useState([])
  const [paquetes, setPaquetes] = useState([])
  const [detalleFor, setDetalleFor] = useState(null)

  async function load() {
    setLoading(true)
    // RLS sólo devuelve las cuotas de la unidad del residente
    const { data: cu } = await supabase
      .from('cuotas').select('id, unidad_id, condominio_id, periodo, monto, recargo, estado, fecha_vencimiento, concepto, recibo_id, recibos_servicio(imagen_url, monto, periodo, detalle)')
      .order('periodo', { ascending: false })

    const unidadIds = [...new Set((cu ?? []).map((c) => c.unidad_id))]
    let unitMap = {}
    if (unidadIds.length) {
      const { data: u } = await supabase.from('unidades').select('id, identificador').in('id', unidadIds)
      ;(u ?? []).forEach((x) => { unitMap[x.id] = x.identificador })
    }

    const cuotaIds = (cu ?? []).map((c) => c.id)
    let approved = {}, pending = new Set()
    if (cuotaIds.length) {
      const { data: pg } = await supabase.from('pagos').select('cuota_id, monto, estado').in('cuota_id', cuotaIds)
      ;(pg ?? []).forEach((p) => {
        if (p.estado === 'aprobado') approved[p.cuota_id] = (approved[p.cuota_id] || 0) + Number(p.monto)
        if (p.estado === 'por_revisar') pending.add(p.cuota_id)
      })
    }

    const nowIso = new Date().toISOString()
    const { data: av } = await supabase.from('avisos')
      .select('id, titulo, cuerpo, created_at, expira_at')
      .or(`expira_at.is.null,expira_at.gt.${nowIso}`)
      .order('created_at', { ascending: false }).limit(8)
    setAvisos(av ?? [])
    const { data: pq } = await supabase.from('paquetes')
      .select('id, descripcion, paqueteria, estado, recibido_at')
      .order('recibido_at', { ascending: false }).limit(10)
    setPaquetes(pq ?? [])
    setCuotas(cu ?? []); setUnits(unitMap); setApprovedByCuota(approved); setPendingCuotas(pending); setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function verRecibo(path) {
    const { data } = await supabase.storage.from('recibos').createSignedUrl(path, 120)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    else alert('No se pudo abrir el recibo.')
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
        <div className="page-head">
          <div>
            <h1 className="page-title">Mis cuotas</h1>
            <p className="page-sub">Consulta tus cuotas y sube tu comprobante de pago.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn--ghost" onClick={() => navigate('/reservas')}>Reservar →</button>
            <button className="btn btn--ghost" onClick={() => navigate('/visitas')}>Mis visitas →</button>
          </div>
        </div>

        <section className="panel">
          <div className="panel__head"><span className="panel__title">Estado de cuenta</span></div>
          {loading ? (
            <div className="panel-empty">Cargando…</div>
          ) : cuotas.length === 0 ? (
            <div className="panel-empty">Aún no tienes cuotas registradas.</div>
          ) : (
            cuotas.map((c) => {
              const total = Number(c.monto) + Number(c.recargo)
              const pagado = approvedByCuota[c.id] || 0
              const restante = Math.max(total - pagado, 0)
              const enRevision = pendingCuotas.has(c.id)
              return (
                <div className="list-item" key={c.id}>
                  <div className="list-item__main">
                    <div className="list-item__name">{units[c.unidad_id] || 'Unidad'} · {c.concepto}</div>
                    <div className="list-item__sub">{money(total)} · {c.periodo} · vence {c.fecha_vencimiento || '—'}</div>
                  </div>
                  {c.recibo_id && (
                    <button className="icon-btn" title="Detalle del cobro" onClick={() => setDetalleFor(c)}>ⓘ</button>
                  )}
                  {c.estado === 'pagada' ? (
                    <span className="pill pill--ok">Pagada</span>
                  ) : enRevision ? (
                    <span className="pill pill--accent">Comprobante en revisión</span>
                  ) : (
                    <>
                      <span className="pill">Restante {money(restante)}</span>
                      <button className="btn btn--primary" onClick={() => setUpFor({ ...c, restante })}>
                        Subir comprobante
                      </button>
                    </>
                  )}
                </div>
              )
            })
          )}
        </section>

        {avisos.length > 0 && (
          <section className="panel">
            <div className="panel__head"><span className="panel__title">Avisos de la comunidad</span></div>
            {avisos.map((a) => (
              <div className="aviso" key={a.id}>
                <div className="aviso__head">
                  <span className="aviso__title">{a.titulo}</span>
                  <span className="aviso__date">{new Date(a.created_at).toLocaleDateString('es-MX')}</span>
                </div>
                <div className="aviso__body">{a.cuerpo}</div>
              </div>
            ))}
          </section>
        )}

        {paquetes.length > 0 && (
          <section className="panel">
            <div className="panel__head"><span className="panel__title">Paquetería</span></div>
            {paquetes.map((p) => (
              <div className="list-item" key={p.id}>
                <div className="list-item__main">
                  <div className="list-item__name">{p.descripcion}</div>
                  <div className="list-item__sub">{p.paqueteria ? p.paqueteria + ' · ' : ''}{new Date(p.recibido_at).toLocaleDateString('es-MX')}</div>
                </div>
                <span className={`pill ${p.estado === 'en_caseta' ? 'pill--accent' : 'pill--ok'}`}>
                  {p.estado === 'en_caseta' ? 'En caseta' : 'Entregado'}
                </span>
              </div>
            ))}
          </section>
        )}
      </div>

      {detalleFor && (
        <DetalleCobroModal cuota={detalleFor} onVerRecibo={verRecibo} onClose={() => setDetalleFor(null)} />
      )}

      {upFor && (
        <UploadModal
          cuota={upFor} userId={user?.id}
          onClose={() => setUpFor(null)} onDone={() => { setUpFor(null); load() }}
        />
      )}
    </div>
  )
}

function UploadModal({ cuota, userId, onClose, onDone }) {
  const [monto, setMonto] = useState(String(cuota.restante))
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const val = Number(monto)
    if (!(val > 0)) { setError('El monto debe ser mayor a cero.'); return }
    if (!file) { setError('Adjunta la imagen de tu comprobante.'); return }
    setBusy(true); setError('')

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${cuota.condominio_id}/${cuota.id}/${Date.now()}_${safeName}`

    const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, file, { upsert: false })
    if (upErr) { setBusy(false); setError('No se pudo subir el archivo: ' + upErr.message); return }

    const { error: insErr } = await supabase.from('pagos').insert({
      condominio_id: cuota.condominio_id, cuota_id: cuota.id, monto: val,
      metodo: 'transferencia', comprobante_url: path,
      registrado_por: userId || null, estado: 'por_revisar',
    })
    setBusy(false)
    if (insErr) setError(insErr.message)
    else onDone()
  }

  return (
    <Modal onClose={onClose}>
      <h2>Subir comprobante</h2>
      <p className="sub">Periodo {cuota.periodo} · restante {money(cuota.restante)}</p>
      <form onSubmit={submit}>
        <div className="field"><label>Monto pagado</label>
          <input className="input" type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required /></div>
        <div className="field"><label>Comprobante (imagen o PDF)</label>
          <input className="input" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files[0])} required /></div>
        {error && <p className="form-error">{error}</p>}
        <p className="muted" style={{ fontSize: 13 }}>El administrador revisará tu comprobante y liberará el pago.</p>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Enviando…' : 'Enviar comprobante'}</button>
        </div>
      </form>
    </Modal>
  )
}

function DetalleCobroModal({ cuota, onVerRecibo, onClose }) {
  const r = cuota.recibos_servicio
  const d = r?.detalle
  const total = Number(cuota.monto) + Number(cuota.recargo)
  return (
    <Modal onClose={onClose}>
      <h2>Detalle del cobro</h2>
      <p className="sub">{cuota.concepto} · {cuota.periodo}</p>
      {d ? (
        <div className="detalle-box">
          <div className="detalle-row"><span>Recibo total</span><strong>{money(d.total)}</strong></div>
          <div className="detalle-row"><span>Residencias que pagan</span><span>{(d.activas || 0) + (d.inactivas || 0)} de {d.residencias}</span></div>
          <div className="detalle-row"><span>Activas (100%)</span><span>{d.activas} · {money(d.per_activa)} c/u</span></div>
          {d.inactivas > 0 && (
            <div className="detalle-row"><span>Inactivas ({d.pct_inactivo}%)</span><span>{d.inactivas} · {money(d.per_inactiva)} c/u</span></div>
          )}
          {d.excluidas > 0 && <div className="detalle-row"><span>Excluidas</span><span>{d.excluidas}</span></div>}
          <div className="detalle-row detalle-row--tot"><span>Tu cobro</span><strong>{money(total)}</strong></div>
        </div>
      ) : (
        <p className="muted" style={{ marginBottom: 14 }}>Tu cobro de {money(total)} no tiene desglose de cálculo.</p>
      )}
      {r?.imagen_url && (
        <button className="btn btn--ghost btn--block" onClick={() => onVerRecibo(r.imagen_url)}>Ver foto del recibo</button>
      )}
      <div className="modal__actions">
        <button className="btn btn--primary" onClick={onClose}>Cerrar</button>
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
