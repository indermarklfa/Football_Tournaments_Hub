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

// Organisers
export const createOrganiser = (data) => api.post('/api/organisers', data);
export const getOrganisers = () => api.get('/api/organisers');
export const getOrganiser = (id) => api.get(`/api/organisers/${id}`);
export const updateOrganiser = (id, data) => api.patch(`/api/organisers/${id}`, data);

// Tournaments
export const createTournament = (data) => api.post('/api/tournaments', data);
export const getTournaments = (organiserId) => api.get(`/api/tournaments?organiser_id=${organiserId}`);
export const getTournament = (id) => api.get(`/api/tournaments/${id}`);
export const updateTournament = (id, data) => api.patch(`/api/tournaments/${id}`, data);

// Editions
export const createEdition = (data) => api.post('/api/editions', data);
export const getEditions = (tournamentId) => api.get(`/api/editions?tournament_id=${tournamentId}`);
export const getEdition = (id) => api.get(`/api/editions/${id}`);
export const updateEdition = (id, data) => api.patch(`/api/editions/${id}`, data);
export const getAliveTeams = (editionId) => api.get(`/api/editions/${editionId}/alive-teams`);

// Teams
export const createTeam = (data) => api.post('/api/teams', data);
export const getTeams = (editionId) => api.get(`/api/teams?edition_id=${editionId}`);
export const updateTeam = (id, data) => api.patch(`/api/teams/${id}`, data);
export const deleteTeam = (id) => api.post(`/api/teams/${id}/delete`);

// Players
export const createPlayer = (data) => api.post('/api/players', data);
export const getPlayers = (teamId) => api.get(`/api/players?team_id=${teamId}`);
export const updatePlayer = (id, data) => api.patch(`/api/players/${id}`, data);
export const deletePlayer = (id) => api.post(`/api/players/${id}/delete`);

// Groups
export const createGroup = (editionId, name) => api.post(`/api/groups?edition_id=${editionId}&name=${encodeURIComponent(name)}`);
export const getGroups = (editionId) => api.get(`/api/groups?edition_id=${editionId}`);
export const deleteGroup = (groupId) => api.delete(`/api/groups/${groupId}`);
export const addTeamToGroup = (groupId, teamId) => api.post(`/api/groups/${groupId}/teams/${teamId}`);
export const removeTeamFromGroup = (groupId, teamId) => api.delete(`/api/groups/${groupId}/teams/${teamId}`);
export const getPublicStandings = (editionId) => api.get(`/api/public/editions/${editionId}/standings`);

// Matches
export const createMatch = (data) => api.post('/api/matches', data);
export const getMatches = (editionId) => api.get(`/api/matches?edition_id=${editionId}`);
export const updateMatch = (id, data) => api.patch(`/api/matches/${id}`, data);
export const deleteMatch = (id) => api.post(`/api/matches/${id}/delete`);

// Match Events
export const createMatchEvent = (data) => api.post('/api/match-events', data);
export const getMatchEvents = (matchId) => api.get(`/api/match-events?match_id=${matchId}`);
export const updateMatchEvent = (id, data) => api.patch(`/api/match-events/${id}`, data);
export const deleteMatchEvent = (id) => api.post(`/api/match-events/${id}/delete`);

// Public
export const searchTournaments = (q, age_group) => {
  const params = new URLSearchParams();
  if (q) params.append('q', q);
  if (age_group) params.append('age_group', age_group);
  const qs = params.toString();
  return api.get(`/api/public/tournaments/search${qs ? `?${qs}` : ''}`);
};
export const getPublicTournament = (id) => api.get(`/api/public/tournaments/${id}`);
export const getPublicEdition = (id) => api.get(`/api/public/editions/${id}`);
export const getPublicFixtures = (editionId) => api.get(`/api/public/editions/${editionId}/fixtures`);
export const getPublicTeams = (editionId) => api.get(`/api/public/editions/${editionId}/teams`);
export const getPublicTopScorers = (editionId) => api.get(`/api/public/editions/${editionId}/topscorers`);
export const getPublicDiscipline = (editionId) => api.get(`/api/public/editions/${editionId}/discipline`);
export const getPublicMatch = (id) => api.get(`/api/public/matches/${id}`);
export const getPublicMatchEvents = (matchId) => api.get(`/api/public/matches/${matchId}/events`);
export const getPublicPlayers = (teamId) => api.get(`/api/public/teams/${teamId}/players`);

export default api;
