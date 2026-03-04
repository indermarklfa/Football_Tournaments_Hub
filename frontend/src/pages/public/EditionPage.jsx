import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicEdition, getPublicFixtures, getPublicTeams, getPublicTopScorers, getPublicDiscipline } from '../../lib/api';

export default function EditionPage() {
  const { id } = useParams();
  const [edition, setEdition] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState([]);
  const [topScorers, setTopScorers] = useState([]);
  const [discipline, setDiscipline] = useState([]);
  const [tab, setTab] = useState('fixtures');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPublicEdition(id),
      getPublicFixtures(id),
      getPublicTeams(id),
      getPublicTopScorers(id),
      getPublicDiscipline(id),
    ]).then(([edRes, fixRes, teamsRes, scorersRes, discRes]) => {
      setEdition(edRes.data);
      setFixtures(fixRes.data);
      setTeams(teamsRes.data);
      setTopScorers(scorersRes.data);
      setDiscipline(discRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (!edition) return <div className="text-center py-12 text-red-400">Edition not found</div>;

  const tabs = [
    { id: 'fixtures', label: 'Fixtures' },
    { id: 'teams', label: 'Teams' },
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

      {tab === 'fixtures' && (
        <div className="space-y-3">
          {fixtures.length === 0 ? <p className="text-slate-500 text-center py-8">No fixtures yet</p> : fixtures.map((m) => (
            <Link key={m.id} to={`/matches/${m.id}`}
              className="flex items-center justify-between bg-slate-800 hover:bg-slate-700 p-4 rounded-lg"
              data-testid={`fixture-${m.id}`}>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-600 text-white">{m.stage.replace('_', ' ')}</span>
              <div className="flex items-center gap-4 flex-1 justify-center">
                <span className="text-white text-right w-32">{m.home_team_name}</span>
                <span className="text-2xl font-bold text-emerald-400 w-20 text-center">
                  {m.status === 'scheduled' ? 'vs' : `${m.home_score} - ${m.away_score}`}
                </span>
                <span className="text-white text-left w-32">{m.away_team_name}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                m.status === 'completed' ? 'bg-green-600' : m.status === 'live' ? 'bg-red-600' : 'bg-slate-600'
              } text-white`}>{m.status}</span>
            </Link>
          ))}
        </div>
      )}

      {tab === 'teams' && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => (
            <div key={t.id} className="bg-slate-800 p-4 rounded-lg" data-testid={`team-card-${t.id}`}>
              <h3 className="text-white font-medium">{t.name}</h3>
              <p className="text-slate-400 text-sm">{t.coach_name || 'Coach TBA'}</p>
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
