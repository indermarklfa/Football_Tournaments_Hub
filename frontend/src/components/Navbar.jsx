import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-slate-900 text-white px-4 py-3 sticky top-0 z-40 border-b border-slate-800" data-testid="navbar">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight text-white">KasiHub</Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-6">
          <Link to="/" className={`hover:text-emerald-400 text-sm ${!isAdmin ? 'text-emerald-400' : 'text-slate-300'}`}>Public</Link>
          <Link to="/admin/dashboard" className={`hover:text-emerald-400 text-sm ${isAdmin ? 'text-emerald-400' : 'text-slate-300'}`}>Admin</Link>
          {user && (
            <>
              <span className="text-slate-400 text-sm">{user.email}</span>
              <button onClick={logout} className="text-red-400 hover:text-red-300 text-sm" data-testid="logout-btn">Logout</button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden flex flex-col gap-1.5 p-2" aria-label="Menu">
          <span className={`block w-5 h-0.5 bg-white transition-transform ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-transform ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden mt-3 pb-3 border-t border-slate-800 space-y-1 pt-3">
          <Link to="/" onClick={() => setMenuOpen(false)}
            className={`block px-2 py-2 rounded text-sm ${!isAdmin ? 'text-emerald-400' : 'text-slate-300'}`}>
            Public
          </Link>
          <Link to="/admin/dashboard" onClick={() => setMenuOpen(false)}
            className={`block px-2 py-2 rounded text-sm ${isAdmin ? 'text-emerald-400' : 'text-slate-300'}`}>
            Admin
          </Link>
          {user && (
            <>
              <p className="px-2 py-2 text-slate-400 text-sm">{user.email}</p>
              <button onClick={() => { logout(); setMenuOpen(false); }}
                className="block px-2 py-2 text-red-400 text-sm w-full text-left">
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}