import { useState, useEffect } from 'react';
import { getRecommendations, updateItemStatus } from '../api/analytics';
import { useToast } from '../components/Toast';

function Recommendations() {
  const { addToast } = useToast();
  const [recommendations, setRecommendations] = useState({ retirees: [], keepers: [], flagged: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecommendations().then(setRecommendations).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await updateItemStatus(id, status);
      addToast(`Item status updated to "${status}"`, 'success');
      const data = await getRecommendations();
      setRecommendations(data);
    } catch (error) {
      addToast('Failed to update status', 'danger');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  const sections = [
    { key: 'retirees', label: 'Recommend Retire', icon: 'bi-trash', color: 'danger', desc: 'Low usage — candidates for removal' },
    { key: 'keepers', label: 'Recommend Keep', icon: 'bi-check-circle', color: 'primary', desc: 'High-performing items to retain' },
    { key: 'flagged', label: 'Flagged for Review', icon: 'bi-question-circle', color: 'warning', desc: 'Need manual review' },
  ];

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Collection Recommendations</h4>
        <p className="text-muted small mb-0">Data-driven decisions for collection management</p>
      </div>

      <div className="vstack gap-4">
        {sections.map(({ key, label, icon, color, desc }) => (
          <div key={key} className="card border-0 shadow-sm">
            <div className="card-header bg-white pt-4 px-4 border-bottom-0">
              <div className="d-flex align-items-center">
                <div className={`bg-${color} bg-opacity-10 rounded-2 p-2 me-3`}>
                  <i className={`bi ${icon} text-${color}`}></i>
                </div>
                <div>
                  <h6 className="fw-bold mb-0">{label}</h6>
                  <small className="text-muted">{desc}</small>
                </div>
                <span className={`badge bg-${color} ms-auto`}>{recommendations[key].length}</span>
              </div>
            </div>
            {recommendations[key].length === 0 ? (
              <div className="card-body text-center py-4">
                <p className="text-muted small mb-0">No items in this category.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="small fw-semibold">Title</th>
                      <th className="small fw-semibold">Author</th>
                      <th className="small fw-semibold">Borrows</th>
                      <th className="small fw-semibold">Usage Score</th>
                      <th className="small fw-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations[key].slice(0, 20).map((item) => (
                      <tr key={item._id}>
                        <td className="fw-medium">{item.title}</td>
                        <td className="text-muted">{item.author}</td>
                        <td>{item.usageMetrics.totalBorrows}</td>
                        <td>{item.usageMetrics.usageScore.toFixed(2)}</td>
                        <td>
                          {key === 'retirees' && (
                            <>
                              <button className="btn btn-sm btn-outline-success me-1" onClick={() => handleStatusChange(item._id, 'Active')}>
                                <i className="bi bi-check-lg"></i>
                              </button>
                              <button className="btn btn-sm btn-outline-warning" onClick={() => handleStatusChange(item._id, 'Flagged for Review')}>
                                <i className="bi bi-flag"></i>
                              </button>
                            </>
                          )}
                          {key === 'keepers' && (
                            <button className="btn btn-sm btn-outline-warning" onClick={() => handleStatusChange(item._id, 'Flagged for Review')}>
                              <i className="bi bi-flag"></i> Flag
                            </button>
                          )}
                          {key === 'flagged' && (
                            <>
                              <button className="btn btn-sm btn-outline-success me-1" onClick={() => handleStatusChange(item._id, 'Active')}>
                                <i className="bi bi-check-lg"></i> Keep
                              </button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => handleStatusChange(item._id, 'Recommend Retire')}>
                                <i className="bi bi-trash"></i> Retire
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Recommendations;