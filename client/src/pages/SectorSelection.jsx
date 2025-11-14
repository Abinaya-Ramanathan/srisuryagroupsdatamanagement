import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const SectorSelection = () => {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSectors();
  }, []);

  const fetchSectors = async () => {
    try {
      const response = await axios.get('/api/sectors');
      setSectors(response.data);
    } catch (error) {
      console.error('Error fetching sectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSectorSelect = (sectorId, viewType = null) => {
    if (user.role === 'user1') {
      // Admin can choose which view to access
      if (viewType === 'employee') {
        navigate(`/employee-dashboard/${sectorId}`);
      } else {
        navigate(`/dashboard/${sectorId}`);
      }
    } else {
      // Employee always goes to employee dashboard
      navigate(`/employee-dashboard/${sectorId}`);
    }
  };

  const sectorColors = {
    1: 'from-blue-500 to-blue-600',
    2: 'from-green-500 to-green-600',
    3: 'from-yellow-500 to-yellow-600',
    4: 'from-purple-500 to-purple-600',
    5: 'from-red-500 to-red-600'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading sectors...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 pt-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Select Sector</h1>
            <p className="text-gray-600 mt-1">
              Logged in as: <span className="font-semibold">{user.user_id}</span> ({user.role === 'user1' ? 'Admin' : 'Employee'})
            </p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sectors.map((sector, index) => (
            <div key={sector.id} className="relative">
              <div className={`bg-gradient-to-br ${sectorColors[index + 1] || 'from-gray-500 to-gray-600'} text-white p-8 rounded-xl shadow-lg`}>
                <div className="text-2xl font-bold mb-2">{sector.code}</div>
                <div className="text-lg opacity-90 mb-4">{sector.name}</div>
                {user.role === 'user1' ? (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleSectorSelect(sector.id, 'admin')}
                      className="flex-1 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition text-sm font-semibold"
                    >
                      Admin View
                    </button>
                    <button
                      onClick={() => handleSectorSelect(sector.id, 'employee')}
                      className="flex-1 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition text-sm font-semibold"
                    >
                      Employee View
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSectorSelect(sector.id)}
                    className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition text-sm font-semibold mt-4"
                  >
                    Open Dashboard
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectorSelection;

