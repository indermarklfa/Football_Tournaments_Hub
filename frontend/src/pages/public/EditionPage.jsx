import { useState, useEffect } from 'react';
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
    <div className="max-w-5xl mx-auto py-8 px-4" data-testid="edition-page">
      <Link to={`/tournaments/${edition.tournament_id}`} className="text-emerald-400 text-sm hover:underline">
        ← Back to {edition.tournament_name}
      </Link>
      <h1 className="text-3xl font-bold text-white mt-4 mb-2">{edition.name}</h1>
      <div className="flex items-center gap-4 text-slate-400 text-sm mb-6">
        <span>{edition.venue || 'Venue TBA'}</span>
        <span>•</span>
        <span>{edition.start_date} - {edition.end_date}</span>
        <span className={`px-2 py-0.5 rounded ${
          edition.status === 'completed' ? 'bg-slate-600' :
          edition.status === 'active' ? 'bg-emerald-600' : 'bg-amber-600'
        } text-white`}>{edition.status}</span>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-800 p-1 rounded-lg overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`} data-testid={`tab-${t.id}`}>{t.label}</button>
        ))}
      </div>

      {/* FIXTURES TAB */}
      {tab === 'fixtures' && (() => {
        const filtered = fixtureFilter === 'all' ? fixtures : fixtures.filter(m => m.status === fixtureFilter);

        const STAGE_ORDER = ['group', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final'];
        const STAGE_LABELS = {
          group: 'Group Stage', round_of_16: 'Round of 16', quarterfinal: 'Quarter Finals',
          semifinal: 'Semi Finals', third_place: 'Third Place', final: 'Final',
        };

        const grouped = STAGE_ORDER.reduce((acc, stage) => {
          const matches = filtered.filter(m => m.stage === stage);
          if (matches.length > 0) acc[stage] = matches;
          return acc;
        }, {});

        return (
          <div className="space-y-6">
            <div className="flex gap-2">
              {['all', 'scheduled', 'live', 'completed'].map(f => (
                <button key={f} onClick={() => setFixtureFilter(f)}
                  className={`px-3 py-1.5 rounded text-sm capitalize ${
                    fixtureFilter === f ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}>{f}</button>
              ))}
            </div>
            {Object.keys(grouped).length === 0 ? (
              <p className="text-slate-500 text-center py-8">No fixtures found</p>
            ) : Object.entries(grouped).map(([stage, matches]) => (
              <div key={stage}>
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
                  {STAGE_LABELS[stage] || stage.replace('_', ' ')}
                </h3>
                <div className="space-y-2">
                  {matches.map((m) => (
                    <Link key={m.id} to={`/matches/${m.id}`}
                      className="flex items-center justify-between bg-slate-800 hover:bg-slate-700 p-4 rounded-lg"
                      data-testid={`fixture-${m.id}`}>
                      <div className="flex items-center gap-4 flex-1 justify-center">
                        <span className="text-white text-right w-36 truncate">{m.home_team_name}</span>
                        <span className="text-2xl font-bold text-emerald-400 text-center whitespace-nowrap">
                          {m.status === 'scheduled' ? 'vs' : (
                            <>
                              {m.home_score}{m.home_penalties != null ? <span className="text-base"> ({m.home_penalties})</span> : ''}
                              {' - '}
                              {m.away_score}{m.away_penalties != null ? <span className="text-base"> ({m.away_penalties})</span> : ''}
                            </>
                          )}
                        </span>
                        <span className="text-white text-left w-36 truncate">{m.away_team_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.kickoff_datetime && (
                          <span className="text-slate-500 text-xs hidden md:block">
                            {new Date(m.kickoff_datetime).toLocaleDateString()}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          m.status === 'completed' ? 'bg-green-600' :
                          m.status === 'live' ? 'bg-red-600 animate-pulse' : 'bg-slate-600'
                        } text-white`}>{m.status}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* TEAMS TAB */}
      {tab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            {teams.map((t) => (
              <div key={t.id}
                onClick={() => handleSelectTeam(t)}
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedTeam?.id === t.id
                    ? 'bg-emerald-600/20 border border-emerald-600'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
                data-testid={`team-card-${t.id}`}>
                <h3 className="text-white font-medium">{t.name}</h3>
                {t.coach_name && <p className="text-slate-400 text-sm">{t.coach_name}</p>}
              </div>
            ))}
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            {!selectedTeam ? (
              <p className="text-slate-500 text-center py-8">Select a team to view their squad</p>
            ) : squadLoading ? (
              <p className="text-slate-400 text-center py-8">Loading...</p>
            ) : (
              <>
                <h3 className="text-white font-semibold mb-4">{selectedTeam.name}</h3>
                {squad.length === 0 ? (
                  <p className="text-slate-500 text-sm">No players registered</p>
                ) : (
                  <div className="space-y-2">
                    {squad.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 py-2 border-b border-slate-700/50 last:border-0">
                        {p.jersey_number && (
                          <span className="text-emerald-400 font-mono text-sm w-6 text-center">#{p.jersey_number}</span>
                        )}
                        <span className="text-white flex-1">{p.name}</span>
                        {p.position && (
                          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase">
                            {p.position === 'goalkeeper' ? 'GK' :
                             p.position === 'defender' ? 'DEF' :
                             p.position === 'midfielder' ? 'MID' :
                             p.position === 'forward' ? 'FWD' : p.position}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* STANDINGS TAB */}
      {tab === 'standings' && (
        <div className="space-y-6">
          {standings.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No group standings available</p>
          ) : standings.map((group) => (
            <div key={group.id} className="bg-slate-800 rounded-lg overflow-hidden">
              <div className="bg-slate-700 px-4 py-3">
                <h3 className="text-white font-semibold">{group.name}</h3>
              </div>
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="text-left px-4 py-2 text-slate-400 text-xs">Team</th>
                    <th className="text-center px-2 py-2 text-slate-400 text-xs">P</th>
                    <th className="text-center px-2 py-2 text-slate-400 text-xs">W</th>
                    <th className="text-center px-2 py-2 text-slate-400 text-xs">D</th>
                    <th className="text-center px-2 py-2 text-slate-400 text-xs">L</th>
                    <th className="text-center px-2 py-2 text-slate-400 text-xs">GF</th>
                    <th className="text-center px-2 py-2 text-slate-400 text-xs">GA</th>
                    <th className="text-center px-2 py-2 text-slate-400 text-xs">GD</th>
                    <th className="text-center px-3 py-2 text-emerald-400 text-xs font-bold">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {group.standings.map((row, i) => (
                    <tr key={row.team_id} className={`border-t border-slate-700 ${i < 2 ? 'bg-emerald-900/10' : ''}`}>
                      <td className="px-4 py-3 text-white text-sm">
                        {i < 2 && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 mb-0.5"></span>}
                        {row.team_name}
                      </td>
                      <td className="px-2 py-3 text-center text-slate-400 text-sm">{row.p}</td>
                      <td className="px-2 py-3 text-center text-slate-400 text-sm">{row.w}</td>
                      <td className="px-2 py-3 text-center text-slate-400 text-sm">{row.d}</td>
                      <td className="px-2 py-3 text-center text-slate-400 text-sm">{row.l}</td>
                      <td className="px-2 py-3 text-center text-slate-400 text-sm">{row.gf}</td>
                      <td className="px-2 py-3 text-center text-slate-400 text-sm">{row.ga}</td>
                      <td className="px-2 py-3 text-center text-slate-400 text-sm">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                      <td className="px-3 py-3 text-center text-emerald-400 font-bold text-sm">{row.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 bg-slate-700/20">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 mb-0.5"></span>
                <span className="text-slate-500 text-xs">Qualifies to next round</span>
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

        return (
          <div className="overflow-x-auto pb-4 pt-2">
            {/* Header row — separate from cards so all headers align */}
            <div className="flex gap-6 min-w-max mb-8">
              {activeStages.map((stage) => (
                <div key={stage} style={{ width: 224, minHeight: 24 }}
                  className="text-slate-400 text-xs font-semibold uppercase tracking-wider text-center">
                  {STAGE_LABELS[stage] || stage}
                </div>
              ))}
            </div>
            {/* Cards row */}
            <div className="flex gap-10 min-w-max items-start">
              {activeStages.map((stage, stageIndex) => {
                const matches = orderedColumns[stageIndex] || [];
                const span = Math.pow(2, stageIndex);

                return (
                  <div key={stage} className="relative" style={{ width: 224, height: colHeight }}>
                    {matches.map((match, i) => {
                      const topCenter = (i * span + span / 2 - 0.5) * SLOT_HEIGHT;
                      const topPos = topCenter - CARD_HEIGHT / 2;
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
        );
      })()}

      {/* TOP SCORERS TAB */}
      {tab === 'scorers' && (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="text-left px-4 py-3 text-slate-300 text-sm">#</th>
                <th className="text-left px-4 py-3 text-slate-300 text-sm">Player</th>
                <th className="text-left px-4 py-3 text-slate-300 text-sm">Team</th>
                <th className="text-center px-4 py-3 text-slate-300 text-sm">Goals</th>
              </tr>
            </thead>
            <tbody>
              {topScorers.map((s, i) => (
                <tr key={s.player_id} className="border-t border-slate-700" data-testid={`scorer-${s.player_id}`}>
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 text-white">{s.player_name}</td>
                  <td className="px-4 py-3 text-slate-400">{s.team_name}</td>
                  <td className="px-4 py-3 text-center text-emerald-400 font-bold">{s.goals}</td>
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
                <th className="text-left px-4 py-3 text-slate-300 text-sm">Player</th>
                <th className="text-left px-4 py-3 text-slate-300 text-sm">Team</th>
                <th className="text-center px-4 py-3 text-yellow-400 text-sm">🟨</th>
                <th className="text-center px-4 py-3 text-red-400 text-sm">🟥</th>
                <th className="text-center px-4 py-3 text-slate-300 text-sm">Total</th>
              </tr>
            </thead>
            <tbody>
              {discipline.map((d) => (
                <tr key={d.player_id} className="border-t border-slate-700" data-testid={`discipline-${d.player_id}`}>
                  <td className="px-4 py-3 text-white">{d.player_name}</td>
                  <td className="px-4 py-3 text-slate-400">{d.team_name}</td>
                  <td className="px-4 py-3 text-center text-yellow-400">{d.yellow_cards}</td>
                  <td className="px-4 py-3 text-center text-red-400">{d.red_cards}</td>
                  <td className="px-4 py-3 text-center text-white font-bold">{d.total}</td>
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
  );
}