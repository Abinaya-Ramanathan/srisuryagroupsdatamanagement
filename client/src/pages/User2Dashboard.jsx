import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = [
  { value: '', label: 'Select status' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half', label: 'Half Day' }
];

const formatCurrency = (value) => {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue)) {
    return '₹0';
  }
  return `₹${numberValue.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
};

const isValidNumericInput = (value) => /^(\d+)?(\.\d{0,2})?$/.test(value);

const getLastDayOfMonth = (monthValue) => {
  if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) {
    return 31;
  }
  const [yearStr, monthStr] = monthValue.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return 31;
  }

  return new Date(year, monthIndex + 1, 0).getDate();
};

const User2Dashboard = () => {
  const { sectorId } = useParams();
  const navigate = useNavigate();
  const { user, logout, loading: authLoading = false } = useAuth();

  const now = useMemo(() => new Date(), []);
  const defaultMonth = useMemo(
    () => {
      try {
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      } catch (e) {
        const fallback = new Date();
        return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}`;
      }
    },
    [now]
  );
  const defaultDate = useMemo(() => {
    try {
      return now.toISOString().split('T')[0];
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  }, [now]);

  const [sectorName, setSectorName] = useState('');
  const [employees, setEmployees] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceState, setAttendanceState] = useState({});
  const [amountState, setAmountState] = useState({});
  const [month, setMonth] = useState(() => defaultMonth);
  const [selectedDate, setSelectedDate] = useState(() => defaultDate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeView, setActiveView] = useState('daily'); // 'daily' or 'status'
  const [nonWorkers, setNonWorkers] = useState([]);
  const [nonWorkerAttendanceState, setNonWorkerAttendanceState] = useState({});
  const [nonWorkerAmountState, setNonWorkerAmountState] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [nonWorkerCountState, setNonWorkerCountState] = useState({});
  const [dailyCountsMap, setDailyCountsMap] = useState({}); // {employeeId: {date: count}}

  const maxDate = useMemo(() => {
    const lastDay = getLastDayOfMonth(month);
    return `${month}-${String(lastDay).padStart(2, '0')}`;
  }, [month]);

  useEffect(() => {
    if (authLoading === true) return;
    
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    
    // Allow both user1 (admin) and user2 (employee) to access this page
  if (!user || (user.role !== 'user2' && user.role !== 'user1')) {
      navigate('/sectors', { replace: true });
    }
  }, [navigate, user, authLoading]);

  const fetchData = useCallback(
    async (showLoader = true) => {
      if (!sectorId) return;
      if (showLoader) {
        setLoading(true);
      }
      setError('');

      try {
        const [employeesResponse, attendanceResponse, nonWorkersResponse, dailyCountsResponse] = await Promise.all([
          axios.get(`/api/employees/sector/${sectorId}`, {
            params: { month, date: selectedDate }
          }),
          axios.get(`/api/attendance/sector/${sectorId}?month=${month}`),
          axios.get(`/api/employees/sector/${sectorId}/non-workers`).catch(() => ({ data: [] })),
          axios.get(`/api/employees/sector/${sectorId}/daily-counts`, {
            params: { date: selectedDate }
          }).catch(() => ({ data: [] }))
        ]);

        const allEmployees = Array.isArray(employeesResponse.data) ? employeesResponse.data : [];
        // Filter out product employees from employee view - they should not be visible here
        const filteredEmployees = allEmployees.filter(emp => emp.designation !== 'product');
        setEmployees(filteredEmployees);
        setNonWorkers(Array.isArray(nonWorkersResponse.data) ? nonWorkersResponse.data : []);

        // Map daily counts by employee_id and date
        const countsMap = {};
        if (Array.isArray(dailyCountsResponse.data)) {
          dailyCountsResponse.data.forEach((item) => {
            if (!countsMap[item.employee_id]) {
              countsMap[item.employee_id] = {};
            }
            countsMap[item.employee_id][item.date] = item.count;
          });
        }
        setDailyCountsMap(countsMap);

        const { sector, attendance } = attendanceResponse.data || {};
        if (sector?.name) {
          setSectorName(sector.name);
        }

        const mappedAttendance = {};
        if (Array.isArray(attendance)) {
          attendance.forEach((entry) => {
            if (entry && entry.employee_id && entry.date) {
              if (!mappedAttendance[entry.employee_id]) {
                mappedAttendance[entry.employee_id] = {};
              }
              mappedAttendance[entry.employee_id][entry.date] = entry.status || '';
            }
          });
        }
        setAttendanceMap(mappedAttendance);
      } catch (fetchError) {
        const errorMessage = fetchError.response?.data?.error || fetchError.message || 'Failed to load data';
        setError(errorMessage);
        console.error('Error fetching data:', fetchError);
    } finally {
        if (showLoader) {
      setLoading(false);
    }
      }
    },
    [month, sectorId, selectedDate, isEditMode]
  );

  useEffect(() => {
    if (authLoading === true) return;
    
    // Allow both user1 (admin) and user2 (employee) to fetch data
    if ((user?.role === 'user2' || user?.role === 'user1') && sectorId) {
      fetchData();
    }
  }, [fetchData, user, authLoading, sectorId]);

  useEffect(() => {
    if (!Array.isArray(employees) || !selectedDate) return;
    
    setAttendanceState(() => {
      const next = {};
      employees.forEach((employee) => {
        if (employee && employee.id) {
          next[employee.id] = attendanceMap[employee.id]?.[selectedDate] || '';
        }
      });
      return next;
    });
  }, [attendanceMap, employees, selectedDate]);

  useEffect(() => {
    if (!Array.isArray(employees) || !selectedDate) return;

    setAmountState(() => {
      const next = {};
      employees.forEach((employee) => {
        if (employee && employee.id) {
          next[employee.id] = { taken: '', paid: '' };
        }
      });
      return next;
    });
  }, [employees, selectedDate]);

  useEffect(() => {
    if (!Array.isArray(nonWorkers) || !selectedDate) return;

    setNonWorkerAttendanceState(() => {
      const next = {};
      nonWorkers.forEach((nonWorker) => {
        if (nonWorker && nonWorker.id) {
          next[nonWorker.id] = attendanceMap[nonWorker.id]?.[selectedDate] || '';
        }
      });
      return next;
    });

    setNonWorkerAmountState(() => {
      const next = {};
      nonWorkers.forEach((nonWorker) => {
        if (nonWorker && nonWorker.id) {
          next[nonWorker.id] = { taken: '', paid: '' };
        }
      });
      return next;
    });

    setNonWorkerCountState(() => {
      const next = {};
      nonWorkers.forEach((nonWorker) => {
        if (nonWorker && nonWorker.id) {
          // Use daily count for selected date, or empty if no count exists for this date
          const dailyCount = dailyCountsMap[nonWorker.id]?.[selectedDate];
          next[nonWorker.id] = dailyCount !== undefined ? dailyCount : '';
        }
      });
      return next;
    });
  }, [nonWorkers, selectedDate, attendanceMap, dailyCountsMap]);

  const handleMonthChange = (value) => {
    if (!value) return;

    const currentDay = selectedDate.split('-')[2] || '01';
    const lastDay = getLastDayOfMonth(value);
    const normalizedDay = Math.min(Number(currentDay), lastDay);

    setMonth(value);
    setSelectedDate(`${value}-${String(normalizedDay).padStart(2, '0')}`);
    setSuccess('');
  };

  const handleDateChange = (value) => {
    if (!value) return;

    setSelectedDate(value);
    const [year, monthStr] = value.split('-');
    const monthValue = `${year}-${monthStr}`;
    if (monthValue !== month) {
      setMonth(monthValue);
    }
    setSuccess('');
  };

  const handleStatusChange = (employeeId, value) => {
    setAttendanceState((prev) => ({
      ...prev,
      [employeeId]: value
    }));
    setSuccess('');
  };

  const handleAmountChange = (employeeId, key, rawValue) => {
    if (rawValue === '' || isValidNumericInput(rawValue)) {
      setAmountState((prev) => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [key]: rawValue
        }
      }));
      setSuccess('');
    }
  };

  const calculateDifference = (employeeId, isNonWorker = false) => {
    const state = isNonWorker ? nonWorkerAmountState : amountState;
    const amounts = state[employeeId] || {};
    const takenValue = amounts.taken ? Number(amounts.taken) : 0;
    const paidValue = amounts.paid ? Number(amounts.paid) : 0;
    if (Number.isNaN(takenValue) || Number.isNaN(paidValue)) {
      return 0;
    }
    return takenValue - paidValue;
  };

  const gatherAttendanceChanges = () => {
    const changes = [];

    employees.forEach((employee) => {
      const current = attendanceState[employee.id] || '';
      const initial = attendanceMap[employee.id]?.[selectedDate] || '';

      if (current !== initial) {
        changes.push({
          employee_id: employee.id,
          date: selectedDate,
          status: current
        });
      }
    });

    return changes;
  };

  const handleEdit = () => {
    setIsEditMode(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setIsEditMode(false);
    // Reset all states to original values
    setAttendanceState(() => {
      const reset = {};
      employees.forEach((employee) => {
        reset[employee.id] = attendanceMap[employee.id]?.[selectedDate] || '';
      });
      return reset;
    });

    setAmountState(() => {
      const reset = {};
      employees.forEach((employee) => {
        reset[employee.id] = { taken: '', paid: '' };
      });
      return reset;
    });

    setNonWorkerAttendanceState(() => {
      const reset = {};
      nonWorkers.forEach((nonWorker) => {
        if (nonWorker && nonWorker.id) {
          reset[nonWorker.id] = attendanceMap[nonWorker.id]?.[selectedDate] || '';
        }
      });
      return reset;
    });

    setNonWorkerAmountState(() => {
      const reset = {};
      nonWorkers.forEach((nonWorker) => {
        if (nonWorker && nonWorker.id) {
          reset[nonWorker.id] = { taken: '', paid: '' };
        }
      });
      return reset;
    });

    setNonWorkerCountState(() => {
      const reset = {};
      nonWorkers.forEach((nonWorker) => {
        if (nonWorker && nonWorker.id) {
          const dailyCount = dailyCountsMap[nonWorker.id]?.[selectedDate];
          reset[nonWorker.id] = dailyCount !== undefined ? dailyCount : '';
        }
      });
      return reset;
    });

    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!selectedDate) {
      setError('Please select a date before saving.');
      setSuccess('');
      return;
    }

    const attendanceChanges = gatherAttendanceChanges();
    const advanceRequests = [];
    let invalidAmount = false;

    employees.forEach((employee) => {
      const amounts = amountState[employee.id] || {};
      const takenValue = amounts.taken ? Number(amounts.taken) : 0;
      const paidValue = amounts.paid ? Number(amounts.paid) : 0;

      if (takenValue < 0 || paidValue < 0) {
        invalidAmount = true;
        return;
      }

      if (takenValue > 0) {
        advanceRequests.push(
          axios.post('/api/advance', {
            employee_id: employee.id,
            amount: takenValue,
            date: selectedDate,
            type: 'taken'
          })
        );
      }

      if (paidValue > 0) {
        advanceRequests.push(
          axios.post('/api/advance', {
            employee_id: employee.id,
            amount: paidValue,
            date: selectedDate,
            type: 'paid'
          })
        );
      }
    });

    if (invalidAmount) {
      setError('Amounts cannot be negative.');
      setSuccess('');
          return;
        }

    // Check for non-worker changes
    const hasNonWorkerChanges = nonWorkers.some((nonWorker) => {
      const current = nonWorkerAttendanceState[nonWorker.id] || '';
      const initial = attendanceMap[nonWorker.id]?.[selectedDate] || '';
      const amounts = nonWorkerAmountState[nonWorker.id] || {};
      const takenValue = amounts.taken ? Number(amounts.taken) : 0;
      const paidValue = amounts.paid ? Number(amounts.paid) : 0;
      const currentCount = nonWorkerCountState[nonWorker.id];
      const existingCount = dailyCountsMap[nonWorker.id]?.[selectedDate];
      const countChanged = currentCount !== undefined && currentCount !== '' && currentCount !== existingCount;
      return current !== initial || takenValue > 0 || paidValue > 0 || countChanged;
    });

    if (!attendanceChanges.length && !advanceRequests.length && !hasNonWorkerChanges) {
      setError('No changes to save.');
      setSuccess('');
        return;
      }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (attendanceChanges.length) {
        await axios.post('/api/attendance/bulk', {
          entries: attendanceChanges.map((change) => ({
            ...change,
            status: change.status || ''
          }))
        });
      }

      if (advanceRequests.length) {
        await Promise.all(advanceRequests);
      }

      // Handle non-worker attendance and advances
      const nonWorkerAttendanceChanges = [];
      const nonWorkerAdvanceRequests = [];

      nonWorkers.forEach((nonWorker) => {
        const current = nonWorkerAttendanceState[nonWorker.id] || '';
        const initial = attendanceMap[nonWorker.id]?.[selectedDate] || '';

        if (current !== initial) {
          nonWorkerAttendanceChanges.push({
            employee_id: nonWorker.id,
            date: selectedDate,
            status: current
          });
        }

        const amounts = nonWorkerAmountState[nonWorker.id] || {};
        const takenValue = amounts.taken ? Number(amounts.taken) : 0;
        const paidValue = amounts.paid ? Number(amounts.paid) : 0;

        if (takenValue > 0) {
          nonWorkerAdvanceRequests.push(
            axios.post('/api/advance', {
              employee_id: nonWorker.id,
              amount: takenValue,
              date: selectedDate,
              type: 'taken'
            })
          );
        }

        if (paidValue > 0) {
          nonWorkerAdvanceRequests.push(
            axios.post('/api/advance', {
              employee_id: nonWorker.id,
              amount: paidValue,
              date: selectedDate,
              type: 'paid'
            })
          );
        }
      });

      if (nonWorkerAttendanceChanges.length) {
        await axios.post('/api/attendance/bulk', {
          entries: nonWorkerAttendanceChanges.map((change) => ({
            ...change,
            status: change.status || ''
          }))
        });
      }

      if (nonWorkerAdvanceRequests.length) {
        await Promise.all(nonWorkerAdvanceRequests);
      }

      // Update daily employee_count for non-workers if changed
      const countUpdates = [];
      nonWorkers.forEach((nonWorker) => {
        const currentCount = nonWorkerCountState[nonWorker.id];
        const existingCount = dailyCountsMap[nonWorker.id]?.[selectedDate];
        
        // Only save if count is provided and different from existing
        if (currentCount !== undefined && currentCount !== '' && currentCount !== existingCount) {
          countUpdates.push(
            axios.put(`/api/employees/${nonWorker.id}/daily-count`, {
              employee_count: currentCount,
              date: selectedDate
            })
          );
        }
      });

      if (countUpdates.length) {
        await Promise.all(countUpdates);
      }

      await fetchData(false);

      setAmountState((prev) => {
        const reset = {};
        Object.keys(prev).forEach((employeeId) => {
          reset[employeeId] = { taken: '', paid: '' };
        });
        return reset;
      });

      setNonWorkerAmountState((prev) => {
        const reset = {};
        Object.keys(prev).forEach((nonWorkerId) => {
          reset[nonWorkerId] = { taken: '', paid: '' };
        });
        return reset;
      });

      // Reset nonWorkerCountState - will be updated when fetchData completes and dailyCountsMap is refreshed
      setIsEditMode(false);
      setSuccess('Updates saved successfully.');
    } catch (saveError) {
      setError(saveError.response?.data?.error || 'Failed to save updates.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading === true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-700">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Allow both user1 (admin) and user2 (employee) to access this page
  if (!user || (user.role !== 'user2' && user.role !== 'user1')) {
    return null;
  }

  if (loading && !error && employees.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-700">Loading employee dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Employee Attendance & Advances</h1>
            {sectorName && (
              <p className="text-gray-600 mt-1">
                Sector: <span className="font-semibold">{sectorName}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/sectors')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
            >
              Back to Sectors
            </button>
            {user && user.role === 'user1' && (
              <button
                onClick={() => navigate(`/dashboard/${sectorId}`)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Admin View
              </button>
            )}
            <button
              onClick={() => logout && logout()}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveView('daily')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                activeView === 'daily'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Daily Attendance Sheet
            </button>
            <button
              onClick={() => setActiveView('status')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                activeView === 'status'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Employee Attendance Status
            </button>
          </div>
        </div>

        {activeView === 'daily' && (
          <>
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Select Month</label>
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min={`${month}-01`}
                    max={maxDate}
                  />
                </div>
              </div>
            </div>

        {(error || success) && (
          <div>
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
            )}
            {success && (
              <div className="px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">{success}</div>
            )}
          </div>
        )}

        {/* Employee Table */}
        {employees.filter(emp => emp.designation === 'employee' || !emp.designation).length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <h2 className="text-xl font-bold text-gray-800 p-4 border-b">Employee Details</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Attendance Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Outstanding Advance</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Advance Amount Taken</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Advance Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.filter(emp => emp.designation === 'employee' || !emp.designation).map((employee) => {
                    const difference = calculateDifference(employee.id);
                    const currentOutstanding =
                      Number(employee.monthly_advance_due ?? employee.total_advance_due ?? 0);
                    const takenValue = amountState[employee.id]?.taken || '';
                    const paidValue = amountState[employee.id]?.paid || '';

                    return (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-800">{employee.name}</div>
                          {employee.phone && (
                            <div className="text-sm text-gray-500">Phone: {employee.phone}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={attendanceState[employee.id] || ''}
                            onChange={(e) => handleStatusChange(employee.id, e.target.value)}
                            disabled={!isEditMode}
                            className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${!isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value || 'blank'} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-lg font-semibold text-gray-800">{formatCurrency(employee.total_advance_due || 0)}</div>
                          {difference !== 0 && (
                            <div className="text-xs text-gray-500">
                              New: {formatCurrency(difference)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={takenValue}
                            onChange={(e) => handleAmountChange(employee.id, 'taken', e.target.value)}
                            placeholder="Enter amount"
                            disabled={!isEditMode}
                            className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${!isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={paidValue}
                            onChange={(e) => handleAmountChange(employee.id, 'paid', e.target.value)}
                            placeholder="Enter amount"
                            disabled={!isEditMode}
                            className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${!isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Contract Employee Table */}
        {employees.filter(emp => emp.designation === 'contract_employee').length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
            <h2 className="text-xl font-bold text-gray-800 p-4 border-b">Contract Employee Details</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Attendance Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Outstanding Advance</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Advance Amount Taken</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Advance Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.filter(emp => emp.designation === 'contract_employee').map((employee) => {
                    const difference = calculateDifference(employee.id);
                    const currentOutstanding =
                      Number(employee.monthly_advance_due ?? employee.total_advance_due ?? 0);
                    const takenValue = amountState[employee.id]?.taken || '';
                    const paidValue = amountState[employee.id]?.paid || '';

                    return (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-800">{employee.name}</div>
                          {employee.phone && (
                            <div className="text-sm text-gray-500">Phone: {employee.phone}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={attendanceState[employee.id] || ''}
                            onChange={(e) => handleStatusChange(employee.id, e.target.value)}
                            disabled={!isEditMode}
                            className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${!isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value || 'blank'} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-lg font-semibold text-gray-800">{formatCurrency(employee.total_advance_due || 0)}</div>
                          {difference !== 0 && (
                            <div className="text-xs text-gray-500">
                              New: {formatCurrency(difference)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={takenValue}
                            onChange={(e) => handleAmountChange(employee.id, 'taken', e.target.value)}
                            placeholder="Enter amount"
                            disabled={!isEditMode}
                            className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${!isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={paidValue}
                            onChange={(e) => handleAmountChange(employee.id, 'paid', e.target.value)}
                            placeholder="Enter amount"
                            disabled={!isEditMode}
                            className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${!isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {/* Non-Worker Table (for backward compatibility - employees with employee_type='non_worker') */}
        {nonWorkers.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
            <h2 className="text-xl font-bold text-gray-800 p-4 border-b">Non Worker Details</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Attendance Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total Count</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Outstanding Advance</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Advance Taken</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Advance Paid</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {nonWorkers.map((nonWorker) => {
                    const difference = calculateDifference(nonWorker.id, true);
                    const takenValue = nonWorkerAmountState[nonWorker.id]?.taken || '';
                    const paidValue = nonWorkerAmountState[nonWorker.id]?.paid || '';
                    
                    return (
                      <tr key={nonWorker.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-800">{nonWorker.name}</div>
                          {nonWorker.phone && (
                            <div className="text-sm text-gray-500">Phone: {nonWorker.phone}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                  <select
                            value={nonWorkerAttendanceState[nonWorker.id] || ''}
                            onChange={(e) => {
                              setNonWorkerAttendanceState(prev => ({
                                ...prev,
                                [nonWorker.id]: e.target.value
                              }));
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value || 'blank'} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                  </select>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            min="1"
                            value={nonWorkerCountState[nonWorker.id] !== undefined ? nonWorkerCountState[nonWorker.id] : ''}
                            onChange={(e) => {
                              const newCount = e.target.value ? Number(e.target.value) : '';
                              if (newCount === '' || (!Number.isNaN(newCount) && newCount >= 1)) {
                                setNonWorkerCountState(prev => ({
                                  ...prev,
                                  [nonWorker.id]: newCount
                                }));
                              }
                            }}
                            disabled={!isEditMode}
                            placeholder="Enter count"
                            className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${!isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-lg font-semibold text-gray-800">
                            {formatCurrency(nonWorker.total_advance_due || 0)}
                </div>
                          {difference !== 0 && (
                            <div className="text-xs text-gray-500">
                              New: {formatCurrency(difference)}
                </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={takenValue}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^(\d+)?(\.\d{0,2})?$/.test(value)) {
                                setNonWorkerAmountState(prev => ({
                                  ...prev,
                                  [nonWorker.id]: { ...prev[nonWorker.id], taken: value }
                                }));
                              }
                            }}
                            placeholder="Enter amount"
                            disabled={!isEditMode}
                            className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${!isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={paidValue}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^(\d+)?(\.\d{0,2})?$/.test(value)) {
                                setNonWorkerAmountState(prev => ({
                                  ...prev,
                                  [nonWorker.id]: { ...prev[nonWorker.id], paid: value }
                                }));
                              }
                            }}
                            placeholder="Enter amount"
                            disabled={!isEditMode}
                            className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${!isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons at Bottom */}
        <div className="flex flex-wrap justify-end gap-3 mt-6">
          {isEditMode ? (
            <>
              <button
                onClick={handleCancel}
                className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving ? 'Saving...' : 'Save Updates'}
              </button>
            </>
          ) : (
            <button
              onClick={handleEdit}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Edit
            </button>
          )}
        </div>
          </>
        )}

        {activeView === 'status' && (
          <EmployeeAttendanceStatusView
            sectorId={sectorId}
            employees={Array.isArray(employees) ? employees : []}
            nonWorkers={Array.isArray(nonWorkers) ? nonWorkers : []}
            month={month}
            setMonth={setMonth}
            fetchData={fetchData}
          />
        )}
                </div>
                </div>
  );
};

// Employee Attendance Status View Component
const EmployeeAttendanceStatusView = ({ sectorId, employees, nonWorkers = [], month, setMonth, fetchData }) => {
  const [selectedDates, setSelectedDates] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [nonWorkerAttendanceData, setNonWorkerAttendanceData] = useState({});
  const [nonWorkerTotalCounts, setNonWorkerTotalCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [statusMonth, setStatusMonth] = useState(month);

  const getLastDayOfMonth = (monthValue) => {
    if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) {
      return 31;
    }
    const [yearStr, monthStr] = monthValue.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      return 31;
    }
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  const maxDate = useMemo(() => {
    const lastDay = getLastDayOfMonth(statusMonth);
    return `${statusMonth}-${String(lastDay).padStart(2, '0')}`;
  }, [statusMonth]);

  const handleMonthChange = (value) => {
    if (!value) return;
    setStatusMonth(value);
    setMonth(value);
    setSelectedDates([]);
    setAttendanceData({});
    setNonWorkerAttendanceData({});
    setNonWorkerTotalCounts({});
  };

  const handleDateToggle = (date) => {
    setSelectedDates((prev) => {
      if (prev.includes(date)) {
        return prev.filter((d) => d !== date);
      } else {
        return [...prev, date].sort();
      }
    });
  };

  useEffect(() => {
    if (selectedDates.length === 0) {
      setAttendanceData({});
      setNonWorkerAttendanceData({});
      setNonWorkerTotalCounts({});
      return;
    }

    const fetchAttendanceForDates = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/attendance/sector/${sectorId}?month=${statusMonth}`);
        const { attendance } = response.data;

        const attendanceMap = {};
        if (employees && Array.isArray(employees)) {
          employees.forEach((employee) => {
            const presentCount = (attendance || []).filter(
              (att) =>
                att.employee_id === employee.id &&
                selectedDates.includes(att.date) &&
                att.status === 'present'
            ).length;
            attendanceMap[employee.id] = presentCount;
          });
        }

        const nonWorkerMap = {};
        const totalCountsMap = {};
        if (nonWorkers && Array.isArray(nonWorkers)) {
          nonWorkers.forEach((nonWorker) => {
            const presentCount = (attendance || []).filter(
              (att) =>
                att.employee_id === nonWorker.id &&
                selectedDates.includes(att.date) &&
                att.status === 'present'
            ).length;
            nonWorkerMap[nonWorker.id] = presentCount;

            // Calculate total count for selected dates
            let totalCount = 0;
            selectedDates.forEach((date) => {
              // We'll fetch daily counts in the next step
              totalCount += (nonWorker.employee_count || 1);
            });
            totalCountsMap[nonWorker.id] = totalCount;
          });
        }

        // Fetch daily counts for selected dates
        let dailyCountsData = [];
        if (selectedDates.length > 0) {
          try {
            const dailyCountsResponse = await axios.get(`/api/employees/sector/${sectorId}/daily-counts`, {
              params: {
                startDate: selectedDates[0],
                endDate: selectedDates[selectedDates.length - 1]
              }
            });
            dailyCountsData = dailyCountsResponse.data || [];
          } catch (err) {
            console.error('Error fetching daily counts:', err);
          }
        }

        // Recalculate total counts with actual daily counts
        if (nonWorkers && Array.isArray(nonWorkers)) {
          nonWorkers.forEach((nonWorker) => {
            let totalCount = 0;
            selectedDates.forEach((date) => {
              const dailyCount = dailyCountsData.find(
                (dc) => dc.employee_id === nonWorker.id && dc.date === date
              );
              if (dailyCount) {
                totalCount += dailyCount.count;
              } else {
                // If no daily count for this date, use default employee_count
                totalCount += (nonWorker.employee_count || 1);
              }
            });
            totalCountsMap[nonWorker.id] = totalCount;
          });
        }

        setAttendanceData(attendanceMap);
        setNonWorkerAttendanceData(nonWorkerMap);
        setNonWorkerTotalCounts(totalCountsMap);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceForDates();
  }, [selectedDates, sectorId, statusMonth, employees, nonWorkers]);

  const daysInMonth = useMemo(() => {
    if (!statusMonth) return [];
    const [year, monthStr] = statusMonth.split('-');
    const totalDays = new Date(Number(year), Number(monthStr), 0).getDate();

    return Array.from({ length: totalDays }, (_, index) => {
      const dayNumber = index + 1;
      return `${statusMonth}-${String(dayNumber).padStart(2, '0')}`;
    });
  }, [statusMonth]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Select Month</label>
                  <input
              type="month"
              value={statusMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Select Dates (Click to toggle)</label>
          <div className="grid grid-cols-7 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg">
            {daysInMonth.map((date) => {
              const isSelected = selectedDates.includes(date);
              const dateObj = new Date(date);
              const dayNumber = dateObj.getDate();
              const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });

              return (
                  <button
                  key={date}
                    type="button"
                  onClick={() => handleDateToggle(date)}
                  className={`p-2 text-sm rounded-lg border transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold">{dayNumber}</div>
                  <div className="text-xs">{dayName}</div>
                  </button>
              );
            })}
                </div>
          {selectedDates.length > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              {selectedDates.length} date(s) selected
            </p>
          )}
            </div>
          </div>

      {/* Employee details table */}
      {employees.filter(emp => emp.designation === 'employee' || !emp.designation).length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="text-xl font-bold text-gray-800 p-4 border-b">Employee details</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">No. of Days Present</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.filter(emp => emp.designation === 'employee' || !emp.designation).map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-800">{employee.name}</div>
                      {employee.phone && (
                        <div className="text-sm text-gray-500">Phone: {employee.phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-lg font-semibold text-gray-800">
                        {loading ? '...' : attendanceData[employee.id] || 0}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contract Employee details table */}
      {employees.filter(emp => emp.designation === 'contract_employee').length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
          <h2 className="text-xl font-bold text-gray-800 p-4 border-b">Contract Employee details</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">No. of Days Present</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.filter(emp => emp.designation === 'contract_employee').map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-800">{employee.name}</div>
                      {employee.phone && (
                        <div className="text-sm text-gray-500">Phone: {employee.phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-lg font-semibold text-gray-800">
                        {loading ? '...' : attendanceData[employee.id] || 0}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {nonWorkers && nonWorkers.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
          <h2 className="text-xl font-bold text-gray-800 p-4 border-b">Non Worker details</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">No. of Days Present</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total Count</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                {nonWorkers.map((nonWorker) => (
                  <tr key={nonWorker.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-800">{nonWorker.name}</div>
                      {nonWorker.phone && (
                        <div className="text-sm text-gray-500">Phone: {nonWorker.phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-lg font-semibold text-gray-800">
                        {loading ? '...' : nonWorkerAttendanceData[nonWorker.id] || 0}
                      </div>
                          </td>
                    <td className="px-6 py-4">
                      <div className="text-lg font-semibold text-gray-800">
                        {loading ? '...' : (nonWorkerTotalCounts[nonWorker.id] || 0)}
                      </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
            </div>
          </div>
        )}
    </div>
  );
};

export default User2Dashboard;

