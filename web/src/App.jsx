import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Security from './pages/Security';
import Climate from './pages/Climate';
import Safety from './pages/Safety';
import Energy from './pages/Energy';

function App() {
  return (
    <div>
      <Navbar />
      <main style={{ padding: '24px', boxSizing: 'border-box' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/security" element={<Security />} />
          <Route path="/climate" element={<Climate />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/energy" element={<Energy />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;