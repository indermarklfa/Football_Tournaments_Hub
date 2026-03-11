import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createSeason, getCompetition } from '../../lib/api';

export default function NewEdition() {
  const [searchParams] = useSearchParams();
  const competitionId = searchParams.get('competition_id');
  const [competition, setCompetition] = useState(null);
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [venue, setVenue] = useState('');
  const [format, setFormat] = useState('groups_knockout');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (competitionId) {
      getCompetition(competitionId).then((res) => {
        setCompetition(res.data);
        setName(`${res.data.name} ${year}`);
      });
    }
  }, [competitionId, year]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createSeason({
        competition_id: competitionId,
        name,
        year: parseInt(year),
        venue: venue || null,
        format,
        status: 'upcoming',
        start_date: startDate || null,
        end_date: endDate || null,
      });
      navigate(`/admin/seasons/${res.data.id}/divisions`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create season');
    } finally {
      setLoading(false);
    }
  };

  if (!competition) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4" data-testid="new-edition-page">
      <h1 className="text-2xl font-bold text-white mb-2">New Season</h1>
      <p className="text-slate-400 mb-6">For {competition.name}</p>
      {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-lg space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 mb-1">Season Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full bg-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              data-testid="name-input" />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Year *</label>
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} required
              className="w-full bg-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              data-testid="year-input" />
          </div>
        </div>
        <div>
          <label className="block text-slate-300 mb-1">Venue(s) <span className="text-slate-500 text-xs">— separate multiple with a comma</span></label>
          <input value={venue} onChange={(e) => setVenue(e.target.value)}
            className="w-full bg-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-slate-300 mb-1">Format *</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}
            className="w-full bg-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="knockout">Knockout</option>
            <option value="groups_knockout">Groups + Knockout</option>
            <option value="league">League</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded font-medium disabled:opacity-50"
            data-testid="submit-btn">{loading ? 'Creating...' : 'Create Season'}</button>
          <button type="button" onClick={() => navigate(-1)}
            className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-2 rounded">Cancel</button>
        </div>
      </form>
    </div>
  );
}
