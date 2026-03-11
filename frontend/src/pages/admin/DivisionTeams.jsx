import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDivision, getTeams, createTeam, updateTeam, getOrganizations, getClubs } from '../../lib/api';

export default function DivisionTeams() {
  const { season_id, division_id } = useParams();
  const [division, setDivision] = useState(null);
  const [teams, setTeams] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => { loadData(); }, [season_id, division_id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const orgsRes = await getOrganizations();
      const orgId = orgsRes.data[0]?.id;

      const [divRes, teamsRes, clubsRes] = await Promise.all([
        getDivision(division_id),
        getTeams(division_id),
        orgId ? getClubs(orgId) : Promise.resolve({ data: [] }),
      ]);

      setDivision(divRes.data);
      setTeams(teamsRes.data);
      setClubs(clubsRes.data);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await createTeam({ season_id, club_id: selectedClubId, division_id });
      setShowAddForm(false);
      setSelectedClubId('');
      await loadData();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setAddError(detail.map((e) => e.msg || JSON.stringify(e)).join(', '));
      } else if (typeof detail === 'string') {
        setAddError(detail);
      } else {
        setAddError('Failed to add team');
      }
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveTeam = async (id) => {
    if (!window.confirm('Remove this team from the division?')) return;
    try {
      await updateTeam(id, { deleted: true });
      setTeams((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError('Failed to remove team');
    }
  };

  const clubMap = Object.fromEntries(clubs.map((c) => [c.id, c.name]));

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link
          to={`/admin/seasons/${season_id}/divisions`}
          className="text-emerald-400 text-sm hover:underline"
        >
          ← Back to Divisions
        </Link>
        <h1 className="text-2xl font-bold text-white mt-2">
          {division?.name} — Teams
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {division?.format} · {division?.age_group} · {teams.length} team{teams.length !== 1 ? 's' : ''}
        </p>
      </div>

      {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4">{error}</div>}

      <div className="mb-4">
        {!showAddForm ? (
          <button
            onClick={() => { setShowAddForm(true); setAddError(''); setSelectedClubId(''); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
          >
            + Add Team
          </button>
        ) : (
          <form onSubmit={handleAddTeam} className="bg-slate-800 p-4 rounded-lg space-y-3">
            <p className="text-slate-300 text-sm font-medium">Add a club to this division</p>
            {addError && <div className="bg-red-900/50 text-red-300 p-2 rounded text-sm">{addError}</div>}
            <div>
              <label className="block text-slate-400 text-xs mb-1">Club *</label>
              <select
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                required
                className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">— Select a club —</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <p className="text-slate-500 text-xs">
              Team name will be auto-generated from club name and age group.
            </p>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addLoading || !selectedClubId}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium"
              >
                {addLoading ? 'Adding...' : 'Add Team'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setAddError(''); }}
                className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No teams in this division yet. Add one above.
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left px-4 py-3">Team Name</th>
                <th className="text-left px-4 py-3">Club</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t, index) => (
                <tr
                  key={t.id}
                  className={`border-b border-slate-700/50 ${index % 2 === 0 ? '' : 'bg-slate-700/20'}`}
                >
                  <td className="px-4 py-3 text-white font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-slate-300">{clubMap[t.club_id] || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemoveTeam(t.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
