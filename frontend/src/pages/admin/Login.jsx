import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as apiLogin } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiLogin(email, password);
      login(res.data.access_token, { email });
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center" data-testid="login-page">
      <div className="bg-slate-800 p-8 rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6">Admin Login</h1>
        {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4" data-testid="login-error">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              data-testid="email-input" />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full bg-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              data-testid="password-input" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded font-medium disabled:opacity-50"
            data-testid="login-submit">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="text-slate-400 text-center mt-4">
          No account? <Link to="/admin/register" className="text-emerald-400 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
