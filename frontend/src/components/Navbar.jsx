import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <nav className="bg-slate-900 text-white px-6 py-4" data-testid="navbar">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">FixtureForge</Link>
        <div className="flex items-center gap-6">
          <Link to="/" className={`hover:text-emerald-400 ${!isAdmin ? 'text-emerald-400' : ''}`}>Public</Link>
          <Link to="/admin/dashboard" className={`hover:text-emerald-400 ${isAdmin ? 'text-emerald-400' : ''}`}>Admin</Link>
          {user && (
            <>
              <span className="text-slate-400 text-sm">{user.email}</span>
              <button onClick={logout} className="text-red-400 hover:text-red-300 text-sm" data-testid="logout-btn">Logout</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
