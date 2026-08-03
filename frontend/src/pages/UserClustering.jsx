import { useState, useEffect } from 'react';
import { getUserClustering, getRecommendationsForMe } from '../api/analytics';
import { useToast } from '../components/Toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];

function UserClustering() {
  const { addToast } = useToast();
  const [data, setData] = useState({ clusters: [], summary: [], totalUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [recUser, setRecUser] = useState(null);
  const [recs, setRecs] = useState([]);
  const [recLoading, setRecLoading] = useState(false);

  useEffect(() => {
    getUserClustering()
      .then(setData)
      .catch(() => addToast('Failed to load user clusters', 'danger'))
      .finally(() => setLoading(false));
  }, []);

  const viewRecommendations = async (u) => {
    setRecUser(u);
    setRecLoading(true);
    setRecs([]);
    try {
      const d = await getRecommendationsForMe(u.userId);
      setRecs(d.recommendations || []);
    } catch (e) {
      addToast('Failed to load recommendations', 'danger');
    } finally {
      setRecLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  const pieData = data.summary.map((s) => ({ name: s.label, value: s.count }));

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">User Segmentation — Unsupervised Learning</h4>
        <p className="text-muted small mb-0">
          K-Means clustering of users based on borrowing behavior and usage patterns
        </p>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white pt-4 px-4 border-bottom-0">
              <h6 className="fw-bold mb-0">User Distribution by Cluster</h6>
              <small className="text-muted">Total users: {data.totalUsers}</small>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3} label>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white pt-4 px-4 border-bottom-0">
              <h6 className="fw-bold mb-0">Average Borrows per Cluster</h6>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.summary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgBorrows" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {data.summary.map((s, idx) => (
        <div key={s.cluster} className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white pt-3 px-4 border-bottom-0 d-flex align-items-center">
            <span className="badge me-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}>{s.label}</span>
            <span className="badge bg-secondary ms-2">{s.count} users</span>
            <div className="ms-auto d-flex gap-3 small text-muted">
              <span><i className="bi bi-arrow-repeat me-1"></i>{s.avgBorrows} avg borrows</span>
              <span><i className="bi bi-clock me-1"></i>{s.avgDwell} avg dwell (days)</span>
              <span><i className="bi bi-exclamation-triangle me-1"></i>{s.overdueTotal} overdue</span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="small">User</th>
                  <th className="small">Dept</th>
                  <th className="small">Borrows</th>
                  <th className="small">Renewals</th>
                  <th className="small">Avg Dwell</th>
                  <th className="small">Overdue</th>
                  <th className="small">Categories</th>
                  <th className="small">Departments</th>
                  <th className="small"></th>
                </tr>
              </thead>
              <tbody>
                {data.clusters.filter((u) => u.cluster === s.cluster).map((u) => (
                  <tr key={u.userId}>
                    <td className="fw-medium">{u.name}</td>
                    <td className="text-muted">{u.department}</td>
                    <td>{u.totalBorrows}</td>
                    <td>{u.totalRenewals}</td>
                    <td>{u.avgDwellTime}</td>
                    <td><span className={u.overdue > 0 ? 'text-danger fw-medium' : ''}>{u.overdue}</span></td>
                    <td>{u.categoriesBorrowed}</td>
                    <td>{u.departmentsBorrowed}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => viewRecommendations(u)}
                        title="View recommended books for this user">
                        <i className="bi bi-stars me-1"></i>Recommend
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {recUser && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold"><i className="bi bi-stars me-2"></i>Recommended for {recUser.name}</h5>
                <button type="button" className="btn-close" onClick={() => setRecUser(null)}></button>
              </div>
              <div className="modal-body">
                {recLoading ? (
                  <div className="text-center p-5">
                    <div className="spinner-border text-primary" role="status"></div>
                  </div>
                ) : recs.length === 0 ? (
                  <div className="text-center p-5 text-muted">
                    <i className="bi bi-stars fs-1 d-block mb-2"></i>
                    <span>No recommendations available for this user.</span>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="small">Title</th>
                          <th className="small">Author</th>
                          <th className="small">Category</th>
                          <th className="small">Why</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recs.map((r) => (
                          <tr key={r._id}>
                            <td className="fw-medium">{r.title}</td>
                            <td className="text-muted">{r.author}</td>
                            <td><span className="badge bg-primary bg-opacity-10 text-primary">{r.category}</span></td>
                            <td className="text-muted small">{r.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer border-top-0">
                <button type="button" className="btn btn-light" onClick={() => setRecUser(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserClustering;