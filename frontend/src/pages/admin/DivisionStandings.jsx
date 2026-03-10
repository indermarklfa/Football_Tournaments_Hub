import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDivision, getStandings } from '../../lib/api';

export default function DivisionStandings() {
  const { division_id } = useParams();
  const [division, setDivision] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, [division_id]);

  const loadData = async () => {
    try {
      const [divRes, standingsRes] = await Promise.all([
        getDivision(division_id),
        getStandings(division_id),
      ]);
      setDivision(divRes.data);
      setRows(standingsRes.data);
    } catch (err) {
      setError('Failed to load standings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link
          to={`/admin/seasons/${division?.season_id}/divisions`}
          className="text-emerald-400 text-sm hover:underline"
        >
          ← Back to Divisions
        </Link>
        <h1 className="text-2xl font-bold text-white mt-2">{division?.name} — Standings</h1>
        <p className="text-slate-400 text-sm mt-1">{division?.format} · {division?.age_group}</p>
      </div>

      {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4">{error}</div>}

      {rows.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No completed matches yet. Standings will appear here once matches are recorded.
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left px-4 py-3 w-8">Pos</th>
                <th className="text-left px-4 py-3">Team</th>
                <th className="text-center px-3 py-3">P</th>
                <th className="text-center px-3 py-3">W</th>
                <th className="text-center px-3 py-3">D</th>
                <th className="text-center px-3 py-3">L</th>
                <th className="text-center px-3 py-3">GF</th>
                <th className="text-center px-3 py-3">GA</th>
                <th className="text-center px-3 py-3">GD</th>
                <th className="text-center px-3 py-3 font-bold text-white">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.team_id}
                  className={`border-b border-slate-700/50 ${index % 2 === 0 ? '' : 'bg-slate-700/20'}`}
                >
                  <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3 text-white font-medium">{row.team_name}</td>
                  <td className="px-3 py-3 text-center text-slate-300">{row.played}</td>
                  <td className="px-3 py-3 text-center text-slate-300">{row.won}</td>
                  <td className="px-3 py-3 text-center text-slate-300">{row.drawn}</td>
                  <td className="px-3 py-3 text-center text-slate-300">{row.lost}</td>
                  <td className="px-3 py-3 text-center text-slate-300">{row.goals_for}</td>
                  <td className="px-3 py-3 text-center text-slate-300">{row.goals_against}</td>
                  <td className="px-3 py-3 text-center text-slate-300">
                    {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                  </td>
                  <td className="px-3 py-3 text-center text-white font-bold">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
