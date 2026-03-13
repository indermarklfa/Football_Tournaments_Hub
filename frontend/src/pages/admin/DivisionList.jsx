import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getSeason, getDivisions } from '../../lib/api';

export default function DivisionList() {
  const { season_id } = useParams();
  const navigate = useNavigate();
  const [season, setSeason] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, [season_id]);

  const loadData = async () => {
    try {
      const [seasonRes, divisionsRes] = await Promise.all([
        getSeason(season_id),
        getDivisions(season_id),
      ]);
      setSeason(seasonRes.data);
      setDivisions(divisionsRes.data);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link to={`/admin/seasons/${season_id}/teams`} className="text-emerald-400 text-sm hover:underline">← Back to Season</Link>
        <h1 className="text-2xl font-bold text-white mt-2">{season?.name} — Divisions</h1>
        <p className="text-slate-400 text-sm mt-1">{divisions.length} division{divisions.length !== 1 ? 's' : ''}</p>
      </div>

      {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4">{error}</div>}

      <div className="mb-6">
        <button
          onClick={() => navigate(`/admin/seasons/${season_id}/divisions/new`)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
        >
          + Create New Division
        </button>
      </div>

      {divisions.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No divisions yet. Create one above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {divisions.map((d) => (
            <div key={d.id} className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
  <h2 className="text-white font-semibold text-lg">{d.name}</h2>
  <button
    onClick={() => navigate(`/admin/divisions/${d.id}/edit?season_id=${season_id}`)}
    className="text-slate-400 hover:text-emerald-400 text-sm"
    title="Division settings"
  >
    ⚙
  </button>
</div>
              <div className="space-y-1 mb-4">
                <p className="text-slate-400 text-sm">
                  <span className="text-slate-500">Format:</span> {d.format_type || d.format}
                </p>
                <p className="text-slate-400 text-sm">
                  <span className="text-slate-500">Age Group:</span> {d.age_group || '—'}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Link
                  to={`/admin/seasons/${season_id}/divisions/${d.id}/teams`}
                  className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1.5 rounded text-sm"
                >
                  Teams
                </Link>
                <Link
                  to={`/admin/divisions/${d.id}/matches`}
                  className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1.5 rounded text-sm"
                >
                  Matches
                </Link>
                <Link
                  to={`/admin/divisions/${d.id}/standings`}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-sm"
                >
                  Standings
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
