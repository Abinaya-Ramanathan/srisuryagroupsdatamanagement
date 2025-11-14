import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const DatabaseManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (user?.role === 'user1') {
      loadTables();
      loadStats();
    }
  }, [user]);

  const loadTables = async () => {
    try {
      const response = await axios.get('/api/admin/tables');
      setTables(response.data.tables);
    } catch (err) {
      setError('Failed to load tables: ' + (err.response?.data?.error || err.message));
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/admin/stats');
      setStats(response.data.stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadTableData = async (tableName) => {
    if (!tableName) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await axios.get(`/api/admin/tables/${tableName}`);
      setTableData(response.data.data);
      setSelectedTable(tableName);
    } catch (err) {
      setError('Failed to load table data: ' + (err.response?.data?.error || err.message));
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tableName, id) => {
    if (!window.confirm(`Are you sure you want to delete entry ID ${id} from ${tableName}?`)) {
      return;
    }

    setDeletingId(id);
    setError('');
    setSuccess('');
    try {
      const response = await axios.delete(`/api/admin/tables/${tableName}/${id}`);
      setSuccess(response.data.message);
      // Reload table data
      await loadTableData(tableName);
      await loadStats();
    } catch (err) {
      setError('Failed to delete: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearTable = async (tableName) => {
    if (!window.confirm(`⚠️ WARNING: This will delete ALL data from ${tableName}. This cannot be undone!\n\nAre you absolutely sure?`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await axios.delete(`/api/admin/tables/${tableName}/clear`);
      setSuccess(response.data.message);
      await loadTableData(tableName);
      await loadStats();
    } catch (err) {
      setError('Failed to clear table: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'user1') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Database Management</h1>
              <p className="text-gray-600">View and manage database tables and entries</p>
            </div>
            <button
              onClick={() => navigate('/sectors')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
            >
              Back to Sectors
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {Object.entries(stats).map(([table, count]) => (
            <div key={table} className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 uppercase">{table}</div>
              <div className="text-2xl font-bold text-indigo-600">{count}</div>
            </div>
          ))}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Table Selection */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Select Table</h2>
            <div className="space-y-2">
              {tables.map((table) => (
                <button
                  key={table}
                  onClick={() => loadTableData(table)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition ${
                    selectedTable === table
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {table}
                  {stats[table] !== undefined && (
                    <span className="ml-2 text-sm opacity-75">({stats[table]})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Table Data */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-lg p-6">
            {!selectedTable ? (
              <div className="text-center text-gray-500 py-12">
                <p className="text-lg">Select a table to view its data</p>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    {selectedTable} ({tableData.length} records)
                  </h2>
                  {['attendance', 'advances', 'daily_employee_counts'].includes(selectedTable) && (
                    <button
                      onClick={() => handleClearTable(selectedTable)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {tableData.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <p>No data found in this table</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(tableData[0] || {}).map((key) => (
                            <th
                              key={key}
                              className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
                            >
                              {key}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tableData.map((row, index) => (
                          <tr key={row.id || index} className="hover:bg-gray-50">
                            {Object.entries(row).map(([key, value]) => (
                              <td key={key} className="px-4 py-3 text-sm text-gray-700">
                                {value === null ? (
                                  <span className="text-gray-400">(null)</span>
                                ) : typeof value === 'string' && value.length > 50 ? (
                                  <span title={value}>{value.substring(0, 50)}...</span>
                                ) : (
                                  String(value)
                                )}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-sm">
                              {row.user_id === 'admin' && selectedTable === 'users' ? (
                                <span className="text-gray-400 text-xs">Protected</span>
                              ) : (
                                <button
                                  onClick={() => handleDelete(selectedTable, row.id)}
                                  disabled={deletingId === row.id}
                                  className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition disabled:opacity-50"
                                >
                                  {deletingId === row.id ? 'Deleting...' : 'Delete'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseManagement;

