import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import Signals from './pages/SignalsClean.jsx'
import Chart from './pages/Chart.jsx'
import Operations from './pages/Operations.jsx'
import Settings from './pages/Settings.jsx'

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/signals2" element={<Signals />} />
        <Route path="/chart" element={<Chart />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/signals2" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default App
