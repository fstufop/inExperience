import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CategoriesProvider } from './contexts/CategoriesContext';
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
import CompetitionHistoryPage from './pages/Admin/CompetitionHistoryPage';
import CompetitionDetailPage from './pages/Admin/CompetitionDetailPage';
import CategoriesManagementPage from './pages/Admin/CategoriesManagementPage';

function App() {
  return (
    <CategoriesProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ScoreboardPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/wods" element={<WodDescriptionPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin/" element={<AdminLayout />}>
              <Route index element={<ScoreboardAdmin />} />
              <Route path="scoreboard" element={<ScoreboardAdmin />} />
              <Route path="teams" element={<TeamsManagementPage />} />
              <Route path="wods" element={<WodsManagementPage />} />
              <Route path="wods/update-descriptions" element={<UpdateWodDescriptions />} />
              <Route path="score-entry" element={<ScoreEntryPage />} />
              <Route path="history" element={<CompetitionHistoryPage />} />
              <Route path="history/:id" element={<CompetitionDetailPage />} />
              <Route path="categories" element={<CategoriesManagementPage />} />
            </Route>
          </Route>
          <Route path="*" element={<h1>404 - Not Found</h1>} />
        </Routes>
      </Router>
    </CategoriesProvider>
  );
}

export default App;
