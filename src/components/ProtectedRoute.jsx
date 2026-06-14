import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import CambiarPassword from '../pages/CambiarPassword'

export default function ProtectedRoute({ children, allow }) {
  const { session, role, loading, mustChangePassword } = useAuth()

  if (loading) return <div className="screen-center">Cargando…</div>
  if (!session) return <Navigate to="/login" replace />
  if (mustChangePassword) return <CambiarPassword />
  if (allow && !allow.includes(role)) return <Navigate to="/" replace />

  return children
}
