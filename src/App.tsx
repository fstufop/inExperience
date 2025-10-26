import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScoreboardPage from './pages/ScoreboardPage';
import AdminLoginPage from './pages/Admin/AdminLoginPage';
import AdminLayout from './pages/Admin/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ScoreboardAdmin from './pages/Admin/ScoreboardAdmin';
import TeamsManagementPage from './pages/Admin/TeamsManagementPage';
import WodsManagementPage from './pages/Admin/WodsManagementPage';
import ScoreEntryPage from './pages/Admin/ScoreEntryPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rota Pública */}
        <Route path="/scoreboard" element={<ScoreboardPage />} />

        {/* Rota de Login */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Rotas Protegidas com Layout (Dashboard e Futuras Telas de Gestão) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="scoreboard" element={<ScoreboardAdmin />} />
            <Route path="teams" element={<TeamsManagementPage />} />
            <Route path="wods" element={<WodsManagementPage />} />
            <Route path="score-entry" element={<ScoreEntryPage />} />
          </Route>
        </Route>
        
        <Route path="*" element={<h1>404 - Not Found</h1>} />
      </Routes>
    </Router>
  );
}

export default App;