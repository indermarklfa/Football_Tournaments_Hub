import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMatchEvents, createMatchEvent, deleteMatchEvent, getPlayers } from '../../lib/api';
import { getPublicMatch } from '../../lib/api';

const EVENT_TYPES = ['goal', 'yellow_card', 'red_card', 'own_goal', 'substitution', 'penalty_scored', 'penalty_missed'];

export default function MatchEvents() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [form, setForm] = useState({ teamId: '', playerId: '', eventType: 'goal', minute: '' });
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
    const res = await getMatchEvents(id);
    setEvents(res.data);
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Delete this event?')) return;
    await deleteMatchEvent(eventId);
    const res = await getMatchEvents(id);
    setEvents(res.data);
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  const players = form.teamId === match?.home_team_id ? homePlayers : awayPlayers;
  const getTeamName = (teamId) => teamId === match?.home_team_id ? match?.home_team_name : match?.away_team_name;
  const getPlayerName = (playerId) => [...homePlayers, ...awayPlayers].find(p => p.id === playerId)?.name || 'Unknown';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" data-testid="match-events-page">
      <div className="mb-6">
        <Link to={`/admin/editions/${match?.edition_id}/matches`} className="text-emerald-400 text-sm hover:underline">← Back to Matches</Link>
        <h1 className="text-2xl font-bold text-white mt-2">Match Events</h1>
        <p className="text-slate-400">{match?.home_team_name} {match?.home_score} - {match?.away_score} {match?.away_team_name}</p>
      </div>

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
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-slate-300 mb-1 text-sm">Event *</label>
          <select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}
            className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" data-testid="event-type-select">
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
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

      <div className="bg-slate-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Timeline</h2>
        {events.length === 0 ? (
          <p className="text-slate-500 text-center py-4">No events yet</p>
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="flex items-center justify-between bg-slate-700/50 p-3 rounded" data-testid={`event-${e.id}`}>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-mono w-12">{e.minute}'</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    e.event_type === 'goal' ? 'bg-green-600' :
                    e.event_type === 'yellow_card' ? 'bg-yellow-600' :
                    e.event_type === 'red_card' ? 'bg-red-600' : 'bg-slate-600'
                  } text-white`}>{e.event_type.replace('_', ' ')}</span>
                  <span className="text-white">{e.player_id ? getPlayerName(e.player_id) : '-'}</span>
                  <span className="text-slate-400 text-sm">({getTeamName(e.team_id)})</span>
                </div>
                <button onClick={() => handleDelete(e.id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
