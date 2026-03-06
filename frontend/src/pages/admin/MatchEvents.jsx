import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMatchEvents, createMatchEvent, updateMatchEvent, deleteMatchEvent, getPlayers } from '../../lib/api';
import { getPublicMatch } from '../../lib/api';

const EVENT_TYPES = ['goal', 'yellow_card', 'red_card', 'own_goal', 'substitution', 'penalty_scored', 'penalty_missed'];

const EVENT_ICONS = {
  goal: '⚽', yellow_card: '🟨', red_card: '🟥',
  own_goal: '⚽🔴', substitution: '🔄', penalty_scored: '⚽P', penalty_missed: '❌P',
};

export default function MatchEvents() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [form, setForm] = useState({ teamId: '', playerId: '', eventType: 'goal', minute: '' });
  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState({ teamId: '', playerId: '', eventType: '', minute: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [matchRes, eventsRes] = await Promise.all([getPublicMatch(id), getMatchEvents(id)]);
      setMatch(matchRes.data);
      setEvents(eventsRes.data);
      const [homeRes, awayRes] = await Promise.all([
        getPlayers(matchRes.data.home_team_id),
        getPlayers(matchRes.data.away_team_id),
      ]);
      setHomePlayers(homeRes.data);
      setAwayPlayers(awayRes.data);
    } finally {
      setLoading(false);
    }
  };

  const refreshEvents = async () => {
    const res = await getMatchEvents(id);
    setEvents(res.data);
  };

  const refreshMatch = async () => {
    const res = await getPublicMatch(id);
    setMatch(res.data);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    await createMatchEvent({
      match_id: id,
      team_id: form.teamId,
      player_id: form.playerId || null,
      event_type: form.eventType,
      minute: parseInt(form.minute),
    });
    setForm({ teamId: '', playerId: '', eventType: 'goal', minute: '' });
    await refreshEvents();
    await refreshMatch();
  };

  const startEdit = (ev) => {
    setEditingEvent(ev.id);
    setEditForm({
      teamId: ev.team_id,
      playerId: ev.player_id || '',
      eventType: ev.event_type,
      minute: ev.minute,
    });
  };

  const handleEditSave = async (eventId) => {
    await updateMatchEvent(eventId, {
      team_id: editForm.teamId,
      player_id: editForm.playerId || null,
      event_type: editForm.eventType,
      minute: parseInt(editForm.minute),
    });
    setEditingEvent(null);
    await refreshEvents();
    await refreshMatch();
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Delete this event?')) return;
    await deleteMatchEvent(eventId);
    await refreshEvents();
    await refreshMatch();
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  const allPlayers = [...homePlayers, ...awayPlayers];
  const getPlayersForTeam = (teamId) => teamId === match?.home_team_id ? homePlayers : awayPlayers;
  const getTeamName = (teamId) => teamId === match?.home_team_id ? match?.home_team_name : match?.away_team_name;
  const getPlayerName = (playerId) => allPlayers.find(p => p.id === playerId)?.name || 'Unknown';
  const addFormPlayers = form.teamId ? getPlayersForTeam(form.teamId) : [];
  const editFormPlayers = editForm.teamId ? getPlayersForTeam(editForm.teamId) : [];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" data-testid="match-events-page">
      <div className="mb-6">
        <Link to={`/admin/editions/${match?.edition_id}/matches`} className="text-emerald-400 text-sm hover:underline">← Back to Matches</Link>
        <h1 className="text-2xl font-bold text-white mt-2">Match Events</h1>
        <p className="text-slate-400 text-lg">
          {match?.home_team_name}
          <span className="text-emerald-400 font-bold mx-3">{match?.home_score} - {match?.away_score}</span>
          {match?.away_team_name}
        </p>
      </div>

      {/* Add event form */}
      <form onSubmit={handleAdd} className="bg-slate-800 p-4 rounded-lg mb-6 grid grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-slate-300 mb-1 text-sm">Team *</label>
          <select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value, playerId: '' })} required
            className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" data-testid="event-team-select">
            <option value="">Select</option>
            <option value={match?.home_team_id}>{match?.home_team_name}</option>
            <option value={match?.away_team_id}>{match?.away_team_name}</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-300 mb-1 text-sm">Player</label>
          <select value={form.playerId} onChange={(e) => setForm({ ...form, playerId: e.target.value })}
            className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" data-testid="event-player-select">
            <option value="">None</option>
            {addFormPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-slate-300 mb-1 text-sm">Event *</label>
          <select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}
            className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" data-testid="event-type-select">
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-slate-300 mb-1 text-sm">Minute *</label>
          <input type="number" value={form.minute} onChange={(e) => setForm({ ...form, minute: e.target.value })} required
            min="0" max="150" className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" data-testid="event-minute-input" />
        </div>
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm"
          data-testid="add-event-btn">Add</button>
      </form>

      {/* Timeline */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Timeline</h2>
        {events.length === 0 ? (
          <p className="text-slate-500 text-center py-4">No events yet</p>
        ) : (
          <div className="space-y-2">
            {events.map((ev) => (
              <div key={ev.id} className="bg-slate-700/50 rounded">
                {editingEvent === ev.id ? (
                  // Inline edit row
                  <div className="grid grid-cols-[1fr_1fr_1fr_80px_auto] gap-2 p-3 items-center">
                    <select value={editForm.teamId}
                      onChange={(e) => setEditForm({ ...editForm, teamId: e.target.value, playerId: '' })}
                      className="bg-slate-600 text-white px-2 py-1 rounded text-sm">
                      <option value={match?.home_team_id}>{match?.home_team_name}</option>
                      <option value={match?.away_team_id}>{match?.away_team_name}</option>
                    </select>
                    <select value={editForm.playerId}
                      onChange={(e) => setEditForm({ ...editForm, playerId: e.target.value })}
                      className="bg-slate-600 text-white px-2 py-1 rounded text-sm">
                      <option value="">None</option>
                      {editFormPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={editForm.eventType}
                      onChange={(e) => setEditForm({ ...editForm, eventType: e.target.value })}
                      className="bg-slate-600 text-white px-2 py-1 rounded text-sm">
                      {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </select>
                    <input type="number" value={editForm.minute}
                      onChange={(e) => setEditForm({ ...editForm, minute: e.target.value })}
                      min="0" max="150" className="bg-slate-600 text-white px-2 py-1 rounded text-sm text-center" />
                    <div className="flex gap-1">
                      <button onClick={() => handleEditSave(ev.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-xs">Save</button>
                      <button onClick={() => setEditingEvent(null)}
                        className="bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded text-xs">Cancel</button>
                    </div>
                  </div>
                ) : (
                  // Display row
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-mono text-sm w-8">{ev.minute}'</span>
                      <span className="text-lg">{EVENT_ICONS[ev.event_type] ?? '•'}</span>
                      <div>
                        <span className="text-white text-sm">{ev.player_name || '—'}</span>
                        <span className="text-slate-400 text-xs ml-2">
                          {getTeamName(ev.team_id)} · {ev.event_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => startEdit(ev)}
                        className="text-emerald-400 hover:text-emerald-300 text-sm">Edit</button>
                      <button onClick={() => handleDelete(ev.id)}
                        className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}