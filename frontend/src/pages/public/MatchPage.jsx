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

  const homeEvents = events.filter(e => e.team_id === match.home_team_id);
  const awayEvents = events.filter(e => e.team_id === match.away_team_id);

  const eventIcon = (type) => {
    switch(type) {
      case 'goal': return '⚽';
      case 'own_goal': return '⚽🔴';
      case 'yellow_card': return '🟨';
      case 'red_card': return '🟥';
      case 'penalty_scored': return '⚽P';
      case 'penalty_missed': return '❌P';
      default: return '🔄';
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" data-testid="match-page">
      <Link to={`/editions/${match.edition_id}`} className="text-emerald-400 text-sm hover:underline">
        ← Back to Fixtures
      </Link>

      <div className="bg-slate-800 rounded-lg p-8 mt-4 mb-6 text-center">
        <div className="flex items-center justify-center gap-8 mb-4">
          <div className="flex-1 text-right">
            <h2 className="text-2xl font-bold text-white">{match.home_team_name}</h2>
          </div>
          <div className="text-4xl font-bold text-emerald-400">
            {match.status === 'scheduled' ? 'vs' : `${match.home_score} - ${match.away_score}`}
          </div>
          <div className="flex-1 text-left">
            <h2 className="text-2xl font-bold text-white">{match.away_team_name}</h2>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 text-slate-400 text-sm">
          <span className={`px-2 py-0.5 rounded ${
            match.status === 'completed' ? 'bg-green-600' :
            match.status === 'live' ? 'bg-red-600' : 'bg-slate-600'
          } text-white`}>{match.status}</span>
          <span>{match.stage.replace('_', ' ')}</span>
          {match.venue && <span>• {match.venue}</span>}
          {match.kickoff_datetime && <span>• {new Date(match.kickoff_datetime).toLocaleString()}</span>}
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 text-center">Match Timeline</h3>
        {events.length === 0 ? (
          <p className="text-slate-500 text-center py-4">No events recorded</p>
        ) : (
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600"></div>
            <div className="space-y-4">
              {events.map((e) => {
                const isHome = e.team_id === match.home_team_id;
                return (
                  <div key={e.id} className={`flex items-center ${isHome ? 'flex-row' : 'flex-row-reverse'}`}
                    data-testid={`timeline-event-${e.id}`}>
                    <div className={`flex-1 ${isHome ? 'text-right pr-6' : 'text-left pl-6'}`}>
                      <span className="text-white">{e.player_name || 'Unknown'}</span>
                      <span className="text-slate-400 ml-2 text-sm">{eventIcon(e.event_type)}</span>
                    </div>
                    <div className="bg-emerald-600 text-white text-sm font-mono px-2 py-1 rounded z-10">
                      {e.minute}'
                    </div>
                    <div className="flex-1"></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
