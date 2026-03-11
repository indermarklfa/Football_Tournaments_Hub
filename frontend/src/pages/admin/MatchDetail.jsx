import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getMatch,
  getTeams,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Score/status update
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [scoreForm, setScoreForm] = useState({ home_score: 0, away_score: 0, status: 'scheduled' });
  const [scoreError, setScoreError] = useState('');
  const [scoreSaving, setScoreSaving] = useState(false);

  useEffect(() => { loadData(); }, [matchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const matchRes = await getMatch(matchId);
      const m = matchRes.data;
      setMatch(m);
      setScoreForm({ home_score: m.home_score ?? 0, away_score: m.away_score ?? 0, status: m.status });

      const teamsRes = await getTeams(m.season_id);
      const map = {};
      teamsRes.data.forEach((t) => { map[t.id] = t.name; });
      setTeamMap(map);
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

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (!match) return <div className="text-center py-12 text-red-400">Match not found</div>;

  const homeName = teamMap[match.home_team_id] || match.home_team_id;
  const awayName = teamMap[match.away_team_id] || match.away_team_id;

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
          {match.kickoff_at && <p>🕐 {new Date(match.kickoff_at).toLocaleString()}</p>}
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
        <p className="text-slate-500 text-sm">Lineup management coming soon</p>
      </div>

      {/* ── OFFICIALS ── */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Officials</h2>
        <p className="text-slate-500 text-sm">Officials management coming soon</p>
      </div>

      {/* ── DISCIPLINE ── */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Discipline</h2>
        <p className="text-slate-500 text-sm">Discipline management coming soon</p>
      </div>
    </div>
  );
}
