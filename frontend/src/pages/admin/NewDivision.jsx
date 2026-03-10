import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createDivision } from '../../lib/api';

export default function NewDivision() {
  const { season_id: seasonId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[NewDivision] seasonId from URL params:', seasonId);
  }, [seasonId]);

  const [name, setName] = useState('');
  const [format, setFormat] = useState('league');
  const [ageGroup, setAgeGroup] = useState('open');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createDivision({
        season_id: seasonId,
        name,
        format,
        age_group: ageGroup,
      });
      navigate(`/admin/seasons/${seasonId}/divisions`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((e) => e.msg || JSON.stringify(e)).join(', '));
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('Failed to create division');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-white mb-2">New Division</h1>
      <p className="text-slate-400 mb-6">Add a division to this season</p>

      {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-lg space-y-4">
        <div>
          <label className="block text-slate-300 mb-1">Division Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-slate-300 mb-1">Format *</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full bg-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="league">League</option>
            <option value="groups_knockout">Groups + Knockout</option>
            <option value="knockout">Knockout</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-300 mb-1">Age Group *</label>
          <select
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
            className="w-full bg-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="open">Open</option>
            <option value="u13">U13</option>
            <option value="u15">U15</option>
            <option value="u17">U17</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded font-medium disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Division'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
