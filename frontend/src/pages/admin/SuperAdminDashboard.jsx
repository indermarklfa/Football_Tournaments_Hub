import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getAdminOrganiserAccounts,
  createAdminOrganiserAccount,
  deleteAdminOrganiserAccount,
  getAdminAllTournaments,
  moveAdminTournament,
  resetOrganiserPassword,
  changePassword,
} from '../../lib/api';

const AGE_GROUPS = ['U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'U21', 'Senior', 'Veterans'];

export default function SuperAdminDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [tab, setTab] = useState('organisers');
  const [showForm, setShowForm] = useState(false);
  const [expandedOrg, setExpandedOrg] = useState('');
  const [ageGroupFilter, setAgeGroupFilter] = useState('');
  const [form, setForm] = useState({
    email: '', password: '', organiser_name: '', organiser_location: '', organiser_description: ''
  });
  const [movingTournament, setMovingTournament] = useState(null);
  const [moveTargetOrganiserId, setMoveTargetOrganiserId] = useState('');
  const [moveError, setMoveError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(null); // { user_id, email }
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [accountsRes, tournamentsRes] = await Promise.all([
        getAdminOrganiserAccounts(),
        getAdminAllTournaments(),
      ]);
      setAccounts(accountsRes.data);
      setTournaments(tournamentsRes.data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createAdminOrganiserAccount(form);
      setForm({ email: '', password: '', organiser_name: '', organiser_location: '', organiser_description: '' });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account');
    }
  };

  const handleDelete = async (userId, email) => {
    if (!window.confirm(`Delete account for ${email}? This will remove all their data.`)) return;
    await deleteAdminOrganiserAccount(userId);
    await loadData();
  };

  const handleMove = async () => {
    if (!moveTargetOrganiserId) return;
    setMoveError('');
    try {
      await moveAdminTournament(movingTournament.id, moveTargetOrganiserId);
      setMovingTournament(null);
      setMoveTargetOrganiserId('');
      await loadData();
    } catch (err) {
      setMoveError(err.response?.data?.detail || 'Failed to move tournament');
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters');
      return;
    }
    setResetError('');
    try {
      await resetOrganiserPassword(resettingPassword.user_id, newPassword);
      setResetSuccess('Password reset successfully');
      setTimeout(() => {
        setResettingPassword(null);
        setNewPassword('');
        setResetSuccess('');
      }, 2000);
    } catch (err) {
      setResetError(err.response?.data?.detail || 'Failed to reset password');
    }
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

  const filteredTournaments = tournaments.filter(t =>
    ageGroupFilter ? t.age_group === ageGroupFilter : true
  );

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">KasiHub</p>
        <h1 className="text-3xl font-black text-white">Super Admin</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <p className="text-emerald-400 font-black text-3xl">{accounts.length}</p>
          <p className="text-slate-500 text-xs mt-1">Organisers</p>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <p className="text-emerald-400 font-black text-3xl">{tournaments.length}</p>
          <p className="text-slate-500 text-xs mt-1">Tournaments</p>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <p className="text-emerald-400 font-black text-3xl">
            {new Set(tournaments.map(t => t.age_group).filter(Boolean)).size}
          </p>
          <p className="text-slate-500 text-xs mt-1">Age Groups</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-slate-800">
        {[
          { id: 'organisers', label: `Organisers (${accounts.length})` },
          { id: 'tournaments', label: `All Tournaments (${tournaments.length})` },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`py-2.5 px-5 text-sm font-medium transition-colors border-b-2 ${
              tab === t.id
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* ORGANISERS TAB */}
      {tab === 'organisers' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowForm(!showForm)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm">
              {showForm ? 'Cancel' : '+ New Organiser Account'}
            </button>
          </div>

          {/* Create form */}
          {showForm && (
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-white font-semibold mb-4">Create Organiser Account</h2>
              {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4 text-sm">{error}</div>}
              <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Email *</label>
                  <input type="email" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Password *</label>
                  <input type="password" required value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Organiser Name *</label>
                  <input required value={form.organiser_name}
                    onChange={(e) => setForm({ ...form, organiser_name: e.target.value })}
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Location</label>
                  <input value={form.organiser_location}
                    onChange={(e) => setForm({ ...form, organiser_location: e.target.value })}
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-300 text-sm mb-1">Description</label>
                  <input value={form.organiser_description}
                    onChange={(e) => setForm({ ...form, organiser_description: e.target.value })}
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm" />
                </div>
                <div className="col-span-2 flex gap-3">
                  <button type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded text-sm">
                    Create Account
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Reset password modal */}
          {resettingPassword && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
                <h2 className="text-white font-semibold mb-1">Reset Password</h2>
                <p className="text-slate-400 text-sm mb-4">
                  For: <span className="text-white">{resettingPassword.email}</span>
                </p>
                {resetError && <div className="bg-red-900/50 text-red-300 text-sm p-2 rounded mb-3">{resetError}</div>}
                {resetSuccess && <div className="bg-emerald-900/50 text-emerald-300 text-sm p-2 rounded mb-3">{resetSuccess}</div>}
                <label className="block text-slate-300 text-sm mb-1">New Password</label>
                <input type="password" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm mb-4" />
                <div className="flex gap-3">
                  <button onClick={handleResetPassword} disabled={!newPassword}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50">
                    Reset Password
                  </button>
                  <button onClick={() => { setResettingPassword(null); setNewPassword(''); setResetError(''); setResetSuccess(''); }}
                    className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Accounts list */}
          {accounts.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No organiser accounts yet</p>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => {
                const orgTournaments = tournaments.filter(t => t.organiser_name === a.organiser_name);
                const isExpanded = expandedOrg === a.user_id && a.user_id;
                return (
                  <div key={a.user_id} className="bg-slate-800 rounded-lg overflow-hidden">
                    {/* Organiser row */}
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition-colors"
                      onClick={() => setExpandedOrg(isExpanded ? null : a.user_id)}>
                      <div className="flex items-center gap-3">
                        <span className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                        <div>
                          <p className="text-white font-medium">{a.organiser_name}</p>
                          <p className="text-slate-400 text-sm">{a.email}</p>
                          {a.organiser_location && (
                            <p className="text-slate-500 text-xs">{a.organiser_location}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <span className="text-slate-500 text-xs">{orgTournaments.length} tournament{orgTournaments.length !== 1 ? 's' : ''}</span>
                        <span className="text-slate-500 text-xs">{new Date(a.created_at).toLocaleDateString()}</span>
                        <button onClick={() => { setResettingPassword(a); setNewPassword(''); setResetError(''); setResetSuccess(''); }}
                          className="text-slate-400 hover:text-white text-sm">
                          Reset PW
                        </button>
                        <button onClick={() => handleDelete(a.user_id, a.email)}
                          className="text-red-400 hover:text-red-300 text-sm">
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Expanded tournaments */}
                    {isExpanded && (
                      <div className="border-t border-slate-700 bg-slate-800 px-4 py-3">
                        {orgTournaments.length === 0 ? (
                          <p className="text-slate-500 text-sm py-2">No tournaments yet</p>
                        ) : (
                          <div className="space-y-2">
                            {orgTournaments.map(t => (
                              <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-slate-700/40 last:border-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-white text-sm">{t.name}</span>
                                  {t.age_group && (
                                    <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded">
                                      {t.age_group}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => { setMovingTournament(t); setMoveTargetOrganiserId(''); setTab('tournaments'); }}
                                    className="text-slate-400 hover:text-white text-xs">
                                    Move
                                  </button>
                                  <Link to={`/admin/tournaments/${t.id}`}
                                    className="text-emerald-400 hover:text-emerald-300 text-xs">
                                    View →
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ALL TOURNAMENTS TAB */}
      {tab === 'tournaments' && (
        <div className="space-y-4">
          {/* Move modal */}
          {movingTournament && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
                <h2 className="text-white font-semibold mb-1">Move Tournament</h2>
                <p className="text-slate-400 text-sm mb-4">
                  Moving: <span className="text-white">{movingTournament.name}</span>
                </p>
                {moveError && (
                  <div className="bg-red-900/50 text-red-300 text-sm p-2 rounded mb-3">{moveError}</div>
                )}
                <label className="block text-slate-300 text-sm mb-1">Select new organiser</label>
                <select value={moveTargetOrganiserId}
                  onChange={(e) => setMoveTargetOrganiserId(e.target.value)}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm mb-4">
                  <option value="">— Select organiser —</option>
                  {accounts
                    .filter(a => a.organiser_name !== movingTournament.organiser_name)
                    .map(a => (
                      <option key={a.organiser_id} value={a.organiser_id}>
                        {a.organiser_name} ({a.email})
                      </option>
                    ))}
                </select>
                <div className="flex gap-3">
                  <button onClick={handleMove} disabled={!moveTargetOrganiserId}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50">
                    Confirm Move
                  </button>
                  <button onClick={() => { setMovingTournament(null); setMoveTargetOrganiserId(''); setMoveError(''); }}
                    className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Age group filter */}
          <div className="flex items-center gap-3">
            <label className="text-slate-400 text-sm">Filter by age group:</label>
            <select value={ageGroupFilter} onChange={(e) => setAgeGroupFilter(e.target.value)}
              className="bg-slate-700 text-white px-3 py-1.5 rounded text-sm">
              <option value="">All</option>
              {AGE_GROUPS.map(ag => (
                <option key={ag} value={ag}>{ag}</option>
              ))}
            </select>
            {ageGroupFilter && (
              <button onClick={() => setAgeGroupFilter('')}
                className="text-slate-400 hover:text-white text-sm">
                Clear
              </button>
            )}
            <span className="text-slate-500 text-sm ml-auto">{filteredTournaments.length} tournament{filteredTournaments.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Tournament list */}
          {filteredTournaments.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No tournaments found</p>
          ) : (
            filteredTournaments.map((t) => (
              <div key={t.id} className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{t.name}</p>
                  <p className="text-slate-400 text-sm">{t.organiser_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  {t.age_group && (
                    <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded">
                      {t.age_group}
                    </span>
                  )}
                  <button
                    onClick={() => { setMovingTournament(t); setMoveTargetOrganiserId(''); }}
                    className="text-slate-400 hover:text-white text-sm">
                    Move
                  </button>
                  <Link to={`/admin/tournaments/${t.id}`}
                    className="text-emerald-400 hover:text-emerald-300 text-sm">
                    View →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {/* Change Password */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Security</h2>
          <button onClick={() => setShowChangePassword(!showChangePassword)}
            className="text-emerald-400 hover:text-emerald-300 text-sm">
            {showChangePassword ? 'Cancel' : 'Change Password'}
          </button>
        </div>
        {!showChangePassword ? (
          <p className="text-slate-500 text-sm mt-2">Update your account password</p>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3 mt-3 max-w-md">
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