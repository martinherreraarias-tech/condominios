import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Home from './pages/Home'
import SuperAdmin from './pages/SuperAdmin'
import CondominioDetail from './pages/CondominioDetail'
import CondominioCobranza from './pages/CondominioCobranza'
import Visitas from './pages/Visitas'

function RoleHome() {
  const { role, loading } = useAuth()
  if (loading) return <div className="screen-center">Cargando…</div>
  if (role === 'super_admin') return <SuperAdmin />
  return <Home />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />
          <Route path="/condominio/:id" element={<ProtectedRoute><CondominioDetail /></ProtectedRoute>} />
          <Route path="/condominio/:id/cobranza" element={<ProtectedRoute><CondominioCobranza /></ProtectedRoute>} />
          <Route path="/visitas" element={<ProtectedRoute><Visitas /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
