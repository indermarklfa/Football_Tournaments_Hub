import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicMatch, getPublicMatchEvents } from '../../lib/api';

const LIVE_STATUSES = ['live', 'penalties'];
const POLL_INTERVAL = 30000; // 30 seconds

export default function MatchPage() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    try {
      const [matchRes, eventsRes] = await Promise.all([
        getPublicMatch(id),
        getPublicMatchEvents(id)
      ]);
      setMatch(matchRes.data);
      setEvents(eventsRes.data);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // Poll every 30s when match is live
  useEffect(() => {
    if (!match) return;
    if (!LIVE_STATUSES.includes(match.status)) return;

    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [match?.status, id]);

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (!match) return <div className="text-center py-12 text-red-400">Match not found</div>;

  const regularEvents = events.filter(e =>
    e.event_type !== 'shootout_scored' && e.event_type !== 'shootout_missed'
  );
  const shootoutEvents = events.filter(e =>
    e.event_type === 'shootout_scored' || e.event_type === 'shootout_missed'
  );
  const homeShootout = shootoutEvents.filter(e => e.team_id === match.home_team_id);
  const awayShootout = shootoutEvents.filter(e => e.team_id === match.away_team_id);
  const showShootout = match.home_penalties != null || match.status === 'penalties' || shootoutEvents.length > 0;
  const maxRounds = Math.max(homeShootout.length, awayShootout.length);

  const eventIcon = (type) => {
    switch(type) {
      case 'goal': return '⚽';
      case 'own_goal': return '⚽🔴';
      case 'yellow_card': return '🟨';
      case 'red_card': return '🟥';
      case 'penalty_scored': return '⚽ P';
      case 'penalty_missed': return '❌ P';
      default: return '🔄';
    }
  };

  const homeEvents = regularEvents.filter(e => e.team_id === match.home_team_id);
  const awayEvents = regularEvents.filter(e => e.team_id === match.away_team_id);

  const hasPens = match.home_penalties != null && match.away_penalties != null;
  const homeWon = match.status === 'completed' && (
    hasPens ? match.home_penalties > match.away_penalties : match.home_score > match.away_score
  );
  const awayWon = match.status === 'completed' && (
    hasPens ? match.away_penalties > match.home_penalties : match.away_score > match.home_score
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" data-testid="match-page">
      <Link to={`/editions/${match.edition_id}`} className="text-emerald-400 text-sm hover:underline">
        ← Back to Fixtures
      </Link>

      {/* Score card */}
      <div className="bg-slate-800 rounded-lg p-6 mt-4 mb-6">
        {/* Teams + Score */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* Home team */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-slate-600 bg-slate-700 flex items-center justify-center shrink-0">
              {match.home_team_logo_url ? (
                <img
                  src={match.home_team_logo_url.startsWith('http') ? match.home_team_logo_url : `http://localhost:8000${match.home_team_logo_url}`}
                  alt={match.home_team_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-emerald-400 font-bold text-lg">
                  {match.home_team_name?.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </span>
              )}
            </div>
            <h2 className={`text-base sm:text-lg font-bold text-center leading-tight ${homeWon ? 'text-white' : 'text-slate-300'}`}>
              {match.home_team_name}
            </h2>
          </div>

          {/* Score / time */}
          <div className="shrink-0 text-center w-28">
            {match.status === 'scheduled' ? (
              <>
                <p className="text-3xl font-bold text-white">
                  {match.kickoff_datetime
                    ? new Date(match.kickoff_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                    : 'TBC'}
                </p>
                {match.kickoff_datetime && (
                  <p className="text-slate-500 text-xs mt-1">
                    {new Date(match.kickoff_datetime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className={`text-3xl sm:text-4xl font-bold ${
                  match.status === 'live' || match.status === 'penalties' ? 'text-red-400 animate-pulse' : 'text-white'
                }`}>
                  {match.home_score}
                  {' - '}
                  {match.away_score}
                </p>
                {match.home_penalties != null && (
                  <p className="text-slate-400 text-sm mt-0.5">
                    ({match.home_penalties}) - ({match.away_penalties})
                  </p>
                )}
                <p className={`text-xs mt-1 font-medium ${
                  match.status === 'live' ? 'text-red-400 animate-pulse' :
                  match.status === 'penalties' ? 'text-purple-400 animate-pulse' :
                  'text-slate-500'
                }`}>
                  {match.status === 'live' ? 'LIVE' :
                   match.status === 'penalties' ? 'PENALTIES' : 'FT'}
                </p>
              </>
            )}
          </div>

          {/* Away team */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-slate-600 bg-slate-700 flex items-center justify-center shrink-0">
              {match.away_team_logo_url ? (
                <img
                  src={match.away_team_logo_url.startsWith('http') ? match.away_team_logo_url : `http://localhost:8000${match.away_team_logo_url}`}
                  alt={match.away_team_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-emerald-400 font-bold text-lg">
                  {match.away_team_name?.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </span>
              )}
            </div>
            <h2 className={`text-base sm:text-lg font-bold text-center leading-tight ${awayWon ? 'text-white' : 'text-slate-300'}`}>
              {match.away_team_name}
            </h2>
          </div>
        </div>

        {/* Match meta */}
        <div className="flex items-center justify-center flex-wrap gap-2 text-slate-400 text-xs pt-3 border-t border-slate-700">
          <span className={`px-2 py-0.5 rounded ${
            match.status === 'completed' ? 'bg-green-700' :
            match.status === 'live' ? 'bg-red-600 animate-pulse' :
            match.status === 'penalties' ? 'bg-purple-600 animate-pulse' :
            'bg-slate-600'
          } text-white`}>{match.status}</span>
          <span className="capitalize">{match.stage.replace(/_/g, ' ')}</span>
          {match.venue && <span>· {match.venue}</span>}
        </div>

        {LIVE_STATUSES.includes(match.status) && lastUpdated && (
          <p className="text-slate-600 text-xs text-center mt-2">
            ⟳ Auto-refreshing every 30s · Last updated {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Penalty shootout card */}
      {showShootout && (
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-1 text-center">Penalty Shootout</h3>
          {hasPens && (
            <p className="text-center text-emerald-400 font-bold text-xl mb-4">
              {match.home_penalties} - {match.away_penalties}
            </p>
          )}
          {maxRounds === 0 ? (
            <p className="text-slate-500 text-center text-sm">Shootout in progress...</p>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {/* Home column */}
              <div>
                <h4 className={`text-sm font-semibold uppercase tracking-wider mb-3 text-center ${homeWon ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {match.home_team_name}
                  {homeWon && <span className="ml-2">🏆</span>}
                </h4>
                <div className="space-y-2">
                  {homeShootout.map((e, i) => (
                    <div key={e.id} className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs w-5">{i + 1}.</span>
                      <span className="text-lg">
                        {e.event_type === 'shootout_scored' ? '⚽' : '❌'}
                      </span>
                      <span className="text-slate-300 text-sm">{e.player_name || 'Unknown'}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Away column */}
              <div>
                <h4 className={`text-sm font-semibold uppercase tracking-wider mb-3 text-center ${awayWon ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {match.away_team_name}
                  {awayWon && <span className="ml-2">🏆</span>}
                </h4>
                <div className="space-y-2">
                  {awayShootout.map((e, i) => (
                    <div key={e.id} className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs w-5">{i + 1}.</span>
                      <span className="text-lg">
                        {e.event_type === 'shootout_scored' ? '⚽' : '❌'}
                      </span>
                      <span className="text-slate-300 text-sm">{e.player_name || 'Unknown'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Match timeline */}
      <div className="bg-slate-800 rounded-lg p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 text-center">
          Match Events
        </h3>
        {regularEvents.length === 0 ? (
          <p className="text-slate-500 text-center py-6 text-sm">No events recorded</p>
        ) : (
          <div className="space-y-1">
            {regularEvents.map((e) => {
              const isHome = e.team_id === match.home_team_id;
              return (
                <div key={e.id} className="flex items-center gap-2">
                  {/* Home side */}
                  <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                    {isHome ? (
                      <>
                        <div className="text-right min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {e.player_name || '—'}
                          </p>
                          {e.event_type === 'own_goal' && (
                            <p className="text-red-400 text-xs">own goal</p>
                          )}
                          {e.event_type === 'penalty_scored' && (
                            <p className="text-emerald-400 text-xs">penalty</p>
                          )}
                          {e.event_type === 'penalty_missed' && (
                            <p className="text-red-400 text-xs">missed pen</p>
                          )}
                        </div>
                        <span className="text-lg shrink-0">{eventIcon(e.event_type)}</span>
                      </>
                    ) : (
                      <span className="text-transparent select-none">·</span>
                    )}
                  </div>

                  {/* Center: minute */}
                  <div className="shrink-0 w-12 text-center">
                    <span className="text-slate-400 text-xs font-mono bg-slate-700 px-1.5 py-0.5 rounded">
                      {e.minute}'
                    </span>
                  </div>

                  {/* Away side */}
                  <div className="flex-1 flex items-center justify-start gap-2 min-w-0">
                    {!isHome ? (
                      <>
                        <span className="text-lg shrink-0">{eventIcon(e.event_type)}</span>
                        <div className="text-left min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {e.player_name || '—'}
                          </p>
                          {e.event_type === 'own_goal' && (
                            <p className="text-red-400 text-xs">own goal</p>
                          )}
                          {e.event_type === 'penalty_scored' && (
                            <p className="text-emerald-400 text-xs">penalty</p>
                          )}
                          {e.event_type === 'penalty_missed' && (
                            <p className="text-red-400 text-xs">missed pen</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-transparent select-none">·</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Column headers */}
        {regularEvents.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700">
            <div className="flex-1 text-right">
              <span className="text-slate-500 text-xs">{match.home_team_name}</span>
            </div>
            <div className="w-12" />
            <div className="flex-1 text-left">
              <span className="text-slate-500 text-xs">{match.away_team_name}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}