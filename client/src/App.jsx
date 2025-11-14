import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import SectorSelection from './pages/SectorSelection';
import User1Dashboard from './pages/User1Dashboard';
import User2Dashboard from './pages/User2Dashboard';
import AttendanceSheet from './pages/AttendanceSheet';
import DatabaseManagement from './pages/DatabaseManagement';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/sectors" element={<PrivateRoute><SectorSelection /></PrivateRoute>} />
          <Route path="/dashboard/:sectorId" element={<PrivateRoute><User1Dashboard /></PrivateRoute>} />
          <Route path="/employee-dashboard/:sectorId" element={<PrivateRoute><User2Dashboard /></PrivateRoute>} />
          <Route path="/attendance-sheet/:sectorId" element={<PrivateRoute><AttendanceSheet /></PrivateRoute>} />
          <Route path="/database" element={<PrivateRoute><DatabaseManagement /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

