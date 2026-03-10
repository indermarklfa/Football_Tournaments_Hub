import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSeason, getTeams, getGroups, createGroup, deleteGroup, addTeamToGroup, removeTeamFromGroup } from '../../lib/api';

export default function EditionGroups() {
  const { id } = useParams();
  const [season, setSeason] = useState(null);
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupTeams, setGroupTeams] = useState({});
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [edRes, teamsRes, groupsRes] = await Promise.all([
        getSeason(id), getTeams(id), getGroups(id)
      ]);
      setSeason(edRes.data);
      setTeams(teamsRes.data);
      setGroups(groupsRes.data);
      // Build groupTeams map: { groupId: [teamId, ...] }
      const map = {};
      for (const g of groupsRes.data) {
        map[g.id] = g.team_ids || [];
      }
      setGroupTeams(map);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      await createGroup(id, newGroupName);
      setNewGroupName('');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create group');
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (!window.confirm(`Delete group "${groupName}"? Teams will be unassigned.`)) return;
    await deleteGroup(groupId);
    await loadData();
  };

  const handleToggleTeam = async (groupId, teamId) => {
    const assigned = (groupTeams[groupId] || []).includes(teamId);
    try {
      if (assigned) {
        await removeTeamFromGroup(groupId, teamId);
      } else {
        await addTeamToGroup(groupId, teamId);
      }
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update group');
    }
  };

  // Which teams are assigned to any group
  const assignedTeamIds = new Set(Object.values(groupTeams).flat());

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link to={`/admin/seasons/${id}/teams`} className="text-emerald-400 text-sm hover:underline">← Back to Teams</Link>
        <h1 className="text-2xl font-bold text-white mt-2">{season?.name} — Groups</h1>
        <p className="text-slate-400 text-sm mt-1">{teams.length} teams · {groups.length} groups</p>
      </div>

      {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4">{error}</div>}

      {/* Create group form */}
      <form onSubmit={handleCreateGroup} className="flex gap-2 mb-8">
        <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
          placeholder='Group name (e.g. "Group A")'
          className="flex-1 bg-slate-800 text-white px-4 py-2 rounded text-sm max-w-xs" />
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm">
          + Add Group
        </button>
      </form>

      {groups.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No groups yet. Create groups above then assign teams to them.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {groups.map((g) => {
            const assignedToThisGroup = groupTeams[g.id] || [];
            return (
              <div key={g.id} className="bg-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold text-lg">{g.name}</h2>
                  <button onClick={() => handleDeleteGroup(g.id, g.name)}
                    className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                </div>

                <div className="space-y-2">
                  {teams.map((t) => {
                    const inThisGroup = assignedToThisGroup.includes(t.id);
                    const inOtherGroup = !inThisGroup && assignedTeamIds.has(t.id);
                    return (
                      <div key={t.id}
                        onClick={() => !inOtherGroup && handleToggleTeam(g.id, t.id)}
                        className={`flex items-center justify-between p-2 rounded text-sm transition-colors ${
                          inThisGroup
                            ? 'bg-emerald-600/20 border border-emerald-600 cursor-pointer'
                            : inOtherGroup
                            ? 'bg-slate-700/30 opacity-40 cursor-not-allowed'
                            : 'bg-slate-700/50 hover:bg-slate-700 cursor-pointer'
                        }`}>
                        <span className={inThisGroup ? 'text-white' : 'text-slate-400'}>{t.name}</span>
                        {inThisGroup && <span className="text-emerald-400 text-xs">✓ Assigned</span>}
                        {inOtherGroup && <span className="text-slate-500 text-xs">Other group</span>}
                      </div>
                    );
                  })}
                </div>

                <p className="text-slate-500 text-xs mt-3">
                  {assignedToThisGroup.length} team{assignedToThisGroup.length !== 1 ? 's' : ''} assigned
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Unassigned warning */}
      {teams.length - assignedTeamIds.size > 0 && (
        <div className="mt-6 bg-amber-900/30 border border-amber-700 text-amber-300 p-3 rounded text-sm">
          ⚠ {teams.length - assignedTeamIds.size} team{teams.length - assignedTeamIds.size !== 1 ? 's' : ''} not assigned to any group
        </div>
      )}
    </div>
  );
}