import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEdition, getTeams, createTeam, deleteTeam, getPlayers, createPlayer } from '../../lib/api';

export default function EditionTeams() {
  const { id } = useParams();
  const [edition, setEdition] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [edRes, teamsRes] = await Promise.all([getEdition(id), getTeams(id)]);
      setEdition(edRes.data);
      setTeams(teamsRes.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    await createTeam({ edition_id: id, name: newTeamName });
    setNewTeamName('');
    const res = await getTeams(id);
    setTeams(res.data);
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Delete this team?')) return;
    await deleteTeam(teamId);
    const res = await getTeams(id);
    setTeams(res.data);
    if (selectedTeam === teamId) setSelectedTeam(null);
  };

  const selectTeam = async (teamId) => {
    setSelectedTeam(teamId);
    const res = await getPlayers(teamId);
    setPlayers(res.data);
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    await createPlayer({
      team_id: selectedTeam,
      name: newPlayerName,
      jersey_number: newPlayerNumber ? parseInt(newPlayerNumber) : null,
    });
    setNewPlayerName('');
    setNewPlayerNumber('');
    const res = await getPlayers(selectedTeam);
    setPlayers(res.data);
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4" data-testid="edition-teams-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{edition?.name} - Teams</h1>
          <Link to={`/admin/editions/${id}/matches`} className="text-emerald-400 text-sm hover:underline">Go to Matches →</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Teams ({teams.length})</h2>
          <form onSubmit={handleAddTeam} className="flex gap-2 mb-4">
            <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Team name" className="flex-1 bg-slate-700 text-white px-3 py-2 rounded text-sm"
              data-testid="new-team-input" />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm"
              data-testid="add-team-btn">Add</button>
          </form>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {teams.map((t) => (
              <div key={t.id} className={`flex items-center justify-between p-3 rounded cursor-pointer ${
                selectedTeam === t.id ? 'bg-emerald-600/20 border border-emerald-600' : 'bg-slate-700/50 hover:bg-slate-700'
              }`} onClick={() => selectTeam(t.id)} data-testid={`team-${t.id}`}>
                <span className="text-white">{t.name}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteTeam(t.id); }}
                  className="text-red-400 hover:text-red-300 text-sm">Delete</button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            {selectedTeam ? `Players - ${teams.find(t => t.id === selectedTeam)?.name}` : 'Select a team'}
          </h2>
          {selectedTeam && (
            <>
              <form onSubmit={handleAddPlayer} className="flex gap-2 mb-4">
                <input value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Player name" className="flex-1 bg-slate-700 text-white px-3 py-2 rounded text-sm"
                  data-testid="new-player-input" />
                <input value={newPlayerNumber} onChange={(e) => setNewPlayerNumber(e.target.value)}
                  placeholder="#" type="number" className="w-16 bg-slate-700 text-white px-3 py-2 rounded text-sm" />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm"
                  data-testid="add-player-btn">Add</button>
              </form>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-slate-700/50 p-3 rounded">
                    <span className="text-white">
                      {p.jersey_number && <span className="text-emerald-400 mr-2">#{p.jersey_number}</span>}
                      {p.name}
                    </span>
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
