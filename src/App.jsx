import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import PPh21Bulanan from './pages/PPh21Bulanan'
import PPh21Tahunan from './pages/PPh21Tahunan'
import PPhBadan from './pages/PPhBadan'
import RiwayatData from './pages/RiwayatData'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pph21-bulanan" element={<PPh21Bulanan />} />
        <Route path="/pph21-tahunan" element={<PPh21Tahunan />} />
        <Route path="/pph-badan" element={<PPhBadan />} />
        <Route path="/riwayat" element={<RiwayatData />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}