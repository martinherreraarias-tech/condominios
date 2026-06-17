import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const mxn = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0)
const today = () => new Date().toISOString().slice(0, 10)
function fmtFecha(f) {
  const [y, m, d] = f.split('-')
  return `${d}/${m}/${y}`
}
const hhmm = (t) => (t ? t.slice(0, 5) : '')

export default function CondominioDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [cond, setCond] = useState(null)
  const [loading, setLoading] = useState(true)
  const [kpi, setKpi] = useState(null)
  const [reservas, setReservas] = useState([])

  async function load() {
    setLoading(true)
    const hoy = today()

    const { data: c } = await supabase.from('condominios').select('id, nombre').eq('id', id).maybeSingle()
    const { data: unidades } = await supabase.from('unidades').select('id').eq('condominio_id', id)
    const { data: cuotas } = await supabase.from('cuotas')
      .select('id, unidad_id, monto, recargo, estado, fecha_vencimiento').eq('condominio_id', id)

    const cuotaIds = (cuotas ?? []).map((c) => c.id)
    const paidByCuota = {}
    if (cuotaIds.length) {
      const { data: pg } = await supabase.from('pagos')
        .select('cuota_id, monto').in('cuota_id', cuotaIds).eq('estado', 'aprobado')
      ;(pg ?? []).forEach((p) => { paidByCuota[p.cuota_id] = (paidByCuota[p.cuota_id] || 0) + Number(p.monto) })
    }

    let montoTotal = 0, cobrado = 0, adeudoVencido = 0
    const morosas = new Set()
    for (const c of cuotas ?? []) {
      const due = Number(c.monto) + Number(c.recargo || 0)
      const paid = Math.min(paidByCuota[c.id] || 0, due)
      montoTotal += due
      cobrado += paid
      const saldo = due - paid
      if (saldo > 0 && c.fecha_vencimiento && c.fecha_vencimiento < hoy) {
        adeudoVencido += saldo
        morosas.add(c.unidad_id)
      }
    }
    const pct = montoTotal > 0 ? Math.round((cobrado / montoTotal) * 100) : 0

    const { data: pk } = await supabase.from('paquetes')
      .select('id').eq('condominio_id', id).eq('estado', 'en_caseta')
    const { data: rev } = await supabase.from('pagos')
      .select('id').eq('condominio_id', id).eq('estado', 'por_revisar')
    const { data: rsv } = await supabase.from('reservas')
      .select('id, fecha, hora_inicio, hora_fin, areas_comunes(nombre), unidades(identificador)')
      .eq('condominio_id', id).eq('estado', 'confirmada').gte('fecha', hoy)
      .order('fecha').order('hora_inicio').limit(6)

    setCond(c)
    setReservas(rsv ?? [])
    setKpi({
      pct,
      cobrado,
      montoTotal,
      adeudo: montoTotal - cobrado,
      adeudoVencido,
      morosas: morosas.size,
      unidades: (unidades ?? []).length,
      paquetes: (pk ?? []).length,
      porRevisar: (rev ?? []).length,
    })
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

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
            <h1 className="page-title">Dashboard</h1>
            <p className="page-sub">{cond?.nombre}</p>
          </div>
        </div>

        {loading ? <p className="muted">Cargando…</p> : kpi && (
          <>
            <div className="stats">
              <div className="stat">
                <div className="stat__num" style={{ color: kpi.pct >= 80 ? 'var(--brand-600)' : kpi.pct >= 50 ? 'var(--accent)' : 'var(--danger)' }}>
                  {kpi.pct}%
                </div>
                <div className="stat__label">Cobranza</div>
              </div>
              <div className="stat">
                <div className="stat__num">{mxn(kpi.cobrado)}</div>
                <div className="stat__label">Recaudado</div>
              </div>
              <div className="stat">
                <div className="stat__num" style={{ color: kpi.adeudo > 0 ? 'var(--danger)' : 'var(--ink)' }}>{mxn(kpi.adeudo)}</div>
                <div className="stat__label">Por cobrar</div>
              </div>
              <div className="stat">
                <div className="stat__num" style={{ color: kpi.morosas > 0 ? 'var(--danger)' : 'var(--ink)' }}>{kpi.morosas}</div>
                <div className="stat__label">Unidades morosas (de {kpi.unidades})</div>
              </div>
              <div className="stat">
                <div className="stat__num">{kpi.paquetes}</div>
                <div className="stat__label">Paquetes en caseta</div>
              </div>
              <div className="stat">
                <div className="stat__num" style={{ color: kpi.porRevisar > 0 ? 'var(--accent)' : 'var(--ink)' }}>{kpi.porRevisar}</div>
                <div className="stat__label">Pagos por revisar</div>
              </div>
            </div>

            <div className="panel">
              <div className="panel__head"><span className="panel__title">Próximas reservas</span></div>
              {reservas.length === 0 ? (
                <div className="panel-empty">No hay reservas próximas.</div>
              ) : (
                <div className="list">
                  {reservas.map((r) => (
                    <div className="list-item" key={r.id}>
                      <div className="list-item__main">
                        <div className="list-item__name">{r.areas_comunes?.nombre || 'Área'}</div>
                        <div className="list-item__sub">
                          {fmtFecha(r.fecha)} · {hhmm(r.hora_inicio)}–{hhmm(r.hora_fin)}
                          {r.unidades?.identificador ? ` · ${r.unidades.identificador}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn--primary" onClick={() => navigate(`/condominio/${id}/cobranza`)}>Ir a cobranza</button>
              <button className="btn btn--ghost" onClick={() => navigate(`/condominio/${id}/areas`)}>Áreas y reservas</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
