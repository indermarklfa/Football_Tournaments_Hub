import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCompetition, getSeasons, updateCompetition, updateSeason, deleteSeason } from '../../lib/api';
import ImageUpload from '../../components/ImageUpload';

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Competition edit state
  const [editingCompetition, setEditingCompetition] = useState(false);
  const [editCompetitionName, setEditCompetitionName] = useState('');
  const [editCompetitionDesc, setEditCompetitionDesc] = useState('');
  const [editCompetitionAgeGroup, setEditCompetitionAgeGroup] = useState('');
  const [editCompetitionLogo, setEditCompetitionLogo] = useState('');

  // Season edit state
  const [editingSeason, setEditingSeason] = useState(null);
  const [editSeasonForm, setEditSeasonForm] = useState({});

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const [tRes, eRes] = await Promise.all([getCompetition(id), getSeasons(id)]);
    setCompetition(tRes.data);
    setSeasons(eRes.data);
    setLoading(false);
  };

  // --- Competition actions ---
  const startEditCompetition = () => {
    setEditCompetitionName(competition.name);
    setEditCompetitionDesc(competition.description || '');
    setEditCompetitionAgeGroup(competition.age_group || '');
    setEditCompetitionLogo(competition.logo_url || '');
    setEditingCompetition(true);
  };

  const handleSaveCompetition = async () => {
    await updateCompetition(id, { name: editCompetitionName, description: editCompetitionDesc, age_group: editCompetitionAgeGroup || null, logo_url: editCompetitionLogo || null });
    setEditingCompetition(false);
    await loadData();
  };

  const handleDeleteCompetition = async () => {
    if (!window.confirm(`Delete "${competition.name}"? This will permanently delete all its seasons, teams, matches and events.`)) return;
    await updateCompetition(id, { deleted: true });
    navigate('/admin/dashboard');
  };

  // --- Season actions ---
  const startEditSeason = (e) => {
    setEditingSeason(e.id);
    setEditSeasonForm({
      name: e.name,
      year: e.year,
      venue: e.venue || '',
      format: e.format,
      status: e.status,
      start_date: e.start_date || '',
      end_date: e.end_date || '',
    });
  };

  const handleSaveSeason = async (seasonId) => {
    await updateSeason(seasonId, {
      name: editSeasonForm.name,
      year: parseInt(editSeasonForm.year),
      venue: editSeasonForm.venue || null,
      format: editSeasonForm.format,
      status: editSeasonForm.status,
      start_date: editSeasonForm.start_date || null,
      end_date: editSeasonForm.end_date || null,
    });
    setEditingSeason(null);
    await loadData();
  };

  const handleSeasonStatus = async (seasonId, status) => {
    const label = status === 'active' ? 'mark as active' : 'mark as completed';
    if (!window.confirm(`Are you sure you want to ${label}?`)) return;
    await updateSeason(seasonId, { status });
    await loadData();
  };

  const handleDeleteSeason = async (e) => {
    if (!window.confirm(`Delete "${e.name}"? This will remove it from active view.`)) return;
    await deleteSeason(e.id);
    await loadData();
  };


  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (!competition) return <div className="text-center py-12 text-red-400">Competition not found</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" data-testid="tournament-detail">

      {/* Competition Header */}
      <Link to="/admin/dashboard" className="text-emerald-400 text-sm hover:underline mb-6 inline-block">← Back to Dashboard</Link>
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        {editingCompetition ? (
          <div className="space-y-3">
            <input value={editCompetitionName} onChange={(e) => setEditCompetitionName(e.target.value)}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-xl font-bold" />
            <textarea value={editCompetitionDesc} onChange={(e) => setEditCompetitionDesc(e.target.value)}
              placeholder="Description" rows={2}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
            <ImageUpload
              currentUrl={editCompetitionLogo}
              onUpload={(url) => setEditCompetitionLogo(url)}
              label="Competition Logo"
              size="md"
            />
            <select value={editCompetitionAgeGroup} onChange={(e) => setEditCompetitionAgeGroup(e.target.value)}
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
              <button onClick={handleSaveCompetition}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm">Save</button>
              <button onClick={() => setEditingCompetition(false)}
                className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-1.5 rounded text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {competition.logo_url && (
                <img
                  src={competition.logo_url.startsWith('http') ? competition.logo_url : `http://localhost:8000${competition.logo_url}`}
                  alt="logo"
                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-600 shrink-0"
                />
              )}
              <div>
              <h1 className="text-3xl font-bold text-white">{competition.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {competition.age_group && (
                  <span className="text-xs bg-emerald-700 text-white px-2 py-0.5 rounded">{competition.age_group}</span>
                )}
                <p className="text-slate-400">{competition.description || 'No description'}</p>
              </div>
            </div>
            </div>
            <div className="flex gap-2 ml-4">
              <button onClick={startEditCompetition}
                className="text-emerald-400 hover:text-emerald-300 text-sm">Edit</button>
              <button onClick={handleDeleteCompetition}
                className="text-red-400 hover:text-red-300 text-sm">Delete</button>
            </div>
          </div>
        )}
      </div>

      {/* Seasons */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Seasons</h2>
        <Link to={`/admin/seasons/new?competition_id=${id}`}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-medium text-sm"
          data-testid="new-edition-btn">+ New Season</Link>
      </div>

      {seasons.length === 0 ? (
        <p className="text-slate-500 bg-slate-800 rounded-lg p-6">No seasons yet</p>
      ) : (
        <div className="space-y-3">
          {seasons.map((e) => (
            <div key={e.id} className="bg-slate-800 rounded-lg" data-testid={`edition-${e.id}`}>
              {editingSeason === e.id ? (
                // Season inline edit form
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Name</label>
                      <input value={editSeasonForm.name}
                        onChange={(ev) => setEditSeasonForm({ ...editSeasonForm, name: ev.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Year</label>
                      <input type="number" value={editSeasonForm.year}
                        onChange={(ev) => setEditSeasonForm({ ...editSeasonForm, year: ev.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Format</label>
                      <select value={editSeasonForm.format}
                        onChange={(ev) => setEditSeasonForm({ ...editSeasonForm, format: ev.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm">
                        <option value="knockout">Knockout</option>
                        <option value="groups_knockout">Groups + Knockout</option>
                        <option value="league">League</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Status</label>
                      <select value={editSeasonForm.status}
                        onChange={(ev) => setEditSeasonForm({ ...editSeasonForm, status: ev.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm">
                        <option value="upcoming">Upcoming</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Start Date</label>
                      <input type="date" value={editSeasonForm.start_date}
                        onChange={(ev) => setEditSeasonForm({ ...editSeasonForm, start_date: ev.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">End Date</label>
                      <input type="date" value={editSeasonForm.end_date}
                        onChange={(ev) => setEditSeasonForm({ ...editSeasonForm, end_date: ev.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-slate-400 text-xs mb-1">
                        Venue(s) <span className="text-slate-500">— separate multiple venues with a comma</span>
                      </label>
                      <input value={editSeasonForm.venue}
                        onChange={(ev) => setEditSeasonForm({ ...editSeasonForm, venue: ev.target.value })}
                        placeholder="e.g. Stadium A, Stadium B, Civic Ground"
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveSeason(e.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm">Save</button>
                    <button onClick={() => setEditingSeason(null)}
                      className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-1.5 rounded text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                // Season display row
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
                      <button onClick={() => handleSeasonStatus(e.id, 'active')}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded">
                        Mark Active
                      </button>
                    )}
                    {e.status === 'active' && (
                      <button onClick={() => handleSeasonStatus(e.id, 'completed')}
                        className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded">
                        Mark Completed
                      </button>
                    )}
                    <button onClick={() => startEditSeason(e)}
                      className="text-emerald-400 hover:text-emerald-300 text-sm">Edit</button>
                    <Link to={`/admin/seasons/${e.id}/divisions`}
                      className="text-emerald-400 hover:underline text-sm">Divisions</Link>
                    <button onClick={() => handleDeleteSeason(e)}
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
