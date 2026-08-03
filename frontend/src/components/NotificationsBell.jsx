import { useState, useEffect, useRef } from 'react';
import { getNotifications, markNotificationsRead } from '../api/analytics';

const TYPE_ICON = {
  due_reminder: 'bi-clock-history text-warning',
  available: 'bi-check2-circle text-success',
  fine: 'bi-cash-coin text-danger',
};

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const ref = useRef(null);

  useEffect(() => {
    getNotifications().then(setData).catch(() => {});
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async () => {
    await markNotificationsRead();
    setData((d) => ({ ...d, unread: 0, notifications: d.notifications.map((n) => ({ ...n, isRead: true })) }));
  };

  return (
    <div className="position-relative" ref={ref}>
      <button className="btn btn-light position-relative" onClick={() => { setOpen(!open); if (open) setData((d) => ({ ...d, unread: 0 })); }}>
        <i className="bi bi-bell"></i>
        {data.unread > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
            {data.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="position-absolute end-0 mt-2 shadow rounded-3 bg-white border" style={{ width: '340px', zIndex: 1050 }}>
          <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
            <strong className="small">Notifications</strong>
            {data.unread > 0 && (
              <button className="btn btn-sm btn-link p-0 small text-primary" onClick={handleMarkRead}>Mark all read</button>
            )}
          </div>
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {data.notifications.length === 0 && (
              <div className="p-4 text-center text-muted small">No notifications</div>
            )}
            {data.notifications.map((n) => (
              <div key={n._id} className={`px-3 py-2 border-bottom d-flex ${!n.isRead ? 'bg-primary bg-opacity-10' : ''}`}>
                <i className={`bi ${TYPE_ICON[n.type] || 'bi-bell'} me-2 mt-1`}></i>
                <div>
                  <div className="small fw-medium">{n.title}</div>
                  <div className="small text-muted">{n.message}</div>
                  <div className="small text-muted-55 text-secondary">{n.createdAt?.slice(0, 19)?.replace('T', ' ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationsBell;