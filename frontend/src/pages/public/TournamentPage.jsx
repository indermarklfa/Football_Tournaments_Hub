import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicTournament } from '../../lib/api';

export default function TournamentPage() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicTournament(id)
      .then((res) => setTournament(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (!tournament) return <div className="text-center py-12 text-red-400">Tournament not found</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" data-testid="tournament-page">
      <Link to="/" className="text-emerald-400 text-sm hover:underline">← Back to Search</Link>
      <h1 className="text-3xl font-bold text-white mt-4 mb-2">{tournament.name}</h1>
      <p className="text-slate-400 mb-2">{tournament.description || 'No description'}</p>
      <p className="text-slate-500 text-sm mb-8">
        Organised by {tournament.organiser_name}
        {tournament.organiser_location && ` • ${tournament.organiser_location}`}
      </p>

      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Editions</h2>
        {tournament.editions?.length === 0 ? (
          <p className="text-slate-500">No editions yet</p>
        ) : (
          <div className="space-y-3">
            {tournament.editions.map((e) => (
              <Link key={e.id} to={`/editions/${e.id}`}
                className="flex items-center justify-between bg-slate-700/50 hover:bg-slate-700 p-4 rounded"
                data-testid={`edition-link-${e.id}`}>
                <div>
                  <span className="text-white font-medium">{e.name}</span>
                  <span className="text-slate-400 ml-2">({e.year})</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  e.status === 'completed' ? 'bg-slate-600' :
                  e.status === 'active' ? 'bg-emerald-600' : 'bg-amber-600'
                } text-white`}>{e.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
