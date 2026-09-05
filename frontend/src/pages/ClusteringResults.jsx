import { useState, useEffect } from 'react';
import { getClusteringResults, runClustering } from '../api/analytics';
import { useToast } from '../components/Toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const CLUSTER_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

function ClusteringResults() {
  const { addToast } = useToast();
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [kValue, setKValue] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [kMethod, setKMethod] = useState('Heuristic: k = max(2, min(5, √n // 3 + 1)) where n = items with usage data');

  useEffect(() => {
    const auto = async () => {
      setLoading(true);
      try {
        let data = await getClusteringResults();
        if ((data.results || []).length === 0) {
          await runClustering().catch(() => null);
          data = await getClusteringResults();
        }
        setResults(data.results || []);
        setSummary(data.summary || []);
        if (data.k) setKValue(data.k);
        if (data.metrics) setMetrics(data.metrics);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    auto();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const data = await getClusteringResults();
      setResults(data.results || []);
      setSummary(data.summary || []);
      if (data.k) setKValue(data.k);
      if (data.metrics) setMetrics(data.metrics);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunClustering = async () => {
    setRunning(true);
    try {
      const data = await runClustering();
      addToast('K-Means clustering completed successfully!', 'success');
      if (data.k) setKValue(data.k);
      if (data.metrics) setMetrics(data.metrics);
      await loadResults();
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

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  const clusterGroups = {};
  const newItems = [];
  results.forEach(item => {
    if (item.cluster === -2) {
      newItems.push(item);
    } else {
      if (!clusterGroups[item.cluster]) clusterGroups[item.cluster] = [];
      clusterGroups[item.cluster].push(item);
    }
  });

  const getClusterUsage = (clusterId) => {
    const stat = summary.find(s => Number(s._id) === Number(clusterId));
    if (!stat) return null;
    const usageScore = Number(stat.avgUsageScore || 0);
    const borrows = Number(stat.avgBorrows || 0);
    let interpretation = 'Minimal Usage';
    let color = 'bg-secondary';
    if (usageScore >= 15 && borrows >= 10) { interpretation = 'High Usage'; color = 'bg-success'; }
    else if (usageScore >= 8 && borrows >= 5) { interpretation = 'Moderate Usage'; color = 'bg-primary'; }
    else if (usageScore > 0) { interpretation = 'Low Usage'; color = 'bg-warning text-dark'; }
    return { interpretation, color };
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Book Clustering Dashboard</h4>
          <p className="text-muted small mb-0">Unsupervised Learning — K-Means clustering of collection items by usage patterns</p>
        </div>
        <div className="d-flex align-items-center gap-3">
          <span className={`badge ${running ? 'bg-info' : kValue ? 'bg-success' : 'bg-warning text-dark'} fs-6`}>
            Clustering Status: {running ? <><span className="spinner-border spinner-border-sm me-1"></span>Running...</> : kValue ? <><i className="bi bi-check-circle me-1"></i>Completed {'\u2713'}</> : <><i className="bi bi-circle me-1"></i>Not Yet Run</>}
          </span>
          <button className="btn btn-outline-secondary btn-sm" onClick={loadResults} disabled={loading || running} title="Refresh data">
            <i className="bi bi-arrow-clockwise me-1"></i>Refresh
          </button>
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

      {kValue && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white pt-4 px-4 border-bottom-0">
            <h6 className="fw-bold mb-0"><i className="bi bi-graph-up me-2"></i>Clustering Validation</h6>
            <small className="text-muted">Quality metrics for the K-Means clustering</small>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <div className="border rounded-3 p-3 text-center h-100">
                  <div className="text-muted small fw-medium mb-1"><i className="bi bi-bounding-box me-1"></i>Silhouette Score</div>
                  <div className={`display-6 fw-bold ${metrics?.silhouette >= 0.5 ? 'text-success' : metrics?.silhouette >= 0.25 ? 'text-primary' : 'text-warning'}`}>
                    {metrics?.silhouette != null ? metrics.silhouette.toFixed(4) : '\u2014'}
                  </div>
                  <div className="small text-muted mt-1">
                    {metrics?.silhouette != null
                      ? (metrics.silhouette >= 0.5 ? 'Strong separation' : metrics.silhouette >= 0.25 ? 'Moderate separation' : 'Weak separation')
                      : 'Not computed'}
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="border rounded-3 p-3 text-center h-100">
                  <div className="text-muted small fw-medium mb-1"><i className="bi bi-bounding-box me-1"></i>Davies{'\u2013'}Bouldin Index</div>
                  <div className={`display-6 fw-bold ${metrics?.daviesBouldin != null && metrics?.daviesBouldin < 1 ? 'text-success' : 'text-warning'}`}>
                    {metrics?.daviesBouldin != null ? metrics.daviesBouldin.toFixed(4) : '\u2014'}
                  </div>
                  <div className="small text-muted mt-1">
                    {metrics?.daviesBouldin != null
                      ? (metrics.daviesBouldin < 1 ? 'Compact clusters' : 'High overlap')
                      : 'Not computed'}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <small className="text-muted">
                <strong>K Selection:</strong> Heuristic Method (Elbow-inspired formula)<br />
                Silhouette Score ranges from {'\u2212'}1 to 1 (higher = well separated). Davies{'\u2013'}Bouldin Index lower-is-better (compact clusters).
              </small>
            </div>
          </div>
        </div>
      )}

      {summary?.length > 0 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white pt-4 px-4 border-bottom-0">
            <h6 className="fw-bold mb-0"><i className="bi bi-gear-wide-connected me-2"></i>Clustering Attributes</h6>
            <small className="text-muted">Attributes used for K-Means clustering of collection items</small>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <h6 className="small fw-semibold text-muted mb-2">Usage Metrics</h6>
                <ul className="list-unstyled mb-0 small">
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Borrowing Frequency (Total Borrows)</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Renewal Frequency (Total Renewals)</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Average Dwell Time</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Usage Score (computed)</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Retention Score</li>
                </ul>
              </div>
              <div className="col-md-6">
                <h6 className="small fw-semibold text-muted mb-2">Content Features</h6>
                <ul className="list-unstyled mb-0 small">
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Title (TF-IDF)</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Description (TF-IDF)</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Top 10 TF-IDF Terms</li>
                </ul>
              </div>
            </div>
            <div className="mt-3">
              <small className="text-muted">
                <strong>Total:</strong> 13 features (3 Usage Metrics + 10 TF-IDF Content Features)<br />
                <strong>Normalization:</strong> Min-Max scaling to [0, 1] range
              </small>
            </div>
          </div>
        </div>
      )}

      {summary?.length > 0 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white pt-4 px-4 border-bottom-0">
            <h6 className="fw-bold mb-0"><i className="bi bi-table me-2"></i>Cluster Summary</h6>
          </div>
          <div className="card-body">
            <div className="row g-4">
              <div className="col-md-5">
                <h6 className="small text-muted mb-3">Distribution of Items per Cluster</h6>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={summary} dataKey="count" nameKey="_id" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {summary.map((c, i) => (
                        <Cell key={c._id} fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <h6 className="small text-muted mb-3 mt-4">Avg Usage Score per Cluster</h6>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={summary}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" label={{ value: 'Cluster', position: 'insideBottom', offset: -2 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgUsageScore" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="col-md-7">
                <h6 className="small text-muted mb-3">Cluster Characteristics — Average behavioral profile per segment</h6>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="small fw-semibold">Cluster</th>
                        <th className="small fw-semibold">Items</th>
                        <th className="small fw-semibold">Avg Usage Score</th>
                        <th className="small fw-semibold">Avg Retention</th>
                        <th className="small fw-semibold">Avg Borrows</th>
                        <th className="small fw-semibold">Avg Dwell Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.map((c) => {
                        const usageScore = Number(c.avgUsageScore || 0);
                        const borrows = Number(c.avgBorrows || 0);
                        let interpretation = 'Minimal Circulation';
                        if (borrows >= 10) interpretation = 'Highly Circulated';
                        else if (borrows >= 5) interpretation = 'Moderately Circulated';
                        else if (borrows >= 1) interpretation = 'Low Circulation';
                        return (
                          <tr key={c._id}>
                            <td>
                              <span className="badge bg-success me-1">Cluster {c._id}</span>
                              <span className="badge bg-primary">{interpretation}</span>
                            </td>
                            <td className="fw-medium">{c.count}</td>
                            <td>{Number(c.avgUsageScore || 0).toFixed(2)}</td>
                            <td>{Number(c.avgRetentionScore || 0).toFixed(2)}</td>
                            <td>{Number(c.avgBorrows || 0).toFixed(2)}</td>
                            <td className="text-muted">{Number(c.avgDwellTime || 0).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {summary?.length > 0 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white pt-4 px-4 border-bottom-0">
            <h6 className="fw-bold mb-0"><i className="bi bi-table me-2"></i>Cluster Statistics</h6>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="small fw-semibold">Cluster</th>
                  <th className="small fw-semibold">Count</th>
                  <th className="small fw-semibold">Avg Usage Score</th>
                  <th className="small fw-semibold">Avg Retention</th>
                  <th className="small fw-semibold">Avg Borrows</th>
                  <th className="small fw-semibold">Avg Dwell Time</th>
                  <th className="small fw-semibold">Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((c) => {
                  const usageScore = Number(c.avgUsageScore || 0);
                  const borrows = Number(c.avgBorrows || 0);
                  let interpretation = 'Minimal Usage';
                  if (usageScore >= 15 && borrows >= 10) interpretation = 'High Usage';
                  else if (usageScore >= 8 && borrows >= 5) interpretation = 'Moderate Usage';
                  else if (usageScore > 0) interpretation = 'Low Usage';
                  return (
                    <tr key={c._id}>
                      <td><span className="badge bg-success">Clustered</span></td>
                      <td className="fw-medium">{c.count}</td>
                      <td>{Number(c.avgUsageScore || 0).toFixed(2)}</td>
                      <td>{Number(c.avgRetentionScore || 0).toFixed(2)}</td>
                      <td>{Number(c.avgBorrows || 0).toFixed(2)}</td>
                      <td className="text-muted">{Number(c.avgDwellTime || 0).toFixed(2)}</td>
                      <td><span className="badge bg-primary">{interpretation}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(!kValue && (summary?.length === 0 || !summary) && (newItems?.length === 0 || !newItems)) && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body text-center py-5">
            <i className="bi bi-diagram-3 text-muted" style={{ fontSize: '3rem' }}></i>
            <h5 className="text-muted mt-3 mb-2">No Clustering Data Yet</h5>
            <p className="text-muted small mb-3">Run clustering to group books by usage patterns and content.</p>
            <button className="btn btn-dark btn-sm" onClick={handleRunClustering} disabled={running}>
              {running ? (
                <><span className="spinner-border spinner-border-sm me-1"></span>Running...</>
              ) : (
                <><i className="bi bi-play-fill me-1"></i>Run Clustering</>
              )}
            </button>
          </div>
        </div>
      )}

      {newItems?.length > 0 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white pt-4 px-4 border-bottom-0">
            <h6 className="fw-bold mb-0">
              <i className="bi bi-plus-circle me-2"></i>New / Insufficient Data
              <span className="badge bg-secondary ms-2">{newItems?.length} items</span>
            </h6>
            <p className="text-muted small mb-0 mt-1">Recently added items with no usage history yet</p>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="small fw-semibold">Title</th>
                  <th className="small fw-semibold">Author</th>
                  <th className="small fw-semibold">Category</th>
                  <th className="small fw-semibold">Department</th>
                  <th className="small fw-semibold">Borrows</th>
                  <th className="small fw-semibold">Usage Score</th>
                </tr>
              </thead>
              <tbody>
                {newItems?.map((item) => (
                  <tr key={item._id}>
                    <td className="fw-medium">{item.title}</td>
                    <td className="text-muted">{item.author}</td>
                    <td className="text-muted">{item.category}</td>
                    <td className="text-muted">{item.department}</td>
                    <td>{item.usageMetrics.totalBorrows}</td>
                    <td>{item.usageMetrics.usageScore.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

{results.length > 0 ? (
        <div className="vstack gap-3">
{Object.entries(clusterGroups).map(([clusterId, items]) => {
              const usage = getClusterUsage(clusterId);
              return (
                <div key={clusterId} className="card border-0 shadow-sm">
                  <div className="card-header bg-white pt-4 px-4 border-bottom-0 d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <h6 className="fw-bold mb-0">
                      <i className="bi bi-diagram-3 me-2"></i>Clustered
                      <span className="badge bg-secondary ms-2">{items.length} items</span>
                      {usage && (
                        <span className={`badge ${usage.color} ms-2`}>
                          <i className="bi bi-graph-up me-1"></i>{usage.interpretation}
                        </span>
                      )}
                    </h6>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="small fw-semibold">Title</th>
                        <th className="small fw-semibold">Author</th>
                        <th className="small fw-semibold">Category</th>
                        <th className="small fw-semibold">Department</th>
                        <th className="small fw-semibold">Borrows</th>
                        <th className="small fw-semibold">Usage Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item._id}>
                          <td className="fw-medium">{item.title}</td>
                          <td className="text-muted">{item.author}</td>
                          <td className="text-muted">{item.category}</td>
                          <td className="text-muted">{item.department}</td>
                          <td>{item.usageMetrics.totalBorrows}</td>
                          <td>{item.usageMetrics.usageScore.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card border-0 shadow-sm text-center p-5">
          <i className="bi bi-diagram-3 text-muted" style={{ fontSize: '3rem' }}></i>
          <p className="text-muted mt-3 mb-0">No clustering results available. Run K-Means clustering to group items by usage patterns.</p>
        </div>
      )}
    </div>
  );
}

export default ClusteringResults;