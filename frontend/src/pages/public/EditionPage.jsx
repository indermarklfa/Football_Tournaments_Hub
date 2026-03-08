import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicEdition, getPublicFixtures, getPublicTeams, getPublicTopScorers, getPublicDiscipline, getPublicPlayers, getPublicStandings } from '../../lib/api';

export default function EditionPage() {
  const { id } = useParams();
  const [edition, setEdition] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState([]);
  const [topScorers, setTopScorers] = useState([]);
  const [discipline, setDiscipline] = useState([]);
  const [standings, setStandings] = useState([]);
  const [tab, setTab] = useState('fixtures');
  const [loading, setLoading] = useState(true);
  const [fixtureFilter, setFixtureFilter] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [squad, setSquad] = useState([]);
  const [squadLoading, setSquadLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      getPublicEdition(id),
      getPublicFixtures(id),
      getPublicTeams(id),
      getPublicTopScorers(id),
      getPublicDiscipline(id),
      getPublicStandings(id),
    ]).then(([edRes, fixRes, teamsRes, scorersRes, discRes, standingsRes]) => {
      setEdition(edRes.data);
      setFixtures(fixRes.data);
      setTeams(teamsRes.data);
      setTopScorers(scorersRes.data);
      setDiscipline(discRes.data);
      setStandings(standingsRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleSelectTeam = async (team) => {
    setSelectedTeam(team);
    setSquadLoading(true);
    try {
      const res = await getPublicPlayers(team.id);
      setSquad(res.data);
    } finally {
      setSquadLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (!edition) return <div className="text-center py-12 text-red-400">Edition not found</div>;

  const showBracket = ['knockout', 'groups_knockout'].includes(edition?.format);
  const showStandings = ['groups_knockout', 'league'].includes(edition?.format);

  const tabs = [
    { id: 'fixtures', label: 'Fixtures' },
    { id: 'teams', label: 'Teams' },
    ...(showStandings ? [{ id: 'standings', label: 'Standings' }] : []),
    ...(showBracket ? [{ id: 'bracket', label: 'Bracket' }] : []),
    { id: 'scorers', label: 'Top Scorers' },
    { id: 'discipline', label: 'Discipline' },
  ];

  return (
    <div className="min-h-screen" data-testid="edition-page">

      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950" />
        <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="pitch3" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
              <rect width="120" height="120" fill="none" stroke="#10b981" strokeWidth="0.5"/>
              <circle cx="60" cy="60" r="30" fill="none" stroke="#10b981" strokeWidth="0.5"/>
              <line x1="60" y1="0" x2="60" y2="120" stroke="#10b981" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pitch3)"/>
        </svg>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-emerald-500/8 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-4 pt-5 pb-8">
          <Link to={`/tournaments/${edition.tournament_id}`}
            className="text-slate-500 hover:text-emerald-400 text-sm transition-colors">
            ← Back to {edition.tournament_name}
          </Link>

          <div className="flex items-center gap-4 mt-5">
            {/* Logo */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shrink-0 overflow-hidden border-2 border-slate-700 bg-slate-800 flex items-center justify-center shadow-xl shadow-black/40">
              {edition.tournament_logo_url ? (
                <img
                  src={edition.tournament_logo_url.startsWith('http') ? edition.tournament_logo_url : `http://localhost:8000${edition.tournament_logo_url}`}
                  alt={edition.tournament_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-emerald-400 font-black text-2xl">
                  {edition.tournament_name?.[0]}
                </span>
              )}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                {edition.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                  edition.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : edition.status === 'upcoming'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
                }`}>
                  {edition.status === 'active' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5 mb-px" />}
                  {edition.status}
                </span>
                {edition.venue && (
                  <span className="text-slate-500 text-xs">📍 {edition.venue}</span>
                )}
                {edition.start_date && (
                  <span className="text-slate-500 text-xs">
                    📅 {edition.start_date}{edition.end_date ? ` – ${edition.end_date}` : ''}
                  </span>
                )}
                <span className="text-slate-600 text-xs capitalize">
                  {edition.format?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 mt-5 pt-4 border-t border-slate-800/80">
            <div>
              <p className="text-emerald-400 font-bold text-lg leading-none">{teams.length}</p>
              <p className="text-slate-500 text-xs mt-0.5">Teams</p>
            </div>
            {fixtures.length > 0 && (
              <>
                <div className="w-px h-7 bg-slate-800" />
                <div>
                  <p className="text-emerald-400 font-bold text-lg leading-none">{fixtures.length}</p>
                  <p className="text-slate-500 text-xs mt-0.5">Fixtures</p>
                </div>
              </>
            )}
            {fixtures.filter(f => f.status === 'completed').length > 0 && (
              <>
                <div className="w-px h-7 bg-slate-800" />
                <div>
                  <p className="text-emerald-400 font-bold text-lg leading-none">
                    {fixtures.filter(f => f.status === 'completed').length}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">Played</p>
                </div>
              </>
            )}
            {topScorers.length > 0 && (
              <>
                <div className="w-px h-7 bg-slate-800" />
                <div>
                  <p className="text-emerald-400 font-bold text-lg leading-none">
                    {topScorers.reduce((sum, s) => sum + s.goals, 0)}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">Goals</p>
                </div>
              </>
            )}
            {fixtures.some(f => f.status === 'live') && (
              <>
                <div className="w-px h-7 bg-slate-800" />
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <p className="text-red-400 text-xs font-semibold">Live</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`py-3 px-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                  tab === t.id
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
                data-testid={`tab-${t.id}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-5xl mx-auto px-4 py-6">

      {/* FIXTURES TAB */}
      {tab === 'fixtures' && (() => {
        const filtered = fixtureFilter === 'all' ? fixtures : fixtures.filter(m => m.status === fixtureFilter);

        const STAGE_ORDER = ['group', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final'];
        const STAGE_LABELS = {
          group: 'Group Stage', round_of_16: 'Round of 16', quarterfinal: 'Quarter Finals',
          semifinal: 'Semi Finals', third_place: 'Third Place', final: 'Final',
        };

        const formatKickoff = (dt) => {
          if (!dt) return null;
          const d = new Date(dt);
          return {
            date: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
            time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          };
        };

        // Group stage: group by matchday, then by date within matchday
        // Other stages: group by stage
        const groupMatches = filtered.filter(m => m.stage === 'group');
        const knockoutMatches = filtered.filter(m => m.stage !== 'group');

        // Build matchday groups
        const matchdays = [...new Set(groupMatches.map(m => m.matchday))]
          .filter(Boolean)
          .sort((a, b) => a - b);
        const unscheduledGroup = groupMatches.filter(m => !m.matchday);

        // Build knockout groups
        const knockoutGrouped = STAGE_ORDER.filter(s => s !== 'group').reduce((acc, stage) => {
          const ms = knockoutMatches.filter(m => m.stage === stage);
          if (ms.length > 0) acc[stage] = ms;
          return acc;
        }, {});

        const TeamLogo = ({ logoUrl, name, size = 'sm' }) => {
          const API_BASE = 'http://localhost:8000';
          const src = logoUrl ? (logoUrl.startsWith('http') ? logoUrl : `${API_BASE}${logoUrl}`) : null;
          const dim = size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-7 h-7' : 'w-6 h-6';
          return (
            <div className={`${dim} rounded-full shrink-0 overflow-hidden bg-slate-700 border border-slate-600 flex items-center justify-center`}>
              {src ? (
                <img src={src} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-emerald-400 font-bold" style={{ fontSize: '8px' }}>
                  {name?.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </span>
              )}
            </div>
          );
        };

        const MatchCard = ({ m, showDate = false }) => {
          const kickoff = formatKickoff(m.kickoff_datetime);
          const isKnockout = m.stage !== 'group';

          const centerContent = () => {
            if (m.status === 'scheduled') {
              return (
                <div className="flex flex-col items-center">
                  <span className="text-white font-semibold text-sm">
                    {kickoff ? kickoff.time : 'TBC'}
                  </span>
                  {isKnockout && kickoff && (
                    <span className="text-slate-500 text-xs mt-0.5">{kickoff.date}</span>
                  )}
                </div>
              );
            }
            if (m.status === 'live' || m.status === 'penalties') {
              return (
                <div className="flex flex-col items-center">
                  <span className="text-red-400 font-bold text-sm animate-pulse">
                    {m.home_score}
                    {m.home_penalties != null && <span className="text-xs font-normal">({m.home_penalties})</span>}
                    {' - '}
                    {m.away_penalties != null && <span className="text-xs font-normal">({m.away_penalties})</span>}
                    {m.away_score}
                  </span>
                  <span className="text-red-500 text-xs animate-pulse mt-0.5">
                    {m.status === 'penalties' ? 'PENS' : 'LIVE'}
                  </span>
                </div>
              );
            }
            // completed
            return (
              <div className="flex flex-col items-center">
                <span className="text-white font-bold text-sm">
                  {m.home_score}
                  {m.home_penalties != null && <span className="text-slate-400 text-xs font-normal"> ({m.home_penalties})</span>}
                  {' - '}
                  {m.away_penalties != null && <span className="text-slate-400 text-xs font-normal">({m.away_penalties}) </span>}
                  {m.away_score}
                </span>
                <span className="text-slate-500 text-xs mt-0.5">
                  {isKnockout && kickoff ? kickoff.date : 'FT'}
                </span>
              </div>
            );
          };

          return (
            <Link to={`/matches/${m.id}`}
              className="block bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg px-4 py-4 transition-colors"
              data-testid={`fixture-${m.id}`}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                  <span className="text-white text-base truncate font-semibold">{m.home_team_name}</span>
                  <TeamLogo logoUrl={m.home_team_logo_url} name={m.home_team_name} size="md" />
                </div>
                <div className="shrink-0 w-20 flex justify-center">
                  {centerContent()}
                </div>
                <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
                  <TeamLogo logoUrl={m.away_team_logo_url} name={m.away_team_name} size="md" />
                  <span className="text-white text-base truncate font-semibold">{m.away_team_name}</span>
                </div>
              </div>
            </Link>
          );
        };

        return (
          <div className="space-y-6">
            {/* Filter */}
            <div className="flex gap-2">
              {['all', 'scheduled', 'live', 'completed'].map(f => (
                <button key={f} onClick={() => setFixtureFilter(f)}
                  className={`px-3 py-1.5 rounded text-sm capitalize ${
                    fixtureFilter === f ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}>{f}</button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No fixtures found</p>
            ) : (
              <>
                {/* Group stage by matchday */}
                {matchdays.map(matchday => {
                  const dayMatches = groupMatches.filter(m => m.matchday === matchday);
                  // Get date for this matchday if available
                  const firstDate = dayMatches.find(m => m.kickoff_datetime)?.kickoff_datetime;
                  const dateLabel = firstDate
                    ? new Date(firstDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
                    : null;
                  return (
                    <div key={matchday}>
                      <div className="flex items-baseline gap-3 mb-3 px-1">
                        <h3 className="text-white font-semibold">Matchday {matchday}</h3>
                        {dateLabel && <span className="text-slate-500 text-xs">{dateLabel}</span>}
                      </div>
                      <div className="space-y-2">
                        {dayMatches.map(m => <MatchCard key={m.id} m={m} />)}
                      </div>
                    </div>
                  );
                })}

                {/* Group matches without matchday */}
                {unscheduledGroup.length > 0 && (
                  <div>
                    <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
                      Group Stage
                    </h3>
                    <div className="space-y-2">
                      {unscheduledGroup.map(m => <MatchCard key={m.id} m={m} />)}
                    </div>
                  </div>
                )}

                {/* Knockout stages */}
                {Object.entries(knockoutGrouped).map(([stage, matches]) => (
                  <div key={stage}>
                    <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
                      {STAGE_LABELS[stage] || stage.replace('_', ' ')}
                    </h3>
                    <div className="space-y-2">
                      {matches.map(m => <MatchCard key={m.id} m={m} />)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })()}

      {/* TEAMS TAB */}
      {tab === 'teams' && (
        <div className="space-y-4">
          {/* Team selector dropdown */}
          <div className="relative">
            <select
              onChange={(e) => {
                const team = teams.find(t => t.id === e.target.value);
                if (team) handleSelectTeam(team);
                else setSelectedTeam(null);
              }}
              value={selectedTeam?.id || ''}
              className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none text-sm">
              <option value="">Select a team...</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▾</span>
          </div>

          {/* All teams grid — shown when no team selected */}
          {!selectedTeam && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {teams.map((t) => (
                <div key={t.id}
                  onClick={() => handleSelectTeam(t)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700/50 hover:border-emerald-600/50 p-4 rounded-lg cursor-pointer transition-colors"
                  data-testid={`team-card-${t.id}`}>
                  {t.logo_url ? (
                    <img
                      src={t.logo_url.startsWith('http') ? t.logo_url : `http://localhost:8000${t.logo_url}`}
                      alt={t.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-700 mb-3"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-700/30 flex items-center justify-center mb-3">
                      <span className="text-emerald-400 font-bold text-sm">
                        {t.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                      </span>
                    </div>
                  )}
                  <h3 className="text-white font-medium text-sm leading-tight">{t.name}</h3>
                  {t.coach_name && <p className="text-slate-500 text-xs mt-1">{t.coach_name}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Squad view — shown when team selected */}
          {selectedTeam && (
            <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700/50">
              {/* Team header */}
              <div className="flex items-center gap-4 px-4 py-4 border-b border-slate-700">
                {selectedTeam.logo_url ? (
                  <img
                    src={selectedTeam.logo_url.startsWith('http') ? selectedTeam.logo_url : `http://localhost:8000${selectedTeam.logo_url}`}
                    alt={selectedTeam.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-600 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-700/30 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold">
                      {selectedTeam.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-lg leading-tight">{selectedTeam.name}</h3>
                  {selectedTeam.coach_name && (
                    <p className="text-slate-400 text-sm">Coach: {selectedTeam.coach_name}</p>
                  )}
                </div>
                <button onClick={() => setSelectedTeam(null)}
                  className="text-slate-500 hover:text-white text-sm px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 shrink-0">
                  ✕ Close
                </button>
              </div>

              {/* Squad list */}
              {squadLoading ? (
                <p className="text-slate-400 text-center py-8 text-sm">Loading squad...</p>
              ) : squad.length === 0 ? (
                <p className="text-slate-500 text-center py-8 text-sm">No players registered</p>
              ) : (
                <>
                  {/* Group by position */}
                  {['goalkeeper', 'defender', 'midfielder', 'forward'].map(pos => {
                    const posPlayers = squad.filter(p => p.position === pos);
                    if (posPlayers.length === 0) return null;
                    const posLabel = { goalkeeper: 'Goalkeepers', defender: 'Defenders', midfielder: 'Midfielders', forward: 'Forwards' }[pos];
                    const posShort = { goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD' }[pos];
                    return (
                      <div key={pos}>
                        <div className="px-4 py-2 bg-slate-700/40">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{posLabel}</span>
                        </div>
                        {posPlayers.sort((a, b) => (a.jersey_number || 99) - (b.jersey_number || 99)).map((p) => (
                          <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-700/30 last:border-0">
                            <span className="text-emerald-400 font-mono text-sm w-7 text-center shrink-0">
                              {p.jersey_number ? `#${p.jersey_number}` : '—'}
                            </span>
                            <span className="text-white text-sm flex-1">{p.name}</span>
                            <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded">{posShort}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {/* Players with no position */}
                  {squad.filter(p => !p.position).length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-slate-700/40">
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Other</span>
                      </div>
                      {squad.filter(p => !p.position).map((p) => (
                        <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-700/30 last:border-0">
                          <span className="text-emerald-400 font-mono text-sm w-7 text-center shrink-0">
                            {p.jersey_number ? `#${p.jersey_number}` : '—'}
                          </span>
                          <span className="text-white text-sm flex-1">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="px-4 py-3 bg-slate-700/20">
                    <span className="text-slate-500 text-xs">{squad.length} players registered</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* STANDINGS TAB */}
      {tab === 'standings' && (
        <div className="space-y-6">
          {standings.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No group standings available</p>
          ) : standings.map((group) => (
            <div key={group.id} className="rounded-xl overflow-hidden border border-slate-700/50">
              {/* Group header */}
              <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700/50">
                <h3 className="text-white font-bold text-sm uppercase tracking-wider">{group.name}</h3>
                <span className="text-slate-500 text-xs">{group.standings.length} teams</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="bg-slate-800/80">
                      <th className="text-left px-4 py-2.5 text-slate-500 text-xs font-medium sticky left-0 bg-slate-800/80 w-8">#</th>
                      <th className="text-left px-3 py-2.5 text-slate-500 text-xs font-medium sticky left-8 bg-slate-800/80">Team</th>
                      <th className="text-center px-3 py-2.5 text-slate-500 text-xs font-medium">P</th>
                      <th className="text-center px-3 py-2.5 text-slate-500 text-xs font-medium">W</th>
                      <th className="text-center px-3 py-2.5 text-slate-500 text-xs font-medium">D</th>
                      <th className="text-center px-3 py-2.5 text-slate-500 text-xs font-medium">L</th>
                      <th className="text-center px-3 py-2.5 text-slate-500 text-xs font-medium">GF</th>
                      <th className="text-center px-3 py-2.5 text-slate-500 text-xs font-medium">GA</th>
                      <th className="text-center px-3 py-2.5 text-slate-500 text-xs font-medium">GD</th>
                      <th className="text-center px-4 py-2.5 text-emerald-400 text-xs font-bold">PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.standings.map((row, i) => {
                      const isTop = i === 0;
                      const isSecond = i === 1;
                      const isQualify = i < 2 && standings.length > 1;
                      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;

                      return (
                        <tr key={row.team_id} className={`border-t border-slate-700/40 transition-colors ${
                          isTop ? 'bg-emerald-950/30 hover:bg-emerald-950/50' :
                          isSecond ? 'bg-emerald-950/15 hover:bg-emerald-950/30' :
                          'bg-slate-800/40 hover:bg-slate-800/80'
                        }`}>
                          {/* Rank */}
                          <td className={`px-4 py-3 text-xs font-bold sticky left-0 ${
                            isTop ? 'bg-emerald-950/30' :
                            isSecond ? 'bg-emerald-950/15' :
                            'bg-slate-800/40'
                          }`}>
                            {medal ? (
                              <span className="text-sm">{medal}</span>
                            ) : (
                              <span className="text-slate-600">{i + 1}</span>
                            )}
                          </td>

                          {/* Team name */}
                          <td className={`px-3 py-3 sticky left-8 ${
                            isTop ? 'bg-emerald-950/30' :
                            isSecond ? 'bg-emerald-950/15' :
                            'bg-slate-800/40'
                          }`}>
                            <div className="flex items-center gap-2">
                              {isQualify && (
                                <span className="w-1 h-4 rounded-full bg-emerald-500 shrink-0" />
                              )}
                              <span className={`text-sm font-medium ${isTop ? 'text-white' : isSecond ? 'text-white' : 'text-slate-300'}`}>
                                {row.team_name}
                              </span>
                            </div>
                          </td>

                          <td className="px-3 py-3 text-center text-slate-400 text-sm">{row.p}</td>
                          <td className="px-3 py-3 text-center text-sm font-medium text-slate-300">{row.w}</td>
                          <td className="px-3 py-3 text-center text-slate-500 text-sm">{row.d}</td>
                          <td className="px-3 py-3 text-center text-slate-500 text-sm">{row.l}</td>
                          <td className="px-3 py-3 text-center text-slate-400 text-sm">{row.gf}</td>
                          <td className="px-3 py-3 text-center text-slate-400 text-sm">{row.ga}</td>
                          <td className={`px-3 py-3 text-center text-sm font-medium ${
                            row.gd > 0 ? 'text-emerald-400' : row.gd < 0 ? 'text-red-400' : 'text-slate-500'
                          }`}>
                            {row.gd > 0 ? `+${row.gd}` : row.gd}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-sm font-black ${isTop ? 'text-emerald-300' : isSecond ? 'text-emerald-400' : 'text-white'}`}>
                              {row.pts}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="px-4 py-2.5 bg-slate-800/60 border-t border-slate-700/30 flex items-center gap-4">
                {standings.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1 h-3 rounded-full bg-emerald-500" />
                    <span className="text-slate-500 text-xs">Qualifies</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🥇</span>
                  <span className="text-slate-500 text-xs">{standings.length > 1 ? 'Group winner' : 'League leader'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BRACKET TAB */}
      {tab === 'bracket' && (() => {
        const STAGE_SEQUENCE = ['round_of_16', 'quarterfinal', 'semifinal', 'final'];

        const activeStages = STAGE_SEQUENCE.filter(s =>
          fixtures.some(m => m.stage === s)
        );

        if (activeStages.length === 0) {
          return <p className="text-slate-500 text-center py-8">No knockout matches yet</p>;
        }

        const byStage = (stage) => fixtures.filter(m => m.stage === stage);

        // Given a team name, find the match in `stage` where they played
        // If the match is completed, they must have won it to be in the next round
        // If not completed yet, just find where they appear (scheduled match)
        const findSourceMatch = (teamName, stage) => {
          return fixtures.find(m =>
            m.stage === stage &&
            (m.home_team_name === teamName || m.away_team_name === teamName)
          ) || null;
        };

        // Build the bracket tree starting from the final
        // Returns an ordered list of matches per stage, paired correctly
        const buildOrderedStages = () => {
          const finalMatches = byStage('final');
          const hasFinal = finalMatches.length > 0;

          // Start from the deepest stage that exists and work backwards
          // We'll build a recursive tree then flatten per stage

          // Build a node: { match, children: [node, node] }
          const buildNode = (match, stageIndex) => {
            const stage = activeStages[stageIndex];
            const prevStage = activeStages[stageIndex - 1];

            if (!prevStage) return { match, children: [] };

            if (!match) {
              // TBD node — two TBD children
              return { match: null, children: [
                buildNode(null, stageIndex - 1),
                buildNode(null, stageIndex - 1),
              ]};
            }

            const homeSource = findSourceMatch(match.home_team_name, prevStage);
            const awaySource = findSourceMatch(match.away_team_name, prevStage);

            return {
              match,
              children: [
                buildNode(homeSource, stageIndex - 1),
                buildNode(awaySource, stageIndex - 1),
              ]
            };
          };

          // Root nodes = final matches (usually 1)
          // If no final yet, root from the latest active stage
          const lastStageIndex = activeStages.length - 1;
          const lastStageMatches = byStage(activeStages[lastStageIndex]);

          const roots = lastStageMatches.length > 0
            ? lastStageMatches.map(m => buildNode(m, lastStageIndex))
            : [buildNode(null, lastStageIndex)];

          // Flatten tree into ordered columns per stage
          // Each stage column = in-order traversal of leaves at that depth
          const columns = activeStages.map(() => []);

          const traverse = (node, depth) => {
            const stageIdx = activeStages.length - 1 - depth;
            if (node.children.length === 0) {
              columns[stageIdx].push(node.match);
            } else {
              traverse(node.children[0], depth + 1);
              columns[stageIdx].push(node.match);
              traverse(node.children[1], depth + 1);
            }
          };

          roots.forEach(root => traverse(root, 0));

          return columns;
        };

        const orderedColumns = buildOrderedStages();

        const SLOT_HEIGHT = 100;
        const CARD_HEIGHT = 70;
        const firstColCount = orderedColumns[0]?.length || 1;
        const colHeight = firstColCount * SLOT_HEIGHT;

        const MatchCard = ({ match }) => {
          if (!match) return (
            <div className="border border-dashed border-slate-700 rounded overflow-hidden w-56" style={{ height: CARD_HEIGHT }}>
              <div className="flex items-center justify-center h-full text-slate-600 text-xs">TBD</div>
            </div>
          );
          const hasPens = match.home_penalties != null && match.away_penalties != null;
          const homeWon = match.status === 'completed' && (
            hasPens ? match.home_penalties > match.away_penalties : match.home_score > match.away_score
          );
          const awayWon = match.status === 'completed' && (
            hasPens ? match.away_penalties > match.home_penalties : match.away_score > match.home_score
          );
          return (
            <div className="bg-slate-800 border border-slate-700 rounded overflow-hidden w-56" style={{ height: CARD_HEIGHT }}>
              <div className={`flex items-center justify-between px-2 py-1 h-1/2 ${homeWon ? 'bg-emerald-900/40' : ''}`}>
                <span className={`truncate flex-1 text-xs ${homeWon ? 'text-white font-semibold' : 'text-slate-400'}`}>
                  {match.home_team_name || 'TBD'}
                </span>
                {match.status !== 'scheduled' && (
                  <span className={`ml-1 font-bold text-xs ${homeWon ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {match.home_score}{match.home_penalties != null ? ` (${match.home_penalties})` : ''}
                  </span>
                )}
              </div>
              <div className="h-px bg-slate-700" />
              <div className={`flex items-center justify-between px-2 py-1 h-1/2 ${awayWon ? 'bg-emerald-900/40' : ''}`}>
                <span className={`truncate flex-1 text-xs ${awayWon ? 'text-white font-semibold' : 'text-slate-400'}`}>
                  {match.away_team_name || 'TBD'}
                </span>
                {match.status !== 'scheduled' && (
                  <span className={`ml-1 font-bold text-xs ${awayWon ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {match.away_score}{match.away_penalties != null ? ` (${match.away_penalties})` : ''}
                  </span>
                )}
              </div>
              {match.status === 'live' && (
                <div className="bg-red-600 text-white text-xs text-center py-0.5 animate-pulse">LIVE</div>
              )}
            </div>
          );
        };

        const STAGE_LABELS = {
          round_of_16: 'Round of 16',
          quarterfinal: 'Quarter Finals',
          semifinal: 'Semi Finals',
          final: 'Final',
        };

        const BracketContent = () => {
          const containerRef = useRef(null);
          const [scale, setScale] = useState(1);

          useEffect(() => {
            const updateScale = () => {
              if (!containerRef.current) return;
              const containerWidth = containerRef.current.offsetWidth;
              const bracketWidth = activeStages.length * 224 + (activeStages.length - 1) * 40;
              const newScale = Math.min(1, containerWidth / bracketWidth);
              setScale(newScale);
            };
            updateScale();
            window.addEventListener('resize', updateScale);
            return () => window.removeEventListener('resize', updateScale);
          }, [activeStages.length]);

          return (
            <div ref={containerRef} className="w-full overflow-hidden pb-4 pt-2">
              <div style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: scale < 1 ? `${100 / scale}%` : '100%',
                height: scale < 1 ? `${(colHeight + 60) * scale}px` : 'auto',
              }}>
                {/* Header row */}
                <div className="flex gap-10 min-w-max mb-6">
                  {activeStages.map((stage) => (
                    <div key={stage} style={{ width: 224 }}
                      className="text-slate-400 text-xs font-semibold uppercase tracking-wider text-center">
                      {STAGE_LABELS[stage] || stage}
                    </div>
                  ))}
                </div>
                {/* Cards */}
                <div className="flex gap-10 min-w-max items-start">
                  {activeStages.map((stage, stageIndex) => {
                    const matches = orderedColumns[stageIndex] || [];
                    const span = Math.pow(2, stageIndex);
                    return (
                      <div key={stage} className="relative" style={{ width: 224, height: colHeight }}>
                        {matches.map((match, i) => {
                          const topCenter = (i * span + span / 2 - 0.5) * SLOT_HEIGHT;
                          const topPos = topCenter - CARD_HEIGHT / 2 + 40;
                          return (
                            <div key={i} className="absolute" style={{ top: topPos, left: 0 }}>
                              <MatchCard match={match} />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        };

        return <BracketContent />;
      })()}

      {/* TOP SCORERS TAB */}
      {tab === 'scorers' && (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="text-left px-3 py-2.5 text-slate-300 text-xs">#</th>
                <th className="text-left px-3 py-2.5 text-slate-300 text-xs">Player</th>
                <th className="text-left px-3 py-2.5 text-slate-300 text-xs hidden sm:table-cell">Team</th>
                <th className="text-center px-3 py-2.5 text-slate-300 text-xs">⚽</th>
              </tr>
            </thead>
            <tbody>
              {topScorers.map((s, i) => (
                <tr key={s.player_id} className="border-t border-slate-700" data-testid={`scorer-${s.player_id}`}>
                  <td className="px-3 py-2.5 text-slate-400 text-sm">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-white text-sm">{s.player_name}</p>
                    <p className="text-slate-500 text-xs sm:hidden">{s.team_name}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 text-sm hidden sm:table-cell">{s.team_name}</td>
                  <td className="px-3 py-2.5 text-center text-emerald-400 font-bold">{s.goals}</td>
                </tr>
              ))}
              {topScorers.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-slate-500">No goals recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* DISCIPLINE TAB */}
      {tab === 'discipline' && (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="text-left px-3 py-2.5 text-slate-300 text-xs">Player</th>
                <th className="text-left px-3 py-2.5 text-slate-300 text-xs hidden sm:table-cell">Team</th>
                <th className="text-center px-3 py-2.5 text-yellow-400 text-xs">🟨</th>
                <th className="text-center px-3 py-2.5 text-red-400 text-xs">🟥</th>
                <th className="text-center px-3 py-2.5 text-slate-300 text-xs">Total</th>
              </tr>
            </thead>
            <tbody>
              {discipline.map((d) => (
                <tr key={d.player_id} className="border-t border-slate-700" data-testid={`discipline-${d.player_id}`}>
                  <td className="px-3 py-2.5">
                    <p className="text-white text-sm">{d.player_name}</p>
                    <p className="text-slate-500 text-xs sm:hidden">{d.team_name}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 text-sm hidden sm:table-cell">{d.team_name}</td>
                  <td className="px-3 py-2.5 text-center text-yellow-400 font-medium">{d.yellow_cards}</td>
                  <td className="px-3 py-2.5 text-center text-red-400 font-medium">{d.red_cards}</td>
                  <td className="px-3 py-2.5 text-center text-white font-bold">{d.total}</td>
                </tr>
              ))}
              {discipline.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-500">No cards recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </div>
  );
}