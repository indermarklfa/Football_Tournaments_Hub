import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = (email, password) => api.post('/api/auth/register', { email, password });
export const login = (email, password) => api.post('/api/auth/login', { email, password });
export const getMe = () => api.get('/api/auth/me');
export const changePassword = (data) => api.post('/api/auth/change-password', data);

// Organizations
export const createOrganization = (data) => api.post('/api/organizations', data);
export const getOrganizations = () => api.get('/api/organizations');
export const getOrganization = (id) => api.get(`/api/organizations/${id}`);
export const updateOrganization = (id, data) => api.patch(`/api/organizations/${id}`, data);

// Competitions
export const createCompetition = (data) => api.post('/api/competitions', data);
export const getCompetitions = (organizationId) => api.get(`/api/competitions?organization_id=${organizationId}`);
export const getCompetition = (id) => api.get(`/api/competitions/${id}`);
export const updateCompetition = (id, data) => api.patch(`/api/competitions/${id}`, data);

// Seasons
export const createSeason = (data) => api.post('/api/seasons', data);
export const getSeasons = (competitionId) => api.get(`/api/seasons?competition_id=${competitionId}`);
export const getSeason = (id) => api.get(`/api/seasons/${id}`);
export const updateSeason = (id, data) => api.patch(`/api/seasons/${id}`, data);
export const deleteSeason = (id) => api.delete(`/api/seasons/${id}`);

// Divisions
export const createDivision = (data) => api.post('/api/divisions', data);
export const getDivisions = (seasonId) => api.get(`/api/divisions?season_id=${seasonId}`);
export const getDivision = (id) => api.get(`/api/divisions/${id}`);
export const updateDivision = (id, data) => api.patch(`/api/divisions/${id}`, data);

// Clubs
export const createClub = (data) => api.post('/api/clubs', data);
export const getClubs = (organizationId) => api.get(`/api/clubs?organization_id=${organizationId}`);
export const getClub = (id) => api.get(`/api/clubs/${id}`);
export const updateClub = (id, data) => api.patch(`/api/clubs/${id}`, data);
export const deleteClub = (id) => api.delete(`/api/clubs/${id}`);

// Teams
export const createTeam = (data) => api.post('/api/teams', data);
export const getTeams = (divisionId) => api.get(`/api/teams?division_id=${divisionId}`);
export const updateTeam = (id, data) => api.patch(`/api/teams/${id}`, data);
export const deleteTeam = (id) => api.delete(`/api/teams/${id}`);

// Players
export const createPlayer = (data) => api.post('/api/players', data);
export const getPlayers = ({ q, id_number } = {}) => {
  const qs = new URLSearchParams();
  if (q) qs.append('q', q);
  if (id_number) qs.append('id_number', id_number);
  const query = qs.toString();
  return api.get(`/api/players${query ? `?${query}` : ''}`);
};
export const getPlayer = (id) => api.get(`/api/players/${id}`);
export const updatePlayer = (id, data) => api.patch(`/api/players/${id}`, data);
export const deletePlayer = (id) => api.delete(`/api/players/${id}`);

// Player Registrations
export const createPlayerRegistration = (data) => api.post('/api/player-registrations', data);
export const getPlayerRegistrations = (teamId) => api.get(`/api/player-registrations?team_id=${teamId}`);
export const updatePlayerRegistration = (id, data) => api.patch(`/api/player-registrations/${id}`, data);
export const deletePlayerRegistration = (id) => api.delete(`/api/player-registrations/${id}`);

// Groups
export const createGroup = (divisionId, name) => api.post(`/api/groups?division_id=${divisionId}&name=${encodeURIComponent(name)}`);
export const getGroups = (divisionId) => api.get(`/api/groups?division_id=${divisionId}`);
export const deleteGroup = (groupId) => api.delete(`/api/groups/${groupId}`);
export const addTeamToGroup = (groupId, teamId) => api.post(`/api/groups/${groupId}/teams/${teamId}`);
export const removeTeamFromGroup = (groupId, teamId) => api.delete(`/api/groups/${groupId}/teams/${teamId}`);

// Matches
export const createMatch = (data) => api.post('/api/matches', data);
export const getMatch = (id) => api.get(`/api/matches/${id}`);
export const getMatches = (divisionId) => api.get(`/api/matches?division_id=${divisionId}`);
export const updateMatch = (id, data) => api.patch(`/api/matches/${id}`, data);
export const deleteMatch = (id) => api.delete(`/api/matches/${id}`);
export const generateGroupFixtures = (data) => api.post('/api/matches/generate-group-fixtures', data);
export const bulkUpdateMatches = (data) => api.post('/api/matches/bulk-update', data);

// Match Events
export const createMatchEvent = (data) => api.post('/api/match-events', data);
export const getMatchEvents = (matchId) => api.get(`/api/match-events?match_id=${matchId}`);
export const updateMatchEvent = (id, data) => api.patch(`/api/match-events/${id}`, data);
export const deleteMatchEvent = (id) => api.delete(`/api/match-events/${id}`);

// Public
export const searchCompetitions = (q, age_group) => {
  const params = new URLSearchParams();
  if (q) params.append('q', q);
  if (age_group) params.append('age_group', age_group);
  const qs = params.toString();
  return api.get(`/api/public/competitions/search${qs ? `?${qs}` : ''}`);
};
export const getPublicCompetition = (id) => api.get(`/api/public/competitions/${id}`);
export const getPublicSeason = (id) => api.get(`/api/public/seasons/${id}`);
export const getPublicFixtures = (divisionId) => api.get(`/api/public/divisions/${divisionId}/fixtures`);
export const getPublicTeams = (divisionId) => api.get(`/api/public/divisions/${divisionId}/teams`);
export const getPublicStandings = (divisionId) => api.get(`/api/public/divisions/${divisionId}/standings`);
export const getPublicTopScorers = (divisionId) => api.get(`/api/public/divisions/${divisionId}/topscorers`);
export const getPublicMatch = (id) => api.get(`/api/public/matches/${id}`);
export const getPublicMatchEvents = (matchId) => api.get(`/api/public/matches/${matchId}/events`);
export const getPublicPlayers = (teamId) => api.get(`/api/public/teams/${teamId}/players`);

// Super Admin
export const getAdminOrganizations = () => api.get('/api/admin/organiser-accounts');
export const createAdminOrganization = (data) => api.post('/api/admin/organiser-accounts', data);
export const deleteAdminOrganization = (userId) => api.delete(`/api/admin/organiser-accounts/${userId}`);
export const getAdminAllCompetitions = () => api.get('/api/admin/competitions');
export const resetUserPassword = (userId, newPassword) => api.post(`/api/admin/organiser-accounts/${userId}/reset-password`, { new_password: newPassword });

// Image Upload
export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_URL}/api/uploads/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
};

export default api;
