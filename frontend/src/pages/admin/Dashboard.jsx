import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOrganisers, getTournaments, updateOrganiser } from '../../lib/api';

export default function Dashboard() {
  const [organisers, setOrganisers] = useState([]);
  const [tournaments, setTournaments] = useState({});
  const [editingOrg, setEditingOrg] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', location: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const orgRes = await getOrganisers();
      setOrganisers(orgRes.data);
      const tournamentsMap = {};
      for (const org of orgRes.data) {
        const tourRes = await getTournaments(org.id);
        tournamentsMap[org.id] = tourRes.data;
      }
      setTournaments(tournamentsMap);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const startEditOrg = (org) => {
    setEditingOrg(org.id);
    setEditForm({
      name: org.name,
      description: org.description || '',
      location: org.location || '',
    });
  };

  const handleEditSave = async (orgId) => {
    if (!editForm.name.trim()) return;
    await updateOrganiser(orgId, {
      name: editForm.name,
      description: editForm.description || null,
      location: editForm.location || null,
    });
    setEditingOrg(null);
    await loadData();
  };

  const handleDeleteOrg = async (orgId) => {
    if (!window.confirm('Delete this organiser and all its tournaments?')) return;
    await updateOrganiser(orgId, { deleted: true });
    await loadData();
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4" data-testid="admin-dashboard">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <Link to="/admin/organisers/new"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-medium"
          data-testid="new-organiser-btn">+ New Organiser</Link>
      </div>

      {organisers.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>No organisers yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {organisers.map((org) => (
            <div key={org.id} className="bg-slate-800 rounded-lg p-6" data-testid={`organiser-${org.id}`}>

              {editingOrg === org.id ? (
                // Inline edit form
                <div className="mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 text-sm mb-1">Name *</label>
                      <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm mb-1">Location</label>
                      <input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm mb-1">Description</label>
                    <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={2} className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditSave(org.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm">Save</button>
                    <button onClick={() => setEditingOrg(null)}
                      className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-1.5 rounded text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                // Display header
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{org.name}</h2>
                    {org.description && <p className="text-slate-400 text-sm mt-0.5">{org.description}</p>}
                    <p className="text-slate-500 text-sm">{org.location || 'No location'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => startEditOrg(org)}
                      className="text-emerald-400 hover:text-emerald-300 text-sm">Edit</button>
                    <button onClick={() => handleDeleteOrg(org.id)}
                      className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                    <Link to={`/admin/tournaments/new?organiser_id=${org.id}`}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm"
                      data-testid={`new-tournament-btn-${org.id}`}>+ Tournament</Link>
                  </div>
                </div>
              )}

              {/* Tournaments list */}
              {tournaments[org.id]?.length > 0 ? (
                <div className="space-y-2">
                  {tournaments[org.id].map((t) => (
                    <div key={t.id} className="bg-slate-700/50 rounded p-3 flex items-center justify-between">
                      <span className="text-white">{t.name}</span>
                      <Link to={`/admin/tournaments/${t.id}`}
                        className="text-emerald-400 hover:underline text-sm">Manage →</Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No tournaments yet.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}