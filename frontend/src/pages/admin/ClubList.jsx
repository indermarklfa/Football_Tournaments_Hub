import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClubs, updateClub } from '../../lib/api';

export default function ClubList() {
  const { organization_id } = useParams();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, [organization_id]);

  const loadData = async () => {
    try {
      const res = await getClubs(organization_id);
      setClubs(res.data);
    } catch (err) {
      setError('Failed to load clubs');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this club?')) return;
    try {
      await updateClub(id, { deleted: true });
      setClubs((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError('Failed to remove club');
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Clubs</h1>
        <p className="text-slate-400 text-sm mt-1">{clubs.length} club{clubs.length !== 1 ? 's' : ''}</p>
      </div>

      {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4">{error}</div>}

      <div className="mb-4">
        <button
          onClick={() => navigate(`/admin/organizations/${organization_id}/clubs/new?organization_id=${organization_id}`)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
        >
          + Add Club
        </button>
      </div>

      {clubs.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No clubs yet. Add one above.</div>
      ) : (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Short Name</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((c, index) => (
                <tr
                  key={c.id}
                  className={`border-b border-slate-700/50 ${index % 2 === 0 ? '' : 'bg-slate-700/20'}`}
                >
                  <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-slate-300">{c.short_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{c.status || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemove(c.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
