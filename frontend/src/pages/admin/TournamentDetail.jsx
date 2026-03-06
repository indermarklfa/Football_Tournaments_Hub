import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTournament, getEditions, updateTournament, updateEdition } from '../../lib/api';

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tournament edit state
  const [editingTournament, setEditingTournament] = useState(false);
  const [editTournamentName, setEditTournamentName] = useState('');
  const [editTournamentDesc, setEditTournamentDesc] = useState('');
  const [editTournamentAgeGroup, setEditTournamentAgeGroup] = useState('');

  // Edition edit state
  const [editingEdition, setEditingEdition] = useState(null);
  const [editEditionForm, setEditEditionForm] = useState({});

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const [tRes, eRes] = await Promise.all([getTournament(id), getEditions(id)]);
    setTournament(tRes.data);
    setEditions(eRes.data);
    setLoading(false);
  };

  // --- Tournament actions ---
  const startEditTournament = () => {
    setEditTournamentName(tournament.name);
    setEditTournamentDesc(tournament.description || '');
    setEditTournamentAgeGroup(tournament.age_group || '');
    setEditingTournament(true);
  };

  const handleSaveTournament = async () => {
    await updateTournament(id, { name: editTournamentName, description: editTournamentDesc, age_group: editTournamentAgeGroup || null });
    setEditingTournament(false);
    await loadData();
  };

  const handleDeleteTournament = async () => {
    if (!window.confirm(`Delete "${tournament.name}"? This will permanently delete all its editions, teams, matches and events.`)) return;
    await updateTournament(id, { deleted: true });
    navigate('/admin/dashboard');
  };

  // --- Edition actions ---
  const startEditEdition = (e) => {
    setEditingEdition(e.id);
    setEditEditionForm({
      name: e.name,
      year: e.year,
      venue: e.venue || '',
      format: e.format,
      status: e.status,
      start_date: e.start_date || '',
      end_date: e.end_date || '',
    });
  };

  const handleSaveEdition = async (editionId) => {
    await updateEdition(editionId, {
      name: editEditionForm.name,
      year: parseInt(editEditionForm.year),
      venue: editEditionForm.venue || null,
      format: editEditionForm.format,
      status: editEditionForm.status,
      start_date: editEditionForm.start_date || null,
      end_date: editEditionForm.end_date || null,
    });
    setEditingEdition(null);
    await loadData();
  };

  const handleEditionStatus = async (editionId, status) => {
    const label = status === 'active' ? 'mark as active' : 'mark as completed';
    if (!window.confirm(`Are you sure you want to ${label}?`)) return;
    await updateEdition(editionId, { status });
    await loadData();
  };

  const handleDeleteEdition = async (e) => {
    if (!window.confirm(`Delete "${e.name}"? This will permanently delete all its teams, matches and events.`)) return;
    await updateEdition(e.id, { deleted: true });
    await loadData();
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (!tournament) return <div className="text-center py-12 text-red-400">Tournament not found</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" data-testid="tournament-detail">

      {/* Tournament Header */}
      <Link to="/admin/dashboard" className="text-emerald-400 text-sm hover:underline mb-6 inline-block">← Back to Dashboard</Link>
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        {editingTournament ? (
          <div className="space-y-3">
            <input value={editTournamentName} onChange={(e) => setEditTournamentName(e.target.value)}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-xl font-bold" />
            <textarea value={editTournamentDesc} onChange={(e) => setEditTournamentDesc(e.target.value)}
              placeholder="Description" rows={2}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
            <select value={editTournamentAgeGroup} onChange={(e) => setEditTournamentAgeGroup(e.target.value)}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm">
              <option value="">None / Open</option>
              <option value="U9">U9</option>
              <option value="U11">U11</option>
              <option value="U13">U13</option>
              <option value="U15">U15</option>
              <option value="U17">U17</option>
              <option value="U19">U19</option>
              <option value="U21">U21</option>
              <option value="Senior">Senior</option>
              <option value="Veterans">Veterans</option>
            </select>
            <div className="flex gap-2">
              <button onClick={handleSaveTournament}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm">Save</button>
              <button onClick={() => setEditingTournament(false)}
                className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-1.5 rounded text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{tournament.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {tournament.age_group && (
                  <span className="text-xs bg-emerald-700 text-white px-2 py-0.5 rounded">{tournament.age_group}</span>
                )}
                <p className="text-slate-400">{tournament.description || 'No description'}</p>
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              <button onClick={startEditTournament}
                className="text-emerald-400 hover:text-emerald-300 text-sm">Edit</button>
              <button onClick={handleDeleteTournament}
                className="text-red-400 hover:text-red-300 text-sm">Delete</button>
            </div>
          </div>
        )}
      </div>

      {/* Editions */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Editions</h2>
        <Link to={`/admin/editions/new?tournament_id=${id}`}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-medium text-sm"
          data-testid="new-edition-btn">+ New Edition</Link>
      </div>

      {editions.length === 0 ? (
        <p className="text-slate-500 bg-slate-800 rounded-lg p-6">No editions yet</p>
      ) : (
        <div className="space-y-3">
          {editions.map((e) => (
            <div key={e.id} className="bg-slate-800 rounded-lg" data-testid={`edition-${e.id}`}>
              {editingEdition === e.id ? (
                // Edition inline edit form
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Name</label>
                      <input value={editEditionForm.name}
                        onChange={(ev) => setEditEditionForm({ ...editEditionForm, name: ev.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Year</label>
                      <input type="number" value={editEditionForm.year}
                        onChange={(ev) => setEditEditionForm({ ...editEditionForm, year: ev.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Format</label>
                      <select value={editEditionForm.format}
                        onChange={(ev) => setEditEditionForm({ ...editEditionForm, format: ev.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm">
                        <option value="knockout">Knockout</option>
                        <option value="groups_knockout">Groups + Knockout</option>
                        <option value="league">League</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Status</label>
                      <select value={editEditionForm.status}
                        onChange={(ev) => setEditEditionForm({ ...editEditionForm, status: ev.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm">
                        <option value="upcoming">Upcoming</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Start Date</label>
                      <input type="date" value={editEditionForm.start_date}
                        onChange={(ev) => setEditEditionForm({ ...editEditionForm, start_date: ev.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">End Date</label>
                      <input type="date" value={editEditionForm.end_date}
                        onChange={(ev) => setEditEditionForm({ ...editEditionForm, end_date: ev.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-slate-400 text-xs mb-1">
                        Venue(s) <span className="text-slate-500">— separate multiple venues with a comma</span>
                      </label>
                      <input value={editEditionForm.venue}
                        onChange={(ev) => setEditEditionForm({ ...editEditionForm, venue: ev.target.value })}
                        placeholder="e.g. Stadium A, Stadium B, Civic Ground"
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdition(e.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm">Save</button>
                    <button onClick={() => setEditingEdition(null)}
                      className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-1.5 rounded text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                // Edition display row
                <div className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium">{e.name}</span>
                      <span className="text-slate-400 text-sm">({e.year})</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        e.status === 'completed' ? 'bg-slate-600 text-slate-300' :
                        e.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                      }`}>{e.status}</span>
                      <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded">{e.format?.replace('_', ' ')}</span>
                    </div>
                    {e.venue && <p className="text-slate-500 text-xs mt-1">📍 {e.venue}</p>}
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-wrap justify-end">
                    {e.status === 'upcoming' && (
                      <button onClick={() => handleEditionStatus(e.id, 'active')}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded">
                        Mark Active
                      </button>
                    )}
                    {e.status === 'active' && (
                      <button onClick={() => handleEditionStatus(e.id, 'completed')}
                        className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded">
                        Mark Completed
                      </button>
                    )}
                    <button onClick={() => startEditEdition(e)}
                      className="text-emerald-400 hover:text-emerald-300 text-sm">Edit</button>
                    <Link to={`/admin/editions/${e.id}/teams`}
                      className="text-emerald-400 hover:underline text-sm">Teams</Link>
                    <Link to={`/admin/editions/${e.id}/matches`}
                      className="text-emerald-400 hover:underline text-sm">Matches</Link>
                    <button onClick={() => handleDeleteEdition(e)}
                      className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}