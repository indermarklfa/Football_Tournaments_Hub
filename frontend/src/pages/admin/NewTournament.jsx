import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createTournament, getOrganisers } from '../../lib/api';

export default function NewTournament() {
  const [searchParams] = useSearchParams();
  const [organiserId, setOrganiserId] = useState(searchParams.get('organiser_id') || '');
  const [organisers, setOrganisers] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getOrganisers().then((res) => setOrganisers(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createTournament({ organiser_id: organiserId, name, description: description || null, age_group: ageGroup || null });
      navigate(`/admin/tournaments/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4" data-testid="new-tournament-page">
      <h1 className="text-2xl font-bold text-white mb-6">New Tournament</h1>
      {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-lg space-y-4">
        <div>
          <label className="block text-slate-300 mb-1">Organiser *</label>
          <select value={organiserId} onChange={(e) => setOrganiserId(e.target.value)} required
            className="w-full bg-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
            data-testid="organiser-select">
            <option value="">Select organiser</option>
            {organisers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-slate-300 mb-1">Tournament Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full bg-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
            data-testid="name-input" />
        </div>
        <div>
          <label className="block text-slate-300 mb-1">Age Group</label>
          <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}
            className="w-full bg-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500">
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
        </div>
        <div>
          <label className="block text-slate-300 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full bg-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded font-medium disabled:opacity-50"
            data-testid="submit-btn">{loading ? 'Creating...' : 'Create Tournament'}</button>
          <button type="button" onClick={() => navigate(-1)}
            className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-2 rounded">Cancel</button>
        </div>
      </form>
    </div>
  );
}
