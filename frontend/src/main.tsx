import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import CargaMaquina from './pages/CargaMaquina'
import Programacao from './pages/Programacao'
import Calculadora from './pages/Calculadora'
import Ordens from './pages/Ordens'
import Maquinas from './pages/Maquinas'
import Produtos from './pages/Produtos'
import Ajuda from './pages/Ajuda'
import Login from './pages/Login'
import TrocarSenha from './pages/TrocarSenha'
import Usuarios from './pages/Usuarios'
import Auditoria from './pages/Auditoria'
import { AuthProvider, useAuth } from './auth/AuthContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 segundos
      retry: 1,
    },
  },
})

function SomenteAdmin({ children }: { children: ReactNode }) {
  const { ehAdmin } = useAuth()
  return ehAdmin ? <>{children}</> : <Navigate to="/" replace />
}

function Aplicacao() {
  const { usuario, carregando } = useAuth()

  if (carregando) {
    return <div className="flex h-screen items-center justify-center bg-gray-100 text-sm text-gray-500">Carregando...</div>
  }
  if (!usuario) return <Login />
  if (usuario.deve_trocar_senha) return <TrocarSenha />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="carga-maquina" element={<CargaMaquina />} />
          <Route path="programacao" element={<Programacao />} />
          <Route path="calculadora" element={<Calculadora />} />
          <Route path="ordens" element={<Ordens />} />
          <Route path="maquinas" element={<Maquinas />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="ajuda" element={<Ajuda />} />
          <Route path="usuarios" element={<SomenteAdmin><Usuarios /></SomenteAdmin>} />
          <Route path="auditoria" element={<SomenteAdmin><Auditoria /></SomenteAdmin>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Aplicacao />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
)
