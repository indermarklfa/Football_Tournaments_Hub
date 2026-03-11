import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAdminOrganization, getOrganizations } from '../../lib/api';

export default function NewOrganizationAccount() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('new'); // 'new' | 'existing'
  const [organizations, setOrganizations] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(false);

  const [form, setForm] = useState({
    organiser_name: '',
    short_name: '',
    organization_type: '',
    email: '',
    password: '',
    confirm_password: '',
    organization_id: '',
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'existing') {
      setOrgsLoading(true);
      getOrganizations()
        .then((res) => setOrganizations(res.data))
        .finally(() => setOrgsLoading(false));
    }
  }, [mode]);

  const selectedOrg = organizations.find((o) => String(o.id) === String(form.organization_id));

  const validate = () => {
    const e = {};
    if (mode === 'new') {
      if (!form.organiser_name.trim()) e.organiser_name = 'Organization name is required';
    } else {
      if (!form.organization_id) e.organization_id = 'Please select an organization';
    }
    if (!form.email.trim()) e.email = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    if (!form.confirm_password) e.confirm_password = 'Please confirm your password';
    if (form.password && form.confirm_password && form.password !== form.confirm_password) {
      e.confirm_password = 'Passwords do not match';
    }
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setErrors({});
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      let payload;
      if (mode === 'new') {
        payload = {
          email: form.email,
          password: form.password,
          organiser_name: form.organiser_name,
          short_name: form.short_name || undefined,
          organization_type: form.organization_type || undefined,
        };
      } else {
        payload = {
          email: form.email,
          password: form.password,
          organiser_name: selectedOrg.name,
          short_name: selectedOrg.short_name || undefined,
          organization_type: selectedOrg.organization_type || undefined,
        };
      }
      await createAdminOrganization(payload);
      navigate('/admin/super', { state: { success: 'Organization account created successfully' } });
    } catch (err) {
      setApiError(err.response?.data?.detail || 'Failed to create organization account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <div className="mb-6">
        <button onClick={() => navigate('/admin/super')} className="text-slate-400 hover:text-white text-sm mb-4 inline-block">
          ← Back
        </button>
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">PitchBase</p>
        <h1 className="text-2xl font-black text-white">New Organization Account</h1>
      </div>

      {/* Toggle */}
      <div className="flex bg-slate-800 rounded-lg p-1 mb-6">
        <button
          type="button"
          onClick={() => handleModeChange('new')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === 'new' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          New Organization
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('existing')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === 'existing' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Existing Organization
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-6 space-y-4">
        {apiError && (
          <div className="bg-red-900/50 text-red-300 p-3 rounded text-sm">{apiError}</div>
        )}

        {mode === 'new' ? (
          <>
            <div>
              <label className="block text-slate-300 text-sm mb-1">
                Organization Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="organiser_name"
                value={form.organiser_name}
                onChange={handleChange}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
              />
              {errors.organiser_name && (
                <p className="text-red-400 text-xs mt-1">{errors.organiser_name}</p>
              )}
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-1">Short Name</label>
              <input
                type="text"
                name="short_name"
                value={form.short_name}
                onChange={handleChange}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-1">Organization Type</label>
              <select
                name="organization_type"
                value={form.organization_type}
                onChange={handleChange}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
              >
                <option value="">— Select type —</option>
                <option value="club">Club</option>
                <option value="league">League</option>
                <option value="association">Association</option>
                <option value="federation">Federation</option>
              </select>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-slate-300 text-sm mb-1">
              Organization <span className="text-red-400">*</span>
            </label>
            {orgsLoading ? (
              <p className="text-slate-400 text-sm">Loading organizations...</p>
            ) : (
              <select
                name="organization_id"
                value={form.organization_id}
                onChange={handleChange}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
              >
                <option value="">— Select organization —</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}
            {errors.organization_id && (
              <p className="text-red-400 text-xs mt-1">{errors.organization_id}</p>
            )}
          </div>
        )}

        {/* Shared fields */}
        <div>
          <label className="block text-slate-300 text-sm mb-1">
            Admin Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
          />
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-slate-300 text-sm mb-1">
            Password <span className="text-red-400">*</span>
          </label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
          />
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
        </div>

        <div>
          <label className="block text-slate-300 text-sm mb-1">
            Confirm Password <span className="text-red-400">*</span>
          </label>
          <input
            type="password"
            name="confirm_password"
            value={form.confirm_password}
            onChange={handleChange}
            className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
          />
          {errors.confirm_password && (
            <p className="text-red-400 text-xs mt-1">{errors.confirm_password}</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Account'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/super')}
            className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2 rounded text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
