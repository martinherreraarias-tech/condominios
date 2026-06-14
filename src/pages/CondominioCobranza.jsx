import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function currentPeriodo() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}
function lastDayOf(periodo) {
  const [y, m] = periodo.split('-').map(Number)
  const d = new Date(y, m, 0)
  return `${y}-${String(m).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const money = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

export default function CondominioCobranza() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  const [cond, setCond] = useState(null)
  const [units, setUnits] = useState([])
  const [periodo, setPeriodo] = useState(currentPeriodo())
  const [cuotas, setCuotas] = useState([])
  const [paidByCuota, setPaidByCuota] = useState({})
  const [pendientes, setPendientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [payFor, setPayFor] = useState(null)

  async function load() {
    setLoading(true)
    const { data: c } = await supabase.from('condominios').select('id, nombre').eq('id', id).maybeSingle()
    const { data: u } = await supabase.from('unidades').select('id, identificador, cuota_base').eq('condominio_id', id)
    const { data: cu } = await supabase
      .from('cuotas').select('id, unidad_id, periodo, monto, recargo, fecha_vencimiento, estado')
      .eq('condominio_id', id).eq('periodo', periodo)

    const cuotaIds = (cu ?? []).map((x) => x.id)
    let paid = {}
    if (cuotaIds.length) {
      const { data: pg } = await supabase.from('pagos')
        .select('cuota_id, monto').in('cuota_id', cuotaIds).eq('estado', 'aprobado')
      ;(pg ?? []).forEach((p) => { paid[p.cuota_id] = (paid[p.cuota_id] || 0) + Number(p.monto) })
    }

    // Pagos por revisar de TODO el condominio (no solo del periodo)
    const { data: pend } = await supabase.from('pagos')
      .select('id, monto, fecha, comprobante_url, cuota_id')
      .eq('condominio_id', id).eq('estado', 'por_revisar').order('fecha')
    const pendCuotaIds = [...new Set((pend ?? []).map((p) => p.cuota_id))]
    let cuotaInfo = {}
    if (pendCuotaIds.length) {
      const { data: cz } = await supabase.from('cuotas').select('id, unidad_id, periodo').in('id', pendCuotaIds)
      ;(cz ?? []).forEach((z) => { cuotaInfo[z.id] = z })
    }

    setCond(c); setUnits(u ?? []); setCuotas(cu ?? []); setPaidByCuota(paid)
    setPendientes((pend ?? []).map((p) => ({ ...p, cuota: cuotaInfo[p.cuota_id] })))
    setLoading(false)
  }

  useEffect(() => { load() }, [id, periodo])

  async function generarCuotas() {
    if (units.length === 0) return
    setGenerating(true)
    const venc = lastDayOf(periodo)
    const rows = units.map((u) => ({
      condominio_id: id, unidad_id: u.id, periodo,
      monto: Number(u.cuota_base) || 0, fecha_vencimiento: venc, estado: 'pendiente',
    }))
    await supabase.from('cuotas').upsert(rows, { onConflict: 'condominio_id,unidad_id,periodo', ignoreDuplicates: true })
    setGenerating(false)
    load()
  }

  async function revisar(pagoId, nuevoEstado) {
    await supabase.from('pagos')
      .update({ estado: nuevoEstado, revisado_por: profile?.id || null, revisado_at: new Date().toISOString() })
      .eq('id', pagoId)
    load()
  }

  async function verComprobante(path) {
    const { data } = await supabase.storage.from('comprobantes').createSignedUrl(path, 120)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    else alert('No se pudo abrir el comprobante.')
  }

  const unitById = Object.fromEntries(units.map((u) => [u.id, u]))
  const hoy = new Date().toISOString().slice(0, 10)
  const montoTotal = cuotas.reduce((s, c) => s + Number(c.monto) + Number(c.recargo), 0)
  const cobrado = cuotas.reduce((s, c) => s + Math.min(paidByCuota[c.id] || 0, Number(c.monto) + Number(c.recargo)), 0)
  const pct = montoTotal > 0 ? Math.round((cobrado / montoTotal) * 100) : 0

  function estadoVisual(c) {
    if (c.estado === 'pagada') return { txt: 'Pagada', cls: 'pill--ok' }
    if (c.estado === 'parcial') return { txt: 'Parcial', cls: 'pill--accent' }
    if (c.fecha_vencimiento && c.fecha_vencimiento < hoy) return { txt: 'Vencida', cls: 'pill--danger' }
    return { txt: 'Pendiente', cls: 'pill' }
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
            <h1 className="page-title">Cobranza</h1>
            <p className="page-sub">{cond?.nombre}</p>
          </div>
        </div>

        {pendientes.length > 0 && (
          <section className="panel">
            <div className="panel__head">
              <span className="panel__title">Pagos por revisar ({pendientes.length})</span>
            </div>
            {pendientes.map((p) => (
              <div className="list-item" key={p.id}>
                <div className="list-item__main">
                  <div className="list-item__name">
                    {unitById[p.cuota?.unidad_id]?.identificador || 'Unidad'} · {money(p.monto)}
                  </div>
                  <div className="list-item__sub">Periodo {p.cuota?.periodo} · {p.fecha}</div>
                </div>
                {p.comprobante_url && (
                  <button className="link-btn" onClick={() => verComprobante(p.comprobante_url)}>Ver comprobante</button>
                )}
                <button className="btn btn--primary" onClick={() => revisar(p.id, 'aprobado')}>Aprobar</button>
                <button className="btn btn--ghost" onClick={() => revisar(p.id, 'rechazado')}>Rechazar</button>
              </div>
            ))}
          </section>
        )}

        <div className="toolbar">
          <div className="field">
            <label>Periodo</label>
            <input className="input" type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
          </div>
          <button className="btn btn--primary" onClick={generarCuotas} disabled={generating || units.length === 0}>
            {generating ? 'Generando…' : 'Generar cuotas del periodo'}
          </button>
        </div>

        <div className="stats">
          <div className="stat"><div className="stat__num">{cuotas.length}</div><div className="stat__label">Cuotas del periodo</div></div>
          <div className="stat"><div className="stat__num">{money(cobrado)}</div><div className="stat__label">Cobrado</div></div>
          <div className="stat"><div className="stat__num">{money(montoTotal)}</div><div className="stat__label">Total a cobrar</div></div>
          <div className="stat"><div className="stat__num">{pct}%</div><div className="stat__label">Avance de cobranza</div></div>
        </div>

        <section className="panel">
          <div className="panel__head"><span className="panel__title">Cuotas de {periodo}</span></div>
          {loading ? (
            <div className="panel-empty">Cargando…</div>
          ) : cuotas.length === 0 ? (
            <div className="panel-empty">
              {units.length === 0 ? 'Este condominio aún no tiene unidades. Agrégalas primero.'
                : 'No hay cuotas para este periodo. Genéralas con el botón de arriba.'}
            </div>
          ) : (
            cuotas.slice()
              .sort((a, b) => (unitById[a.unidad_id]?.identificador || '').localeCompare(unitById[b.unidad_id]?.identificador || ''))
              .map((c) => {
                const ev = estadoVisual(c)
                const total = Number(c.monto) + Number(c.recargo)
                const paid = paidByCuota[c.id] || 0
                return (
                  <div className="list-item" key={c.id}>
                    <div className="list-item__main">
                      <div className="list-item__name">{unitById[c.unidad_id]?.identificador || 'Unidad'}</div>
                      <div className="list-item__sub">
                        {money(total)}{paid > 0 && c.estado !== 'pagada' ? ` · pagado ${money(paid)}` : ''}
                      </div>
                    </div>
                    <span className={`pill ${ev.cls}`}>{ev.txt}</span>
                    {c.estado !== 'pagada' && (
                      <button className="link-btn" onClick={() => setPayFor(c)}>Registrar pago</button>
                    )}
                  </div>
                )
              })
          )}
        </section>
      </div>

      {payFor && (
        <PaymentModal
          condominioId={id} cuota={payFor}
          yaPagado={paidByCuota[payFor.id] || 0}
          unidad={unitById[payFor.unidad_id]} registradoPor={profile?.id}
          onClose={() => setPayFor(null)} onPaid={() => { setPayFor(null); load() }}
        />
      )}
    </div>
  )
}

function PaymentModal({ condominioId, cuota, yaPagado, unidad, registradoPor, onClose, onPaid }) {
  const total = Number(cuota.monto) + Number(cuota.recargo)
  const restante = Math.max(total - yaPagado, 0)
  const [monto, setMonto] = useState(String(restante))
  const [metodo, setMetodo] = useState('transferencia')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const val = Number(monto)
    if (!(val > 0)) { setError('El monto debe ser mayor a cero.'); return }
    setBusy(true); setError('')
    // Pago registrado por el admin: queda aprobado directo.
    const { error } = await supabase.from('pagos').insert({
      condominio_id: condominioId, cuota_id: cuota.id, monto: val, metodo, fecha,
      registrado_por: registradoPor || null, estado: 'aprobado',
      revisado_por: registradoPor || null, revisado_at: new Date().toISOString(),
    })
    setBusy(false)
    if (error) setError(error.message)
    else onPaid()
  }

  return (
    <Modal onClose={onClose}>
      <h2>Registrar pago</h2>
      <p className="sub">{unidad?.identificador} · restante {money(restante)}</p>
      <p className="muted" style={{ fontSize: 13, marginTop: -8, marginBottom: 14 }}>
        Como administrador, este pago se registra ya aprobado.
      </p>
      <form onSubmit={submit}>
        <div className="field"><label>Monto</label>
          <input className="input" type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required /></div>
        <div className="field"><label>Método</label>
          <select className="input" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            <option value="transferencia">Transferencia</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="otro">Otro</option>
          </select></div>
        <div className="field"><label>Fecha</label>
          <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required /></div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Guardando…' : 'Registrar pago'}</button>
        </div>
      </form>
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
