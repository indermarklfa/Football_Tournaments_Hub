import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSeason, getTeams, getGroups, getMatches, createMatch, updateMatch, deleteMatch, generateGroupFixtures, bulkUpdateMatches } from '../../lib/api';

const STAGES = ['group', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final'];
const STATUSES = ['scheduled', 'live', 'completed', 'postponed', 'cancelled'];

export default function DivisionMatches() {
  const { id } = useParams();
  const [season, setSeason] = useState(null);
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [matches, setMatches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [editingMatch, setEditingMatch] = useState(null);
  const [editForm, setEditForm] = useState({
    homeTeamId: '', awayTeamId: '', stage: 'group',
    groupId: '', kickoff: '', venue: '', status: 'scheduled'
  });
  const defaultStage = () => {
    if (season?.format === 'knockout') return 'round_of_16';
    return 'group';
  };

  const [form, setForm] = useState({
    homeTeamId: '', awayTeamId: '', stage: 'group',
    groupId: '', kickoff: '', venue: ''
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleData, setScheduleData] = useState({});
  const [scheduleSaving, setScheduleSaving] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const [seasonRes, teamsRes, matchesRes, groupsRes] = await Promise.all([
      getSeason(id), getTeams(id), getMatches(id), getGroups(id)
    ]);
    setSeason(seasonRes.data);
    setTeams(teamsRes.data);
    setMatches(matchesRes.data);
    setGroups(groupsRes.data);
    setLoading(false);
  };

  const handleGenerateFixtures = async () => {
    if (!window.confirm(`Generate round-robin fixtures for all groups? This cannot be undone.`)) return;
    setGenerating(true);
    setGenerateError('');
    try {
      const res = await generateGroupFixtures({ season_id: id, venue: season?.venue || null });
      await loadData();
      alert(`✓ Created ${res.data.created} fixtures across ${res.data.groups} groups`);
    } catch (err) {
      setGenerateError(err.response?.data?.detail || 'Failed to generate fixtures');
    } finally {
      setGenerating(false);
    }
  };

  const openScheduler = () => {
    // Build initial schedule data from existing matches
    const data = {};
    matches.filter(m => m.stage === 'group').forEach(m => {
      data[m.id] = {
        kickoff: m.kickoff_at ? m.kickoff_at.slice(0, 16) : '',
        venue: m.venue || '',
      };
    });
    setScheduleData(data);
    setShowScheduler(true);
  };

  const handleBulkSchedule = async () => {
    setScheduleSaving(true);
    try {
      const payload = Object.entries(scheduleData).map(([id, vals]) => ({
        id,
        kickoff_at: vals.kickoff || null,
        venue: vals.venue || null,
      }));
      const res = await bulkUpdateMatches({ matches: payload });
      await loadData();
      setShowScheduler(false);
      alert(`✓ Updated ${res.data.updated} matches`);
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await createMatch({
      season_id: id,
      home_team_id: form.homeTeamId,
      away_team_id: form.awayTeamId,
      stage: form.stage,
      group_id: form.groupId || null,
      kickoff_at: form.kickoff || null,
      venue: form.venue || null,
    });
    setShowForm(false);
    setForm({ homeTeamId: '', awayTeamId: '', stage: defaultStage(), groupId: '', kickoff: '', venue: '' });
    loadData();
  };

  const openEdit = (m) => {
    setEditingMatch(m.id);
    setEditForm({
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      stage: m.stage,
      groupId: m.group_id || '',
      kickoff: m.kickoff_at ? m.kickoff_at.slice(0, 16) : '',
      venue: m.venue || '',
      status: m.status,
      homePenalties: m.home_penalties ?? '',
      awayPenalties: m.away_penalties ?? '',
    });
  };

  const handleUpdate = async () => {
    await updateMatch(editingMatch, {
      home_team_id: editForm.homeTeamId,
      away_team_id: editForm.awayTeamId,
      stage: editForm.stage,
      group_id: editForm.groupId || null,
      kickoff_at: editForm.kickoff || null,
      venue: editForm.venue || null,
      status: editForm.status,
      home_penalties: editForm.homePenalties !== '' ? parseInt(editForm.homePenalties) : null,
      away_penalties: editForm.awayPenalties !== '' ? parseInt(editForm.awayPenalties) : null,
    });
    setEditingMatch(null);
    loadData();
  };

  const handleDeleteMatch = async (matchId) => {
    const match = matches.find(m => m.id === matchId);
    const homeName = teamMap[match?.home_team_id] || 'Home';
    const awayName = teamMap[match?.away_team_id] || 'Away';
    if (!window.confirm(`Delete ${homeName} vs ${awayName}? This will permanently delete the match and all its recorded events.`)) return;
    await deleteMatch(matchId);
    loadData();
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));
  const groupMap = Object.fromEntries(groups.map(g => [g.id, g.name]));
  const filteredMatches = filter === 'all' ? matches : matches.filter(m => m.status === filter);

  // Stages available depend on format
  const availableStages = season?.format === 'knockout'
    ? STAGES.filter(s => s !== 'group')
    : season?.format === 'league'
    ? ['group']  // league uses group stage matchdays only
    : STAGES;    // groups_knockout gets all stages

  // Group dropdown only relevant when stage is 'group' and format supports groups
  const showGroupSelect = (stage) =>
    stage === 'group' &&
    groups.length > 0 &&
    ['groups_knockout', 'league'].includes(season?.format);

  // Teams filtered to only those in the selected group
  const teamsForGroup = (groupId) => {
    if (!groupId) return [];
    const group = groups.find(g => g.id === groupId);
    if (!group || !group.team_ids?.length) return [];
    return teams.filter(t => group.team_ids.includes(t.id));
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4" data-testid="edition-matches-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{season?.name} - Matches</h1>
          <Link to={`/admin/competitions/${season?.competition_id}`} className="text-emerald-400 text-sm hover:underline">← Back to Competition</Link>
        </div>
        <button onClick={() => {
          const next = !showForm;
          setShowForm(next);
          if (next) {
            setForm(f => ({ ...f, venue: season?.venue || '', stage: defaultStage() }));
          }
        }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-medium"
          data-testid="new-match-btn">+ New Match</button>
      </div>

      {/* Groups warning */}
      {season?.format === 'groups_knockout' && groups.length === 0 && (
        <div className="bg-amber-900/30 border border-amber-700 text-amber-300 p-4 rounded-lg mb-6 flex items-center justify-between">
          <span className="text-sm">⚠ This is a Groups + Knockout division but no groups have been set up yet.</span>
          <Link to={`/admin/seasons/${id}/groups`}
            className="bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded text-sm ml-4 whitespace-nowrap">
            Set Up Groups →
          </Link>
        </div>
      )}


      {/* Generate fixtures button — shown when groups exist and no group matches yet */}
      {['groups_knockout', 'league'].includes(season?.format) && groups.length > 0 && !matches.some(m => m.stage === 'group') && (
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg mb-6 flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Auto-generate group fixtures</p>
            <p className="text-slate-400 text-xs mt-0.5">
              Creates a full round-robin schedule for all {groups.length} group{groups.length !== 1 ? 's' : ''}
            </p>
            {generateError && <p className="text-red-400 text-xs mt-1">{generateError}</p>}
          </div>
          <button
            onClick={handleGenerateFixtures}
            disabled={generating}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm whitespace-nowrap ml-4">
            {generating ? 'Generating...' : '⚡ Generate Fixtures'}
          </button>
        </div>
      )}

      {/* Schedule button — shown when group matches exist */}
      {['groups_knockout', 'league'].includes(season?.format) && matches.some(m => m.stage === 'group') && (
        <div className="flex justify-end mb-4">
          <button onClick={openScheduler}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm">
            📅 Schedule Matchdays
          </button>
        </div>
      )}

      {/* Scheduler modal */}
      {showScheduler && (() => {
        const groupMatches = matches.filter(m => m.stage === 'group');
        const matchdays = [...new Set(groupMatches.map(m => m.matchday))].sort((a, b) => a - b);
        return (
          <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 overflow-y-auto py-8">
            <div className="bg-slate-800 rounded-lg w-full max-w-4xl mx-4">
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <div>
                  <h2 className="text-white font-semibold text-lg">Schedule Matchdays</h2>
                  <p className="text-slate-400 text-sm mt-0.5">Set kickoff times and venues for group stage matches</p>
                </div>
                <button onClick={() => setShowScheduler(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
              </div>

              <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
                {/* Apply to all */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-300 text-sm font-medium mb-3">Apply to all matches</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Venue for all</label>
                      <input
                        placeholder="e.g. Main Stadium"
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm"
                        onChange={(e) => {
                          const venue = e.target.value;
                          setScheduleData(prev => {
                            const next = { ...prev };
                            Object.keys(next).forEach(id => { next[id] = { ...next[id], venue }; });
                            return next;
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Start time for all (time only)</label>
                      <input type="time"
                        className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm"
                        onChange={(e) => {
                          const time = e.target.value;
                          setScheduleData(prev => {
                            const next = { ...prev };
                            Object.keys(next).forEach(id => {
                              const existing = next[id].kickoff || '';
                              const datePart = existing.slice(0, 10) || '';
                              if (datePart) next[id] = { ...next[id], kickoff: `${datePart}T${time}` };
                            });
                            return next;
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Per matchday */}
                {matchdays.map(matchday => {
                  const dayMatches = groupMatches.filter(m => m.matchday === matchday);
                  return (
                    <div key={matchday}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-medium">Matchday {matchday}</h3>
                        <div className="flex items-center gap-2">
                          <input type="date"
                            className="bg-slate-700 text-white px-2 py-1 rounded text-xs"
                            onChange={(e) => {
                              const date = e.target.value;
                              setScheduleData(prev => {
                                const next = { ...prev };
                                dayMatches.forEach(m => {
                                  const timePart = next[m.id]?.kickoff?.slice(11, 16) || '12:00';
                                  next[m.id] = { ...next[m.id], kickoff: `${date}T${timePart}` };
                                });
                                return next;
                              });
                            }}
                          />
                          <span className="text-slate-500 text-xs">Set date for all in matchday</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {dayMatches.map(m => (
                          <div key={m.id} className="bg-slate-700/50 rounded p-3 grid grid-cols-3 gap-3 items-center">
                            <div className="text-sm text-white">
                              <span>{teamMap[m.home_team_id]}</span>
                              <span className="text-slate-400 mx-2">vs</span>
                              <span>{teamMap[m.away_team_id]}</span>
                              {m.group_id && <span className="ml-2 text-xs text-slate-500">{groupMap[m.group_id]}</span>}
                            </div>
                            <div>
                              <input type="datetime-local"
                                value={scheduleData[m.id]?.kickoff || ''}
                                onChange={(e) => setScheduleData(prev => ({
                                  ...prev,
                                  [m.id]: { ...prev[m.id], kickoff: e.target.value }
                                }))}
                                className="w-full bg-slate-700 text-white px-2 py-1 rounded text-xs" />
                            </div>
                            <div>
                              <input
                                placeholder="Venue"
                                value={scheduleData[m.id]?.venue || ''}
                                onChange={(e) => setScheduleData(prev => ({
                                  ...prev,
                                  [m.id]: { ...prev[m.id], venue: e.target.value }
                                }))}
                                className="w-full bg-slate-700 text-white px-2 py-1 rounded text-xs" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-6 border-t border-slate-700 flex gap-3">
                <button onClick={handleBulkSchedule} disabled={scheduleSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2 rounded text-sm">
                  {scheduleSaving ? 'Saving...' : 'Save Schedule'}
                </button>
                <button onClick={() => setShowScheduler(false)}
                  className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* New Match Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-800 p-6 rounded-lg mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-1">Home Team *</label>
              <select value={form.homeTeamId} onChange={(e) => setForm({ ...form, homeTeamId: e.target.value })} required
                className="w-full bg-slate-700 text-white px-4 py-2 rounded" data-testid="home-team-select">
                <option value="">Select</option>
                {(form.stage === 'group' && form.groupId
                  ? teamsForGroup(form.groupId)
                  : teams
                ).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Away Team *</label>
              <select value={form.awayTeamId} onChange={(e) => setForm({ ...form, awayTeamId: e.target.value })} required
                className="w-full bg-slate-700 text-white px-4 py-2 rounded" data-testid="away-team-select">
                <option value="">Select</option>
                {(form.stage === 'group' && form.groupId
                  ? teamsForGroup(form.groupId)
                  : teams
                ).filter(t => t.id !== form.homeTeamId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-slate-300 mb-1">Stage</label>
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value, groupId: '' })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded">
                {availableStages.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            {showGroupSelect(form.stage) && (
              <div>
                <label className="block text-slate-300 mb-1">Group</label>
                <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded">
                  <option value="">None</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-slate-300 mb-1">Kickoff</label>
              <input type="datetime-local" value={form.kickoff} onChange={(e) => setForm({ ...form, kickoff: e.target.value })}
                min={season?.start_date ? `${season.start_date}T00:00` : undefined}
                max={season?.end_date ? `${season.end_date}T23:59` : undefined}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded" />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Venue</label>
              <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded"
              data-testid="create-match-btn">Create Match</button>
            <button type="button" onClick={() => setShowForm(false)}
              className="bg-slate-600 text-white px-6 py-2 rounded">Cancel</button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['all', 'scheduled', 'live', 'completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-sm capitalize ${
              filter === f ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}>{f}</button>
        ))}
      </div>

      {/* Match list */}
      {filteredMatches.length === 0 ? (
        <p className="text-slate-500 text-center py-8">No matches found</p>
      ) : (() => {
        // Sort: live first, then by matchday/stage order
        const STATUS_ORDER = { live: 0, penalties: 1, scheduled: 2, completed: 3, postponed: 4, cancelled: 5 };
        const STAGE_ORDER = ['group', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final'];

        const kickoffMs = (m) => m.kickoff_at ? new Date(m.kickoff_at).getTime() : Infinity;

        const sorted = [...filteredMatches].sort((a, b) => {
          const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          if (statusDiff !== 0) return statusDiff;
          if (a.stage === 'group' && b.stage === 'group') {
            const mdDiff = (a.matchday ?? 99) - (b.matchday ?? 99);
            if (mdDiff !== 0) return mdDiff;
            return kickoffMs(a) - kickoffMs(b);
          }
          const stageDiff = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
          if (stageDiff !== 0) return stageDiff;
          return kickoffMs(a) - kickoffMs(b);
        });

        // Group matches into sections
        const sections = [];
        const seen = new Set();

        // Live section first
        const liveMatches = sorted.filter(m => m.status === 'live' || m.status === 'penalties');
        if (liveMatches.length > 0) {
          sections.push({ label: '🔴 Live', matches: liveMatches });
          liveMatches.forEach(m => seen.add(m.id));
        }

        // Group stage — group by matchday
        const groupMatches = sorted.filter(m => m.stage === 'group' && !seen.has(m.id));
        const matchdays = [...new Set(groupMatches.map(m => m.matchday))].sort((a, b) => (a ?? 99) - (b ?? 99));
        matchdays.forEach(md => {
          const mdMatches = groupMatches.filter(m => m.matchday === md);
          sections.push({ label: md ? `Matchday ${md}` : 'Group Stage', matches: mdMatches });
          mdMatches.forEach(m => seen.add(m.id));
        });
        // Group matches without matchday
        const ungrouped = groupMatches.filter(m => !seen.has(m.id));
        if (ungrouped.length > 0) {
          sections.push({ label: 'Group Stage', matches: ungrouped });
          ungrouped.forEach(m => seen.add(m.id));
        }

        // Knockout stages
        const STAGE_LABELS = {
          round_of_16: 'Round of 16', quarterfinal: 'Quarter Finals',
          semifinal: 'Semi Finals', third_place: 'Third Place', final: 'Final',
        };
        STAGE_ORDER.filter(s => s !== 'group').forEach(stage => {
          const stageMatches = sorted.filter(m => m.stage === stage && !seen.has(m.id));
          if (stageMatches.length > 0) {
            sections.push({ label: STAGE_LABELS[stage] || stage, matches: stageMatches });
            stageMatches.forEach(m => seen.add(m.id));
          }
        });

        return (
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.label}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 px-1 ${
                  section.label.startsWith('🔴') ? 'text-red-400' : 'text-slate-400'
                }`}>{section.label}</h3>
                <div className="space-y-2">
                  {section.matches.map((m) => (
                    <div key={m.id} className="bg-slate-800 rounded-lg" data-testid={`match-${m.id}`}>
                      {editingMatch === m.id ? (
                        // Inline edit form
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-400 text-xs mb-1">Home Team</label>
                              <select value={editForm.homeTeamId} onChange={(e) => setEditForm({ ...editForm, homeTeamId: e.target.value })}
                                className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm">
                                {(editForm.stage === 'group' && editForm.groupId
                                  ? teamsForGroup(editForm.groupId)
                                  : teams
                                ).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-slate-400 text-xs mb-1">Away Team</label>
                              <select value={editForm.awayTeamId} onChange={(e) => setEditForm({ ...editForm, awayTeamId: e.target.value })}
                                className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm">
                                {(editForm.stage === 'group' && editForm.groupId
                                  ? teamsForGroup(editForm.groupId)
                                  : teams
                                ).filter(t => t.id !== editForm.homeTeamId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-slate-400 text-xs mb-1">Stage</label>
                              <select value={editForm.stage} onChange={(e) => setEditForm({ ...editForm, stage: e.target.value, groupId: '' })}
                                className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm">
                                {availableStages.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                              </select>
                            </div>
                            {showGroupSelect(editForm.stage) && (
                              <div>
                                <label className="block text-slate-400 text-xs mb-1">Group</label>
                                <select value={editForm.groupId} onChange={(e) => setEditForm({ ...editForm, groupId: e.target.value })}
                                  className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm">
                                  <option value="">None</option>
                                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                              </div>
                            )}
                            <div>
                              <label className="block text-slate-400 text-xs mb-1">Status</label>
                              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm">
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            {editForm.status === 'completed' && (
                              <>
                                <div>
                                  <label className="block text-slate-400 text-xs mb-1">
                                    Penalties — {teams.find(t => t.id === editForm.homeTeamId)?.name || 'Home'}
                                  </label>
                                  <input type="number" min="0"
                                    value={editForm.homePenalties ?? ''}
                                    onChange={(e) => setEditForm({ ...editForm, homePenalties: e.target.value })}
                                    placeholder="e.g. 4"
                                    className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                                </div>
                                <div>
                                  <label className="block text-slate-400 text-xs mb-1">
                                    Penalties — {teams.find(t => t.id === editForm.awayTeamId)?.name || 'Away'}
                                  </label>
                                  <input type="number" min="0"
                                    value={editForm.awayPenalties ?? ''}
                                    onChange={(e) => setEditForm({ ...editForm, awayPenalties: e.target.value })}
                                    placeholder="e.g. 3"
                                    className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                                </div>
                                <p className="col-span-2 text-slate-500 text-xs">Only fill penalties if the match was decided by a shootout</p>
                              </>
                            )}
                            <div>
                              <label className="block text-slate-400 text-xs mb-1">Kickoff</label>
                              <input type="datetime-local" value={editForm.kickoff}
                                onChange={(e) => setEditForm({ ...editForm, kickoff: e.target.value })}
                                min={season?.start_date ? `${season.start_date}T00:00` : undefined}
                                max={season?.end_date ? `${season.end_date}T23:59` : undefined}
                                className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                            </div>
                            <div>
                              <label className="block text-slate-400 text-xs mb-1">Venue</label>
                              <input value={editForm.venue} onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                                className="w-full bg-slate-700 text-white px-3 py-1.5 rounded text-sm" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleUpdate}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm">Save</button>
                            <button onClick={() => setEditingMatch(null)}
                              className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-1.5 rounded text-sm">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        // Display row
                        <div className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {/* Home team */}
                            <span className="text-white text-sm font-medium truncate flex-1 text-right">
                              {teamMap[m.home_team_id]}
                            </span>
                            {/* Score / time */}
                            <div className="shrink-0 text-center w-24">
                              {m.status === 'scheduled' ? (
                                <span className="text-slate-300 font-semibold text-sm">
                                  {m.kickoff_at
                                    ? new Date(m.kickoff_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                                    : 'vs'}
                                </span>
                              ) : (
                                <span className={`font-bold text-sm ${
                                  m.status === 'live' ? 'text-red-400 animate-pulse' :
                                  m.status === 'penalties' ? 'text-purple-400 animate-pulse' :
                                  'text-emerald-400'
                                }`}>
                                  {m.home_score ?? 0}
                                  {m.home_penalties != null && <span className="text-slate-400 text-xs font-normal"> ({m.home_penalties})</span>}
                                  {' - '}
                                  {m.away_penalties != null && <span className="text-slate-400 text-xs font-normal">({m.away_penalties}) </span>}
                                  {m.away_score ?? 0}
                                </span>
                              )}
                            </div>
                            {/* Away team */}
                            <span className="text-white text-sm font-medium truncate flex-1">
                              {teamMap[m.away_team_id]}
                            </span>
                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0 ml-1">
                              {m.status === 'scheduled' && (
                                <button onClick={async () => { await updateMatch(m.id, { status: 'live' }); loadData(); }}
                                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded">
                                  Live
                                </button>
                              )}
                              {m.status === 'live' && m.home_score === m.away_score && (
                                <button onClick={async () => { await updateMatch(m.id, { status: 'penalties' }); loadData(); }}
                                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded">
                                  Pens
                                </button>
                              )}
                              {(m.status === 'live' || m.status === 'penalties') && (
                                <button onClick={async () => { await updateMatch(m.id, { status: 'completed' }); loadData(); }}
                                  className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded">
                                  Done
                                </button>
                              )}
                              <button onClick={() => openEdit(m)}
                                className="text-slate-400 hover:text-emerald-300 text-sm">Edit</button>
                              <Link to={`/admin/matches/${m.id}/events`}
                                className="text-emerald-400 hover:underline text-sm">Events</Link>
                              <button onClick={() => handleDeleteMatch(m.id)}
                                className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                            </div>
                          </div>
                          {/* Sub row */}
                          <div className="flex items-center gap-3 mt-1 pl-1">
                            {m.kickoff_at && (
                              <span className="text-slate-500 text-xs">
                                {new Date(m.kickoff_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                {' · '}
                                {new Date(m.kickoff_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {m.venue && (
                              <span className="text-slate-600 text-xs truncate">📍 {m.venue}</span>
                            )}
                            <span className={`text-xs ml-auto ${
                              m.status === 'completed' ? 'text-green-500' :
                              m.status === 'live' ? 'text-red-400 animate-pulse' :
                              m.status === 'penalties' ? 'text-purple-400 animate-pulse' :
                              'text-slate-600'
                            }`}>● {m.status}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
