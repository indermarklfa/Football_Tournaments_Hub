import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { searchCompetitions } from '../../lib/api';

const AGE_GROUPS = ['U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'U21', 'Senior', 'Veterans'];

export default function Home() {
  const [query, setQuery] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [allTournaments, setAllTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    searchCompetitions('').then((res) => {
      setTournaments(res.data);
      setAllTournaments(res.data);
      setLoading(false);
    }).catch(() => {
      setTournaments([]);
      setLoading(false);
    });
  }, []);

  const doSearch = async (q) => {
    setLoading(true);
    try {
      const res = await searchCompetitions(q);
      setTournaments(res.data);
    } catch {
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    doSearch(query);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      doSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="min-h-screen" data-testid="home-page">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden">
        {/* Pitch line background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950" />
        <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="pitch" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
              <rect width="120" height="120" fill="none" stroke="#10b981" strokeWidth="0.5"/>
              <circle cx="60" cy="60" r="30" fill="none" stroke="#10b981" strokeWidth="0.5"/>
              <line x1="60" y1="0" x2="60" y2="120" stroke="#10b981" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pitch)"/>
        </svg>
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-3xl mx-auto px-4 pt-14 pb-10 text-center">
          {/* Wordmark */}
          <div className="inline-flex items-baseline gap-0 mb-3">
            <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">Kasi</span>
            <span className="text-5xl sm:text-6xl font-black text-emerald-400 tracking-tight">Hub</span>
          </div>
          <p className="text-slate-400 text-sm sm:text-base mb-8 tracking-wide">
            Your tournament. Every fixture. Every result.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2 mb-6">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tournaments..."
              className="flex-1 bg-slate-800/80 backdrop-blur text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-700/50 min-w-0 placeholder-slate-500"
              data-testid="search-input"
            />
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-3 rounded-xl font-semibold text-sm shrink-0 transition-colors shadow-lg shadow-emerald-500/20"
              data-testid="search-btn">
              Search
            </button>
          </form>

          {/* Age group filters */}
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
              All
            </button>
            {AGE_GROUPS.map(ag => (
              <button
                key={ag}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50">
                {ag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      {allTournaments.length > 0 && (
        <div className="border-y border-slate-800 bg-slate-900/50">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-emerald-400 font-bold text-lg leading-none">{allTournaments.length}</p>
              <p className="text-slate-500 text-xs mt-0.5">Competitions</p>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <p className="text-emerald-400 font-bold text-lg leading-none">
                {new Set(allTournaments.map(t => t.organiser_name).filter(Boolean)).size}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">Organizations</p>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <p className="text-emerald-400 font-bold text-lg leading-none">
                {new Set(allTournaments.flatMap(t => t.age_group ? [t.age_group] : [])).size}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">Age Groups</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TOURNAMENT LIST ── */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {!loading && tournaments.length > 0 && (
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
            {tournaments.length} Competition{tournaments.length !== 1 ? 's' : ''}
          </p>
        )}

        {loading ? (
          <div className="text-center text-slate-500 py-12">Loading...</div>
        ) : tournaments.length === 0 ? (
          <div className="text-center text-slate-500 py-12">No competitions found</div>
        ) : (
          <div className="space-y-3">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                to={`/competitions/${t.id}`}
                className="group flex gap-4 items-center bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40 hover:border-emerald-500/30 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5"
                data-testid={`tournament-card-${t.id}`}>

                {/* Left accent bar */}
                <div className="w-0.5 self-stretch bg-emerald-500/30 group-hover:bg-emerald-500 rounded-full transition-colors shrink-0" />

                {/* Logo */}
                <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden border border-slate-600/50 bg-slate-700 flex items-center justify-center">
                  {t.logo_url ? (
                    <img
                      src={t.logo_url.startsWith('http') ? t.logo_url : `http://localhost:8000${t.logo_url}`}
                      alt={t.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-emerald-400 font-bold text-lg">
                      {t.name[0]}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-white leading-tight mb-0.5 group-hover:text-emerald-50 transition-colors">
                    {t.name}
                  </h2>
                  {t.description && t.description !== 'No description' && (
                    <p className="text-slate-500 text-xs line-clamp-1 mb-1.5">{t.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {t.age_group && (
                      <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {t.age_group}
                      </span>
                    )}
                    <span className="text-slate-600 text-xs">{t.organiser_name}</span>
                    {t.organiser_location && (
                      <span className="text-slate-600 text-xs">· {t.organiser_location}</span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <span className="text-slate-600 group-hover:text-emerald-400 transition-colors text-lg shrink-0">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}