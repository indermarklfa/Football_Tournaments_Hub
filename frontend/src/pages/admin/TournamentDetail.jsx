import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTournament, getEditions } from '../../lib/api';

export default function TournamentDetail() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTournament(id), getEditions(id)])
      .then(([tRes, eRes]) => {
        setTournament(tRes.data);
        setEditions(eRes.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (!tournament) return <div className="text-center py-12 text-red-400">Tournament not found</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" data-testid="tournament-detail">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">{tournament.name}</h1>
          <p className="text-slate-400">{tournament.description || 'No description'}</p>
        </div>
        <Link to={`/admin/editions/new?tournament_id=${id}`}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-medium"
          data-testid="new-edition-btn">+ New Edition</Link>
      </div>

      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Editions</h2>
        {editions.length === 0 ? (
          <p className="text-slate-500">No editions yet</p>
        ) : (
          <div className="space-y-3">
            {editions.map((e) => (
              <div key={e.id} className="flex items-center justify-between bg-slate-700/50 p-4 rounded"
                data-testid={`edition-${e.id}`}>
                <div>
                  <span className="text-white font-medium">{e.name}</span>
                  <span className="text-slate-400 ml-2">({e.year})</span>
                  <span className={`ml-3 text-xs px-2 py-0.5 rounded ${
                    e.status === 'completed' ? 'bg-slate-600 text-slate-300' :
                    e.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                  }`}>{e.status}</span>
                </div>
                <div className="flex gap-2">
                  <Link to={`/admin/editions/${e.id}/teams`} className="text-emerald-400 hover:underline text-sm">Teams</Link>
                  <Link to={`/admin/editions/${e.id}/matches`} className="text-emerald-400 hover:underline text-sm">Matches</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
