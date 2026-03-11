import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  getOrganizations,
  getAdminAllCompetitions,
  changePassword,
} from '../../lib/api';

const AGE_GROUPS = ['U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'U21', 'Senior', 'Veterans'];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [organizations, setOrganizations] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [tab, setTab] = useState('organizations');
  const [successMessage, setSuccessMessage] = useState(location.state?.success || '');
  const [ageGroupFilter, setAgeGroupFilter] = useState('');
  const [movingCompetition, setMovingCompetition] = useState(null);
  const [moveTargetOrganizationId, setMoveTargetOrganizationId] = useState('');
  const [moveError, setMoveError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [orgsRes, competitionsRes] = await Promise.all([
        getOrganizations(),
        getAdminAllCompetitions(),
      ]);
      setOrganizations(orgsRes.data);
      setCompetitions(competitionsRes.data);
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async () => {
    if (!moveTargetOrganizationId) return;
    setMoveError('');
    try {
      // moveAdminCompetition removed — endpoint no longer exists
      setMovingCompetition(null);
      setMoveTargetOrganizationId('');
      await loadData();
    } catch (err) {
      setMoveError(err.response?.data?.detail || 'Failed to move competition');
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

  const filteredCompetitions = competitions.filter(t =>
    ageGroupFilter ? t.age_group === ageGroupFilter : true
  );

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">PitchBase</p>
        <h1 className="text-3xl font-black text-white">Super Admin</h1>
      </div>

      {successMessage && (
        <div className="bg-emerald-900/50 text-emerald-300 p-3 rounded mb-6 text-sm flex items-center justify-between">
          {successMessage}
          <button onClick={() => setSuccessMessage('')} className="text-emerald-400 hover:text-white ml-4">✕</button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <p className="text-emerald-400 font-black text-3xl">{organizations.length}</p>
          <p className="text-slate-500 text-xs mt-1">Organizations</p>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <p className="text-emerald-400 font-black text-3xl">{competitions.length}</p>
          <p className="text-slate-500 text-xs mt-1">Competitions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-slate-800">
        {[
          { id: 'organizations', label: `Organizations (${organizations.length})` },
          { id: 'competitions', label: `All Competitions (${competitions.length})` },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`py-2.5 px-5 text-sm font-medium transition-colors border-b-2 ${
              tab === t.id
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* ORGANIZATIONS TAB */}
      {tab === 'organizations' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => navigate('/admin/organizations/new-account')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm">
              + New Organization Account
            </button>
          </div>

          {organizations.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No organizations yet</p>
          ) : (
            <div className="space-y-2">
              {organizations.map((org) => (
                <div key={org.id} className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{org.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {org.short_name && (
                        <span className="text-slate-500 text-xs">{org.short_name}</span>
                      )}
                      {org.organization_type && (
                        <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded capitalize">
                          {org.organization_type}
                        </span>
                      )}
                      {org.status && org.status !== 'active' && (
                        <span className="text-xs bg-amber-900/50 text-amber-400 px-2 py-0.5 rounded capitalize">
                          {org.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link to={`/admin/organizations/${org.id}`}
                    className="text-emerald-400 hover:text-emerald-300 text-sm">
                    View →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ALL COMPETITIONS TAB */}
      {tab === 'competitions' && (
        <div className="space-y-4">
          {/* Move modal */}
          {movingCompetition && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
                <h2 className="text-white font-semibold mb-1">Move Competition</h2>
                <p className="text-slate-400 text-sm mb-4">
                  Moving: <span className="text-white">{movingCompetition.name}</span>
                </p>
                {moveError && (
                  <div className="bg-red-900/50 text-red-300 text-sm p-2 rounded mb-3">{moveError}</div>
                )}
                <label className="block text-slate-300 text-sm mb-1">Select new organization</label>
                <select value={moveTargetOrganizationId}
                  onChange={(e) => setMoveTargetOrganizationId(e.target.value)}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm mb-4">
                  <option value="">— Select organization —</option>
                  {organizations
                    .filter(org => org.name !== movingCompetition.organization_name)
                    .map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                </select>
                <div className="flex gap-3">
                  <button onClick={handleMove} disabled={!moveTargetOrganizationId}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50">
                    Confirm Move
                  </button>
                  <button onClick={() => { setMovingCompetition(null); setMoveTargetOrganizationId(''); setMoveError(''); }}
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
            <span className="text-slate-500 text-sm ml-auto">{filteredCompetitions.length} competition{filteredCompetitions.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Competition list */}
          {filteredCompetitions.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No competitions found</p>
          ) : (
            filteredCompetitions.map((t) => (
              <div key={t.id} className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{t.name}</p>
                  <p className="text-slate-400 text-sm">{t.organization_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  {t.age_group && (
                    <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded">
                      {t.age_group}
                    </span>
                  )}
                  <button
                    onClick={() => { setMovingCompetition(t); setMoveTargetOrganizationId(''); }}
                    className="text-slate-400 hover:text-white text-sm">
                    Move
                  </button>
                  <Link to={`/admin/competitions/${t.id}`}
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
