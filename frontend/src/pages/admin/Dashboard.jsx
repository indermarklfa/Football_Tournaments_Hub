import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (user.role === 'admin') {
      navigate('/admin/super', { replace: true });
    } else {
      navigate('/admin/organiser', { replace: true });
    }
  }, [user, loading]);

  return <div className="text-center py-12 text-slate-400">Loading...</div>;
}