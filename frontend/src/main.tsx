import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import CargaMaquina from './pages/CargaMaquina'
import Programacao from './pages/Programacao'
import Calculadora from './pages/Calculadora'
import Ordens from './pages/Ordens'
import Maquinas from './pages/Maquinas'
import Produtos from './pages/Produtos'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 segundos
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
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
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)

