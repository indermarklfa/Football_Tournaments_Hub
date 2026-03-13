import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getMatch,
  getTeams,
  getMatchEvents,
  createMatchEvent,
  updateMatchEvent,
  deleteMatchEvent,
  getPlayerRegistrations,
  updateMatch,
} from '../../lib/api';

const EVENT_BUTTONS = [
  { type: 'goal', icon: '⚽', label: 'Goal' },
  { type: 'yellow_card', icon: '🟨', label: 'Yellow' },
  { type: 'yellow_red_card', icon: '🟨🟥', label: '2nd Yellow' },
  { type: 'red_card', icon: '🟥', label: 'Red' },
  { type: 'own_goal', icon: '⚽🔴', label: 'Own Goal' },
  { type: 'penalty_scored', icon: '⚽P', label: 'Pen Scored' },
  { type: 'penalty_missed', icon: '❌P', label: 'Pen Missed' },
  { type: 'substitution', icon: '🔄', label: 'Sub' },
];

function parseError(err, fallback) {
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((e) => e.msg || JSON.stringify(e)).join(', ');
  if (typeof detail === 'string') return detail;
  return fallback;
}

function eventIcon(type) {
  const map = {
    goal: '⚽',
    assist: '🅰️',
    yellow_card: '🟨',
    yellow_red_card: '🟨🟥',
    red_card: '🟥',
    own_goal: '⚽🔴',
    penalty_scored: '⚽P',
    penalty_missed: '❌P',
    sub_on: '🟢',
    sub_off: '🔴',
    penalty_shootout_scored: '⚽',
    penalty_shootout_missed: '❌',
  };
  return map[type] || '•';
}

function normalizeRegistration(reg) {
  const player = reg.player || {};
  const playerId = reg.player_id || player.id;
  const firstName = player.first_name || reg.first_name || '';
  const lastName = player.last_name || reg.last_name || '';
  const squadNumber = reg.squad_number ?? reg.jersey_number ?? player.jersey_number ?? null;

  return {
    id: playerId,
    first_name: firstName,
    last_name: lastName,
    squad_number: squadNumber,
    label: `${squadNumber ? `#${squadNumber} ` : ''}${firstName} ${lastName}`.trim(),
  };
}

