import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScoreboardPage from './pages/ScoreboardPage';
import AdminLoginPage from './pages/Admin/AdminLoginPage';
import AdminDashboardPage from './pages/Admin/AdminDashboardPage';
import ProtectedRoute from './components/ProtectedRoute'; // Importado
import TeamsManagementPage from './pages/Admin/TeamsManagementPage';
import WodsManagementPage from './pages/Admin/WodsManagementPage';
import ScoreEntryPage from './pages/Admin/ScoreEntryPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rota Pública */}
        <Route path="/" element={<ScoreboardPage />} />

        {/* Rota de Login */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Rotas Protegidas (Dashboard e Futuras Telas de Gestão) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/teams" element={<TeamsManagementPage />} />
          <Route path="/admin/wods" element={<WodsManagementPage />} />
          <Route path="/admin/score-entry" element={<ScoreEntryPage />} />
        </Route>
        
        <Route path="*" element={<h1>404 - Not Found</h1>} />
      </Routes>
    </Router>
  );
}

export default App;