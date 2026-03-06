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
  const [fixtureFilter, setFixtureFilter] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [squad, setSquad] = useState([]);
  const [squadLoading, setSquadLoading] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const tabs = [
    { id: 'fixtures', label: 'Fixtures' },
    { id: 'teams', label: 'Teams' },
    { id: 'standings', label: 'Standings' },
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

      <div className="flex gap-1 mb-6 bg-slate-800 p-1 rounded-lg">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`} data-testid={`tab-${t.id}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'fixtures' && (() => {
        const filtered = fixtureFilter === 'all' ? fixtures : fixtures.filter(m => m.status === fixtureFilter);
        if (filtered.length === 0) return (
          <>
            <div className="flex gap-2 mb-4">
              {['all', 'scheduled', 'live', 'completed'].map(f => (
                <button key={f} onClick={() => setFixtureFilter(f)}
                  className={`px-3 py-1.5 rounded text-sm capitalize ${
                    fixtureFilter === f ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}>{f}</button>
              ))}
            </div>
            <p className="text-slate-500 text-center py-8">No fixtures found</p>
          </>
        );

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
            {Object.entries(grouped).map(([stage, matches]) => (
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
                        <span className="text-2xl font-bold text-emerald-400 w-20 text-center">
                          {m.status === 'scheduled' ? 'vs' : `${m.home_score} - ${m.away_score}`}
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

      {tab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team list */}
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

          {/* Squad panel */}
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

      {tab === 'standings' && (
        <div className="space-y-6">
          {standings.map((group) => (
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
