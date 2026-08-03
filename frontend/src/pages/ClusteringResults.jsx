import { useState, useEffect } from 'react';
import { getClusteringResults, runClustering } from '../api/analytics';
import { useToast } from '../components/Toast';

function ClusteringResults() {
  const { addToast } = useToast();
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => { loadResults(); }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const data = await getClusteringResults();
      setResults(data.results || []);
      setSummary(data.summary || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunClustering = async () => {
    setRunning(true);
    try {
      await runClustering();
      addToast('K-Means clustering completed successfully!', 'success');
      await loadResults();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to run clustering', 'danger');
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

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Unsupervised Learning — K-Means Clustering</h4>
          <p className="text-muted small mb-0">Unsupervised learning for collection decision support</p>
        </div>
        <button className="btn btn-dark btn-sm" onClick={handleRunClustering} disabled={running}>
          {running ? (
            <><span className="spinner-border spinner-border-sm me-1"></span>Running...</>
          ) : (
            <><i className="bi bi-play-fill me-1"></i>Run Clustering</>
          )}
        </button>
      </div>

      {summary.length > 0 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white pt-4 px-4 border-bottom-0">
            <h6 className="fw-bold mb-0"><i className="bi bi-table me-2"></i>Cluster Summary</h6>
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
                </tr>
              </thead>
              <tbody>
                {summary.map((c) => (
                  <tr key={c._id}>
                    <td><span className="badge bg-dark">Cluster {c._id}</span></td>
                    <td className="fw-medium">{c.count}</td>
                    <td>{c.avgUsageScore.toFixed(2)}</td>
                    <td>{c.avgRetentionScore.toFixed(2)}</td>
                    <td>{c.avgBorrows.toFixed(2)}</td>
                    <td className="text-muted">{c.avgDwellTime?.toFixed(2) || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {newItems.length > 0 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white pt-4 px-4 border-bottom-0">
            <h6 className="fw-bold mb-0">
              <i className="bi bi-plus-circle me-2"></i>New / Insufficient Data
              <span className="badge bg-secondary ms-2">{newItems.length} items</span>
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
                {newItems.map((item) => (
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
          {Object.entries(clusterGroups).map(([clusterId, items]) => (
            <div key={clusterId} className="card border-0 shadow-sm">
              <div className="card-header bg-white pt-4 px-4 border-bottom-0">
                <h6 className="fw-bold mb-0">
                  <i className="bi bi-diagram-3 me-2"></i>Cluster {clusterId}
                  <span className="badge bg-secondary ms-2">{items.length} items</span>
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
          ))}
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