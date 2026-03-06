import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEdition, getTeams, createTeam, updateTeam, deleteTeam, getPlayers, createPlayer, updatePlayer, deletePlayer } from '../../lib/api';

const POSITIONS = [
  { value: 'goalkeeper', label: 'GK' },
  { value: 'defender', label: 'DEF' },
  { value: 'midfielder', label: 'MID' },
  { value: 'forward', label: 'FWD' },
];

export default function EditionTeams() {
  const { id } = useParams();
  const [edition, setEdition] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCoach, setNewTeamCoach] = useState('');
  const [editingTeam, setEditingTeam] = useState(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamCoach, setEditTeamCoach] = useState('');
  const [newPlayer, setNewPlayer] = useState({ name: '', number: '', position: '' });
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', number: '', position: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [edRes, teamsRes] = await Promise.all([getEdition(id), getTeams(id)]);
      setEdition(edRes.data);
      setTeams(teamsRes.data);
    } finally {
      setLoading(false);
    }
  };

  const startEditTeam = (t) => {
    setEditingTeam(t.id);
    setEditTeamName(t.name);
    setEditTeamCoach(t.coach_name || '');
  };

  const handleEditTeamSave = async (teamId) => {
    if (!editTeamName.trim()) return;
    await updateTeam(teamId, { name: editTeamName, coach_name: editTeamCoach || null });
    setEditingTeam(null);
    const res = await getTeams(id);
    setTeams(res.data);
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    await createTeam({ edition_id: id, name: newTeamName, coach_name: newTeamCoach || null });
    setNewTeamName('');
    setNewTeamCoach('');
    const res = await getTeams(id);
    setTeams(res.data);
  };

  const handleDeleteTeam = async (teamId) => {
    const team = teams.find(t => t.id === teamId);
    const playerCount = selectedTeam === teamId ? players.length : null;
    const playerWarning = playerCount > 0 ? ` This will also delete ${playerCount} player(s).` : '';
    if (!window.confirm(`Delete ${team?.name}?${playerWarning}`)) return;
    await deleteTeam(teamId);
    const res = await getTeams(id);
    setTeams(res.data);
    if (selectedTeam === teamId) { setSelectedTeam(null); setPlayers([]); }
  };

  const selectTeam = async (teamId) => {
    setSelectedTeam(teamId);
    setEditingPlayer(null);
    const res = await getPlayers(teamId);
    setPlayers(res.data);
  };

  const refreshPlayers = async () => {
    const res = await getPlayers(selectedTeam);
    setPlayers(res.data);
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayer.name.trim()) return;
    await createPlayer({
      team_id: selectedTeam,
      name: newPlayer.name,
      jersey_number: newPlayer.number ? parseInt(newPlayer.number) : null,
      position: newPlayer.position || null,
    });
    setNewPlayer({ name: '', number: '', position: '' });
    await refreshPlayers();
  };

  const startEdit = (p) => {
    setEditingPlayer(p.id);
    setEditForm({
      name: p.name,
      number: p.jersey_number ?? '',
      position: p.position ?? '',
    });
  };

  const handleEditSave = async (playerId) => {
    await updatePlayer(playerId, {
      name: editForm.name,
      jersey_number: editForm.number ? parseInt(editForm.number) : null,
      position: editForm.position || null,
    });
    setEditingPlayer(null);
    await refreshPlayers();
  };

  const handleDeletePlayer = async (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (!window.confirm(`Delete ${player?.name}? Any match events recorded for this player will lose their player link.`)) return;
    await deletePlayer(playerId);
    await refreshPlayers();
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4" data-testid="edition-teams-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{edition?.name} - Teams</h1>
          <Link to={`/admin/tournaments/${edition?.tournament_id}`} className="text-emerald-400 text-sm hover:underline">← Back to Tournament</Link>
          <Link to={`/admin/editions/${id}/matches`} className="text-emerald-400 text-sm hover:underline ml-4">Go to Matches →</Link>
          <Link to={`/admin/editions/${id}/groups`} className="text-emerald-400 text-sm hover:underline ml-4">Manage Groups →</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teams panel */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Teams ({teams.length})</h2>
          <form onSubmit={handleAddTeam} className="space-y-2 mb-4">
            <div className="flex gap-2">
              <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team name *" className="flex-1 bg-slate-700 text-white px-3 py-2 rounded text-sm"
                data-testid="new-team-input" />
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm"
                data-testid="add-team-btn">Add</button>
            </div>
            <input value={newTeamCoach} onChange={(e) => setNewTeamCoach(e.target.value)}
              placeholder="Coach name (optional)"
              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
          </form>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {teams.map((t) => (
              <div key={t.id} className={`rounded ${
                selectedTeam === t.id ? 'bg-emerald-600/20 border border-emerald-600' : 'bg-slate-700/50'
              }`}>
                {editingTeam === t.id ? (
                  <div className="p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <input value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)}
                      placeholder="Team name *" className="w-full bg-slate-600 text-white px-2 py-1 rounded text-sm" />
                    <input value={editTeamCoach} onChange={(e) => setEditTeamCoach(e.target.value)}
                      placeholder="Coach name (optional)" className="w-full bg-slate-600 text-white px-2 py-1 rounded text-sm" />
                    <div className="flex gap-1">
                      <button onClick={() => handleEditTeamSave(t.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-xs">Save</button>
                      <button onClick={() => setEditingTeam(null)}
                        className="bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded text-xs">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/70 rounded"
                    onClick={() => selectTeam(t.id)} data-testid={`team-${t.id}`}>
                    <div>
                      <span className="text-white">{t.name}</span>
                      {t.coach_name && <p className="text-slate-400 text-xs">{t.coach_name}</p>}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={(e) => { e.stopPropagation(); startEditTeam(t); }}
                        className="text-emerald-400 hover:text-emerald-300 text-sm">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteTeam(t.id); }}
                        className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Players panel */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            {selectedTeam ? `Players — ${teams.find(t => t.id === selectedTeam)?.name}` : 'Select a team'}
          </h2>
          {selectedTeam && (
            <>
              {/* Add player form */}
              <form onSubmit={handleAddPlayer} className="grid grid-cols-[1fr_48px_80px_60px] gap-2 mb-4 items-center">
                <input value={newPlayer.name} onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                  placeholder="Player name" className="bg-slate-700 text-white px-3 py-2 rounded text-sm"
                  data-testid="new-player-input" />
                <input value={newPlayer.number} onChange={(e) => setNewPlayer({ ...newPlayer, number: e.target.value })}
                  placeholder="#" type="number" min="1" max="99"
                  className="bg-slate-700 text-white px-2 py-2 rounded text-sm text-center" />
                <select value={newPlayer.position} onChange={(e) => setNewPlayer({ ...newPlayer, position: e.target.value })}
                  className="bg-slate-700 text-white px-2 py-2 rounded text-sm">
                  <option value="">Pos</option>
                  {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded text-sm"
                  data-testid="add-player-btn">Add</button>
              </form>

              {/* Player list */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {players.map((p) => (
                  <div key={p.id} className="bg-slate-700/50 rounded">
                    {editingPlayer === p.id ? (
                      // Inline edit row
                      <div className="grid grid-cols-[1fr_48px_80px_auto] gap-2 p-2 items-center">
                        <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="bg-slate-600 text-white px-2 py-1 rounded text-sm" />
                        <input value={editForm.number} onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                          type="number" min="1" max="99" placeholder="#"
                          className="bg-slate-600 text-white px-2 py-1 rounded text-sm text-center" />
                        <select value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                          className="bg-slate-600 text-white px-2 py-1 rounded text-sm">
                          <option value="">Pos</option>
                          {POSITIONS.map(pos => <option key={pos.value} value={pos.value}>{pos.label}</option>)}
                        </select>
                        <div className="flex gap-1">
                          <button onClick={() => handleEditSave(p.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-xs">Save</button>
                          <button onClick={() => setEditingPlayer(null)}
                            className="bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded text-xs">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      // Display row
                      <div className="flex items-center justify-between p-3">
                        <span className="text-white flex items-center gap-2">
                          {p.jersey_number && <span className="text-emerald-400 font-mono text-sm w-6">#{p.jersey_number}</span>}
                          <span>{p.name}</span>
                          {p.position && (
                            <span className="text-xs bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded uppercase">
                              {POSITIONS.find(pos => pos.value === p.position)?.label ?? p.position}
                            </span>
                          )}
                        </span>
                        <div className="flex gap-3">
                          <button onClick={() => startEdit(p)}
                            className="text-emerald-400 hover:text-emerald-300 text-sm">Edit</button>
                          <button onClick={() => handleDeletePlayer(p.id)}
                            className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {players.length === 0 && <p className="text-slate-500 text-sm">No players yet</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}