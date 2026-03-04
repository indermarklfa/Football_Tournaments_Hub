import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { searchTournaments } from '../../lib/api';

export default function Home() {
  const [query, setQuery] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    searchTournaments().then((res) => {
      setTournaments(res.data);
      setLoading(false);
    });
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await searchTournaments(query);
    setTournaments(res.data);
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4" data-testid="home-page">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Football Tournaments</h1>
        <p className="text-slate-400 mb-8">Find tournaments, fixtures, results and stats</p>
        <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tournaments..."
            className="flex-1 bg-slate-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            data-testid="search-input" />
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium"
            data-testid="search-btn">Search</button>
        </form>
      </div>

      {loading ? (
        <div className="text-center text-slate-400">Loading...</div>
      ) : tournaments.length === 0 ? (
        <div className="text-center text-slate-500">No tournaments found</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <Link key={t.id} to={`/tournaments/${t.id}`}
              className="bg-slate-800 hover:bg-slate-700 p-6 rounded-lg transition-colors"
              data-testid={`tournament-card-${t.id}`}>
              <h2 className="text-xl font-semibold text-white mb-2">{t.name}</h2>
              <p className="text-slate-400 text-sm line-clamp-2 mb-3">{t.description || 'No description'}</p>
              <div className="flex items-center text-sm text-slate-500">
                <span>{t.organiser_name}</span>
                {t.organiser_location && <span className="ml-2">• {t.organiser_location}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
