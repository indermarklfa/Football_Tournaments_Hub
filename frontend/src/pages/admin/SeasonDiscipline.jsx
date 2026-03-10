import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getSeason, getDivisions, getSeasonDiscipline } from '../../lib/api';

export default function SeasonDiscipline() {
  const { season_id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const divisionId = searchParams.get('division_id') || '';

  const [season, setSeason] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, [season_id, divisionId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [seasonRes, divisionsRes, actionsRes] = await Promise.all([
        getSeason(season_id),
        getDivisions(season_id),
        getSeasonDiscipline(season_id, divisionId || undefined),
      ]);
      setSeason(seasonRes.data);
      setDivisions(divisionsRes.data);
      setActions(actionsRes.data);
    } catch (err) {
      setError('Failed to load discipline records');
    } finally {
      setLoading(false);
    }
  };

  const handleDivisionFilter = (e) => {
    const val = e.target.value;
    if (val) {
      setSearchParams({ division_id: val });
    } else {
      setSearchParams({});
    }
  };

  const actionBadgeClass = (type) => {
    if (type === 'red_card' || type === 'second_yellow') return 'bg-red-700 text-white';
    if (type === 'yellow_card') return 'bg-yellow-600 text-white';
    if (type === 'suspension') return 'bg-orange-700 text-white';
    return 'bg-slate-600 text-slate-300';
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link to={`/admin/seasons/${season_id}/divisions`} className="text-emerald-400 text-sm hover:underline">
          ← Back to Season
        </Link>
        <h1 className="text-2xl font-bold text-white mt-2">{season?.name} — Discipline</h1>
        <p className="text-slate-400 text-sm mt-1">{actions.length} record{actions.length !== 1 ? 's' : ''}</p>
      </div>

      {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4">{error}</div>}

      <div className="mb-4">
        <select
          value={divisionId}
          onChange={handleDivisionFilter}
          className="bg-slate-700 text-white px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Divisions</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No discipline records found.</div>
      ) : (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left px-4 py-3">Player</th>
                <th className="text-left px-4 py-3">Team</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Match</th>
                <th className="text-center px-3 py-3">Min</th>
                <th className="text-left px-4 py-3">Reason</th>
                <th className="text-center px-3 py-3">Susp.</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a, index) => (
                <tr
                  key={a.id}
                  className={`border-b border-slate-700/50 ${index % 2 === 0 ? '' : 'bg-slate-700/20'}`}
                >
                  <td className="px-4 py-3 text-white font-mono text-xs">{a.player_id}</td>
                  <td className="px-4 py-3 text-slate-300 font-mono text-xs">{a.team_id}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${actionBadgeClass(a.action_type)}`}>
                      {a.action_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                    <Link to={`/admin/matches/${a.match_id}`} className="text-emerald-400 hover:underline">
                      View
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-center text-slate-300">{a.minute ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{a.reason || '—'}</td>
                  <td className="px-3 py-3 text-center text-slate-300">{a.suspension_matches ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
