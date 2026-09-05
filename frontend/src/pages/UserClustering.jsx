import { useState, useEffect } from 'react';
import { getUserClustering, getRecommendationsForMe, runUserClustering } from '../api/analytics';
import { useToast } from '../components/Toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];

function UserClustering() {
  const { addToast } = useToast();
  const [data, setData] = useState({ clusters: [], summary: [], totalUsers: 0, metrics: {} });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [recUser, setRecUser] = useState(null);
  const [recs, setRecs] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [kValue, setKValue] = useState(null);
  const [kMethod, setKMethod] = useState('Heuristic: K = 2 if active users < 6 else 3');

  useEffect(() => {
    getUserClustering()
      .then(setData)
      .catch(() => addToast('Failed to load user clusters', 'danger'))
      .finally(() => setLoading(false));
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const fresh = await getUserClustering();
      setData(fresh);
      if (fresh.k) setKValue(fresh.k);
    } catch (e) {
      addToast('Failed to load user clusters', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleRunClustering = async () => {
    setRunning(true);
    try {
      const result = await runUserClustering();
      addToast('User clustering completed successfully!', 'success');
      if (result.k) setKValue(result.k);
      await loadData();
    } catch (error) {
      let message = 'Failed to run clustering';
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        message = 'Clustering timed out. Please try again.';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      addToast(message, 'danger');
    } finally {
      setRunning(false);
    }
  };

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

  const pieData = data.summary.map((s) => ({ name: `Cluster ${s.cluster} \u2013 ${s.label}`, value: s.count }));
  const chartData = data.summary.map((s) => ({ ...s, chartName: `Cluster ${s.cluster} \u2013 ${s.label}` }));

  const renderModal = () => {
    if (!recUser) return null;
    return (
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
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">User Segmentation — Unsupervised Learning</h4>
          <p className="text-muted small mb-0">
            K-Means clustering of users based on borrowing behavior and usage patterns
          </p>
        </div>
        <div className="d-flex align-items-center gap-3">
          <span className={`badge ${running ? 'bg-info' : kValue ? 'bg-success' : 'bg-warning text-dark'} fs-6`}>
            {running ? <><span className="spinner-border spinner-border-sm me-1"></span>Running...</> : kValue ? <><i className="bi bi-check-circle me-1"></i>Completed</> : <><i className="bi bi-circle me-1"></i>Not Yet Run</>}
          </span>
          <button className="btn btn-dark btn-sm" onClick={handleRunClustering} disabled={running}>
            {running ? (
              <><span className="spinner-border spinner-border-sm me-1"></span>Running...</>
            ) : (
              <><i className="bi bi-play-fill me-1"></i>Run Clustering</>
            )}
          </button>
        </div>
      </div>

      {kValue && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white pt-4 px-4 border-bottom-0">
            <h6 className="fw-bold mb-0"><i className="bi bi-123 me-2"></i>Selected K Value</h6>
          </div>
          <div className="card-body">
            <div className="row g-3 align-items-center">
              <div className="col-md-4 text-center">
                <div className="display-4 fw-bold text-primary">{kValue}</div>
                <small className="text-muted">Number of Clusters (K)</small>
              </div>
              <div className="col-md-8">
                <h6 className="small fw-semibold text-muted mb-2">K Selection Method</h6>
                <p className="small mb-0">{kMethod}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white pt-4 px-4 border-bottom-0">
          <h6 className="fw-bold mb-0"><i className="bi bi-diagram-3 me-2"></i>User Clustering → Analytics Flow</h6>
          <small className="text-muted">How K-Means user segmentation drives library insights and services</small>
        </div>
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-2 text-center">
              <div className="badge bg-primary p-3 fs-6"><i className="bi bi-people-fill fs-4"></i></div>
              <small className="text-muted d-block mt-2 fw-medium">User Segmentation</small>
              <small className="text-muted">K-Means by behavior patterns</small>
            </div>
            <div className="col-md-1 text-center">
              <i className="bi bi-arrow-right fs-3 text-muted"></i>
            </div>
            <div className="col-md-3 text-center">
              <div className="badge bg-info p-3 fs-6"><i className="bi bi-search fs-4"></i></div>
              <small className="text-muted d-block mt-2 fw-medium">Behavior Patterns</small>
              <small className="text-muted">Borrows, renewals, dwell, overdue</small>
            </div>
            <div className="col-md-1 text-center">
              <i className="bi bi-arrow-right fs-3 text-muted"></i>
            </div>
            <div className="col-md-3 text-center">
              <div className="badge bg-warning p-3 fs-6"><i className="bi bi-graph-up fs-4"></i></div>
              <small className="text-muted d-block mt-2 fw-medium">Usage Analysis</small>
              <small className="text-muted">Trends, diversity, overdue risk</small>
            </div>
            <div className="col-md-1 text-center">
              <i className="bi bi-arrow-right fs-3 text-muted"></i>
            </div>
            <div className="col-md-3 text-center">
              <div className="badge bg-success p-3 fs-6"><i className="bi bi-lightbulb fs-4"></i></div>
              <small className="text-muted d-block mt-2 fw-medium">Library Insights</small>
              <small className="text-muted">Collection gaps, service planning</small>
            </div>
          </div>
          <hr className="my-3" />
          <div className="row g-3">
            <div className="col-md-4">
              <div className="p-3 border rounded-3 bg-light">
                <small className="text-muted d-block mb-1"><strong>High Demand</strong> → <span className="text-success">Priority Services</span></small>
                <small className="text-muted">High borrows, frequent renewals, low overdue</small>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 border rounded-3 bg-light">
                <small className="text-muted d-block mb-1"><strong>Active Borrower</strong> → <span className="text-primary">Targeted Services</span></small>
                <small className="text-muted">Regular activity, diverse categories, moderate overdue</small>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 border rounded-3 bg-light">
                <small className="text-muted d-block mb-1"><strong>Light User</strong> → <span className="text-warning">Outreach / Engagement</span></small>
                <small className="text-muted">Low activity, limited diversity, potential disengagement</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white pt-4 px-4 border-bottom-0">
          <h6 className="fw-bold mb-0"><i className="bi bi-gear-wide-connected me-2"></i>Clustering Attributes</h6>
          <small className="text-muted">Attributes used for K-Means clustering of users/borrowers</small>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <h6 className="small fw-semibold text-muted mb-2">Borrowing Behavior</h6>
              <ul className="list-unstyled mb-0 small">
                <li><i className="bi bi-check-circle-fill text-success me-2"></i>Borrowing Frequency (Total Borrows)</li>
                <li><i className="bi bi-check-circle-fill text-success me-2"></i>Renewal Frequency (Total Renewals)</li>
              </ul>
            </div>
            <div className="col-md-4">
              <h6 className="small fw-semibold text-muted mb-2">Usage Patterns</h6>
              <ul className="list-unstyled mb-0 small">
                <li><i className="bi bi-check-circle-fill text-success me-2"></i>Average Borrowing/Dwell Duration</li>
                <li><i className="bi bi-check-circle-fill text-success me-2"></i>Overdue Activity</li>
              </ul>
            </div>
            <div className="col-md-4">
              <h6 className="small fw-semibold text-muted mb-2">Content Diversity</h6>
              <ul className="list-unstyled mb-0 small">
                <li><i className="bi bi-check-circle-fill text-success me-2"></i>Categories Accessed</li>
                <li><i className="bi bi-check-circle-fill text-success me-2"></i>Departments Accessed</li>
              </ul>
            </div>
          </div>
          <div className="mt-3">
            <small className="text-muted">
              <strong>Total:</strong> 8 features (all behavioral metrics)<br />
              <strong>Normalization:</strong> Min-Max scaling to [0, 1] range
            </small>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white pt-4 px-4 border-bottom-0">
              <h6 className="fw-bold mb-0">Cluster Distribution</h6>
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
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white pt-4 px-4 border-bottom-0">
              <h6 className="fw-bold mb-0">User Distribution by Cluster</h6>
              <small className="text-muted">Number of users per cluster</small>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="chartName" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Users" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white pt-4 px-4 border-bottom-0">
              <h6 className="fw-bold mb-0">Average Borrows per Cluster</h6>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="chartName" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgBorrows" name="Avg Borrows" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white pt-4 px-4 border-bottom-0">
              <h6 className="fw-bold mb-0">Clustering Validation Metrics</h6>
              <small className="text-muted">Statistical validation of the segmentation quality</small>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-6">
                  <div className="border rounded-3 p-3 text-center h-100">
                    <div className="text-muted small fw-medium mb-1"><i className="bi bi-bounding-box me-1"></i>Silhouette Score</div>
                    <div className={`display-6 fw-bold ${data.metrics?.silhouette >= 0.5 ? 'text-success' : data.metrics?.silhouette >= 0.25 ? 'text-primary' : 'text-warning'}`}>
                      {data.metrics?.silhouette != null ? data.metrics.silhouette.toFixed(4) : '\u2014'}
                    </div>
                    <div className="small text-muted mt-1">
                      {data.metrics?.silhouette != null
                        ? (data.metrics.silhouette >= 0.5 ? 'Strong separation' : data.metrics.silhouette >= 0.25 ? 'Moderate separation' : 'Weak separation')
                        : 'Not computed'}
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="border rounded-3 p-3 text-center h-100">
                    <div className="text-muted small fw-medium mb-1"><i className="bi bi-bounding-box me-1"></i>Davies\u2013Bouldin Index</div>
                    <div className={`display-6 fw-bold ${data.metrics?.daviesBouldin != null && data.metrics?.daviesBouldin < 1 ? 'text-success' : 'text-warning'}`}>
                      {data.metrics?.daviesBouldin != null ? data.metrics.daviesBouldin.toFixed(4) : '\u2014'}
                    </div>
                    <div className="small text-muted mt-1">
                      {data.metrics?.daviesBouldin != null
                        ? (data.metrics.daviesBouldin < 1 ? 'Compact clusters' : 'High overlap')
                        : 'Not computed'}
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-muted small mb-0 mt-3">
                Silhouette Score ranges from \u22121 to 1 (higher = clusters are well separated). The Davies\u2013Bouldin Index is lower-is-better (clusters are compact and far apart). K = {data.k ?? data.metrics?.k ?? '\u2014'}.
              </p>
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white pt-4 px-4 border-bottom-0">
              <h6 className="fw-bold mb-0"><i className="bi bi-table me-2"></i>Cluster Characteristics</h6>
              <small className="text-muted">Average behavioral profile per segment</small>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="small fw-semibold">Cluster</th>
                    <th className="small fw-semibold">Users</th>
                    <th className="small fw-semibold">Avg Borrows</th>
                    <th className="small fw-semibold">Avg Renewals</th>
                    <th className="small fw-semibold">Avg Dwell (days)</th>
                    <th className="small fw-semibold">Avg Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.summary.map((s, idx) => (
                    <tr key={s.cluster}>
                      <td>
                        <span className="badge me-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}>{s.label}</span>
                        <span className="text-muted small">{s.cluster >= 0 ? `(Cluster ${s.cluster})` : 'No Activity'}</span>
                      </td>
                      <td className="fw-medium">{s.count}</td>
                      <td>{s.avgBorrows}</td>
                      <td>{s.avgRenewals != null ? s.avgRenewals : '\u2014'}</td>
                      <td>{s.avgDwell}</td>
                      <td>{s.avgOverdue != null ? s.avgOverdue : '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white pt-4 px-4 border-bottom-0">
              <h6 className="fw-bold mb-0"><i className="bi bi-people me-2"></i>Borrower Segmentation</h6>
              <small className="text-muted">Individual borrower cluster assignments</small>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="small fw-semibold">Borrower</th>
                    <th className="small fw-semibold">Student ID</th>
                    <th className="small fw-semibold">Borrowings</th>
                    <th className="small fw-semibold">Renewals</th>
                    <th className="small fw-semibold">Usage</th>
                    <th className="small fw-semibold">Cluster No.</th>
                    <th className="small fw-semibold">Cluster</th>
                  </tr>
                </thead>
                <tbody>
                  {data.clusters.map((u) => (
                    <tr key={u.userId}>
                      <td className="fw-medium">{u.name}</td>
                      <td className="text-muted small">{u.studentId || '\u2014'}</td>
                      <td>{u.totalBorrows}</td>
                      <td>{u.totalRenewals}</td>
                      <td>{u.avgDwellTime}</td>
                      <td className="text-center fw-medium">{u.cluster >= 0 ? u.cluster : '-'}</td>
                      <td>
                        {u.cluster === -1 ? (
                          <span className="badge bg-warning text-dark">Not Clustered</span>
                        ) : (
                          <span className="badge bg-success">{u.segment}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {renderModal()}
    </div>
  );
}

export default UserClustering;