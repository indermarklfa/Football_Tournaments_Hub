import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicCompetition } from '../../lib/api';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
const formatShort = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null;

const STATUS_CONFIG = {
  active:    { label: 'Live',      dot: 'bg-emerald-400 animate-pulse', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  upcoming:  { label: 'Upcoming',  dot: 'bg-amber-400',                 badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  completed: { label: 'Completed', dot: 'bg-slate-500',                 badge: 'bg-slate-700/50 text-slate-400 border-slate-600/30' },
};

export default function TournamentPage() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicCompetition(id)
      .then((res) => setTournament(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (!tournament) return <div className="text-center py-12 text-red-400">Tournament not found</div>;

  const editions = tournament.editions || [];
  const activeEditions = editions.filter(e => e.status === 'active');
  const upcomingEditions = editions.filter(e => e.status === 'upcoming');
  const completedEditions = editions.filter(e => e.status === 'completed').sort((a, b) => b.year - a.year);

  const logoUrl = tournament.logo_url
    ? (tournament.logo_url.startsWith('http') ? tournament.logo_url : `http://localhost:8000${tournament.logo_url}`)
    : null;

  return (
    <div className="min-h-screen" data-testid="tournament-page">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950" />
        {/* Subtle pitch texture */}
        <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="pitch2" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
              <rect width="120" height="120" fill="none" stroke="#10b981" strokeWidth="0.5"/>
              <circle cx="60" cy="60" r="30" fill="none" stroke="#10b981" strokeWidth="0.5"/>
              <line x1="60" y1="0" x2="60" y2="120" stroke="#10b981" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pitch2)"/>
        </svg>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-emerald-500/8 rounded-full blur-3xl" />

        <div className="relative max-w-3xl mx-auto px-4 pt-6 pb-10">
          <Link to="/" className="text-slate-500 hover:text-emerald-400 text-sm transition-colors">
            ← Back
          </Link>

          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 mt-6">
            {/* Logo */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shrink-0 overflow-hidden border-2 border-slate-700 bg-slate-800 flex items-center justify-center shadow-xl shadow-black/40">
              {logoUrl ? (
                <img src={logoUrl} alt={tournament.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-emerald-400 font-black text-4xl">{tournament.name[0]}</span>
              )}
            </div>

            {/* Title block */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight">
                {tournament.name}
              </h1>
              {tournament.description && (
                <p className="text-slate-400 text-sm mt-1 max-w-xl">{tournament.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 justify-center sm:justify-start flex-wrap">
                <span className="text-slate-500 text-xs">
                  {tournament.organiser_name}
                </span>
                {tournament.organiser_location && (
                  <span className="text-slate-600 text-xs">· {tournament.organiser_location}</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 mt-6 pt-6 border-t border-slate-800">
            <div>
              <p className="text-emerald-400 font-bold text-xl leading-none">{editions.length}</p>
              <p className="text-slate-500 text-xs mt-0.5">Edition{editions.length !== 1 ? 's' : ''}</p>
            </div>
            {completedEditions.length > 0 && (
              <>
                <div className="w-px h-8 bg-slate-800" />
                <div>
                  <p className="text-emerald-400 font-bold text-xl leading-none">{completedEditions.length}</p>
                  <p className="text-slate-500 text-xs mt-0.5">Completed</p>
                </div>
              </>
            )}
            {activeEditions.length > 0 && (
              <>
                <div className="w-px h-8 bg-slate-800" />
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <p className="text-emerald-400 text-xs font-semibold">Live now</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── EDITIONS ── */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Active */}
        {activeEditions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
              ● Live Now
            </p>
            <div className="space-y-2">
              {activeEditions.map(e => (
                <Link key={e.id} to={`/seasons/${e.id}`}
                  className="group flex items-center gap-4 bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-700/40 hover:border-emerald-500/50 rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/10">
                  <div className="w-0.5 self-stretch bg-emerald-500 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold">{e.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5 capitalize">
                      {e.format?.replace(/_/g, ' ')}
                      {e.venue && ` · ${e.venue}`}
                      {e.start_date && e.end_date && ` · ${formatShort(e.start_date)} – ${formatShort(e.end_date)}`}
                    </p>
                  </div>
                  <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform text-lg">›</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcomingEditions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
              Upcoming
            </p>
            <div className="space-y-2">
              {upcomingEditions.map(e => (
                <Link key={e.id} to={`/seasons/${e.id}`}
                  className="group flex items-center gap-4 bg-amber-950/20 hover:bg-amber-950/30 border border-amber-700/30 hover:border-amber-500/40 rounded-xl p-4 transition-all hover:-translate-y-0.5">
                  <div className="w-0.5 self-stretch bg-amber-500/60 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold">{e.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5 capitalize">
                      {e.format?.replace(/_/g, ' ')}
                      {e.venue && ` · ${e.venue}`}
                      {e.start_date && ` · Starts ${formatDate(e.start_date)}`}
                    </p>
                  </div>
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2 py-0.5 rounded-full">
                    Upcoming
                  </span>
                  <span className="text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all text-lg">›</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {completedEditions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Edition History
            </p>
            <div className="space-y-2">
              {completedEditions.map((e, i) => (
                <Link key={e.id} to={`/seasons/${e.id}`}
                  className="group flex items-center gap-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/30 hover:border-slate-600/50 rounded-xl p-4 transition-all hover:-translate-y-0.5"
                  data-testid={`edition-link-${e.id}`}>
                  {/* Year marker */}
                  <div className="w-10 shrink-0 text-center">
                    <p className="text-slate-500 text-xs font-mono">{e.year}</p>
                  </div>
                  <div className="w-0.5 self-stretch bg-slate-700 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{e.name}</p>
                    <p className="text-slate-500 text-xs mt-0.5 capitalize">
                      {e.format?.replace(/_/g, ' ')}
                      {e.venue && ` · ${e.venue}`}
                      {e.start_date && e.end_date && ` · ${formatShort(e.start_date)} – ${formatShort(e.end_date)}`}
                    </p>
                  </div>
                  {i === 0 && completedEditions.length > 1 && (
                    <span className="text-xs text-slate-500 shrink-0">Latest</span>
                  )}
                  <span className="text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all text-lg">›</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {editions.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm">No editions yet</div>
        )}
      </div>
    </div>
  );
}