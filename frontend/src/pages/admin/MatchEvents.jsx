import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMatchEvents, createMatchEvent, deleteMatchEvent, getPlayers, updateMatch } from '../../lib/api';
import { getPublicMatch } from '../../lib/api';

const REGULAR_EVENT_TYPES = ['goal', 'yellow_card', 'red_card', 'own_goal', 'substitution', 'penalty_scored', 'penalty_missed'];

const eventIcon = (type) => {
  switch(type) {
    case 'goal': return '⚽';
    case 'own_goal': return '⚽🔴';
    case 'yellow_card': return '🟨';
    case 'red_card': return '🟥';
    case 'penalty_scored': return '⚽ P';
    case 'penalty_missed': return '❌ P';
    case 'shootout_scored': return '⚽';
    case 'shootout_missed': return '❌';
    default: return '🔄';
  }
};

export default function MatchEvents() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState(null);
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [form, setForm] = useState({ teamId: '', playerId: '', eventType: 'goal', minute: '' });
  const [shootoutPlayerId, setShootoutPlayerId] = useState('');
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

  const handleAddRegular = async (e) => {
    e.preventDefault();
    await createMatchEvent({
      match_id: id,
      team_id: form.teamId,
      player_id: form.playerId || null,
      event_type: form.eventType,
      minute: parseInt(form.minute),
    });
    setForm({ teamId: '', playerId: '', eventType: 'goal', minute: '' });
    await loadData();
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Delete this event?')) return;
    await deleteMatchEvent(eventId);
    await loadData();
  };

  const handleMarkPenalties = async () => {
    await updateMatch(id, { status: 'penalties' });
    await loadData();
  };

  const handleMarkCompleted = async () => {
    await updateMatch(id, { status: 'completed' });
    await loadData();
  };

  // Determine whose turn it is in the shootout
  const getShootoutTurn = () => {
    const shootoutEvents = (events || []).filter(e =>
      e.event_type === 'shootout_scored' || e.event_type === 'shootout_missed'
    );
    const homeKicks = shootoutEvents.filter(e => e.team_id === match?.home_team_id).length;
    const awayKicks = shootoutEvents.filter(e => e.team_id === match?.away_team_id).length;
    // Home always kicks first — if home has kicked more, it's away's turn
    if (homeKicks <= awayKicks) return 'home';
    return 'away';
  };

  const handleAddShootoutKick = async (scored) => {
    if (!shootoutPlayerId) return alert('Select a player first');
    const turn = getShootoutTurn();
    const teamId = turn === 'home' ? match.home_team_id : match.away_team_id;
    await createMatchEvent({
      match_id: id,
      team_id: teamId,
      player_id: shootoutPlayerId,
      event_type: scored ? 'shootout_scored' : 'shootout_missed',
      minute: 120,
    });
    setShootoutPlayerId('');
    await loadData();
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  const regularEvents = (events || []).filter(e =>
    e.event_type !== 'shootout_scored' && e.event_type !== 'shootout_missed'
  );
  const shootoutEvents = (events || []).filter(e =>
    e.event_type === 'shootout_scored' || e.event_type === 'shootout_missed'
  );
  const homeShootout = shootoutEvents.filter(e => e.team_id === match?.home_team_id);
  const awayShootout = shootoutEvents.filter(e => e.team_id === match?.away_team_id);

  const players = form.teamId === match?.home_team_id ? homePlayers : awayPlayers;
  const getTeamName = (teamId) => teamId === match?.home_team_id ? match?.home_team_name : match?.away_team_name;
  const getPlayerName = (playerId) => [...homePlayers, ...awayPlayers].find(p => p.id === playerId)?.name || 'Unknown';

  const isShootout = match?.status === 'penalties';
  const shootoutTurn = isShootout ? getShootoutTurn() : null;
  const currentTeamName = shootoutTurn === 'home' ? match?.home_team_name : match?.away_team_name;
  const currentPlayers = shootoutTurn === 'home' ? homePlayers : awayPlayers;
  const maxRounds = Math.max(homeShootout.length, awayShootout.length);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" data-testid="match-events-page">
      <div className="mb-6">
        <Link to={`/admin/editions/${match?.edition_id}/matches`} className="text-emerald-400 text-sm hover:underline">← Back to Matches</Link>
        <h1 className="text-2xl font-bold text-white mt-2">Match Events</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-slate-400">
            {match?.home_team_name} {match?.home_score} - {match?.away_score} {match?.away_team_name}
            {match?.home_penalties != null && (
              <span className="text-slate-500 ml-2">
                (pens: {match.home_penalties} - {match.away_penalties})
              </span>
            )}
          </p>
          <span className={`text-xs px-2 py-0.5 rounded ${
            match?.status === 'completed' ? 'bg-green-600' :
            match?.status === 'live' ? 'bg-red-600' :
            match?.status === 'penalties' ? 'bg-purple-600' : 'bg-slate-600'
          } text-white`}>{match?.status}</span>
        </div>
      </div>

      {/* Status action buttons */}
      <div className="flex gap-2 mb-6">
        {match?.status === 'live' && match?.home_score === match?.away_score && (
          <button onClick={handleMarkPenalties}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm">
            Goes to Penalties →
          </button>
        )}
        {(match?.status === 'live' || match?.status === 'penalties') && (
          <button onClick={handleMarkCompleted}
            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm">
            Mark Completed
          </button>
        )}
      </div>

      {/* Regular event form — hidden during penalties */}
      {match?.status !== 'penalties' && match?.status !== 'completed' && (
        <form onSubmit={handleAddRegular} className="bg-slate-800 p-4 rounded-lg mb-6 grid grid-cols-5 gap-3 items-end">
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
              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm">
              <option value="">None</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-slate-300 mb-1 text-sm">Event *</label>
            <select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm">
              {REGULAR_EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-slate-300 mb-1 text-sm">Minute *</label>
            <input type="number" value={form.minute} onChange={(e) => setForm({ ...form, minute: e.target.value })} required
              min="0" max="150" className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
          </div>
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm">Add</button>
        </form>
      )}

      {/* Penalty shootout section */}
      {(isShootout || shootoutEvents.length > 0) && (
        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Penalty Shootout
            {match?.home_penalties != null && (
              <span className="text-emerald-400 ml-2">
                {match.home_penalties} - {match.away_penalties}
              </span>
            )}
          </h2>

          {/* Kick entry form */}
          {isShootout && (
            <div className="bg-slate-700 rounded p-3 mb-4">
              <p className="text-slate-300 text-sm mb-2">
                Next kick: <span className="text-white font-semibold">{currentTeamName}</span>
                <span className="text-slate-500 ml-2">(Round {Math.max(homeShootout.length, awayShootout.length) + (shootoutTurn === 'home' ? 1 : 0)})</span>
              </p>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <select value={shootoutPlayerId} onChange={(e) => setShootoutPlayerId(e.target.value)}
                    className="w-full bg-slate-600 text-white px-3 py-2 rounded text-sm">
                    <option value="">Select player</option>
                    {currentPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <button onClick={() => handleAddShootoutKick(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm">
                  ⚽ Scored
                </button>
                <button onClick={() => handleAddShootoutKick(false)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm">
                  ❌ Missed
                </button>
              </div>
            </div>
          )}

          {/* Shootout table */}
          {maxRounds > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-slate-400 text-xs font-semibold uppercase mb-2">{match?.home_team_name}</h3>
                <div className="space-y-1">
                  {homeShootout.map((e, i) => (
                    <div key={e.id} className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 w-4">{i + 1}.</span>
                      <span>{e.event_type === 'shootout_scored' ? '⚽' : '❌'}</span>
                      <span className="text-slate-300">{getPlayerName(e.player_id)}</span>
                      <button onClick={() => handleDelete(e.id)} className="text-slate-600 hover:text-red-400 text-xs ml-auto">✕</button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-slate-400 text-xs font-semibold uppercase mb-2">{match?.away_team_name}</h3>
                <div className="space-y-1">
                  {awayShootout.map((e, i) => (
                    <div key={e.id} className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 w-4">{i + 1}.</span>
                      <span>{e.event_type === 'shootout_scored' ? '⚽' : '❌'}</span>
                      <span className="text-slate-300">{getPlayerName(e.player_id)}</span>
                      <button onClick={() => handleDelete(e.id)} className="text-slate-600 hover:text-red-400 text-xs ml-auto">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Regular timeline */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Match Timeline</h2>
        {regularEvents.length === 0 ? (
          <p className="text-slate-500 text-center py-4">No events recorded</p>
        ) : (
          <div className="space-y-2">
            {regularEvents.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2 border-b border-slate-700/50 last:border-0">
                <span className="text-slate-500 text-sm w-8">{e.minute}'</span>
                <span>{eventIcon(e.event_type)}</span>
                <span className="text-slate-400 text-sm">{getTeamName(e.team_id)}</span>
                <span className="text-white text-sm">{e.player_id ? getPlayerName(e.player_id) : ''}</span>
                <button onClick={() => handleDelete(e.id)} className="text-slate-600 hover:text-red-400 text-xs ml-auto">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}