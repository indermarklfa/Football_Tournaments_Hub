import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPlayers, createPlayer, updatePlayer } from '../../lib/api';

function parseError(err, fallback) {
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((e) => e.msg || JSON.stringify(e)).join(', ');
  if (typeof detail === 'string') return detail;
  return fallback;
}

function isValidSouthAfricanId(idNumber) {
  if (!idNumber) return true;
  if (!/^\d{13}$/.test(idNumber)) return false;

  const mm = parseInt(idNumber.slice(2, 4), 10);
  const dd = parseInt(idNumber.slice(4, 6), 10);

  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;

  return true;
}

function playerLabel(player) {
  return `${player.first_name || ''} ${player.last_name || ''}`.trim();
}

export default function PlayerList() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'male',
    nationality: 'South Africa',
    id_number: '',
    primary_position: '',
    secondary_position: '',
  });

  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'male',
    nationality: 'South Africa',
    id_number: '',
    primary_position: '',
    secondary_position: '',
  });

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async (q = '') => {
    if (q) setSearchLoading(true);
    else setLoading(true);

    setError('');
    try {
      const res = await getPlayers({ q: q || undefined });
      setPlayers(res.data || []);
    } catch (err) {
      setError(parseError(err, 'Failed to load players'));
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await loadPlayers(search.trim());
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');

    try {
      if (!isValidSouthAfricanId(createForm.id_number)) {
        setCreateError('ID number must be 13 digits and start with a valid YYMMDD date.');
        setCreateLoading(false);
        return;
      }

      await createPlayer({
        first_name: createForm.first_name,
        last_name: createForm.last_name,
        date_of_birth: createForm.date_of_birth || null,
        gender: createForm.gender || null,
        nationality: createForm.nationality || null,
        id_number: createForm.id_number || null,
        primary_position: createForm.primary_position || null,
        secondary_position: createForm.secondary_position || null,
      });

      setCreateForm({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'male',
        nationality: 'South Africa',
        id_number: '',
        primary_position: '',
        secondary_position: '',
      });
      setShowCreateForm(false);
      await loadPlayers(search.trim());
    } catch (err) {
      setCreateError(parseError(err, 'Failed to create player'));
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (player) => {
    setEditingPlayerId(player.id);
    setEditError('');
    setEditForm({
      first_name: player.first_name || '',
      last_name: player.last_name || '',
      date_of_birth: player.date_of_birth || '',
      gender: player.gender || 'male',
      nationality: player.nationality || 'South Africa',
      id_number: player.id_number || '',
      primary_position: player.primary_position || '',
      secondary_position: player.secondary_position || '',
    });
  };

  const handleSaveEdit = async (playerId) => {
    setEditSaving(true);
    setEditError('');

    try {
      if (!isValidSouthAfricanId(editForm.id_number)) {
        setEditError('ID number must be 13 digits and start with a valid YYMMDD date.');
        setEditSaving(false);
        return;
      }

      await updatePlayer(playerId, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        date_of_birth: editForm.date_of_birth || null,
        gender: editForm.gender || null,
        nationality: editForm.nationality || null,
        id_number: editForm.id_number || null,
        primary_position: editForm.primary_position || null,
        secondary_position: editForm.secondary_position || null,
      });

      setEditingPlayerId(null);
      await loadPlayers(search.trim());
    } catch (err) {
      setEditError(parseError(err, 'Failed to update player'));
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link to="/admin/organiser" className="text-emerald-400 text-sm hover:underline">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white mt-2">Players</h1>
        <p className="text-slate-400 text-sm mt-1">Global player directory and profile management</p>
      </div>

      {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4">{error}</div>}

      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[260px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players by name"
              className="flex-1 bg-slate-700 text-white px-3 py-2 rounded text-sm"
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </form>

          <button
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setCreateError('');
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
          >
            {showCreateForm ? 'Close' : '+ New Player'}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreate} className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 mb-6 space-y-4">
          <h2 className="text-white font-medium">Create Player</h2>
          {createError && <div className="bg-red-900/50 text-red-300 p-3 rounded text-sm">{createError}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">First Name *</label>
              <input
                value={createForm.first_name}
                onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                required
                className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Last Name *</label>
              <input
                value={createForm.last_name}
                onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                required
                className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Date of Birth</label>
              <input
                type="date"
                value={createForm.date_of_birth}
                onChange={(e) => setCreateForm({ ...createForm, date_of_birth: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Gender</label>
              <select
                value={createForm.gender}
                onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Nationality</label>
              <input
                value={createForm.nationality}
                onChange={(e) => setCreateForm({ ...createForm, nationality: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">ID Number</label>
              <input
                value={createForm.id_number}
                onChange={(e) => setCreateForm({ ...createForm, id_number: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Primary Position</label>
              <select
                value={createForm.primary_position}
                onChange={(e) => setCreateForm({ ...createForm, primary_position: e.target.value })}
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
                value={createForm.secondary_position}
                onChange={(e) => setCreateForm({ ...createForm, secondary_position: e.target.value })}
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
              type="submit"
              disabled={createLoading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
            >
              {createLoading ? 'Creating...' : 'Create Player'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700">
          <h2 className="text-white font-medium">Player Directory</h2>
        </div>

        {players.length === 0 ? (
          <div className="text-center py-10 text-slate-500">No players found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left px-4 py-3">Player</th>
                <th className="text-left px-4 py-3">DOB</th>
                <th className="text-left px-4 py-3">Gender</th>
                <th className="text-left px-4 py-3">Primary Position</th>
                <th className="text-left px-4 py-3">Nationality</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => (
                <React.Fragment key={player.id}>
                  <tr className={`border-b border-slate-700/50 ${index % 2 === 0 ? '' : 'bg-slate-700/20'}`}>
                    <td className="px-4 py-3 text-white font-medium">{playerLabel(player)}</td>
                    <td className="px-4 py-3 text-slate-300">{player.date_of_birth || '—'}</td>
                    <td className="px-4 py-3 text-slate-300">{player.gender || '—'}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {player.primary_position
                        ? player.primary_position.charAt(0).toUpperCase() + player.primary_position.slice(1)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{player.nationality || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(player)}
                        className="text-emerald-400 hover:text-emerald-300 text-sm"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>

                  {editingPlayerId === player.id && (
                    <tr>
                      <td colSpan="6" className="px-4 py-4 bg-slate-700/30 border-b border-slate-700">
                        {editError && <div className="bg-red-900/50 text-red-300 p-2 rounded mb-3 text-sm">{editError}</div>}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-slate-400 text-xs mb-1">First Name</label>
                            <input
                              value={editForm.first_name}
                              onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-xs mb-1">Last Name</label>
                            <input
                              value={editForm.last_name}
                              onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <div>
                            <label className="block text-slate-400 text-xs mb-1">Date of Birth</label>
                            <input
                              type="date"
                              value={editForm.date_of_birth}
                              onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-xs mb-1">Gender</label>
                            <select
                              value={editForm.gender}
                              onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                            >
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-slate-400 text-xs mb-1">Nationality</label>
                            <input
                              value={editForm.nationality}
                              onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <div>
                            <label className="block text-slate-400 text-xs mb-1">ID Number</label>
                            <input
                              value={editForm.id_number}
                              onChange={(e) => setEditForm({ ...editForm, id_number: e.target.value })}
                              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-xs mb-1">Primary Position</label>
                            <select
                              value={editForm.primary_position}
                              onChange={(e) => setEditForm({ ...editForm, primary_position: e.target.value })}
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
                              value={editForm.secondary_position}
                              onChange={(e) => setEditForm({ ...editForm, secondary_position: e.target.value })}
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
                            onClick={() => handleSaveEdit(player.id)}
                            disabled={editSaving}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
                          >
                            {editSaving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingPlayerId(null)}
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
  );
}