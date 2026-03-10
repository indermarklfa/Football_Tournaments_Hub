import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOrganizations, getCompetitions, updateOrganization, changePassword } from '../../lib/api';

export default function OrganiserDashboard() {
  const [organization, setOrganization] = useState(null);
  const [competitions, setCompetitions] = useState([]);
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
      const orgRes = await getOrganizations();
      const org = orgRes.data[0]; // Organiser only has one
      setOrganization(org);
      if (org) {
        const tourRes = await getCompetitions(org.id);
        setCompetitions(tourRes.data);
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
      name: organization.name,
      description: organization.description || '',
      location: organization.location || '',
    });
  };

  const handleEditSave = async () => {
    if (!editForm.name.trim()) return;
    await updateOrganization(organization.id, {
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
  if (!organization) return <div className="text-center py-12 text-slate-400">No organiser profile found.</div>;

  const liveTournaments = competitions.filter(t => t.status === 'active');
  const upcomingTournaments = competitions.filter(t => t.status === 'upcoming');

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Welcome back</p>
        <h1 className="text-3xl font-black text-white">{organization?.name}</h1>
        {organization?.location && <p className="text-slate-500 text-sm mt-0.5">📍 {organization.location}</p>}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <p className="text-emerald-400 font-black text-3xl">{competitions.length}</p>
          <p className="text-slate-500 text-xs mt-1">Competitions</p>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <p className="text-emerald-400 font-black text-3xl">{liveTournaments.length}</p>
          <p className="text-slate-500 text-xs mt-1">Active</p>
          {liveTournaments.length > 0 && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mt-1" />
          )}
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <p className="text-emerald-400 font-black text-3xl">{upcomingTournaments.length}</p>
          <p className="text-slate-500 text-xs mt-1">Upcoming</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 mb-6">
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
            <h3 className="text-xl font-semibold text-white">{organization.name}</h3>
            {organization.description && (
              <p className="text-slate-400 text-sm mt-1">{organization.description}</p>
            )}
            <p className="text-slate-500 text-sm mt-0.5">{organization.location || 'No location set'}</p>
          </div>
        )}
      </div>

      {/* Tournaments */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Your Competitions</h2>
          <Link to={`/admin/competitions/new?organiser_id=${organization.id}`}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
            + New
          </Link>
        </div>

        {competitions.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">
            No competitions yet — create one to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {competitions.map((t) => (
              <Link key={t.id} to={`/admin/competitions/${t.id}`}
                className="group flex items-center gap-3 bg-slate-700/30 hover:bg-slate-700/60 border border-slate-700/30 hover:border-slate-600/50 rounded-lg px-4 py-3 transition-all">
                <div className="w-0.5 self-stretch rounded-full bg-slate-600 group-hover:bg-emerald-500 transition-colors shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{t.name}</p>
                </div>
                {t.age_group && (
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                    {t.age_group}
                  </span>
                )}
                <span className="text-slate-600 group-hover:text-emerald-400 transition-colors text-lg shrink-0">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Change Password Card */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 mt-6">
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