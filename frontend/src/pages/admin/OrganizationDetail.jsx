import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getOrganization,
  getCompetitions,
  getClubs,
  getAdminOrganizations,
  resetUserPassword,
} from '../../lib/api';

export default function OrganizationDetail() {
  const { id } = useParams();
  const [organization, setOrganization] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('competitions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reset password state
  const [resettingUser, setResettingUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orgRes, competitionsRes, clubsRes, usersRes] = await Promise.all([
        getOrganization(id),
        getCompetitions(id),
        getClubs(id),
        getAdminOrganizations(),
      ]);
      setOrganization(orgRes.data);
      setCompetitions(competitionsRes.data);
      setClubs(clubsRes.data);
      // Filter users that belong to this organization
      const allUsers = usersRes.data;
      setUsers(allUsers.filter(u => String(u.organization_id) === String(id)));
    } catch (err) {
      setError('Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setResetError('Password must be at least 6 characters');
      return;
    }
    setResetSaving(true);
    setResetError('');
    try {
      await resetUserPassword(resettingUser.user_id, newPassword);
      setResetSuccess('Password reset successfully');
      setNewPassword('');
      setTimeout(() => {
        setResettingUser(null);
        setResetSuccess('');
      }, 2000);
    } catch (err) {
      setResetError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setResetSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (!organization) return <div className="text-center py-12 text-red-400">Organization not found</div>;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Back */}
      <Link to="/admin/super" className="text-emerald-400 text-sm hover:underline mb-6 inline-block">
        ← Back to Super Admin
      </Link>

      {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4 text-sm">{error}</div>}

      {/* Header */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">{organization.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {organization.short_name && (
                <span className="text-slate-400 text-sm">{organization.short_name}</span>
              )}
              {organization.organization_type && (
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded capitalize">
                  {organization.organization_type}
                </span>
              )}
              {organization.status && organization.status !== 'active' && (
                <span className="text-xs bg-amber-900/50 text-amber-400 px-2 py-0.5 rounded capitalize">
                  {organization.status}
                </span>
              )}
              {organization.status === 'active' && (
                <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded">
                  active
                </span>
              )}
            </div>
          </div>
          <Link
            to={`/admin/competitions/new?organization_id=${id}`}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
          >
            + Add Competition
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <p className="text-emerald-400 font-black text-3xl">{competitions.length}</p>
          <p className="text-slate-500 text-xs mt-1">Competitions</p>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <p className="text-emerald-400 font-black text-3xl">{clubs.length}</p>
          <p className="text-slate-500 text-xs mt-1">Clubs</p>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <p className="text-emerald-400 font-black text-3xl">{users.length}</p>
          <p className="text-slate-500 text-xs mt-1">Users</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-slate-800">
        {[
          { id: 'competitions', label: `Competitions (${competitions.length})` },
          { id: 'clubs', label: `Clubs (${clubs.length})` },
          { id: 'users', label: `Users (${users.length})` },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`py-2.5 px-5 text-sm font-medium transition-colors border-b-2 ${
              tab === t.id
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* COMPETITIONS TAB */}
      {tab === 'competitions' && (
        <div className="space-y-2">
          {competitions.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No competitions yet</p>
          ) : (
            competitions.map((c) => (
              <div key={c.id} className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{c.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {c.age_group && (
                      <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded">
                        {c.age_group}
                      </span>
                    )}
                    {c.description && (
                      <span className="text-slate-500 text-xs">{c.description}</span>
                    )}
                  </div>
                </div>
                <Link to={`/admin/competitions/${c.id}`}
                  className="text-emerald-400 hover:text-emerald-300 text-sm">
                  View →
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* CLUBS TAB */}
      {tab === 'clubs' && (
        <div className="space-y-2">
          {clubs.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No clubs yet</p>
          ) : (
            clubs.map((club) => (
              <div key={club.id} className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{club.name}</p>
                  {club.short_name && (
                    <p className="text-slate-500 text-xs mt-0.5">{club.short_name}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <div className="space-y-2">
          {/* Reset password modal */}
          {resettingUser && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
                <h2 className="text-white font-semibold mb-1">Reset Password</h2>
                <p className="text-slate-400 text-sm mb-4">
                  User: <span className="text-white">{resettingUser.organiser_name || resettingUser.email}</span>
                </p>
                {resetError && (
                  <div className="bg-red-900/50 text-red-300 text-sm p-2 rounded mb-3">{resetError}</div>
                )}
                {resetSuccess && (
                  <div className="bg-emerald-900/50 text-emerald-300 text-sm p-2 rounded mb-3">{resetSuccess}</div>
                )}
                <label className="block text-slate-300 text-sm mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleResetPassword}
                    disabled={resetSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
                  >
                    {resetSaving ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button
                    onClick={() => { setResettingUser(null); setNewPassword(''); setResetError(''); setResetSuccess(''); }}
                    className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {users.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No users found for this organization</p>
          ) : (
            users.map((u) => (
              <div key={u.user_id} className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{u.organiser_name || '—'}</p>
                  <p className="text-slate-400 text-sm">{u.email}</p>
                </div>
                <button
                  onClick={() => { setResettingUser(u); setNewPassword(''); setResetError(''); setResetSuccess(''); }}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  Reset Password
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
