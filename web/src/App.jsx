import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Security from './pages/Security'
import Climate from './pages/Climate'
import Safety from './pages/Safety'
import Energy from './pages/Energy'
import Alerts from './pages/Alerts'
import NotFound from './pages/NotFound'

function App() {
  return (
    <div className="min-h-screen bg-deep">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/security" element={<Security />} />
          <Route path="/climate" element={<Climate />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/energy" element={<Energy />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}

export default App