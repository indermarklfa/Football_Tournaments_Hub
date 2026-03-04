import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEdition, getTeams, getMatches, createMatch, updateMatch } from '../../lib/api';

const STAGES = ['group', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final'];
const STATUSES = ['scheduled', 'live', 'completed', 'postponed', 'cancelled'];

export default function EditionMatches() {
  const { id } = useParams();
  const [edition, setEdition] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [form, setForm] = useState({ homeTeamId: '', awayTeamId: '', stage: 'group', kickoff: '', venue: '' });
  const [scoreForm, setScoreForm] = useState({ homeScore: 0, awayScore: 0, status: 'scheduled' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const [edRes, teamsRes, matchesRes] = await Promise.all([getEdition(id), getTeams(id), getMatches(id)]);
    setEdition(edRes.data);
    setTeams(teamsRes.data);
    setMatches(matchesRes.data);
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await createMatch({
      edition_id: id,
      home_team_id: form.homeTeamId,
      away_team_id: form.awayTeamId,
      stage: form.stage,
      kickoff_datetime: form.kickoff || null,
      venue: form.venue || null,
    });
    setShowForm(false);
    setForm({ homeTeamId: '', awayTeamId: '', stage: 'group', kickoff: '', venue: '' });
    loadData();
  };

  const openEdit = (m) => {
    setEditingMatch(m.id);
    setScoreForm({ homeScore: m.home_score || 0, awayScore: m.away_score || 0, status: m.status });
  };

  const handleUpdate = async () => {
    await updateMatch(editingMatch, {
      home_score: parseInt(scoreForm.homeScore),
      away_score: parseInt(scoreForm.awayScore),
      status: scoreForm.status,
    });
    setEditingMatch(null);
    loadData();
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));

  return (
    <div className="max-w-6xl mx-auto py-8 px-4" data-testid="edition-matches-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{edition?.name} - Matches</h1>
          <Link to={`/admin/editions/${id}/teams`} className="text-emerald-400 text-sm hover:underline">← Back to Teams</Link>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-medium"
          data-testid="new-match-btn">+ New Match</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-800 p-6 rounded-lg mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-1">Home Team *</label>
              <select value={form.homeTeamId} onChange={(e) => setForm({ ...form, homeTeamId: e.target.value })} required
                className="w-full bg-slate-700 text-white px-4 py-2 rounded" data-testid="home-team-select">
                <option value="">Select</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Away Team *</label>
              <select value={form.awayTeamId} onChange={(e) => setForm({ ...form, awayTeamId: e.target.value })} required
                className="w-full bg-slate-700 text-white px-4 py-2 rounded" data-testid="away-team-select">
                <option value="">Select</option>
                {teams.filter(t => t.id !== form.homeTeamId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 mb-1">Stage</label>
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded">
                {STAGES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Kickoff</label>
              <input type="datetime-local" value={form.kickoff} onChange={(e) => setForm({ ...form, kickoff: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded" />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Venue</label>
              <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded"
              data-testid="create-match-btn">Create Match</button>
            <button type="button" onClick={() => setShowForm(false)}
              className="bg-slate-600 text-white px-6 py-2 rounded">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {matches.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No matches yet</p>
        ) : matches.map((m) => (
          <div key={m.id} className="bg-slate-800 p-4 rounded-lg" data-testid={`match-${m.id}`}>
            {editingMatch === m.id ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-4">
                  <span className="text-white">{teamMap[m.home_team_id]}</span>
                  <input type="number" value={scoreForm.homeScore} onChange={(e) => setScoreForm({ ...scoreForm, homeScore: e.target.value })}
                    className="w-16 bg-slate-700 text-white text-center px-2 py-1 rounded" />
                  <span className="text-slate-400">-</span>
                  <input type="number" value={scoreForm.awayScore} onChange={(e) => setScoreForm({ ...scoreForm, awayScore: e.target.value })}
                    className="w-16 bg-slate-700 text-white text-center px-2 py-1 rounded" />
                  <span className="text-white">{teamMap[m.away_team_id]}</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <select value={scoreForm.status} onChange={(e) => setScoreForm({ ...scoreForm, status: e.target.value })}
                    className="bg-slate-700 text-white px-3 py-1 rounded text-sm">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={handleUpdate} className="bg-emerald-600 text-white px-4 py-1 rounded text-sm"
                    data-testid="save-score-btn">Save</button>
                  <button onClick={() => setEditingMatch(null)} className="text-slate-400 text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    m.status === 'completed' ? 'bg-slate-600' : m.status === 'live' ? 'bg-red-600' : 'bg-amber-600'
                  } text-white`}>{m.stage.replace('_', ' ')}</span>
                  <span className="text-white">{teamMap[m.home_team_id]}</span>
                  <span className="text-2xl font-bold text-emerald-400">{m.home_score ?? '-'}</span>
                  <span className="text-slate-400">:</span>
                  <span className="text-2xl font-bold text-emerald-400">{m.away_score ?? '-'}</span>
                  <span className="text-white">{teamMap[m.away_team_id]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    m.status === 'completed' ? 'bg-green-600' : m.status === 'live' ? 'bg-red-600' : 'bg-slate-600'
                  } text-white`}>{m.status}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(m)} className="text-emerald-400 hover:underline text-sm"
                    data-testid={`edit-match-${m.id}`}>Edit Score</button>
                  <Link to={`/admin/matches/${m.id}/events`} className="text-emerald-400 hover:underline text-sm">Events</Link>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
