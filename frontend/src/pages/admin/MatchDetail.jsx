import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getMatch,
  getTeams,
  getOrganizations,
  getOrganizationOfficials,
  getLineup,
  addToLineup,
  updateLineup,
  getMatchOfficials,
  assignMatchOfficial,
  removeMatchOfficial,
  getDiscipline,
  createDisciplinaryAction,
  updateDisciplinaryAction,
  updateMatch,
} from '../../lib/api';

function parseError(err, fallback) {
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((e) => e.msg || JSON.stringify(e)).join(', ');
  if (typeof detail === 'string') return detail;
  return fallback;
}

export default function MatchDetail() {
  const { id: matchId } = useParams();

  const [match, setMatch] = useState(null);
  const [teamMap, setTeamMap] = useState({});
  const [homeLineups, setHomeLineups] = useState([]);
  const [awayLineups, setAwayLineups] = useState([]);
  const [matchOfficials, setMatchOfficials] = useState([]);
  const [orgOfficials, setOrgOfficials] = useState([]);
  const [discipline, setDiscipline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Score/status update
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [scoreForm, setScoreForm] = useState({ home_score: 0, away_score: 0, status: 'scheduled' });
  const [scoreError, setScoreError] = useState('');
  const [scoreSaving, setScoreSaving] = useState(false);

  // Lineup add form
  const [showLineupForm, setShowLineupForm] = useState(null); // 'home' | 'away' | null
  const [lineupForm, setLineupForm] = useState({ player_id: '', starting: true, jersey_number: '', position: '' });
  const [lineupError, setLineupError] = useState('');
  const [lineupSaving, setLineupSaving] = useState(false);

  // Official assign form
  const [showOfficialForm, setShowOfficialForm] = useState(false);
  const [officialForm, setOfficialForm] = useState({ official_id: '', role: '' });
  const [officialError, setOfficialError] = useState('');
  const [officialSaving, setOfficialSaving] = useState(false);

  // Discipline add form
  const [showDisciplineForm, setShowDisciplineForm] = useState(false);
  const [disciplineForm, setDisciplineForm] = useState({
    player_id: '', team_id: '', action_type: 'yellow_card', minute: '', reason: '', suspension_matches: '',
  });
  const [disciplineError, setDisciplineError] = useState('');
  const [disciplineSaving, setDisciplineSaving] = useState(false);

  useEffect(() => { loadData(); }, [matchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const matchRes = await getMatch(matchId);
      const m = matchRes.data;
      setMatch(m);
      setScoreForm({ home_score: m.home_score ?? 0, away_score: m.away_score ?? 0, status: m.status });

      const orgsRes = await getOrganizations();
      const orgId = orgsRes.data[0]?.id;

      const [teamsRes, homeLineupRes, awayLineupRes, matchOfficialsRes, disciplineRes, orgOfficialsRes] =
        await Promise.all([
          getTeams(m.season_id),
          getLineup(m.id, m.home_team_id),
          getLineup(m.id, m.away_team_id),
          getMatchOfficials(m.id),
          getDiscipline({ season_id: m.season_id }),
          orgId ? getOrganizationOfficials(orgId) : Promise.resolve({ data: [] }),
        ]);

      const map = {};
      teamsRes.data.forEach((t) => { map[t.id] = t.name; });
      setTeamMap(map);
      setHomeLineups(homeLineupRes.data);
      setAwayLineups(awayLineupRes.data);
      setMatchOfficials(matchOfficialsRes.data);
      setDiscipline(disciplineRes.data.filter((d) => d.match_id === matchId));
      setOrgOfficials(orgOfficialsRes.data);
    } catch (err) {
      setError('Failed to load match data');
    } finally {
      setLoading(false);
    }
  };

  // --- Score update ---
  const handleScoreSave = async () => {
    setScoreSaving(true);
    setScoreError('');
    try {
      await updateMatch(matchId, {
        home_score: parseInt(scoreForm.home_score) || 0,
        away_score: parseInt(scoreForm.away_score) || 0,
        status: scoreForm.status,
      });
      setShowScoreForm(false);
      await loadData();
    } catch (err) {
      setScoreError(parseError(err, 'Failed to update match'));
    } finally {
      setScoreSaving(false);
    }
  };

  // --- Lineup ---
  const handleAddLineup = async (teamId) => {
    setLineupSaving(true);
    setLineupError('');
    try {
      await addToLineup({
        match_id: matchId,
        team_id: teamId,
        player_id: lineupForm.player_id,
        starting: lineupForm.starting,
        jersey_number: lineupForm.jersey_number ? parseInt(lineupForm.jersey_number) : null,
        position: lineupForm.position || null,
      });
      setShowLineupForm(null);
      setLineupForm({ player_id: '', starting: true, jersey_number: '', position: '' });
      await loadData();
    } catch (err) {
      setLineupError(parseError(err, 'Failed to add player'));
    } finally {
      setLineupSaving(false);
    }
  };

  const handleRemoveLineup = async (id) => {
    try {
      await updateLineup(id, { deleted: true });
      await loadData();
    } catch {
      setError('Failed to remove player from lineup');
    }
  };

  // --- Officials ---
  const handleAssignOfficial = async () => {
    setOfficialSaving(true);
    setOfficialError('');
    try {
      await assignMatchOfficial({
        match_id: matchId,
        official_id: officialForm.official_id,
        role: officialForm.role || null,
      });
      setShowOfficialForm(false);
      setOfficialForm({ official_id: '', role: '' });
      await loadData();
    } catch (err) {
      setOfficialError(parseError(err, 'Failed to assign official'));
    } finally {
      setOfficialSaving(false);
    }
  };

  const handleRemoveOfficial = async (id) => {
    try {
      await removeMatchOfficial(id);
      await loadData();
    } catch {
      setError('Failed to remove official');
    }
  };

  // --- Discipline ---
  const handleAddDiscipline = async () => {
    setDisciplineSaving(true);
    setDisciplineError('');
    try {
      await createDisciplinaryAction({
        match_id: matchId,
        player_id: disciplineForm.player_id,
        team_id: disciplineForm.team_id,
        season_id: match.season_id,
        division_id: match.division_id || null,
        action_type: disciplineForm.action_type,
        minute: disciplineForm.minute ? parseInt(disciplineForm.minute) : null,
        reason: disciplineForm.reason || null,
        suspension_matches: disciplineForm.suspension_matches ? parseInt(disciplineForm.suspension_matches) : 0,
      });
      setShowDisciplineForm(false);
      setDisciplineForm({ player_id: '', team_id: '', action_type: 'yellow_card', minute: '', reason: '', suspension_matches: '' });
      await loadData();
    } catch (err) {
      setDisciplineError(parseError(err, 'Failed to add disciplinary action'));
    } finally {
      setDisciplineSaving(false);
    }
  };

  const handleRemoveDiscipline = async (id) => {
    try {
      await updateDisciplinaryAction(id, { deleted: true });
      await loadData();
    } catch {
      setError('Failed to remove record');
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (!match) return <div className="text-center py-12 text-red-400">Match not found</div>;

  const homeName = teamMap[match.home_team_id] || match.home_team_id;
  const awayName = teamMap[match.away_team_id] || match.away_team_id;

  const LineupColumn = ({ label, lineups, teamId, side }) => (
    <div className="flex-1">
      <h3 className="text-white font-semibold mb-3">{label}</h3>
      {lineups.length === 0 ? (
        <p className="text-slate-500 text-sm">No players added yet.</p>
      ) : (
        <div className="space-y-1 mb-3">
          {lineups.map((l) => (
            <div key={l.id} className="flex items-center justify-between bg-slate-700/40 rounded px-3 py-2">
              <div className="flex items-center gap-2">
                {l.jersey_number && (
                  <span className="text-slate-400 text-xs w-6 text-right">{l.jersey_number}</span>
                )}
                <span className="text-white text-sm font-mono">{l.player_id}</span>
                {l.position && <span className="text-slate-500 text-xs">({l.position})</span>}
                <span className={`text-xs px-1.5 py-0.5 rounded ${l.starting ? 'bg-emerald-700 text-white' : 'bg-slate-600 text-slate-300'}`}>
                  {l.starting ? 'Start' : 'Sub'}
                </span>
              </div>
              <button
                onClick={() => handleRemoveLineup(l.id)}
                className="text-red-400 hover:text-red-300 text-xs ml-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {showLineupForm === side ? (
        <div className="bg-slate-700 rounded p-3 space-y-2">
          {lineupError && <p className="text-red-400 text-xs">{lineupError}</p>}
          <input
            placeholder="Player ID (UUID)"
            value={lineupForm.player_id}
            onChange={(e) => setLineupForm({ ...lineupForm, player_id: e.target.value })}
            className="w-full bg-slate-600 text-white px-3 py-1.5 rounded text-sm"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Jersey #"
              value={lineupForm.jersey_number}
              onChange={(e) => setLineupForm({ ...lineupForm, jersey_number: e.target.value })}
              className="w-24 bg-slate-600 text-white px-3 py-1.5 rounded text-sm"
            />
            <input
              placeholder="Position"
              value={lineupForm.position}
              onChange={(e) => setLineupForm({ ...lineupForm, position: e.target.value })}
              className="flex-1 bg-slate-600 text-white px-3 py-1.5 rounded text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-slate-300 text-sm">
            <input
              type="checkbox"
              checked={lineupForm.starting}
              onChange={(e) => setLineupForm({ ...lineupForm, starting: e.target.checked })}
            />
            Starting XI
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleAddLineup(teamId)}
              disabled={lineupSaving || !lineupForm.player_id}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm"
            >
              {lineupSaving ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={() => { setShowLineupForm(null); setLineupError(''); }}
              className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1.5 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setShowLineupForm(side); setLineupForm({ player_id: '', starting: true, jersey_number: '', position: '' }); setLineupError(''); }}
          className="text-emerald-400 hover:text-emerald-300 text-sm"
        >
          + Add Player
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <Link to={`/admin/seasons/${match.season_id}/matches`} className="text-emerald-400 text-sm hover:underline">
        ← Back to Matches
      </Link>

      {error && <div className="bg-red-900/50 text-red-300 p-3 rounded">{error}</div>}

      {/* ── DETAILS ── */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Details</h2>
        <div className="flex items-center justify-center gap-6 mb-4">
          <span className="text-white text-xl font-bold">{homeName}</span>
          <div className="text-center">
            <div className="text-3xl font-black text-white">
              {match.home_score ?? 0} – {match.away_score ?? 0}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
              match.status === 'completed' ? 'bg-slate-600 text-slate-300' :
              match.status === 'live' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
            }`}>
              {match.status}
            </span>
          </div>
          <span className="text-white text-xl font-bold">{awayName}</span>
        </div>
        <div className="text-slate-400 text-sm space-y-1 mb-4">
          {match.kickoff_datetime && <p>🕐 {new Date(match.kickoff_datetime).toLocaleString()}</p>}
          {match.venue && <p>📍 {match.venue}</p>}
          {match.division_id && <p className="font-mono text-xs">Division: {match.division_id}</p>}
        </div>

        {showScoreForm ? (
          <div className="bg-slate-700 rounded p-4 space-y-3">
            {scoreError && <p className="text-red-400 text-sm">{scoreError}</p>}
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-slate-300 text-xs mb-1">{homeName} Score</label>
                <input
                  type="number" min="0"
                  value={scoreForm.home_score}
                  onChange={(e) => setScoreForm({ ...scoreForm, home_score: e.target.value })}
                  className="w-20 bg-slate-600 text-white px-3 py-1.5 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-xs mb-1">{awayName} Score</label>
                <input
                  type="number" min="0"
                  value={scoreForm.away_score}
                  onChange={(e) => setScoreForm({ ...scoreForm, away_score: e.target.value })}
                  className="w-20 bg-slate-600 text-white px-3 py-1.5 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-xs mb-1">Status</label>
                <select
                  value={scoreForm.status}
                  onChange={(e) => setScoreForm({ ...scoreForm, status: e.target.value })}
                  className="bg-slate-600 text-white px-3 py-1.5 rounded text-sm"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                  <option value="postponed">Postponed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleScoreSave}
                disabled={scoreSaving}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-1.5 rounded text-sm"
              >
                {scoreSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setShowScoreForm(false); setScoreError(''); }}
                className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-1.5 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowScoreForm(true)}
            className="text-emerald-400 hover:text-emerald-300 text-sm"
          >
            Update Score / Status
          </button>
        )}
      </div>

      {/* ── LINEUPS ── */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Lineups</h2>
        <div className="flex gap-8">
          <LineupColumn
            label={homeName}
            lineups={homeLineups}
            teamId={match.home_team_id}
            side="home"
          />
          <div className="w-px bg-slate-700" />
          <LineupColumn
            label={awayName}
            lineups={awayLineups}
            teamId={match.away_team_id}
            side="away"
          />
        </div>
      </div>

      {/* ── OFFICIALS ── */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Officials</h2>
        {matchOfficials.length === 0 ? (
          <p className="text-slate-500 text-sm mb-3">No officials assigned.</p>
        ) : (
          <div className="space-y-1 mb-3">
            {matchOfficials.map((o) => {
              const official = orgOfficials.find((x) => x.id === o.official_id);
              return (
                <div key={o.id} className="flex items-center justify-between bg-slate-700/40 rounded px-3 py-2">
                  <div>
                    <span className="text-white text-sm">{official?.name || o.official_id}</span>
                    {o.role && <span className="text-slate-400 text-xs ml-2">({o.role})</span>}
                  </div>
                  <button
                    onClick={() => handleRemoveOfficial(o.id)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {showOfficialForm ? (
          <div className="bg-slate-700 rounded p-3 space-y-2">
            {officialError && <p className="text-red-400 text-xs">{officialError}</p>}
            <select
              value={officialForm.official_id}
              onChange={(e) => setOfficialForm({ ...officialForm, official_id: e.target.value })}
              className="w-full bg-slate-600 text-white px-3 py-1.5 rounded text-sm"
            >
              <option value="">— Select Official —</option>
              {orgOfficials.map((o) => (
                <option key={o.id} value={o.id}>{o.name} ({o.role || 'no role'})</option>
              ))}
            </select>
            <input
              placeholder="Role for this match (e.g. referee)"
              value={officialForm.role}
              onChange={(e) => setOfficialForm({ ...officialForm, role: e.target.value })}
              className="w-full bg-slate-600 text-white px-3 py-1.5 rounded text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAssignOfficial}
                disabled={officialSaving || !officialForm.official_id}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm"
              >
                {officialSaving ? 'Assigning...' : 'Assign'}
              </button>
              <button
                onClick={() => { setShowOfficialForm(false); setOfficialError(''); }}
                className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1.5 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowOfficialForm(true)}
            className="text-emerald-400 hover:text-emerald-300 text-sm"
          >
            + Assign Official
          </button>
        )}
      </div>

      {/* ── DISCIPLINE ── */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Discipline</h2>
        {discipline.length === 0 ? (
          <p className="text-slate-500 text-sm mb-3">No disciplinary actions.</p>
        ) : (
          <div className="space-y-1 mb-3">
            {discipline.map((d) => (
              <div key={d.id} className="flex items-center justify-between bg-slate-700/40 rounded px-3 py-2">
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <span className="text-white font-mono text-xs">{d.player_id}</span>
                  <span className="text-slate-400 text-xs">{teamMap[d.team_id] || d.team_id}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    d.action_type === 'red_card' || d.action_type === 'second_yellow' ? 'bg-red-700 text-white' :
                    d.action_type === 'yellow_card' ? 'bg-yellow-600 text-white' :
                    'bg-orange-700 text-white'
                  }`}>
                    {d.action_type.replace(/_/g, ' ')}
                  </span>
                  {d.minute != null && <span className="text-slate-400 text-xs">{d.minute}'</span>}
                  {d.reason && <span className="text-slate-500 text-xs">{d.reason}</span>}
                  {d.suspension_matches > 0 && (
                    <span className="text-orange-400 text-xs">{d.suspension_matches} match ban</span>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveDiscipline(d.id)}
                  className="text-red-400 hover:text-red-300 text-xs ml-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {showDisciplineForm ? (
          <div className="bg-slate-700 rounded p-3 space-y-2">
            {disciplineError && <p className="text-red-400 text-xs">{disciplineError}</p>}
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Player ID (UUID)"
                value={disciplineForm.player_id}
                onChange={(e) => setDisciplineForm({ ...disciplineForm, player_id: e.target.value })}
                className="bg-slate-600 text-white px-3 py-1.5 rounded text-sm"
              />
              <input
                placeholder="Team ID (UUID)"
                value={disciplineForm.team_id}
                onChange={(e) => setDisciplineForm({ ...disciplineForm, team_id: e.target.value })}
                className="bg-slate-600 text-white px-3 py-1.5 rounded text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={disciplineForm.action_type}
                onChange={(e) => setDisciplineForm({ ...disciplineForm, action_type: e.target.value })}
                className="bg-slate-600 text-white px-3 py-1.5 rounded text-sm"
              >
                <option value="yellow_card">Yellow Card</option>
                <option value="red_card">Red Card</option>
                <option value="second_yellow">Second Yellow</option>
                <option value="suspension">Suspension</option>
              </select>
              <input
                type="number" placeholder="Minute"
                value={disciplineForm.minute}
                onChange={(e) => setDisciplineForm({ ...disciplineForm, minute: e.target.value })}
                className="bg-slate-600 text-white px-3 py-1.5 rounded text-sm"
              />
              <input
                type="number" placeholder="Match ban"
                value={disciplineForm.suspension_matches}
                onChange={(e) => setDisciplineForm({ ...disciplineForm, suspension_matches: e.target.value })}
                className="bg-slate-600 text-white px-3 py-1.5 rounded text-sm"
              />
            </div>
            <input
              placeholder="Reason (optional)"
              value={disciplineForm.reason}
              onChange={(e) => setDisciplineForm({ ...disciplineForm, reason: e.target.value })}
              className="w-full bg-slate-600 text-white px-3 py-1.5 rounded text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddDiscipline}
                disabled={disciplineSaving || !disciplineForm.player_id || !disciplineForm.team_id}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm"
              >
                {disciplineSaving ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => { setShowDisciplineForm(false); setDisciplineError(''); }}
                className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1.5 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDisciplineForm(true)}
            className="text-emerald-400 hover:text-emerald-300 text-sm"
          >
            + Add Action
          </button>
        )}
      </div>
    </div>
  );
}
