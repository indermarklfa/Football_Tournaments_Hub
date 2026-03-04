import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOrganisers, getTournaments } from '../../lib/api';

export default function Dashboard() {
  const [organisers, setOrganisers] = useState([]);
  const [tournaments, setTournaments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const orgRes = await getOrganisers();
      setOrganisers(orgRes.data);
      const tournamentsMap = {};
      for (const org of orgRes.data) {
        const tourRes = await getTournaments(org.id);
        tournamentsMap[org.id] = tourRes.data;
      }
      setTournaments(tournamentsMap);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4" data-testid="admin-dashboard">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <Link to="/admin/organisers/new" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-medium"
          data-testid="new-organiser-btn">+ New Organiser</Link>
      </div>

      {organisers.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>No organisers yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {organisers.map((org) => (
            <div key={org.id} className="bg-slate-800 rounded-lg p-6" data-testid={`organiser-${org.id}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">{org.name}</h2>
                  <p className="text-slate-400 text-sm">{org.location || 'No location'}</p>
                </div>
                <Link to={`/admin/tournaments/new?organiser_id=${org.id}`}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm"
                  data-testid={`new-tournament-btn-${org.id}`}>+ Tournament</Link>
              </div>
              {tournaments[org.id]?.length > 0 ? (
                <div className="grid gap-3">
                  {tournaments[org.id].map((t) => (
                    <Link key={t.id} to={`/admin/tournaments/${t.id}`}
                      className="flex items-center justify-between bg-slate-700/50 hover:bg-slate-700 p-3 rounded"
                      data-testid={`tournament-${t.id}`}>
                      <span className="text-white">{t.name}</span>
                      <span className="text-emerald-400 text-sm">Manage →</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No tournaments</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
