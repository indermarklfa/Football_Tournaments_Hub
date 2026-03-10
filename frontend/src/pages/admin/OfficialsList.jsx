import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrganizationOfficials, updateOfficial } from '../../lib/api';

export default function OfficialsList() {
  const { organization_id } = useParams();
  const navigate = useNavigate();
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, [organization_id]);

  const loadData = async () => {
    try {
      const res = await getOrganizationOfficials(organization_id);
      setOfficials(res.data);
    } catch (err) {
      setError('Failed to load officials');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this official?')) return;
    try {
      await updateOfficial(id, { deleted: true });
      setOfficials((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      setError('Failed to remove official');
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Officials</h1>
        <p className="text-slate-400 text-sm mt-1">{officials.length} official{officials.length !== 1 ? 's' : ''}</p>
      </div>

      {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4">{error}</div>}

      <div className="mb-4">
        <button
          onClick={() => navigate(`/admin/organizations/${organization_id}/officials/new`)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
        >
          + Add Official
        </button>
      </div>

      {officials.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No officials yet. Add one above.</div>
      ) : (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {officials.map((o, index) => (
                <tr
                  key={o.id}
                  className={`border-b border-slate-700/50 ${index % 2 === 0 ? '' : 'bg-slate-700/20'}`}
                >
                  <td className="px-4 py-3 text-white font-medium">{o.name}</td>
                  <td className="px-4 py-3 text-slate-300">{o.role || '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{o.phone || '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{o.email || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemove(o.id)}
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
