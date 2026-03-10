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
import DivisionList from './pages/admin/DivisionList';
import NewDivision from './pages/admin/NewDivision';
import DivisionStandings from './pages/admin/DivisionStandings';
import EditDivision from './pages/admin/EditDivision';
import OfficialsList from './pages/admin/OfficialsList';
import NewOfficial from './pages/admin/NewOfficial';
import MatchDetail from './pages/admin/MatchDetail';
import SeasonDiscipline from './pages/admin/SeasonDiscipline';
import ClubList from './pages/admin/ClubList';
import NewClub from './pages/admin/NewClub';
import DivisionTeams from './pages/admin/DivisionTeams';

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
              <Route path="/competitions/:id" element={<TournamentPage />} />
              <Route path="/seasons/:id" element={<EditionPage />} />
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
              <Route path="/admin/organizations/new" element={<ProtectedRoute><NewOrganiser /></ProtectedRoute>} />
              <Route path="/admin/competitions/new" element={<ProtectedRoute><NewTournament /></ProtectedRoute>} />
              <Route path="/admin/competitions/:id" element={<ProtectedRoute><TournamentDetail /></ProtectedRoute>} />
              <Route path="/admin/seasons/new" element={<ProtectedRoute><NewEdition /></ProtectedRoute>} />
              <Route path="/admin/seasons/:id/teams" element={<ProtectedRoute><EditionTeams /></ProtectedRoute>} />
              <Route path="/admin/seasons/:id/matches" element={<ProtectedRoute><EditionMatches /></ProtectedRoute>} />
              <Route path="/admin/seasons/:id/groups" element={<ProtectedRoute><EditionGroups /></ProtectedRoute>} />
              <Route path="/admin/matches/:id/events" element={<ProtectedRoute><MatchEvents /></ProtectedRoute>} />
              <Route path="/admin/seasons/:season_id/divisions" element={<ProtectedRoute><DivisionList /></ProtectedRoute>} />
              <Route path="/admin/seasons/:season_id/divisions/new" element={<ProtectedRoute><NewDivision /></ProtectedRoute>} />
              <Route path="/admin/divisions/:division_id/standings" element={<ProtectedRoute><DivisionStandings /></ProtectedRoute>} />
              <Route path="/admin/divisions/:division_id/edit" element={<ProtectedRoute><EditDivision /></ProtectedRoute>} />
              <Route path="/admin/organizations/:organization_id/officials" element={<ProtectedRoute><OfficialsList /></ProtectedRoute>} />
              <Route path="/admin/organizations/:organization_id/officials/new" element={<ProtectedRoute><NewOfficial /></ProtectedRoute>} />
              <Route path="/admin/matches/:id" element={<ProtectedRoute><MatchDetail /></ProtectedRoute>} />
              <Route path="/admin/seasons/:season_id/discipline" element={<ProtectedRoute><SeasonDiscipline /></ProtectedRoute>} />
              <Route path="/admin/organizations/:organization_id/clubs" element={<ProtectedRoute><ClubList /></ProtectedRoute>} />
              <Route path="/admin/organizations/:organization_id/clubs/new" element={<ProtectedRoute><NewClub /></ProtectedRoute>} />
              <Route path="/admin/seasons/:season_id/divisions/:division_id/teams" element={<ProtectedRoute><DivisionTeams /></ProtectedRoute>} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
