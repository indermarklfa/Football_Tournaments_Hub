import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicMatch, getPublicMatchEvents } from '../../lib/api';

export default function MatchPage() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPublicMatch(id), getPublicMatchEvents(id)])
      .then(([matchRes, eventsRes]) => {
        setMatch(matchRes.data);
        setEvents(eventsRes.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

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
      <div className="bg-slate-800 rounded-lg p-8 mt-4 mb-6 text-center">
        <div className="flex items-center justify-center gap-8 mb-4">
          <div className="flex-1 text-right">
            <h2 className={`text-2xl font-bold ${homeWon ? 'text-white' : 'text-slate-400'}`}>
              {match.home_team_name}
            </h2>
          </div>
          <div className="text-4xl font-bold text-emerald-400 text-center">
            {match.status === 'scheduled' ? (
              'vs'
            ) : (
              <>
                {match.home_score}
                {match.home_penalties != null && (
                  <span className="text-2xl"> ({match.home_penalties})</span>
                )}
                {' - '}
                {match.away_score}
                {match.away_penalties != null && (
                  <span className="text-2xl"> ({match.away_penalties})</span>
                )}
              </>
            )}
          </div>
          <div className="flex-1 text-left">
            <h2 className={`text-2xl font-bold ${awayWon ? 'text-white' : 'text-slate-400'}`}>
              {match.away_team_name}
            </h2>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 text-slate-400 text-sm">
          <span className={`px-2 py-0.5 rounded ${
            match.status === 'completed' ? 'bg-green-600' :
            match.status === 'live' ? 'bg-red-600 animate-pulse' :
            match.status === 'penalties' ? 'bg-purple-600 animate-pulse' :
            'bg-slate-600'
          } text-white`}>{match.status}</span>
          <span>{match.stage.replace(/_/g, ' ')}</span>
          {match.venue && <span>• {match.venue}</span>}
          {match.kickoff_datetime && (
            <span>• {new Date(match.kickoff_datetime).toLocaleString()}</span>
          )}
        </div>
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
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 text-center">Match Timeline</h3>
        {regularEvents.length === 0 ? (
          <p className="text-slate-500 text-center py-4">No events recorded</p>
        ) : (
          <div className="relative">
            {regularEvents.map((e) => {
              const isHome = e.team_id === match.home_team_id;
              return (
                <div key={e.id} className={`flex items-center gap-3 py-2 border-b border-slate-700/50 last:border-0 ${isHome ? 'flex-row' : 'flex-row-reverse'}`}>
                  <span className="text-slate-500 text-sm w-8 text-center">{e.minute}'</span>
                  <span className="text-lg">{eventIcon(e.event_type)}</span>
                  <div className={`flex flex-col ${isHome ? 'text-left' : 'text-right'}`}>
                    <span className="text-white text-sm">{e.player_name || '—'}</span>
                    <span className="text-slate-500 text-xs">{e.team_name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}