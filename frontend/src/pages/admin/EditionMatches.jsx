import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEdition, getTeams, getAliveTeams, getGroups, getMatches, createMatch, updateMatch, deleteMatch } from '../../lib/api';

const STAGES = ['group', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final'];
const STATUSES = ['scheduled', 'live', 'completed', 'postponed', 'cancelled'];

export default function EditionMatches() {
  const { id } = useParams();
  const [edition, setEdition] = useState(null);
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [matches, setMatches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [aliveTeams, setAliveTeams] = useState([]);
  const [filter, setFilter] = useState('all');
  const [editingMatch, setEditingMatch] = useState(null);
  const [editForm, setEditForm] = useState({
    homeTeamId: '', awayTeamId: '', stage: 'group',
    groupId: '', kickoff: '', venue: '', status: 'scheduled'
  });
  const defaultStage = () => {
    if (edition?.format === 'knockout') return 'round_of_16';
    return 'group';
  };

  const [form, setForm] = useState({
    homeTeamId: '', awayTeamId: '', stage: 'group',
    groupId: '', kickoff: '', venue: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const [edRes, teamsRes, matchesRes, groupsRes] = await Promise.all([
      getEdition(id), getTeams(id), getMatches(id), getGroups(id)
    ]);
    setEdition(edRes.data);
    setTeams(teamsRes.data);
    setMatches(matchesRes.data);
    setGroups(groupsRes.data);
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await createMatch({
      edition_id: id,
      home_team_id: form.homeTeamId,
      away_team_id: form.awayTeamId,
      stage: form.stage,
      group_id: form.groupId || null,
      kickoff_datetime: form.kickoff || null,
      venue: form.venue || null,
    });
    setShowForm(false);
    setForm({ homeTeamId: '', awayTeamId: '', stage: defaultStage(), groupId: '', kickoff: '', venue: '' });
    loadData();
  };

  const openEdit = (m) => {
    setEditingMatch(m.id);
    setEditForm({
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      stage: m.stage,
      groupId: m.group_id || '',
      kickoff: m.kickoff_datetime ? m.kickoff_datetime.slice(0, 16) : '',
      venue: m.venue || '',
      status: m.status,
      homePenalties: m.home_penalties ?? '',
      awayPenalties: m.away_penalties ?? '',
    });
  };

  const handleUpdate = async () => {
    await updateMatch(editingMatch, {
      home_team_id: editForm.homeTeamId,
      away_team_id: editForm.awayTeamId,
      stage: editForm.stage,
      group_id: editForm.groupId || null,
      kickoff_datetime: editForm.kickoff || null,
      venue: editForm.venue || null,
      status: editForm.status,
      home_penalties: editForm.homePenalties !== '' ? parseInt(editForm.homePenalties) : null,
      away_penalties: editForm.awayPenalties !== '' ? parseInt(editForm.awayPenalties) : null,
    });
    setEditingMatch(null);
    loadData();
  };

  const handleDeleteMatch = async (matchId) => {
    const match = matches.find(m => m.id === matchId);
    const homeName = teamMap[match?.home_team_id] || 'Home';
    const awayName = teamMap[match?.away_team_id] || 'Away';
    if (!window.confirm(`Delete ${homeName} vs ${awayName}? This will permanently delete the match and all its recorded events.`)) return;
    await deleteMatch(matchId);
    loadData();
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));
  const groupMap = Object.fromEntries(groups.map(g => [g.id, g.name]));
  const filteredMatches = filter === 'all' ? matches : matches.filter(m => m.status === filter);

  // Stages available depend on format
  const availableStages = edition?.format === 'knockout'
    ? STAGES.filter(s => s !== 'group')
    : edition?.format === 'league'
    ? ['group']  // league uses group stage matchdays only
    : STAGES;    // groups_knockout gets all stages

  // Group dropdown only relevant when stage is 'group' and format supports groups
  const showGroupSelect = (stage) => 
    stage === 'group' && 
    groups.length > 0 && 
    ['groups_knockout', 'league'].includes(edition?.format);

  // Teams filtered to only those in the selected group
  const teamsForGroup = (groupId) => {
    if (!groupId) return [];
    const group = groups.find(g => g.id === groupId);
    if (!group || !group.team_ids?.length) return [];
    return teams.filter(t => group.team_ids.includes(t.id));
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4" data-testid="edition-matches-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{edition?.name} - Matches</h1>
          <Link to={`/admin/editions/${id}/teams`} className="text-emerald-400 text-sm hover:underline">← Back to Teams</Link>
        </div>
        <button onClick={async () => {
          const next = !showForm;
          setShowForm(next);
          if (next) {
            const res = await getAliveTeams(id);
            setAliveTeams(res.data);
            setForm(f => ({ ...f, venue: edition?.venue || '', stage: defaultStage() }));
          }
        }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-medium"
          data-testid="new-match-btn">+ New Match</button>
      </div>

      {/* Groups warning */}
      {edition?.format === 'groups_knockout' && groups.length === 0 && (
        <div className="bg-amber-900/30 border border-amber-700 text-amber-300 p-4 rounded-lg mb-6 flex items-center justify-between">
          <span className="text-sm">⚠ This is a Groups + Knockout edition but no groups have been set up yet.</span>
          <Link to={`/admin/editions/${id}/groups`}
            className="bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded text-sm ml-4 whitespace-nowrap">
            Set Up Groups →
          </Link>
        </div>
      )}

      {/* New Match Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-800 p-6 rounded-lg mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-1">Home Team *</label>
              <select value={form.homeTeamId} onChange={(e) => setForm({ ...form, homeTeamId: e.target.value })} required
                className="w-full bg-slate-700 text-white px-4 py-2 rounded" data-testid="home-team-select">
                <option value="">Select</option>
                {(form.stage === 'group' && form.groupId
                  ? teamsForGroup(form.groupId)
                  : aliveTeams.length > 0 ? aliveTeams : teams
                ).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Away Team *</label>
              <select value={form.awayTeamId} onChange={(e) => setForm({ ...form, awayTeamId: e.target.value })} required
                className="w-full bg-slate-700 text-white px-4 py-2 rounded" data-testid="away-team-select">
                <option value="">Select</option>
                {(form.stage === 'group' && form.groupId
                  ? teamsForGroup(form.groupId)
                  : aliveTeams.length > 0 ? aliveTeams : teams
                ).filter(t => t.id !== form.homeTeamId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-slate-300 mb-1">Stage</label>
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value, groupId: '' })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded">
                {availableStages.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            {showGroupSelect(form.stage) && (
              <div>
                <label className="block text-slate-300 mb-1">Group</label>
                <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded">
                  <option value="">None</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-slate-300 mb-1">Kickoff</label>
              <input type="datetime-local" value={form.kickoff} onChange={(e) => setForm({ ...form, kickoff: e.target.value })}
                min={edition?.start_date ? `${edition.start_date}T00:00` : undefined}
                max={edition?.end_date ? `${edition.end_date}T23:59` : undefined}
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

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['all', 'scheduled', 'live', 'completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-sm capitalize ${
              filter === f ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}>{f}</button>
        ))}
      </div>

      {/* Match list */}
      <div className="space-y-3">
        {filteredMatches.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No matches found</p>
        ) : filteredMatches.map((m) => (
          <div key={m.id} className="bg-slate-800 rounded-lg" data-testid={`match-${m.id}`}>
            {editingMatch === m.id ? (
              // Inline edit form
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Home Team</label>
                    <select value={editForm.homeTeamId} onChange={(e) => setEditForm({ ...editForm, homeTeamId: e.target.value })}
                      className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm">
                      {(editForm.stage === 'group' && editForm.groupId
                        ? teamsForGroup(editForm.groupId)
                        : teams
                      ).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Away Team</label>
                    <select value={editForm.awayTeamId} onChange={(e) => setEditForm({ ...editForm, awayTeamId: e.target.value })}
                      className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm">
                      {(editForm.stage === 'group' && editForm.groupId
                        ? teamsForGroup(editForm.groupId)
                        : teams
                      ).filter(t => t.id !== editForm.homeTeamId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Stage</label>
                    <select value={editForm.stage} onChange={(e) => setEditForm({ ...editForm, stage: e.target.value, groupId: '' })}
                      className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm">
                      {availableStages.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  {showGroupSelect(editForm.stage) && (
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Group</label>
                      <select value={editForm.groupId} onChange={(e) => setEditForm({ ...editForm, groupId: e.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm">
                        <option value="">None</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Status</label>
                    <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm">
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {editForm.status === 'completed' && (
                    <>
                      <div>
                        <label className="block text-slate-400 text-xs mb-1">
                          Penalties — {teams.find(t => t.id === editForm.homeTeamId)?.name || 'Home'}
                        </label>
                        <input type="number" min="0"
                          value={editForm.homePenalties ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, homePenalties: e.target.value })}
                          placeholder="e.g. 4"
                          className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-xs mb-1">
                          Penalties — {teams.find(t => t.id === editForm.awayTeamId)?.name || 'Away'}
                        </label>
                        <input type="number" min="0"
                          value={editForm.awayPenalties ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, awayPenalties: e.target.value })}
                          placeholder="e.g. 3"
                          className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                      </div>
                    <p className="col-span-2 text-slate-500 text-xs">Only fill penalties if the match was decided by a shootout</p>
                    </>
                  )}
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Kickoff</label>
                    <input type="datetime-local" value={editForm.kickoff}
                      onChange={(e) => setEditForm({ ...editForm, kickoff: e.target.value })}
                      min={edition?.start_date ? `${edition.start_date}T00:00` : undefined}
                      max={edition?.end_date ? `${edition.end_date}T23:59` : undefined}
                      className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Venue</label>
                    <input value={editForm.venue} onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                      className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleUpdate}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm">Save</button>
                  <button onClick={() => setEditingMatch(null)}
                    className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-1.5 rounded text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              // Display row
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    m.status === 'completed' ? 'bg-slate-600' : m.status === 'live' ? 'bg-red-600' : 'bg-amber-600'
                  } text-white`}>{m.stage.replace(/_/g, ' ')}</span>
                  {m.group_id && groupMap[m.group_id] && (
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{groupMap[m.group_id]}</span>
                  )}
                  <span className="text-white">{teamMap[m.home_team_id]}</span>
                  <span className="text-2xl font-bold text-emerald-400">{m.home_score ?? '-'}</span>
                  <span className="text-slate-400">:</span>
                  <span className="text-2xl font-bold text-emerald-400">{m.away_score ?? '-'}</span>
                  <span className="text-white">{teamMap[m.away_team_id]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    m.status === 'completed' ? 'bg-green-600' : m.status === 'live' ? 'bg-red-600' : 'bg-slate-600'
                  } text-white`}>{m.status}</span>
                </div>
                <div className="flex items-center gap-3">
                  {m.status === 'scheduled' && (
                    <button onClick={async () => { await updateMatch(m.id, { status: 'live' }); loadData(); }}
                      className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded">
                      Mark Live
                    </button>
                  )}
                  {m.status === 'live' && m.home_score === m.away_score && (
                    <button onClick={async () => { await updateMatch(m.id, { status: 'penalties' }); loadData(); }}
                      className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded">
                      Penalties
                    </button>
                  )}
                  {(m.status === 'live' || m.status === 'penalties') && (
                    <button onClick={async () => { await updateMatch(m.id, { status: 'completed' }); loadData(); }}
                      className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded">
                      Mark Completed
                    </button>
                  )}
                  <button onClick={() => openEdit(m)} className="text-emerald-400 hover:text-emerald-300 text-sm"
                    data-testid={`edit-match-${m.id}`}>Edit</button>
                  <Link to={`/admin/matches/${m.id}/events`} className="text-emerald-400 hover:underline text-sm">Events</Link>
                  <button onClick={() => handleDeleteMatch(m.id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}