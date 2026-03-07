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

  const editions = tournament.editions || [];
  const activeEdition = editions.find(e => e.status === 'active');
  const completedEditions = editions.filter(e => e.status === 'completed');
  const upcomingEditions = editions.filter(e => e.status === 'upcoming');

  const statusStyle = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-600';
      case 'completed': return 'bg-slate-600';
      case 'upcoming': return 'bg-amber-600';
      default: return 'bg-slate-600';
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" data-testid="tournament-page">
      <Link to="/" className="text-emerald-400 text-sm hover:underline">← Back to Search</Link>

      {/* Header */}
      <div className="mt-4 mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Tournament logo */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shrink-0 overflow-hidden border-2 border-slate-600 bg-slate-700 flex items-center justify-center">
              {tournament.logo_url ? (
                <img
                  src={tournament.logo_url.startsWith('http') ? tournament.logo_url : `http://localhost:8000${tournament.logo_url}`}
                  alt={tournament.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-emerald-400 font-bold text-2xl">{tournament.name[0]}</span>
              )}
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 leading-tight">{tournament.name}</h1>
              {tournament.description && (
                <p className="text-slate-400 mb-2 max-w-2xl text-sm sm:text-base">{tournament.description}</p>
              )}
              <p className="text-slate-500 text-sm">
                Organised by <span className="text-slate-300">{tournament.organiser_name}</span>
                {tournament.organiser_location && (
                  <span> · {tournament.organiser_location}</span>
                )}
              </p>
            </div>
          </div>
          <div className="text-right text-slate-500 text-sm shrink-0">
            <p>{editions.length} edition{editions.length !== 1 ? 's' : ''}</p>
            {completedEditions.length > 0 && (
              <p>{completedEditions.length} completed</p>
            )}
          </div>
        </div>
      </div>

      {/* Active edition highlight */}
      {activeEdition && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Currently Active</p>
          <Link to={`/editions/${activeEdition.id}`}
            className="block bg-emerald-900/30 border border-emerald-700/50 hover:bg-emerald-900/50 rounded-lg p-5 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{activeEdition.name}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                  <span>{activeEdition.year}</span>
                  <span>·</span>
                  <span className="capitalize">{activeEdition.format?.replace(/_/g, ' ')}</span>
                  {activeEdition.venue && <><span>·</span><span>{activeEdition.venue}</span></>}
                  {activeEdition.start_date && (
                    <><span>·</span><span>{formatDate(activeEdition.start_date)}</span></>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded animate-pulse">LIVE</span>
                <span className="text-emerald-400">View →</span>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Upcoming editions */}
      {upcomingEditions.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Upcoming</p>
          <div className="space-y-2">
            {upcomingEditions.map(e => (
              <Link key={e.id} to={`/editions/${e.id}`}
                className="flex items-center justify-between bg-slate-800 hover:bg-slate-700 p-4 rounded-lg transition-colors">
                <div>
                  <span className="text-white font-medium">{e.name}</span>
                  <span className="text-slate-500 text-sm ml-2">({e.year})</span>
                  {e.start_date && (
                    <span className="text-slate-500 text-sm ml-2">· Starts {formatDate(e.start_date)}</span>
                  )}
                </div>
                <span className="bg-amber-600 text-white text-xs px-2 py-0.5 rounded">Upcoming</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Edition history */}
      {editions.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center">
          <p className="text-slate-500">No editions yet</p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {completedEditions.length > 0 ? 'Edition History' : 'All Editions'}
          </p>
          <div className="space-y-2">
            {(completedEditions.length > 0 ? completedEditions : editions)
              .sort((a, b) => b.year - a.year)
              .map(e => (
                <Link key={e.id} to={`/editions/${e.id}`}
                  className="flex items-center justify-between bg-slate-800 hover:bg-slate-700 p-4 rounded-lg transition-colors"
                  data-testid={`edition-link-${e.id}`}>
                  <div>
                    <span className="text-white font-medium">{e.name}</span>
                    <span className="text-slate-500 text-sm ml-2">({e.year})</span>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span className="capitalize">{e.format?.replace(/_/g, ' ')}</span>
                      {e.venue && <><span>·</span><span>{e.venue}</span></>}
                      {e.start_date && e.end_date && (
                        <><span>·</span><span>{formatDate(e.start_date)} – {formatDate(e.end_date)}</span></>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${statusStyle(e.status)} text-white`}>
                      {e.status}
                    </span>
                    <span className="text-slate-400 text-sm">View →</span>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}