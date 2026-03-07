import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOrganisers, getTournaments, updateOrganiser, changePassword } from '../../lib/api';

export default function OrganiserDashboard() {
  const [organiser, setOrganiser] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [editingOrg, setEditingOrg] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', location: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const orgRes = await getOrganisers();
      const org = orgRes.data[0]; // Organiser only has one
      setOrganiser(org);
      if (org) {
        const tourRes = await getTournaments(org.id);
        setTournaments(tourRes.data);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    setEditingOrg(true);
    setEditForm({
      name: organiser.name,
      description: organiser.description || '',
      location: organiser.location || '',
    });
  };

  const handleEditSave = async () => {
    if (!editForm.name.trim()) return;
    await updateOrganiser(organiser.id, {
      name: editForm.name,
      description: editForm.description || null,
      location: editForm.location || null,
    });
    setEditingOrg(false);
    await loadData();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    try {
      await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordSuccess('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => { setShowChangePassword(false); setPasswordSuccess(''); }, 2000);
    } catch (err) {
      setPasswordError(err.response?.data?.detail || 'Failed to change password');
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>;
  if (!organiser) return <div className="text-center py-12 text-slate-400">No organiser profile found.</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>

      {/* Profile Card */}
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Your Profile</h2>
          {!editingOrg && (
            <button onClick={startEdit}
              className="text-emerald-400 hover:text-emerald-300 text-sm">
              Edit
            </button>
          )}
        </div>

        {editingOrg ? (
          <div className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 text-sm mb-1">Name *</label>
                <input value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
              </div>
              <div>
                <label className="block text-slate-300 text-sm mb-1">Location</label>
                <input value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1">Description</label>
              <textarea value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2} className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleEditSave}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm">
                Save
              </button>
              <button onClick={() => setEditingOrg(false)}
                className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-1.5 rounded text-sm">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <h3 className="text-xl font-semibold text-white">{organiser.name}</h3>
            {organiser.description && (
              <p className="text-slate-400 text-sm mt-1">{organiser.description}</p>
            )}
            <p className="text-slate-500 text-sm mt-0.5">{organiser.location || 'No location set'}</p>
          </div>
        )}
      </div>

      {/* Tournaments Card */}
      <div className="bg-slate-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Tournaments</h2>
          <Link to={`/admin/tournaments/new?organiser_id=${organiser.id}`}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-sm">
            + New Tournament
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">
            No tournaments yet. Create one to get started!
          </p>
        ) : (
          <div className="space-y-2">
            {tournaments.map((t) => (
              <div key={t.id} className="bg-slate-700/50 rounded p-3 flex items-center justify-between">
                <div>
                  <span className="text-white">{t.name}</span>
                  {t.age_group && (
                    <span className="ml-2 text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded">
                      {t.age_group}
                    </span>
                  )}
                </div>
                <Link to={`/admin/tournaments/${t.id}`}
                  className="text-emerald-400 hover:underline text-sm">
                  Manage →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Change Password Card */}
      <div className="bg-slate-800 rounded-lg p-6 mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Security</h2>
          <button onClick={() => { setShowChangePassword(!showChangePassword); setPasswordError(''); setPasswordSuccess(''); }}
            className="text-emerald-400 hover:text-emerald-300 text-sm">
            {showChangePassword ? 'Cancel' : 'Change Password'}
          </button>
        </div>
        {!showChangePassword ? (
          <p className="text-slate-500 text-sm mt-2">Update your account password</p>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3 mt-3">
            {passwordError && <div className="bg-red-900/50 text-red-300 text-sm p-2 rounded">{passwordError}</div>}
            {passwordSuccess && <div className="bg-emerald-900/50 text-emerald-300 text-sm p-2 rounded">{passwordSuccess}</div>}
            <div>
              <label className="block text-slate-300 text-sm mb-1">Current Password</label>
              <input type="password" required value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1">New Password</label>
              <input type="password" required value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1">Confirm New Password</label>
              <input type="password" required value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
            </div>
            <button type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm">
              Update Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}