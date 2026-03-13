import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getDivision,
  getTeams,
  createTeam,
  updateTeam,
  getOrganizations,
  getClubs,
  getPlayerRegistrations,
  getPlayers,
  createPlayer,
  updatePlayer,
  createPlayerRegistration,
  updatePlayerRegistration,
  deletePlayerRegistration,
} from '../../lib/api';

function parseError(err, fallback) {
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((e) => e.msg || JSON.stringify(e)).join(', ');
  if (typeof detail === 'string') return detail;
  return fallback;
}

function isValidSouthAfricanId(idNumber) {
  if (!idNumber) return true; // optional field
  if (!/^\d{13}$/.test(idNumber)) return false;

  const yymmdd = idNumber.slice(0, 6);
  const yy = yymmdd.slice(0, 2);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);

  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  return true;
}

function playerLabel(player) {
  if (!player) return 'Unknown player';
  const name = `${player.first_name || ''} ${player.last_name || ''}`.trim();
  return name || player.id;
}

export default function DivisionTeams() {
  const { season_id, division_id } = useParams();

  const [division, setDivision] = useState(null);
  const [teams, setTeams] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState('');

  const [playerSearch, setPlayerSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedExistingPlayer, setSelectedExistingPlayer] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [existingSquadNumber, setExistingSquadNumber] = useState('');
  const [registeringExisting, setRegisteringExisting] = useState(false);
  
  const [editingRegistrationId, setEditingRegistrationId] = useState(null);
  const [editPlayerForm, setEditPlayerForm] = useState({
    squad_number: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'male',
    nationality: 'South Africa',
    id_number: '',
    primary_position: '',
    secondary_position: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [creatingPlayer, setCreatingPlayer] = useState(false);
  const [newPlayerError, setNewPlayerError] = useState('');
  const [newPlayerForm, setNewPlayerForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'Male',
    nationality: 'South Africa',
    id_number: '',
    primary_position: '',
    secondary_position: '',
    squad_number: '',
  });

  useEffect(() => {
    loadData();
  }, [season_id, division_id]);

  useEffect(() => {
    if (selectedTeam?.id) {
      loadRegistrations(selectedTeam.id);
    } else {
      setRegistrations([]);
    }
  }, [selectedTeam]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const orgsRes = await getOrganizations();
      const orgId = orgsRes.data[0]?.id;

      const [divRes, teamsRes, clubsRes] = await Promise.all([
        getDivision(division_id),
        getTeams(division_id),
        orgId ? getClubs(orgId) : Promise.resolve({ data: [] }),
      ]);

      setDivision(divRes.data);
      setTeams(teamsRes.data);
      setClubs(clubsRes.data);

      if (selectedTeam) {
        const freshSelected = teamsRes.data.find((t) => t.id === selectedTeam.id) || null;
        setSelectedTeam(freshSelected);
      }
    } catch (err) {
      setError(parseError(err, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrations = async (teamId) => {
    setPlayersLoading(true);
    setPlayersError('');
    try {
      const res = await getPlayerRegistrations(teamId);
      setRegistrations(res.data || []);
    } catch (err) {
      setPlayersError(parseError(err, 'Failed to load registered players'));
    } finally {
      setPlayersLoading(false);
    }
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await createTeam({ club_id: selectedClubId, division_id });
      setShowAddForm(false);
      setSelectedClubId('');
      await loadData();
    } catch (err) {
      setAddError(parseError(err, 'Failed to add team'));
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveTeam = async (id) => {
    if (!window.confirm('Remove this team from the division?')) return;
    try {
      await updateTeam(id, { deleted: true });
      if (selectedTeam?.id === id) {
        setSelectedTeam(null);
        setRegistrations([]);
      }
      setTeams((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(parseError(err, 'Failed to remove team'));
    }
  };

  const handleSearchPlayers = async (term) => {
    const value = term.trim();
    setPlayerSearch(term);
    setSelectedExistingPlayer(null);

    if (!value) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    setSearchError('');
    try {
      const res = await getPlayers({ q: value });
      setSearchResults(res.data || []);
      setShowSearchResults(true);
    } catch (err) {
      setSearchError(parseError(err, 'Failed to search players'));
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRegisterExisting = async () => {
    if (!selectedTeam?.id || !selectedExistingPlayer?.id) return;

    setRegisteringExisting(true);
    setSearchError('');
    try {
      await createPlayerRegistration({
        player_id: selectedExistingPlayer.id,
        team_id: selectedTeam.id,
        squad_number: existingSquadNumber ? parseInt(existingSquadNumber, 10) : null,
      });
      setSelectedExistingPlayer(null);
      setExistingSquadNumber('');
      setPlayerSearch('');
      setSearchResults([]);
      setShowSearchResults(false);
      await loadRegistrations(selectedTeam.id);
    } catch (err) {
      setSearchError(parseError(err, 'Failed to register player'));
    } finally {
      setRegisteringExisting(false);
    }
  };

  const openEditRegistration = (reg) => {
    setEditingRegistrationId(reg.id);
    setEditError('');
    setEditPlayerForm({
      squad_number: reg.squad_number || '',
      first_name: reg.player?.first_name || '',
      last_name: reg.player?.last_name || '',
      date_of_birth: reg.player?.date_of_birth || '',
      gender: reg.player?.gender || 'male',
      nationality: reg.player?.nationality || 'South Africa',
      id_number: reg.player?.id_number || '',
      primary_position: reg.player?.primary_position || '',
      secondary_position: reg.player?.secondary_position || '',
    });
  };

  const handleCreateAndRegister = async (e) => {
    e.preventDefault();
    if (!selectedTeam?.id) return;

    setCreatingPlayer(true);
    setNewPlayerError('');
    try {
      if (!isValidSouthAfricanId(newPlayerForm.id_number)) {
        setNewPlayerError('ID number must be 13 digits and start with a valid YYMMDD date.');
        setCreatingPlayer(false);
        return;
      }
      const playerRes = await createPlayer({
        first_name: newPlayerForm.first_name,
        last_name: newPlayerForm.last_name,
        date_of_birth: newPlayerForm.date_of_birth || null,
        gender: newPlayerForm.gender || null,
        nationality: newPlayerForm.nationality || null,
        id_number: newPlayerForm.id_number || null,
        primary_position: newPlayerForm.primary_position || null,
        secondary_position: newPlayerForm.secondary_position || null,
      });

      await createPlayerRegistration({
        player_id: playerRes.data.id,
        team_id: selectedTeam.id,
        squad_number: newPlayerForm.squad_number ? parseInt(newPlayerForm.squad_number, 10) : null,
      });

      setNewPlayerForm({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'Male',
        nationality: 'South Africa',
        id_number: '',
        primary_position: '',
        secondary_position: '',
        squad_number: '',
      });
      setShowNewPlayerForm(false);
      await loadRegistrations(selectedTeam.id);
    } catch (err) {
      setNewPlayerError(parseError(err, 'Failed to create and register player'));
    } finally {
      setCreatingPlayer(false);
    }
  };

  const handleSaveRegistrationEdit = async (reg) => {
    if (!reg.player?.id) return;

    setEditSaving(true);
    setEditError('');

    try {
      if (!isValidSouthAfricanId(editPlayerForm.id_number)) {
        setEditError('ID number must be 13 digits and start with a valid YYMMDD date.');
        setEditSaving(false);
        return;
      }

      await updatePlayer(reg.player.id, {
        first_name: editPlayerForm.first_name,
        last_name: editPlayerForm.last_name,
        date_of_birth: editPlayerForm.date_of_birth || null,
        gender: editPlayerForm.gender || null,
        nationality: editPlayerForm.nationality || null,
        id_number: editPlayerForm.id_number || null,
        primary_position: editPlayerForm.primary_position || null,
        secondary_position: editPlayerForm.secondary_position || null,
      });

      await updatePlayerRegistration(reg.id, {
        squad_number: editPlayerForm.squad_number ? parseInt(editPlayerForm.squad_number, 10) : null,
      });

      setEditingRegistrationId(null);
      if (selectedTeam?.id) {
        await loadRegistrations(selectedTeam.id);
      }
    } catch (err) {
      setEditError(parseError(err, 'Failed to update player'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeregister = async (registrationId) => {
    if (!window.confirm('Remove this player from the team?')) return;
    try {
      await deletePlayerRegistration(registrationId);
      if (selectedTeam?.id) {
        await loadRegistrations(selectedTeam.id);
      }
    } catch (err) {
      setPlayersError(parseError(err, 'Failed to deregister player'));
    }
  };

  const clubMap = Object.fromEntries(clubs.map((c) => [c.id, c.name]));

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link
          to={`/admin/seasons/${season_id}/divisions`}
          className="text-emerald-400 text-sm hover:underline"
        >
          ← Back to Divisions
        </Link>
        <h1 className="text-2xl font-bold text-white mt-2">
          {division?.name} — Teams & Players
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {division?.format} · {division?.age_group} · {teams.length} team{teams.length !== 1 ? 's' : ''}
        </p>
      </div>

      {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4">{error}</div>}

      <div className="mb-6">
        {!showAddForm ? (
          <button
            onClick={() => {
              setShowAddForm(true);
              setAddError('');
              setSelectedClubId('');
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
          >
            + Add Team
          </button>
        ) : (
          <form onSubmit={handleAddTeam} className="bg-slate-800 p-4 rounded-lg space-y-3">
            <p className="text-slate-300 text-sm font-medium">Add a club to this division</p>
            {addError && <div className="bg-red-900/50 text-red-300 p-2 rounded text-sm">{addError}</div>}
            <div>
              <label className="block text-slate-400 text-xs mb-1">Club *</label>
              <select
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                required
                className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">— Select a club —</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-slate-500 text-xs">
              Team name will be auto-generated from club name and age group.
            </p>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addLoading || !selectedClubId}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium"
              >
                {addLoading ? 'Adding...' : 'Add Team'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setAddError('');
                }}
                className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div>
          {teams.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-800 rounded-lg">
              No teams in this division yet. Add one above.
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left px-4 py-3">Team Name</th>
                    <th className="text-left px-4 py-3">Club</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t, index) => (
                    <tr
                      key={t.id}
                      className={`border-b border-slate-700/50 ${index % 2 === 0 ? '' : 'bg-slate-700/20'} ${
                        selectedTeam?.id === t.id ? 'bg-emerald-900/20' : ''
                      }`}
                    >
                      <td
                        className="px-4 py-3 text-white font-medium cursor-pointer"
                        onClick={() => setSelectedTeam(t)}
                      >
                        {t.display_name}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{clubMap[t.club_id] || '—'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTeam(t)}
                          className="text-emerald-400 hover:text-emerald-300 text-sm mr-3"
                        >
                          Players
                        </button>
                        <button
                          onClick={() => handleRemoveTeam(t.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          {!selectedTeam ? (
            <div className="bg-slate-800 rounded-lg p-6 text-slate-500 text-center">
              Select a team to manage registered players.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-4">
                <h2 className="text-white font-semibold text-lg">{selectedTeam.display_name}</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Manage players registered to this team
                </p>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 space-y-4">
                <h3 className="text-white font-medium">Register Existing Player</h3>
                {searchError && <div className="bg-red-900/50 text-red-300 p-2 rounded text-sm">{searchError}</div>}
                <div className="space-y-3">
                  <div className="relative">
                    <label className="block text-slate-400 text-xs mb-1">Search Player</label>
                    <input
                      value={playerSearch}
                      onChange={(e) => handleSearchPlayers(e.target.value)}
                      onFocus={() => {
                        if (searchResults.length > 0) setShowSearchResults(true);
                      }}
                      placeholder="Type player name..."
                      className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                    />

                    {showSearchResults && playerSearch.trim() && (
                      <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {searchLoading ? (
                          <div className="px-3 py-2 text-slate-400 text-sm">Searching...</div>
                        ) : searchResults.length === 0 ? (
                          <div className="px-3 py-2 text-slate-500 text-sm">No players found</div>
                        ) : (
                          searchResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedExistingPlayer(p);
                                setPlayerSearch(playerLabel(p));
                                setShowSearchResults(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-700 text-sm text-white border-b border-slate-700 last:border-0"
                            >
                              <div>{playerLabel(p)}</div>
                              <div className="text-slate-500 text-xs">
                                {p.primary_position
                                  ? p.primary_position.charAt(0).toUpperCase() + p.primary_position.slice(1)
                                  : 'No position'}
                                {p.date_of_birth ? ` · DOB: ${p.date_of_birth}` : ''}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {selectedExistingPlayer && (
                    <div className="bg-slate-700/40 rounded p-3">
                      <p className="text-white text-sm font-medium">{playerLabel(selectedExistingPlayer)}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        {selectedExistingPlayer.primary_position
                          ? selectedExistingPlayer.primary_position.charAt(0).toUpperCase() + selectedExistingPlayer.primary_position.slice(1)
                          : 'No position'}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Squad Number</label>
                    <input
                      type="number"
                      min="1"
                      value={existingSquadNumber}
                      onChange={(e) => setExistingSquadNumber(e.target.value)}
                      className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                    />
                  </div>

                  <button
                    onClick={handleRegisterExisting}
                    disabled={!selectedExistingPlayer || registeringExisting}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
                  >
                    {registeringExisting ? 'Registering...' : 'Register Player'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">Create New Player</h3>
                  <button
                    onClick={() => setShowNewPlayerForm((prev) => !prev)}
                    className="text-emerald-400 hover:text-emerald-300 text-sm"
                  >
                    {showNewPlayerForm ? 'Hide' : 'New Player'}
                  </button>
                </div>

                {showNewPlayerForm && (
                  <form onSubmit={handleCreateAndRegister} className="space-y-3">
                    {newPlayerError && (
                      <div className="bg-red-900/50 text-red-300 p-2 rounded text-sm">{newPlayerError}</div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 text-xs mb-1">First Name *</label>
                        <input
                          value={newPlayerForm.first_name}
                          onChange={(e) => setNewPlayerForm({ ...newPlayerForm, first_name: e.target.value })}
                          required
                          className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-xs mb-1">Last Name *</label>
                        <input
                          value={newPlayerForm.last_name}
                          onChange={(e) => setNewPlayerForm({ ...newPlayerForm, last_name: e.target.value })}
                          required
                          className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 text-xs mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={newPlayerForm.date_of_birth}
                          onChange={(e) => setNewPlayerForm({ ...newPlayerForm, date_of_birth: e.target.value })}
                          className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-xs mb-1">Gender</label>
                        <select
                          value={newPlayerForm.gender}
                          onChange={(e) => setNewPlayerForm({ ...newPlayerForm, gender: e.target.value })}
                          className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 text-xs mb-1">Nationality</label>
                        <input
                          value={newPlayerForm.nationality}
                          onChange={(e) => setNewPlayerForm({ ...newPlayerForm, nationality: e.target.value })}
                          className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-xs mb-1">ID Number</label>
                        <input
                          value={newPlayerForm.id_number}
                          onChange={(e) => setNewPlayerForm({ ...newPlayerForm, id_number: e.target.value })}
                          className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 text-xs mb-1">Primary Position</label>
                        <select
                          value={newPlayerForm.primary_position}
                          onChange={(e) => setNewPlayerForm({ ...newPlayerForm, primary_position: e.target.value })}
                          className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                        >
                          <option value="">— Select —</option>
                          <option value="goalkeeper">Goalkeeper</option>
                          <option value="defender">Defender</option>
                          <option value="midfielder">Midfielder</option>
                          <option value="forward">Forward</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 text-xs mb-1">Secondary Position</label>
                        <select
                          value={newPlayerForm.secondary_position}
                          onChange={(e) => setNewPlayerForm({ ...newPlayerForm, secondary_position: e.target.value })}
                          className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                        >
                          <option value="">— Select —</option>
                          <option value="goalkeeper">Goalkeeper</option>
                          <option value="defender">Defender</option>
                          <option value="midfielder">Midfielder</option>
                          <option value="forward">Forward</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 text-xs mb-1">Squad Number</label>
                        <input
                          type="number"
                          min="1"
                          value={newPlayerForm.squad_number}
                          onChange={(e) => setNewPlayerForm({ ...newPlayerForm, squad_number: e.target.value })}
                          className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={creatingPlayer}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
                    >
                      {creatingPlayer ? 'Creating...' : 'Create & Register'}
                    </button>
                  </form>
                )}
              </div>

              <div className="bg-slate-800 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700">
                  <h3 className="text-white font-medium">Registered Players</h3>
                </div>

                {playersError && <div className="bg-red-900/50 text-red-300 p-3 text-sm">{playersError}</div>}

                {playersLoading ? (
                  <div className="text-center py-8 text-slate-400">Loading players...</div>
                ) : registrations.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No registered players yet.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="text-left px-4 py-3">Squad</th>
                        <th className="text-left px-4 py-3">Player</th>
                        <th className="text-left px-4 py-3">Position</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.map((reg, index) => (
                        <React.Fragment key={reg.id}>
                          <tr
                            className={`border-b border-slate-700/50 ${index % 2 === 0 ? '' : 'bg-slate-700/20'}`}
                          >
                            <td className="px-4 py-3 text-slate-300">{reg.squad_number || '—'}</td>
                            <td className="px-4 py-3 text-white">
                              {reg.player ? playerLabel(reg.player) : reg.player_id}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {reg.player?.primary_position
                                ? reg.player.primary_position.charAt(0).toUpperCase() + reg.player.primary_position.slice(1)
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => openEditRegistration(reg)}
                                className="text-emerald-400 hover:text-emerald-300 text-sm mr-3"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeregister(reg.id)}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>

                          {editingRegistrationId === reg.id && (
                            <tr>
                              <td colSpan="4" className="px-4 py-4 bg-slate-700/30 border-b border-slate-700">
                                {editError && <div className="bg-red-900/50 text-red-300 p-2 rounded mb-3 text-sm">{editError}</div>}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                  <div>
                                    <label className="block text-slate-400 text-xs mb-1">Squad Number</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={editPlayerForm.squad_number}
                                      onChange={(e) => setEditPlayerForm({ ...editPlayerForm, squad_number: e.target.value })}
                                      className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-slate-400 text-xs mb-1">First Name</label>
                                    <input
                                      value={editPlayerForm.first_name}
                                      onChange={(e) => setEditPlayerForm({ ...editPlayerForm, first_name: e.target.value })}
                                      className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-slate-400 text-xs mb-1">Last Name</label>
                                    <input
                                      value={editPlayerForm.last_name}
                                      onChange={(e) => setEditPlayerForm({ ...editPlayerForm, last_name: e.target.value })}
                                      className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                  <div>
                                    <label className="block text-slate-400 text-xs mb-1">Date of Birth</label>
                                    <input
                                      type="date"
                                      value={editPlayerForm.date_of_birth}
                                      onChange={(e) => setEditPlayerForm({ ...editPlayerForm, date_of_birth: e.target.value })}
                                      className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-slate-400 text-xs mb-1">Gender</label>
                                    <select
                                      value={editPlayerForm.gender}
                                      onChange={(e) => setEditPlayerForm({ ...editPlayerForm, gender: e.target.value })}
                                      className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                                    >
                                      <option value="male">Male</option>
                                      <option value="female">Female</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-slate-400 text-xs mb-1">Nationality</label>
                                    <input
                                      value={editPlayerForm.nationality}
                                      onChange={(e) => setEditPlayerForm({ ...editPlayerForm, nationality: e.target.value })}
                                      className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                  <div>
                                    <label className="block text-slate-400 text-xs mb-1">ID Number</label>
                                    <input
                                      value={editPlayerForm.id_number}
                                      onChange={(e) => setEditPlayerForm({ ...editPlayerForm, id_number: e.target.value })}
                                      className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-slate-400 text-xs mb-1">Primary Position</label>
                                    <select
                                      value={editPlayerForm.primary_position}
                                      onChange={(e) => setEditPlayerForm({ ...editPlayerForm, primary_position: e.target.value })}
                                      className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                                    >
                                      <option value="">— Select —</option>
                                      <option value="goalkeeper">Goalkeeper</option>
                                      <option value="defender">Defender</option>
                                      <option value="midfielder">Midfielder</option>
                                      <option value="forward">Forward</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-slate-400 text-xs mb-1">Secondary Position</label>
                                    <select
                                      value={editPlayerForm.secondary_position}
                                      onChange={(e) => setEditPlayerForm({ ...editPlayerForm, secondary_position: e.target.value })}
                                      className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                                    >
                                      <option value="">— Select —</option>
                                      <option value="goalkeeper">Goalkeeper</option>
                                      <option value="defender">Defender</option>
                                      <option value="midfielder">Midfielder</option>
                                      <option value="forward">Forward</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSaveRegistrationEdit(reg)}
                                    disabled={editSaving}
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
                                  >
                                    {editSaving ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => setEditingRegistrationId(null)}
                                    className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}