import { useState, useEffect } from 'react';
import { getActivities } from '../api/analytics';
import { useToast } from '../components/Toast';

function ActivityLog() {
  const { addToast } = useToast();
  const [activities, setActivities] = useState([]);
  const [actions, setActions] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getActivities(filter);
      setActivities(data.activities || []);
      setActions(data.actions || []);
    } catch (e) {
      addToast('Failed to load activity log', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const ACTION_COLORS = {
    'Add Item': 'success', 'CSV Upload': 'success', 'Update Item Status': 'primary',
    'Borrow': 'info', 'Return': 'info', 'Reserve': 'warning', 'Cancel Reservation': 'warning',
    'Run Clustering': 'dark', 'Update Settings': 'danger', 'User Registered': 'secondary',
    'Admin Registered': 'secondary',
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h4 className="fw-bold mb-1">Activity Log</h4>
          <p className="text-muted small mb-0">Audit trail of all system & administrative actions</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <label className="small text-muted">Filter:</label>
          <select className="form-select form-select-sm w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All Actions</option>
            {actions.map((a) => <option key={a}>{a}</option>)}
          </select>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => load()}>
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="small fw-semibold">Time</th>
                <th className="small fw-semibold">User</th>
                <th className="small fw-semibold">Action</th>
                <th className="small fw-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr><td colSpan="4" className="text-center text-muted py-4">No activity recorded yet.</td></tr>
              ) : activities.map((a) => (
                <tr key={a._id}>
                  <td className="text-muted small">{a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}</td>
                  <td className="fw-medium">{a.userName}</td>
                  <td><span className={`badge bg-${ACTION_COLORS[a.action] || 'secondary'}`}>{a.action}</span></td>
                  <td className="text-muted small">{a.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ActivityLog;