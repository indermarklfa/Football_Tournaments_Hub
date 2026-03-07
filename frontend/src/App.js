import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import Home from './pages/public/Home';
import TournamentPage from './pages/public/TournamentPage';
import EditionPage from './pages/public/EditionPage';
import MatchPage from './pages/public/MatchPage';

// Admin pages
import Login from './pages/admin/Login';
import Register from './pages/admin/Register';
import Dashboard from './pages/admin/Dashboard';
import OrganiserDashboard from './pages/admin/OrganiserDashboard';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import NewOrganiser from './pages/admin/NewOrganiser';
import NewTournament from './pages/admin/NewTournament';
import TournamentDetail from './pages/admin/TournamentDetail';
import NewEdition from './pages/admin/NewEdition';
import EditionTeams from './pages/admin/EditionTeams';
import EditionGroups from './pages/admin/EditionGroups';
import EditionMatches from './pages/admin/EditionMatches';
import MatchEvents from './pages/admin/MatchEvents';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-900">
          <Navbar />
          <main>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/tournaments/:id" element={<TournamentPage />} />
              <Route path="/editions/:id" element={<EditionPage />} />
              <Route path="/matches/:id" element={<MatchPage />} />

              {/* Auth Routes */}
              <Route path="/admin/login" element={<Login />} />
              <Route path="/admin/register" element={
                <ProtectedRoute>
                  <Register />
                </ProtectedRoute>
              } />

              {/* Protected Admin Routes */}
              <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/admin/organiser" element={<ProtectedRoute><OrganiserDashboard /></ProtectedRoute>} />
              <Route path="/admin/super" element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/organisers/new" element={<ProtectedRoute><NewOrganiser /></ProtectedRoute>} />
              <Route path="/admin/tournaments/new" element={<ProtectedRoute><NewTournament /></ProtectedRoute>} />
              <Route path="/admin/tournaments/:id" element={<ProtectedRoute><TournamentDetail /></ProtectedRoute>} />
              <Route path="/admin/editions/new" element={<ProtectedRoute><NewEdition /></ProtectedRoute>} />
              <Route path="/admin/editions/:id/teams" element={<ProtectedRoute><EditionTeams /></ProtectedRoute>} />
              <Route path="/admin/editions/:id/matches" element={<ProtectedRoute><EditionMatches /></ProtectedRoute>} />
              <Route path="/admin/editions/:id/groups" element={<ProtectedRoute><EditionGroups /></ProtectedRoute>} />
              <Route path="/admin/matches/:id/events" element={<ProtectedRoute><MatchEvents /></ProtectedRoute>} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
