import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScoreboardPage from './pages/ScoreboardPage';
import SchedulePage from './pages/SchedulePage';
import WodDescriptionPage from './pages/WodDescriptionPage';
import AdminLoginPage from './pages/Admin/AdminLoginPage';
import AdminLayout from './pages/Admin/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ScoreboardAdmin from './pages/Admin/ScoreboardAdmin';
import TeamsManagementPage from './pages/Admin/TeamsManagementPage';
import WodsManagementPage from './pages/Admin/WodsManagementPage';
import ScoreEntryPage from './pages/Admin/ScoreEntryPage';
import UpdateWodDescriptions from './pages/Admin/UpdateWodDescriptions';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/" element={<ScoreboardPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/wods" element={<WodDescriptionPage />} />

        {/* Rota de Login */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Rotas Protegidas com Layout (Dashboard e Futuras Telas de Gestão) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/admin/" element={<AdminLayout />}>
            <Route index element={<ScoreboardAdmin />} />
            <Route path="scoreboard" element={<ScoreboardAdmin />} />
            <Route path="teams" element={<TeamsManagementPage />} />
            <Route path="wods" element={<WodsManagementPage />} />
            <Route path="wods/update-descriptions" element={<UpdateWodDescriptions />} />
            <Route path="score-entry" element={<ScoreEntryPage />} />
          </Route>
        </Route>
        
        <Route path="*" element={<h1>404 - Not Found</h1>} />
      </Routes>
    </Router>
  );
}

export default App;