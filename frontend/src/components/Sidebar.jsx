import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Sidebar() {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { to: '/dashboard/borrowing', label: 'Borrowing', icon: 'bi-bookmark-check' },
    { to: '/dashboard/items', label: 'Collection Items', icon: 'bi-journal-richtext' },
  ];

  if (user?.role === 'admin') {
    navItems[1] = { to: '/dashboard/transactions', label: 'Transactions', icon: 'bi-arrow-left-right' };
    navItems.push({ to: '/dashboard/user-clustering', label: 'User Segmentation', icon: 'bi-people' });
    navItems.push({ to: '/dashboard/reservations', label: 'Reservations', icon: 'bi-pin-angle' });
    navItems.push({ to: '/dashboard/activity', label: 'Activity Log', icon: 'bi-clock-history' });
    navItems.push({ to: '/dashboard/recommendations', label: 'Recommendations', icon: 'bi-lightbulb' });
    navItems.push({ to: '/dashboard/collection-decisions', label: 'Collection Framework', icon: 'bi-clipboard-data' });
  }

  navItems.push({ to: '/dashboard/settings', label: 'Settings', icon: 'bi-gear' });

  return (
    <div className="d-flex flex-column" style={{ width: '260px', minHeight: '100vh', backgroundColor: '#1e293b' }}>
      <div className="p-4 border-bottom" style={{ borderColor: '#334155 !important' }}>
        <div className="d-flex align-items-center">
          <div className="d-inline-flex align-items-center justify-content-center bg-primary rounded-2 me-2" style={{ width: '36px', height: '36px' }}>
            <i className="bi bi-book text-white"></i>
          </div>
          <div>
            <h6 className="text-white fw-bold mb-0" style={{ fontSize: '0.95rem' }}>Library System</h6>
            <small className="text-white-50" style={{ fontSize: '0.7rem' }}>Collection Framework</small>
          </div>
        </div>
      </div>

      <nav className="flex-grow-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              `d-flex align-items-center px-3 py-2 rounded text-decoration-none mb-1 transition ${
                isActive ? 'bg-primary text-white' : 'text-white-50 hover-bg'
              }`
            }
            style={{ fontSize: '0.875rem' }}
          >
            <i className={`bi ${item.icon} me-3`}></i>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-top" style={{ borderColor: '#334155 !important' }}>
        <div className="d-flex align-items-center mb-3">
          <div className="d-inline-flex align-items-center justify-content-center bg-primary rounded-2 me-2" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
            <span className="text-white fw-bold">{user?.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-grow-1">
            <small className="text-white fw-medium d-block" style={{ fontSize: '0.8rem' }}>{user?.name}</small>
            <small className="text-white-50" style={{ fontSize: '0.7rem' }}>{user?.role}</small>
          </div>
        </div>
        <button onClick={logout} className="btn btn-outline-light btn-sm w-100" style={{ fontSize: '0.8rem' }}>
          <i className="bi bi-box-arrow-right me-2"></i>Logout
        </button>
      </div>

      <style>{`
        .hover-bg:hover { background-color: rgba(255,255,255,0.1); }
        .transition { transition: all 0.2s ease; }
      `}</style>
    </div>
  );
}

export default Sidebar;