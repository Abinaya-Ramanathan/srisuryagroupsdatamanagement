import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = [
  { value: '', label: '--' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half', label: 'Half Day' }
];

const AttendanceSheet = () => {
  const { sectorId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [sector, setSector] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [initialData, setInitialData] = useState({});
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const daysInMonth = useMemo(() => {
    if (!month) return [];
    const [year, monthStr] = month.split('-');
    const totalDays = new Date(Number(year), Number(monthStr), 0).getDate();

    return Array.from({ length: totalDays }, (_, index) => {
      const dayNumber = index + 1;
      const date = new Date(Number(year), Number(monthStr) - 1, dayNumber);
      return {
        dateString: `${month}-${String(dayNumber).padStart(2, '0')}`,
        label: String(dayNumber).padStart(2, '0'),
        weekday: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        isWeekend: date.getDay() === 0
      };
    });
  }, [month]);

  const ensureEmployeeMaps = useCallback((employeesList) => {
    setAttendanceData((prev) => {
      const next = { ...prev };
      employeesList.forEach((employee) => {
        if (!next[employee.id]) {
          next[employee.id] = {};
        }
      });
      return next;
    });

    setInitialData((prev) => {
      const next = { ...prev };
      employeesList.forEach((employee) => {
        if (!next[employee.id]) {
          next[employee.id] = {};
        }
      });
      return next;
    });
  }, []);

  const fetchAttendanceSheet = useCallback(async () => {
    if (!month) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.get(`/api/attendance/sector/${sectorId}?month=${month}`);
      const { sector: sectorInfo, employees: employeeList, attendance } = response.data;

      setSector(sectorInfo);
      setEmployees(employeeList);

      const attendanceMap = {};
      const initialMap = {};

      employeeList.forEach((employee) => {
        attendanceMap[employee.id] = {};
        initialMap[employee.id] = {};
      });

      attendance.forEach((entry) => {
        if (!attendanceMap[entry.employee_id]) {
          attendanceMap[entry.employee_id] = {};
          initialMap[entry.employee_id] = {};
        }
        attendanceMap[entry.employee_id][entry.date] = entry.status;
        initialMap[entry.employee_id][entry.date] = entry.status;
      });

      setAttendanceData(attendanceMap);
      setInitialData(initialMap);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [month, sectorId]);

  useEffect(() => {
    fetchAttendanceSheet();
  }, [fetchAttendanceSheet]);

  useEffect(() => {
    ensureEmployeeMaps(employees);
  }, [employees, ensureEmployeeMaps]);

  const handleStatusChange = (employeeId, dateString, status) => {
    setAttendanceData((prev) => {
      const employeeAttendance = { ...(prev[employeeId] || {}) };

      if (!status) {
        delete employeeAttendance[dateString];
      } else {
        employeeAttendance[dateString] = status;
      }

      return {
        ...prev,
        [employeeId]: employeeAttendance
      };
    });
  };

  const gatherChanges = () => {
    const changes = [];

    employees.forEach((employee) => {
      const employeeId = employee.id;
      const current = attendanceData[employeeId] || {};
      const initial = initialData[employeeId] || {};

      daysInMonth.forEach(({ dateString }) => {
        const currentStatus = current[dateString] || '';
        const initialStatus = initial[dateString] || '';

        if (currentStatus !== initialStatus) {
          changes.push({
            employee_id: employeeId,
            date: dateString,
            status: currentStatus
          });
        }
      });
    });

    return changes;
  };

  const handleSave = async () => {
    const changes = gatherChanges();

    if (!changes.length) {
      setError('No changes to save');
      setSuccess('');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await axios.post('/api/attendance/bulk', {
        entries: changes.map((change) => ({
          ...change,
          status: change.status || ''
        }))
      });

      setSuccess('Attendance saved successfully');
      fetchAttendanceSheet();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setAttendanceData(JSON.parse(JSON.stringify(initialData)));
    setError('');
    setSuccess('Changes reverted to last saved state');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl">Loading attendance sheet...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-[95vw] xl:max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Attendance Sheet</h1>
            {sector && (
              <p className="text-gray-600 mt-1">
                {sector.name} • {month}
              </p>
            )}
            <p className="text-gray-500 text-sm mt-1">Select a value in each cell: Present, Absent, or Half Day.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Reset Changes
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
            <button
              onClick={() => navigate('/sectors')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Back to Sectors
            </button>
          </div>
        </div>

        {(error || success) && (
          <div className="mb-4">
            {error && (
              <div className="mb-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
            )}
            {success && (
              <div className="px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">{success}</div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="sticky left-0 bg-gray-100 px-4 py-3 border border-gray-200 text-left text-xs font-semibold text-gray-600">
                  Employee
                </th>
                {daysInMonth.map(({ dateString, label, weekday, isWeekend }) => (
                  <th
                    key={dateString}
                    className={`px-2 py-2 border border-gray-200 text-xs font-semibold text-gray-600 whitespace-nowrap ${isWeekend ? 'bg-green-50' : ''}`}
                  >
                    <div>{label}</div>
                    <div className="text-[11px] text-gray-500">{weekday}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="even:bg-gray-50">
                  <td className="sticky left-0 bg-white px-4 py-2 border border-gray-200 text-sm font-medium text-gray-800">
                    <div>{employee.name}</div>
                    {employee.phone && <div className="text-xs text-gray-500">{employee.phone}</div>}
                  </td>
                  {daysInMonth.map(({ dateString, isWeekend }) => {
                    const value = attendanceData[employee.id]?.[dateString] || '';
                    return (
                      <td key={dateString} className={`px-2 py-1 border border-gray-200 ${isWeekend ? 'bg-green-50' : ''}`}>
                        <select
                          value={value}
                          onChange={(e) => handleStatusChange(employee.id, dateString, e.target.value)}
                          className="w-full border border-gray-300 rounded-md text-sm px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value || 'blank'} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSheet;