export default function MatchEvents() {
  const { id } = useParams();

  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [teamMap, setTeamMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [editingEventId, setEditingEventId] = useState(null);
  const [editPlayerId, setEditPlayerId] = useState('');
  const [editRelatedPlayerId, setEditRelatedPlayerId] = useState('');
  const [editMinute, setEditMinute] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [selectedRelatedPlayer, setSelectedRelatedPlayer] = useState('');
  const [minute, setMinute] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [shootoutPlayerId, setShootoutPlayerId] = useState('');
  const [shootoutError, setShootoutError] = useState('');
  const [showShootoutSetup, setShowShootoutSetup] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setPageError('');
    try {
      const [matchRes, eventsRes] = await Promise.all([
        getMatch(id),
        getMatchEvents(id),
      ]);

      const matchData = matchRes.data;
      setMatch(matchData);
      setEvents(eventsRes.data || []);

      const [teamsRes, homeRegsRes, awayRegsRes] = await Promise.all([
        getTeams(matchData.division_id),
        getPlayerRegistrations(matchData.home_team_id),
        getPlayerRegistrations(matchData.away_team_id),
      ]);

      const nextTeamMap = {};
      (teamsRes.data || []).forEach((t) => {
        nextTeamMap[t.id] = t.display_name;
      });
      setTeamMap(nextTeamMap);

      setHomePlayers((homeRegsRes.data || []).map(normalizeRegistration).filter((p) => p.id));
      setAwayPlayers((awayRegsRes.data || []).map(normalizeRegistration).filter((p) => p.id));
    } catch (err) {
      setPageError(parseError(err, 'Failed to load match events'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedTeam(null);
    setSelectedType(null);
    setSelectedPlayer('');
    setSelectedRelatedPlayer('');
    setMinute('');
    setFormError('');
  };

  const homeTeamName = teamMap[match?.home_team_id] || 'Home';
  const awayTeamName = teamMap[match?.away_team_id] || 'Away';

  const playerMap = useMemo(() => {
    const map = {};
    [...homePlayers, ...awayPlayers].forEach((p) => {
      map[p.id] = `${p.first_name} ${p.last_name}`.trim();
    });
    return map;
  }, [homePlayers, awayPlayers]);

  const regularEvents = events.filter(
    (e) => e.event_type !== 'penalty_shootout_scored' && e.event_type !== 'penalty_shootout_missed'
  );

  const shootoutEvents = events.filter(
    (e) => e.event_type === 'penalty_shootout_scored' || e.event_type === 'penalty_shootout_missed'
  );

  const isLive = match?.status === 'live';
  const isShootout = match?.status === 'penalties';
  const isCompleted = match?.status === 'completed';
  const canAddEvents = isLive;

  const currentPlayers = selectedTeam === 'home' ? homePlayers : awayPlayers;
  const currentTeamId = selectedTeam === 'home' ? match?.home_team_id : match?.away_team_id;

  const getPlayerName = (playerId) => playerMap[playerId] || 'Unknown';
  const openEditEvent = (event) => {
    setEditingEventId(event.id);
    setEditPlayerId(event.player_id || '');
    setEditRelatedPlayerId(event.related_player_id || '');
    setEditMinute(event.minute ?? '');
    setEditError('');
  };

  const getShootoutTurn = () => {
    if (!match?.shootout_first_team_id) return 'home';

    const homeKicks = shootoutEvents.filter((e) => e.team_id === match.home_team_id).length;
    const awayKicks = shootoutEvents.filter((e) => e.team_id === match.away_team_id).length;

    const firstIsHome = match.shootout_first_team_id === match.home_team_id;
    if (firstIsHome) return homeKicks <= awayKicks ? 'home' : 'away';
    return awayKicks <= homeKicks ? 'away' : 'home';
  };

  const homeShootout = shootoutEvents.filter((e) => e.team_id === match?.home_team_id);
  const awayShootout = shootoutEvents.filter((e) => e.team_id === match?.away_team_id);

  const shootoutTurn = isShootout ? getShootoutTurn() : null;
  const currentShootoutPlayers = shootoutTurn === 'home' ? homePlayers : awayPlayers;
  const currentShootoutTeam = shootoutTurn === 'home' ? homeTeamName : awayTeamName;

  const groupedRegularEvents = [];
  const usedAssistIds = new Set();

  regularEvents.forEach((e) => {
    if (e.event_type === 'assist') return;

    if (e.event_type === 'goal') {
      const assist = regularEvents.find(
        (a) =>
          a.event_type === 'assist' &&
          !usedAssistIds.has(a.id) &&
          a.team_id === e.team_id &&
          a.minute === e.minute
      );
      if (assist) usedAssistIds.add(assist.id);
      groupedRegularEvents.push({ ...e, assist_event: assist || null });
    } else {
      groupedRegularEvents.push(e);
    }
  });

  const handleSubmitEvent = async () => {
    if (!selectedTeam || !selectedType || !minute || !currentTeamId) return;

    setSubmitting(true);
    setFormError('');

    try {
      if (selectedType === 'substitution') {
        if (!selectedPlayer || !selectedRelatedPlayer) {
          setFormError('Select both player off and player on.');
          setSubmitting(false);
          return;
        }
        if (selectedPlayer === selectedRelatedPlayer) {
          setFormError('Player off and player on must be different.');
          setSubmitting(false);
          return;
        }

        await createMatchEvent({
          match_id: id,
          team_id: currentTeamId,
          player_id: selectedPlayer,
          related_player_id: selectedRelatedPlayer,
          event_type: 'sub_off',
          minute: parseInt(minute, 10),
        });

        await createMatchEvent({
          match_id: id,
          team_id: currentTeamId,
          player_id: selectedRelatedPlayer,
          related_player_id: selectedPlayer,
          event_type: 'sub_on',
          minute: parseInt(minute, 10),
        });
      } else if (selectedType === 'goal') {
        if (!selectedPlayer && selectedRelatedPlayer) {
          setFormError('Select a scorer if you want to add an assist.');
          setSubmitting(false);
          return;
        }

        await createMatchEvent({
          match_id: id,
          team_id: currentTeamId,
          player_id: selectedPlayer || null,
          event_type: 'goal',
          minute: parseInt(minute, 10),
        });

        if (selectedPlayer && selectedRelatedPlayer) {
          await createMatchEvent({
            match_id: id,
            team_id: currentTeamId,
            player_id: selectedRelatedPlayer,
            related_player_id: selectedPlayer,
            event_type: 'assist',
            minute: parseInt(minute, 10),
          });
        }
      } else {
        await createMatchEvent({
          match_id: id,
          team_id: currentTeamId,
          player_id: selectedPlayer || null,
          event_type: selectedType,
          minute: parseInt(minute, 10),
        });
      }

      resetForm();
      await loadData();
    } catch (err) {
      setFormError(parseError(err, 'Failed to add event'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await deleteMatchEvent(eventId);
      await loadData();
    } catch (err) {
      setPageError(parseError(err, 'Failed to delete event'));
    }
  };

  const handleSaveEventEdit = async (event) => {
    setEditSaving(true);
    setEditError('');

    try {
      await updateMatchEvent(event.id, {
        player_id: editPlayerId || null,
        related_player_id: editRelatedPlayerId || null,
        minute: editMinute !== '' ? parseInt(editMinute, 10) : event.minute,
      });

      setEditingEventId(null);
      await loadData();
    } catch (err) {
      setEditError(parseError(err, 'Failed to update event'));
    } finally {
      setEditSaving(false);
    }
  };

  const startShootout = async (firstTeamId) => {
    try {
      await updateMatch(id, {
        status: 'penalties',
        shootout_first_team_id: firstTeamId,
      });
      setShowShootoutSetup(false);
      await loadData();
    } catch (err) {
      setPageError(parseError(err, 'Failed to start shootout'));
    }
  };

  const handleAddShootoutKick = async (scored) => {
    const teamId = getShootoutTurn() === 'home' ? match.home_team_id : match.away_team_id;

    try {
      setShootoutError('');
      await createMatchEvent({
        match_id: id,
        team_id: teamId,
        player_id: shootoutPlayerId || null,
        event_type: scored ? 'penalty_shootout_scored' : 'penalty_shootout_missed',
        minute: 120,
      });
      setShootoutPlayerId('');
      await loadData();
    } catch (err) {
      setShootoutError(parseError(err, 'Failed to add shootout kick'));
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (!match) return <div className="text-center py-12 text-red-400">Match not found</div>;

  return (
    <div className="max-w-3xl mx-auto py-6 px-4" data-testid="match-events-page">
      <Link to={`/admin/divisions/${match.division_id}/matches`} className="text-emerald-400 text-sm hover:underline">
        ← Back to Matches
      </Link>

      {pageError && <div className="bg-red-900/50 text-red-300 p-3 rounded mt-4">{pageError}</div>}

      <div className="flex items-center justify-between mt-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">
            {homeTeamName} {match.home_score ?? 0}
            {match.home_penalties != null ? ` (${match.home_penalties})` : ''}
            {' - '}
            {match.away_penalties != null ? `(${match.away_penalties}) ` : ''}
            {match.away_score ?? 0} {awayTeamName}
          </h1>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded font-medium ${
            isCompleted
              ? 'bg-green-700'
              : isShootout
              ? 'bg-purple-600 animate-pulse'
              : isLive
              ? 'bg-red-600 animate-pulse'
              : 'bg-slate-600'
          } text-white`}
        >
          {match.status}
        </span>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {isLive && (match.home_score ?? 0) === (match.away_score ?? 0) && !isShootout && (
          <button
            onClick={() => setShowShootoutSetup(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
          >
            → Penalties
          </button>
        )}

        {(isLive || isShootout) && (
          <button
            onClick={async () => {
              await updateMatch(id, { status: 'completed' });
              await loadData();
            }}
            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm"
          >
            Mark Completed
          </button>
        )}
      </div>

      {showShootoutSetup && (
        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4 mb-5">
          <h2 className="text-white font-semibold mb-3">Who kicks first?</h2>
          <div className="flex gap-2">
            <button
              onClick={() => startShootout(match.home_team_id)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
            >
              {homeTeamName}
            </button>
            <button
              onClick={() => startShootout(match.away_team_id)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
            >
              {awayTeamName}
            </button>
            <button
              onClick={() => setShowShootoutSetup(false)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {canAddEvents && (
        <div className="bg-slate-800 rounded-lg p-4 mb-5 border border-slate-700">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Add Event</p>
          {formError && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-3">{formError}</div>}

          <div className="grid grid-cols-2 gap-2 mb-3">
            {['home', 'away'].map((side) => {
              const name = side === 'home' ? homeTeamName : awayTeamName;
              return (
                <button
                  key={side}
                  onClick={() => {
                    setSelectedTeam(side);
                    setSelectedPlayer('');
                    setSelectedRelatedPlayer('');
                    setSelectedType(null);
                    setFormError('');
                  }}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    selectedTeam === side
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {selectedTeam && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {EVENT_BUTTONS.map((btn) => (
                <button
                  key={btn.type}
                  onClick={() => {
                    setSelectedType(btn.type);
                    setSelectedPlayer('');
                    setSelectedRelatedPlayer('');
                    setFormError('');
                  }}
                  className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs transition-colors ${
                    selectedType === btn.type
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <span className="text-lg mb-0.5">{btn.icon}</span>
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          )}

          {selectedTeam && selectedType === 'goal' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Scorer *</label>
                  <select
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer(e.target.value)}
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                  >
                    <option value="">Select scorer</option>
                    {currentPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Assist</label>
                  <select
                    value={selectedRelatedPlayer}
                    onChange={(e) => setSelectedRelatedPlayer(e.target.value)}
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                  >
                    <option value="">No assist</option>
                    {currentPlayers
                      .filter((p) => p.id !== selectedPlayer)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 items-end">
                <div className="w-24">
                  <label className="block text-slate-400 text-xs mb-1">Minute *</label>
                  <input
                    type="number"
                    value={minute}
                    onChange={(e) => setMinute(e.target.value)}
                    min="0"
                    max="150"
                    placeholder="45"
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm text-center"
                  />
                </div>
                <button
                  onClick={handleSubmitEvent}
                  disabled={!minute || submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-4 py-2 rounded text-sm font-medium shrink-0"
                >
                  {submitting ? '...' : 'Add Goal'}
                </button>
              </div>
            </div>
          )}

          {selectedTeam && selectedType && !['goal', 'substitution'].includes(selectedType) && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-slate-400 text-xs mb-1">Player</label>
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                >
                  <option value="">No player</option>
                  {currentPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-slate-400 text-xs mb-1">Minute *</label>
                <input
                  type="number"
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  min="0"
                  max="150"
                  placeholder="45"
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm text-center"
                />
              </div>
              <button
                onClick={handleSubmitEvent}
                disabled={!minute || submitting}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-4 py-2 rounded text-sm font-medium shrink-0"
              >
                {submitting ? '...' : 'Add'}
              </button>
            </div>
          )}

          {selectedTeam && selectedType === 'substitution' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Player Off *</label>
                  <select
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer(e.target.value)}
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                  >
                    <option value="">Select player off</option>
                    {currentPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Player On *</label>
                  <select
                    value={selectedRelatedPlayer}
                    onChange={(e) => setSelectedRelatedPlayer(e.target.value)}
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                  >
                    <option value="">Select player on</option>
                    {currentPlayers
                      .filter((p) => p.id !== selectedPlayer)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 items-end">
                <div className="w-24">
                  <label className="block text-slate-400 text-xs mb-1">Minute *</label>
                  <input
                    type="number"
                    value={minute}
                    onChange={(e) => setMinute(e.target.value)}
                    min="0"
                    max="150"
                    placeholder="70"
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm text-center"
                  />
                </div>
                <button
                  onClick={handleSubmitEvent}
                  disabled={!minute || !selectedPlayer || !selectedRelatedPlayer || submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-4 py-2 rounded text-sm font-medium shrink-0"
                >
                  {submitting ? '...' : 'Add Sub'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(isShootout || shootoutEvents.length > 0) && (
        <div className="bg-slate-800 rounded-lg p-4 mb-5">
          <h2 className="text-white font-semibold mb-3">Penalty Shootout</h2>

          {isShootout && (
            <div className="bg-slate-700 rounded-lg p-3 mb-4">
              {shootoutError && <div className="bg-red-900/50 text-red-300 p-2 rounded mb-2 text-sm">{shootoutError}</div>}
              <p className="text-sm text-slate-300 mb-2">
                Next: <span className="text-white font-semibold">{currentShootoutTeam}</span>
              </p>
              <div className="flex gap-2 items-center">
                <select
                  value={shootoutPlayerId}
                  onChange={(e) => setShootoutPlayerId(e.target.value)}
                  className="flex-1 bg-slate-600 text-white px-3 py-2 rounded text-sm"
                >
                  <option value="">No player</option>
                  {currentShootoutPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleAddShootoutKick(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded text-sm font-medium"
                >
                  ⚽ Scored
                </button>
                <button
                  onClick={() => handleAddShootoutKick(false)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium"
                >
                  ❌ Missed
                </button>
              </div>
            </div>
          )}

          {(homeShootout.length > 0 || awayShootout.length > 0) && (() => {
            const maxRounds = Math.max(homeShootout.length, awayShootout.length);
            const shootoutRounds = Array.from({ length: maxRounds }, (_, i) => ({
              round: i + 1,
              home: homeShootout[i] || null,
              away: awayShootout[i] || null,
            }));

            return (
              <div>
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <p className="text-slate-400 text-xs font-semibold uppercase">{homeTeamName}</p>
                  <p className="text-slate-500 text-xs font-semibold uppercase text-center">Round</p>
                  <p className="text-slate-400 text-xs font-semibold uppercase text-right">{awayTeamName}</p>
                </div>

                <div className="space-y-1.5">
                  {shootoutRounds.map(({ round, home, away }) => (
                    <div key={round} className="grid grid-cols-3 gap-4 items-center text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {home ? (
                          <>
                            <span>{home.event_type === 'penalty_shootout_scored' ? '⚽' : '❌'}</span>
                            <span className="text-slate-300 truncate flex-1">
                              {home.player_id ? getPlayerName(home.player_id) : 'No player'}
                            </span>
                            <button
                              onClick={() => handleDelete(home.id)}
                              className="text-slate-600 hover:text-red-400 text-xs shrink-0"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </div>

                      <div className="text-center text-slate-500">{round}</div>

                      <div className="flex items-center justify-end gap-2 min-w-0">
                        {away ? (
                          <>
                            <button
                              onClick={() => handleDelete(away.id)}
                              className="text-slate-600 hover:text-red-400 text-xs shrink-0"
                            >
                              ✕
                            </button>
                            <span className="text-slate-300 truncate flex-1 text-right">
                              {away.player_id ? getPlayerName(away.player_id) : 'No player'}
                            </span>
                            <span>{away.event_type === 'penalty_shootout_scored' ? '⚽' : '❌'}</span>
                          </>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      {match.status === 'completed' &&
        match.home_penalties != null &&
        match.away_penalties != null &&
        match.home_penalties !== match.away_penalties && (
          <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <p className="text-emerald-400 text-sm font-medium text-center">
              {match.home_penalties > match.away_penalties ? homeTeamName : awayTeamName}
              {' '}won {Math.max(match.home_penalties, match.away_penalties)} - {Math.min(match.home_penalties, match.away_penalties)} on penalties
            </p>
          </div>
        )}

      <div className="bg-slate-800 rounded-lg p-4">
        <h2 className="text-white font-semibold mb-4">Match Timeline</h2>
        {groupedRegularEvents.length === 0 ? (
          <p className="text-slate-500 text-center py-4 text-sm">No events yet</p>
        ) : (
          <div className="space-y-1">
            {groupedRegularEvents.map((e) => {
              const isHome = e.team_id === match?.home_team_id;
              const assistName = e.assist_event?.player_id ? getPlayerName(e.assist_event.player_id) : null;

              return (
                <div key={e.id}>
                  <div className="flex items-center gap-2 py-1.5 border-b border-slate-700/40 last:border-0">
                    <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                      {isHome ? (
                        <>
                          <div className="text-right min-w-0">
                            <p className="text-white text-sm truncate">{e.player_id ? getPlayerName(e.player_id) : '—'}</p>
                            {assistName && <p className="text-slate-500 text-xs truncate">Assist: {assistName}</p>}
                            {e.related_player_id && !assistName && (
                              <p className="text-slate-500 text-xs truncate">{getPlayerName(e.related_player_id)}</p>
                            )}
                          </div>
                          <span className="shrink-0">{eventIcon(e.event_type)}</span>
                        </>
                      ) : null}
                    </div>

                    <div className="shrink-0 w-12 text-center">
                      <span className="text-slate-400 text-xs font-mono bg-slate-700 px-1.5 py-0.5 rounded">
                        {e.minute}'
                      </span>
                    </div>

                    <div className="flex-1 flex items-center justify-start gap-2 min-w-0">
                      {!isHome ? (
                        <>
                          <span className="shrink-0">{eventIcon(e.event_type)}</span>
                          <div className="text-left min-w-0">
                            <p className="text-white text-sm truncate">{e.player_id ? getPlayerName(e.player_id) : '—'}</p>
                            {assistName && <p className="text-slate-500 text-xs truncate">Assist: {assistName}</p>}
                            {e.related_player_id && !assistName && (
                              <p className="text-slate-500 text-xs truncate">{getPlayerName(e.related_player_id)}</p>
                            )}
                          </div>
                        </>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-1">
                      <button
                        onClick={() => openEditEvent(e)}
                        className="text-slate-400 hover:text-emerald-400 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="text-slate-600 hover:text-red-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {editingEventId === e.id && (
                    <div className="bg-slate-700/40 rounded mt-2 p-3 mb-2">
                      {editError && <div className="bg-red-900/50 text-red-300 p-2 rounded mb-2 text-sm">{editError}</div>}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-400 text-xs mb-1">Player</label>
                          <select
                            value={editPlayerId}
                            onChange={(ev) => setEditPlayerId(ev.target.value)}
                            className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                          >
                            <option value="">No player</option>
                            {(e.team_id === match.home_team_id ? homePlayers : awayPlayers).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 text-xs mb-1">Related Player</label>
                          <select
                            value={editRelatedPlayerId}
                            onChange={(ev) => setEditRelatedPlayerId(ev.target.value)}
                            className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                          >
                            <option value="">None</option>
                            {(e.team_id === match.home_team_id ? homePlayers : awayPlayers)
                              .filter((p) => p.id !== editPlayerId)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.label}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 text-xs mb-1">Minute</label>
                          <input
                            type="number"
                            min="0"
                            max="150"
                            value={editMinute}
                            onChange={(ev) => setEditMinute(ev.target.value)}
                            className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleSaveEventEdit(e)}
                          disabled={editSaving}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
                        >
                          {editSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingEventId(null)}
                          className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        )}
      </div>
    </div>
  );
}