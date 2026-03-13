import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getDivision,
  getTeams,
  getGroups,
  getMatches,
  createMatch,
  updateMatch,
  deleteMatch,
} from '../../lib/api';

function parseError(err, fallback) {
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((e) => e.msg || JSON.stringify(e)).join(', ');
  if (typeof detail === 'string') return detail;
  return fallback;
}

const STATUSES = ['scheduled', 'live', 'completed', 'postponed', 'cancelled'];

export default function EditionMatches() {
  const { division_id } = useParams();

  const [division, setDivision] = useState(null);
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  const [form, setForm] = useState({
    homeTeamId: '',
    awayTeamId: '',
    groupId: '',
    kickoff: '',
    status: 'scheduled',
    matchday: '',
    roundNo: '',
    notes: '',
  });

  const [editingMatch, setEditingMatch] = useState(null);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    homeTeamId: '',
    awayTeamId: '',
    groupId: '',
    kickoff: '',
    status: 'scheduled',
    matchday: '',
    roundNo: '',
    homeScore: 0,
    awayScore: 0,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [division_id]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [divisionRes, teamsRes, matchesRes, groupsRes] = await Promise.all([
        getDivision(division_id),
        getTeams(division_id),
        getMatches(division_id),
        getGroups(division_id),
      ]);

      setDivision(divisionRes.data);
      setTeams(teamsRes.data);
      setMatches(matchesRes.data);
      setGroups(groupsRes.data);
    } catch (err) {
      setError(parseError(err, 'Failed to load matches data'));
    } finally {
      setLoading(false);
    }
  };

  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t.display_name]));
  const groupMap = Object.fromEntries(groups.map((g) => [g.id, g.name]));

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError('');

    try {
      await createMatch({
        division_id,
        group_id: form.groupId || null,
        home_team_id: form.homeTeamId,
        away_team_id: form.awayTeamId,
        kickoff_at: form.kickoff || null,
        status: form.status,
        matchday: form.matchday ? parseInt(form.matchday, 10) : null,
        round_no: form.roundNo ? parseInt(form.roundNo, 10) : null,
        notes: form.notes || null,
      });

      setShowForm(false);
      setForm({
        homeTeamId: '',
        awayTeamId: '',
        groupId: '',
        kickoff: '',
        status: 'scheduled',
        matchday: '',
        roundNo: '',
        notes: '',
      });
      await loadData();
    } catch (err) {
      setFormError(parseError(err, 'Failed to create match'));
    } finally {
      setFormSaving(false);
    }
  };

  const openEdit = (m) => {
    setEditingMatch(m.id);
    setEditError('');
    setEditForm({
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      groupId: m.group_id || '',
      kickoff: m.kickoff_at ? m.kickoff_at.slice(0, 16) : '',
      status: m.status || 'scheduled',
      matchday: m.matchday ?? '',
      roundNo: m.round_no ?? '',
      homeScore: m.home_score ?? 0,
      awayScore: m.away_score ?? 0,
      notes: m.notes || '',
    });
  };

  const handleUpdate = async () => {
    setEditSaving(true);
    setEditError('');

    try {
      await updateMatch(editingMatch, {
        group_id: editForm.groupId || null,
        home_team_id: editForm.homeTeamId,
        away_team_id: editForm.awayTeamId,
        kickoff_at: editForm.kickoff || null,
        status: editForm.status,
        matchday: editForm.matchday !== '' ? parseInt(editForm.matchday, 10) : null,
        round_no: editForm.roundNo !== '' ? parseInt(editForm.roundNo, 10) : null,
        home_score: parseInt(editForm.homeScore, 10) || 0,
        away_score: parseInt(editForm.awayScore, 10) || 0,
        notes: editForm.notes || null,
      });

      setEditingMatch(null);
      await loadData();
    } catch (err) {
      setEditError(parseError(err, 'Failed to update match'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteMatch = async (matchId) => {
    const match = matches.find((m) => m.id === matchId);
    const homeName = teamMap[match?.home_team_id] || 'Home';
    const awayName = teamMap[match?.away_team_id] || 'Away';

    if (!window.confirm(`Delete ${homeName} vs ${awayName}?`)) return;

    try {
      await deleteMatch(matchId);
      await loadData();
    } catch (err) {
      setError(parseError(err, 'Failed to delete match'));
    }
  };

  const sortedMatches = [...matches].sort((a, b) => {
    const aMatchday = a.matchday ?? 999;
    const bMatchday = b.matchday ?? 999;
    if (aMatchday !== bMatchday) return aMatchday - bMatchday;

    const aRound = a.round_no ?? 999;
    const bRound = b.round_no ?? 999;
    if (aRound !== bRound) return aRound - bRound;

    const aKickoff = a.kickoff_at ? new Date(a.kickoff_at).getTime() : Infinity;
    const bKickoff = b.kickoff_at ? new Date(b.kickoff_at).getTime() : Infinity;
    return aKickoff - bKickoff;
  });

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (!division) return <div className="text-center py-12 text-red-400">Division not found</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to={`/admin/seasons/${division.season_id}/divisions`} className="text-emerald-400 text-sm hover:underline">
            ← Back to Divisions
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">{division.name} — Matches</h1>
          <p className="text-slate-400 text-sm mt-1">
            {division.format_type || division.format} · {division.age_group || '—'}
          </p>
        </div>

        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-medium"
        >
          {showForm ? 'Close Form' : '+ New Match'}
        </button>
      </div>

      {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-800 p-6 rounded-lg mb-6 space-y-4">
          {formError && <div className="bg-red-900/50 text-red-300 p-3 rounded">{formError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-1">Home Team *</label>
              <select
                value={form.homeTeamId}
                onChange={(e) => setForm({ ...form, homeTeamId: e.target.value })}
                required
                className="w-full bg-slate-700 text-white px-4 py-2 rounded"
              >
                <option value="">Select</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Away Team *</label>
              <select
                value={form.awayTeamId}
                onChange={(e) => setForm({ ...form, awayTeamId: e.target.value })}
                required
                className="w-full bg-slate-700 text-white px-4 py-2 rounded"
              >
                <option value="">Select</option>
                {teams
                  .filter((t) => t.id !== form.homeTeamId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.display_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-slate-300 mb-1">Group</label>
              <select
                value={form.groupId}
                onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded"
              >
                <option value="">None</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Matchday</label>
              <input
                type="number"
                min="1"
                value={form.matchday}
                onChange={(e) => setForm({ ...form, matchday: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Round No</label>
              <input
                type="number"
                min="1"
                value={form.roundNo}
                onChange={(e) => setForm({ ...form, roundNo: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Kickoff</label>
              <input
                type="datetime-local"
                value={form.kickoff}
                onChange={(e) => setForm({ ...form, kickoff: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={formSaving}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2 rounded"
            >
              {formSaving ? 'Creating...' : 'Create Match'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-slate-600 text-white px-6 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {sortedMatches.length === 0 ? (
        <p className="text-slate-500 text-center py-8">No matches found</p>
      ) : (
        <div className="space-y-3">
          {sortedMatches.map((m) => (
            <div key={m.id} className="bg-slate-800 rounded-lg">
              {editingMatch === m.id ? (
                <div className="p-4 space-y-4">
                  {editError && <div className="bg-red-900/50 text-red-300 p-3 rounded">{editError}</div>}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 mb-1">Home Team</label>
                      <select
                        value={editForm.homeTeamId}
                        onChange={(e) => setEditForm({ ...editForm, homeTeamId: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-2 rounded"
                      >
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.display_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Away Team</label>
                      <select
                        value={editForm.awayTeamId}
                        onChange={(e) => setEditForm({ ...editForm, awayTeamId: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-2 rounded"
                      >
                        {teams
                          .filter((t) => t.id !== editForm.homeTeamId)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.display_name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div>
                      <label className="block text-slate-300 mb-1">Group</label>
                      <select
                        value={editForm.groupId}
                        onChange={(e) => setEditForm({ ...editForm, groupId: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-2 rounded"
                      >
                        <option value="">None</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Matchday</label>
                      <input
                        type="number"
                        min="1"
                        value={editForm.matchday}
                        onChange={(e) => setEditForm({ ...editForm, matchday: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-2 rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Round No</label>
                      <input
                        type="number"
                        min="1"
                        value={editForm.roundNo}
                        onChange={(e) => setEditForm({ ...editForm, roundNo: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-2 rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Home Score</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.homeScore}
                        onChange={(e) => setEditForm({ ...editForm, homeScore: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-2 rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Away Score</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.awayScore}
                        onChange={(e) => setEditForm({ ...editForm, awayScore: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-2 rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-2 rounded"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 mb-1">Kickoff</label>
                      <input
                        type="datetime-local"
                        value={editForm.kickoff}
                        onChange={(e) => setEditForm({ ...editForm, kickoff: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-2 rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Notes</label>
                      <input
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-2 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdate}
                      disabled={editSaving}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
                    >
                      {editSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingMatch(null)}
                      className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-white text-sm font-medium truncate flex-1 text-right">
                      {teamMap[m.home_team_id]}
                    </span>

                    <div className="shrink-0 text-center w-28">
                      <div className="font-bold text-sm text-emerald-400">
                        {m.home_score ?? 0} - {m.away_score ?? 0}
                      </div>
                      <div className="text-slate-500 text-xs mt-1">
                        {m.kickoff_at
                          ? new Date(m.kickoff_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                          : 'No kickoff'}
                      </div>
                    </div>

                    <span className="text-white text-sm font-medium truncate flex-1">
                      {teamMap[m.away_team_id]}
                    </span>

                    <div className="flex items-center gap-2 shrink-0 ml-1">
                      <button
                        onClick={() => openEdit(m)}
                        className="text-slate-400 hover:text-emerald-300 text-sm"
                      >
                        Edit
                      </button>
                      <Link
                        to={`/admin/matches/${m.id}/events`}
                        className="text-emerald-400 hover:underline text-sm"
                      >
                        Events
                      </Link>
                      <Link
                        to={`/admin/matches/${m.id}`}
                        className="text-emerald-400 hover:underline text-sm"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDeleteMatch(m.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-1 pl-1">
                    {m.group_id && (
                      <span className="text-slate-500 text-xs">
                        Group: {groupMap[m.group_id] || m.group_id}
                      </span>
                    )}
                    {m.matchday != null && (
                      <span className="text-slate-500 text-xs">
                        Matchday: {m.matchday}
                      </span>
                    )}
                    {m.round_no != null && (
                      <span className="text-slate-500 text-xs">
                        Round: {m.round_no}
                      </span>
                    )}
                    <span className="text-slate-500 text-xs ml-auto">● {m.status}</span>
                  </div>

                  {m.notes && <p className="text-slate-500 text-xs mt-2">{m.notes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}