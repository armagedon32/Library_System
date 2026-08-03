import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Register from './pages/Register';
import Login from './pages/Login';
import Layout from './components/Layout';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import UserDashboard from './pages/UserDashboard';
import CollectionItems from './pages/CollectionItems';
import ClusteringResults from './pages/ClusteringResults';
import UserClustering from './pages/UserClustering';
import Recommendations from './pages/Recommendations';
import CollectionDecisions from './pages/CollectionDecisions';
import Reservations from './pages/Reservations';
import ActivityLog from './pages/ActivityLog';
import Transactions from './pages/Transactions';
import MySettings from './pages/MySettings';
import AdminSettings from './pages/AdminSettings';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={user?.role === 'admin' ? <AnalyticsDashboard /> : <UserDashboard />} />
          <Route path="borrowing" element={<UserDashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="settings" element={<MySettings />} />
          <Route path="items" element={<CollectionItems />} />
          <Route path="clustering" element={<ClusteringResults />} />
          <Route path="user-clustering" element={<UserClustering />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="collection-decisions" element={<CollectionDecisions />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="activity" element={<ActivityLog />} />
          {user?.role === 'admin' && <Route path="admin" element={<AdminSettings />} />}
        </Route>
      </Routes>
    </div>
  );
}

export default App;