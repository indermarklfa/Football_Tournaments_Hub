import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMatchEvents, createMatchEvent, deleteMatchEvent, getPlayers, updateMatch } from '../../lib/api';
import { getPublicMatch } from '../../lib/api';

const LIVE_STATUSES = ['live', 'penalties'];

const EVENT_BUTTONS = [
  { type: 'goal',            icon: '⚽', label: 'Goal' },
  { type: 'yellow_card',     icon: '🟨', label: 'Yellow' },
  { type: 'red_card',        icon: '🟥', label: 'Red' },
  { type: 'own_goal',        icon: '⚽🔴', label: 'Own Goal' },
  { type: 'penalty_scored',  icon: '⚽P', label: 'Pen Scored' },
  { type: 'penalty_missed',  icon: '❌P', label: 'Pen Missed' },
  { type: 'substitution',    icon: '🔄', label: 'Sub' },
];

const eventIcon = (type) => {
  const found = EVENT_BUTTONS.find(e => e.type === type);
  return found ? found.icon : '🔄';
};

export default function MatchEvents() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick entry state
  const [selectedTeam, setSelectedTeam] = useState(null); // 'home' | 'away'
  const [selectedType, setSelectedType] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [minute, setMinute] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Shootout state
  const [shootoutPlayerId, setShootoutPlayerId] = useState('');

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

  const resetForm = () => {
    setSelectedTeam(null);
    setSelectedType(null);
    setSelectedPlayer('');
    setMinute('');
  };

  const handleSubmitEvent = async () => {
    if (!selectedTeam || !selectedType || !minute) return;
    const teamId = selectedTeam === 'home' ? match.home_team_id : match.away_team_id;
    setSubmitting(true);
    try {
      await createMatchEvent({
        match_id: id,
        team_id: teamId,
        player_id: selectedPlayer || null,
        event_type: selectedType,
        minute: parseInt(minute),
      });
      resetForm();
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Delete this event?')) return;
    await deleteMatchEvent(eventId);
    await loadData();
  };

  const getShootoutTurn = () => {
    const shootoutEvts = events.filter(e =>
      e.event_type === 'shootout_scored' || e.event_type === 'shootout_missed'
    );
    const homeKicks = shootoutEvts.filter(e => e.team_id === match?.home_team_id).length;
    const awayKicks = shootoutEvts.filter(e => e.team_id === match?.away_team_id).length;
    return homeKicks <= awayKicks ? 'home' : 'away';
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

  const regularEvents = events.filter(e =>
    e.event_type !== 'shootout_scored' && e.event_type !== 'shootout_missed'
  );
  const shootoutEvents = events.filter(e =>
    e.event_type === 'shootout_scored' || e.event_type === 'shootout_missed'
  );
  const homeShootout = shootoutEvents.filter(e => e.team_id === match?.home_team_id);
  const awayShootout = shootoutEvents.filter(e => e.team_id === match?.away_team_id);
  const maxRounds = Math.max(homeShootout.length, awayShootout.length);

  const isLive = match?.status === 'live';
  const isShootout = match?.status === 'penalties';
  const isCompleted = match?.status === 'completed';
  const canAddEvents = isLive;

  const currentPlayers = selectedTeam === 'home' ? homePlayers : awayPlayers;
  const shootoutTurn = isShootout ? getShootoutTurn() : null;
  const currentShootoutPlayers = shootoutTurn === 'home' ? homePlayers : awayPlayers;
  const currentShootoutTeam = shootoutTurn === 'home' ? match?.home_team_name : match?.away_team_name;

  const getPlayerName = (playerId) =>
    [...homePlayers, ...awayPlayers].find(p => p.id === playerId)?.name || 'Unknown';

  return (
    <div className="max-w-3xl mx-auto py-6 px-4" data-testid="match-events-page">

      {/* Header */}
      <Link to={`/admin/editions/${match?.edition_id}/matches`}
        className="text-emerald-400 text-sm hover:underline">← Back to Matches</Link>

      <div className="flex items-center justify-between mt-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">
            {match?.home_team_name} vs {match?.away_team_name}
          </h1>
          <p className="text-slate-400 text-sm">
            {match?.home_score} - {match?.away_score}
            {match?.home_penalties != null && (
              <span className="text-slate-500 ml-1">
                (pens {match.home_penalties} - {match.away_penalties})
              </span>
            )}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded font-medium ${
          isCompleted ? 'bg-green-700' :
          isShootout ? 'bg-purple-600 animate-pulse' :
          isLive ? 'bg-red-600 animate-pulse' : 'bg-slate-600'
        } text-white`}>{match?.status}</span>
      </div>

      {/* Status actions */}
      <div className="flex gap-2 mb-5">
        {isLive && match?.home_score === match?.away_score && (
          <button onClick={async () => { await updateMatch(id, { status: 'penalties' }); loadData(); }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm">
            → Penalties
          </button>
        )}
        {(isLive || isShootout) && (
          <button onClick={async () => { await updateMatch(id, { status: 'completed' }); loadData(); }}
            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm">
            Mark Completed
          </button>
        )}
      </div>

      {/* ── QUICK EVENT ENTRY ── */}
      {canAddEvents && (
        <div className="bg-slate-800 rounded-lg p-4 mb-5 border border-slate-700">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Add Event
          </p>

          {/* Step 1: Team */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {['home', 'away'].map(side => {
              const name = side === 'home' ? match?.home_team_name : match?.away_team_name;
              return (
                <button key={side} onClick={() => { setSelectedTeam(side); setSelectedPlayer(''); setSelectedType(null); }}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    selectedTeam === side
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}>
                  {name}
                </button>
              );
            })}
          </div>

          {/* Step 2: Event type */}
          {selectedTeam && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {EVENT_BUTTONS.map(btn => (
                <button key={btn.type} onClick={() => setSelectedType(btn.type)}
                  className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs transition-colors ${
                    selectedType === btn.type
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}>
                  <span className="text-lg mb-0.5">{btn.icon}</span>
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Player + Minute */}
          {selectedTeam && selectedType && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-slate-400 text-xs mb-1">Player</label>
                <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm">
                  <option value="">No player</option>
                  {currentPlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-slate-400 text-xs mb-1">Minute *</label>
                <input type="number" value={minute} onChange={e => setMinute(e.target.value)}
                  min="0" max="150" placeholder="45"
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm text-center" />
              </div>
              <button onClick={handleSubmitEvent} disabled={!minute || submitting}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-4 py-2 rounded text-sm font-medium shrink-0">
                {submitting ? '...' : 'Add'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PENALTY SHOOTOUT ── */}
      {(isShootout || shootoutEvents.length > 0) && (
        <div className="bg-slate-800 rounded-lg p-4 mb-5">
          <h2 className="text-white font-semibold mb-3">
            Penalty Shootout
            {match?.home_penalties != null && (
              <span className="text-emerald-400 ml-2 font-bold">
                {match.home_penalties} - {match.away_penalties}
              </span>
            )}
          </h2>

          {/* Kick entry */}
          {isShootout && (
            <div className="bg-slate-700 rounded-lg p-3 mb-4">
              <p className="text-sm text-slate-300 mb-2">
                Next: <span className="text-white font-semibold">{currentShootoutTeam}</span>
              </p>
              <div className="flex gap-2 items-center">
                <select value={shootoutPlayerId} onChange={e => setShootoutPlayerId(e.target.value)}
                  className="flex-1 bg-slate-600 text-white px-3 py-2 rounded text-sm">
                  <option value="">Select player</option>
                  {currentShootoutPlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button onClick={() => handleAddShootoutKick(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded text-sm font-medium">
                  ⚽ Scored
                </button>
                <button onClick={() => handleAddShootoutKick(false)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium">
                  ❌ Missed
                </button>
              </div>
            </div>
          )}

          {/* Shootout table */}
          {maxRounds > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase mb-2">{match?.home_team_name}</p>
                <div className="space-y-1.5">
                  {homeShootout.map((e, i) => (
                    <div key={e.id} className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 w-5 shrink-0">{i + 1}.</span>
                      <span>{e.event_type === 'shootout_scored' ? '⚽' : '❌'}</span>
                      <span className="text-slate-300 truncate flex-1">{getPlayerName(e.player_id)}</span>
                      <button onClick={() => handleDelete(e.id)}
                        className="text-slate-600 hover:text-red-400 text-xs shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase mb-2">{match?.away_team_name}</p>
                <div className="space-y-1.5">
                  {awayShootout.map((e, i) => (
                    <div key={e.id} className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 w-5 shrink-0">{i + 1}.</span>
                      <span>{e.event_type === 'shootout_scored' ? '⚽' : '❌'}</span>
                      <span className="text-slate-300 truncate flex-1">{getPlayerName(e.player_id)}</span>
                      <button onClick={() => handleDelete(e.id)}
                        className="text-slate-600 hover:text-red-400 text-xs shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MATCH TIMELINE ── */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h2 className="text-white font-semibold mb-4">Match Timeline</h2>
        {regularEvents.length === 0 ? (
          <p className="text-slate-500 text-center py-4 text-sm">No events yet</p>
        ) : (
          <div className="space-y-1">
            {regularEvents.map((e) => {
              const isHome = e.team_id === match?.home_team_id;
              return (
                <div key={e.id} className="flex items-center gap-2 py-1.5 border-b border-slate-700/40 last:border-0">
                  {/* Home side */}
                  <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                    {isHome ? (
                      <>
                        <div className="text-right min-w-0">
                          <p className="text-white text-sm truncate">
                            {e.player_name || '—'}
                          </p>
                        </div>
                        <span className="shrink-0">{eventIcon(e.event_type)}</span>
                      </>
                    ) : null}
                  </div>
                  {/* Minute */}
                  <div className="shrink-0 w-12 text-center">
                    <span className="text-slate-400 text-xs font-mono bg-slate-700 px-1.5 py-0.5 rounded">
                      {e.minute}'
                    </span>
                  </div>
                  {/* Away side */}
                  <div className="flex-1 flex items-center justify-start gap-2 min-w-0">
                    {!isHome ? (
                      <>
                        <span className="shrink-0">{eventIcon(e.event_type)}</span>
                        <div className="text-left min-w-0">
                          <p className="text-white text-sm truncate">
                            {e.player_name || '—'}
                          </p>
                        </div>
                      </>
                    ) : null}
                  </div>
                  {/* Delete */}
                  <button onClick={() => handleDelete(e.id)}
                    className="text-slate-600 hover:text-red-400 text-xs shrink-0 ml-1">✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}