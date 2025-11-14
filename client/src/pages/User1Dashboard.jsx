import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Non Employee Row Component
const NonEmployeeRow = ({ nonWorker, onUpdate, formatCurrency }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [amountProvided, setAmountProvided] = useState(nonWorker.salary_payment_amount ? String(nonWorker.salary_payment_amount) : '');
  const [amountDate, setAmountDate] = useState(nonWorker.salary_payment_date || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleEdit = () => {
    setIsEditing(true);
    setAmountProvided(nonWorker.salary_payment_amount ? String(nonWorker.salary_payment_amount) : '');
    setAmountDate(nonWorker.salary_payment_date || '');
    setError('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setAmountProvided(nonWorker.salary_payment_amount ? String(nonWorker.salary_payment_amount) : '');
    setAmountDate(nonWorker.salary_payment_date || '');
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const updates = {};
      if (amountProvided !== '' && amountProvided !== String(nonWorker.salary_payment_amount || '')) {
        const parsedAmount = Number(amountProvided);
        if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
          setError('Amount must be a valid number');
          setSaving(false);
          return;
        }
        updates.salary_payment_amount = parsedAmount;
      } else if (amountProvided === '' && nonWorker.salary_payment_amount) {
        updates.salary_payment_amount = null;
      }

      if (amountDate !== (nonWorker.salary_payment_date || '')) {
        updates.salary_payment_date = amountDate || null;
      }

      if (Object.keys(updates).length > 0) {
        await axios.put(`/api/employees/${nonWorker.id}`, updates);
        await onUpdate();
        setIsEditing(false);
      } else {
        setIsEditing(false);
      }
    } catch (saveError) {
      setError(saveError.response?.data?.error || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800">{nonWorker.name}</td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-700">
          {formatCurrency(nonWorker.total_advance_due || 0)}
        </div>
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <input
            type="text"
            value={amountProvided}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || /^(\d+)?(\.\d{0,2})?$/.test(value)) {
                setAmountProvided(value);
              }
            }}
            placeholder="Enter amount"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        ) : (
          <div className="text-sm text-gray-700">
            {nonWorker.salary_payment_amount ? formatCurrency(nonWorker.salary_payment_amount) : '-'}
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <input
            type="date"
            value={amountDate}
            onChange={(e) => setAmountDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        ) : (
          <div className="text-sm text-gray-700">
            {nonWorker.salary_payment_date || '-'}
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleEdit}
            className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
          >
            Edit
          </button>
        )}
        {error && (
          <div className="text-xs text-red-600 mt-1">{error}</div>
        )}
      </td>
    </tr>
  );
};

const defaultFormData = {
  name: '',
  phone: '',
  address: '',
  bank_account: '',
  bank_ifsc: '',
  bank_name: '',
  monthly_wage: '',
  weekly_wage: '',
  salary: '',
  salary_frequency: '',
  employee_type: 'worker',
  employee_count: '1',
  designation: ''
};

const salaryFrequencyOptions = [
  { value: '', label: 'Select Status' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
];

const designationOptions = [
  { value: '', label: 'Select Designation' },
  { value: 'employee', label: 'Employee' },
  { value: 'contract_employee', label: 'Contract Employee' }
];

const salaryStatusOptions = [
  { value: 'provided', label: 'Provided' },
  { value: 'not_provided', label: 'Not Provided' }
];

const isValidCurrencyInput = (value) => /^(\d+)?(\.\d{0,2})?$/.test(value);

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

const normalizeText = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parseNumericField = (value, label) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${label} must be a number`);
  }
  if (parsed < 0) {
    throw new Error(`${label} cannot be negative`);
  }
  return parsed;
};

const User1Dashboard = () => {
  const { sectorId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [sectorName, setSectorName] = useState('');
  const [employees, setEmployees] = useState([]);
  const [nonWorkers, setNonWorkers] = useState([]);
  const [contractEmployees, setContractEmployees] = useState([]);
  const [productEmployees, setProductEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState(defaultFormData);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [salarySavingId, setSalarySavingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [salaryUpdates, setSalaryUpdates] = useState({});
  const [editingSalaryId, setEditingSalaryId] = useState(null);
  const [reasonUpdates, setReasonUpdates] = useState({});

  const loadEmployees = useCallback(async () => {
    const [employeesResponse, nonWorkersResponse] = await Promise.all([
      axios.get(`/api/employees/sector/${sectorId}`),
      axios.get(`/api/employees/sector/${sectorId}/non-workers`).catch(() => ({ data: [] }))
    ]);
    const allEmployees = employeesResponse.data || [];
    const allNonWorkers = nonWorkersResponse.data || [];
    
    // Filter by designation
    setEmployees(allEmployees.filter(emp => emp.designation === 'employee' || !emp.designation));
    setNonWorkers(allNonWorkers);
    setContractEmployees(allEmployees.filter(emp => emp.designation === 'contract_employee'));
    setProductEmployees(allEmployees.filter(emp => emp.designation === 'product'));
    return allEmployees;
  }, [sectorId]);

  useEffect(() => {
    if (!user) {
      return;
    }
    if (user.role !== 'user1') {
      navigate('/sectors', { replace: true });
      return;
    }

    const initialize = async () => {
      setLoading(true);
      setError('');
      try {
        const sectorsResponse = await axios.get('/api/sectors');
        const sector = sectorsResponse.data.find((item) => item.id === Number(sectorId));
        if (sector) {
          setSectorName(sector.name);
        }
        await loadEmployees();
      } catch (initError) {
        setError(initError.response?.data?.error || 'Failed to load admin dashboard.');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [loadEmployees, navigate, sectorId, user]);

  useEffect(() => {
    const updates = {};
    const reasonUpds = {};
    // Initialize for all employees
    employees.forEach((employee) => {
      updates[employee.id] = {
        status: employee.salary_payment_status || 'not_provided',
        amount:
          employee.salary_payment_amount !== null && employee.salary_payment_amount !== undefined
            ? String(employee.salary_payment_amount)
            : '',
        date: employee.salary_payment_date || ''
      };
      reasonUpds[employee.id] = employee.reason || '';
    });
    // Also initialize for contract employees
    contractEmployees.forEach((employee) => {
      if (!updates[employee.id]) {
        updates[employee.id] = {
          status: employee.salary_payment_status || 'not_provided',
          amount:
            employee.salary_payment_amount !== null && employee.salary_payment_amount !== undefined
              ? String(employee.salary_payment_amount)
              : '',
          date: employee.salary_payment_date || ''
        };
      }
      reasonUpds[employee.id] = employee.reason || '';
    });
    setSalaryUpdates(updates);
    setReasonUpdates(reasonUpds);
  }, [employees, contractEmployees]);

  const openAddForm = () => {
    setActiveTab('add');
    setEditingEmployeeId(null);
    setFormData(defaultFormData);
    setSuccess('');
    setError('');
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    setSuccess('');
    setError('');
    if (tab === 'add' && !editingEmployeeId) {
      setFormData(defaultFormData);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = formData.name.trim();
    if (!name) {
      setError('Employee name is required.');
      setSuccess('');
      return;
    }

    let payload;
    try {
      payload = {
        name,
        phone: normalizeText(formData.phone),
        address: normalizeText(formData.address),
        bank_account: normalizeText(formData.bank_account),
        bank_ifsc: normalizeText(formData.bank_ifsc),
        bank_name: normalizeText(formData.bank_name),
        monthly_wage: parseNumericField(formData.monthly_wage, 'Monthly salary amount'),
        weekly_wage: parseNumericField(formData.weekly_wage, 'Weekly salary amount'),
        salary: parseNumericField(formData.salary, 'Daily salary amount'),
        salary_frequency: formData.salary_frequency || null,
        employee_type: formData.employee_type || 'worker',
        employee_count: 1,
        designation: formData.designation || null
      };

      // Only validate salary_frequency if it's provided (not empty)
      if (payload.salary_frequency && !['daily', 'weekly', 'monthly'].includes(payload.salary_frequency)) {
        throw new Error('Please choose a valid salaried status.');
      }
    } catch (validationError) {
      setError(validationError.message);
      setSuccess('');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingEmployeeId) {
        await axios.put(`/api/employees/${editingEmployeeId}`, payload);
        setSuccess('Employee updated successfully.');
      } else {
        await axios.post('/api/employees', { ...payload, sector_id: sectorId });
        setSuccess('Employee added successfully.');
      }

      await loadEmployees();
      setFormData(defaultFormData);
      setEditingEmployeeId(null);
      if (editingEmployeeId) {
        setActiveTab('personal');
      }
    } catch (submitError) {
      setError(submitError.response?.data?.error || 'Failed to save employee.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelForm = () => {
    setFormData(defaultFormData);
    setEditingEmployeeId(null);
    setActiveTab('personal');
    setSuccess('');
    setError('');
  };

  const handleEdit = (employee) => {
    setFormData({
      name: employee.name || '',
      phone: employee.phone || '',
      address: employee.address || '',
      bank_account: employee.bank_account || '',
      bank_ifsc: employee.bank_ifsc || '',
      bank_name: employee.bank_name || '',
      monthly_wage: employee.monthly_wage !== null && employee.monthly_wage !== undefined ? String(employee.monthly_wage) : '',
      weekly_wage: employee.weekly_wage !== null && employee.weekly_wage !== undefined ? String(employee.weekly_wage) : '',
      salary: employee.salary !== null && employee.salary !== undefined ? String(employee.salary) : '',
      salary_frequency: employee.salary_frequency || '',
      employee_type: employee.employee_type || 'worker',
      employee_count: employee.employee_count ? String(employee.employee_count) : '1',
      designation: employee.designation || ''
    });
    setEditingEmployeeId(employee.id);
    setActiveTab('add');
    setSuccess('');
    setError('');
  };

  const handleDelete = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await axios.delete(`/api/employees/${employeeId}`);
      await loadEmployees();
      setSuccess('Employee deleted successfully.');
    } catch (deleteError) {
      setError(deleteError.response?.data?.error || 'Failed to delete employee.');
    }
  };

  const handleSalaryChange = (employeeId, field, value) => {
    if (field === 'amount' && value !== '' && !isValidCurrencyInput(value)) {
      return;
    }

    setSalaryUpdates((prev) => ({
      ...prev,
      [employeeId]: {
        status: prev[employeeId]?.status || 'not_provided',
        amount: field === 'amount' ? value : prev[employeeId]?.amount || '',
        date: field === 'date' ? value : prev[employeeId]?.date || '',
        ...(field === 'status' ? { status: value } : {})
      }
    }));
    setSuccess('');
  };

  const handleSalarySave = async (employeeId) => {
    const salaryInfo = salaryUpdates[employeeId] || { status: 'not_provided', amount: '', date: '' };
    const { amount, date } = salaryInfo;
    const reason = reasonUpdates[employeeId] || '';

    let parsedAmount = null;
    if (amount !== '') {
      const numericAmount = Number(amount);
      if (Number.isNaN(numericAmount) || numericAmount < 0) {
        setError('Salary amount must be a non-negative number.');
        setSuccess('');
        return;
      }
      parsedAmount = numericAmount;
    }

    // Automatically determine status based on whether salary details are provided
    let status = 'not_provided';
    if (parsedAmount && parsedAmount > 0 && date) {
      status = 'provided';
    }

    setSalarySavingId(employeeId);
    setError('');
    setSuccess('');

    try {
      await axios.put(`/api/employees/${employeeId}`, {
        salary_payment_status: status,
        salary_payment_amount: parsedAmount,
        salary_payment_date: date || null,
        reason: reason || null
      });
      await loadEmployees();
      setEditingSalaryId(null);
      setSuccess('Salary details updated successfully.');
    } catch (salaryError) {
      setError(salaryError.response?.data?.error || 'Failed to update salary details.');
    } finally {
      setSalarySavingId(null);
    }
  };

  const handleSalaryEdit = (employeeId) => {
    setEditingSalaryId(employeeId);
  };

  const handleSalaryCancelEdit = (employeeId) => {
    const employee = employees.find((emp) => emp.id === employeeId);
    if (employee) {
      setSalaryUpdates((prev) => ({
        ...prev,
        [employeeId]: {
          status: employee.salary_payment_status || 'not_provided',
          amount:
            employee.salary_payment_amount !== null && employee.salary_payment_amount !== undefined
              ? String(employee.salary_payment_amount)
              : '',
          date: employee.salary_payment_date || ''
        }
      }));
      setReasonUpdates((prev) => ({
        ...prev,
        [employeeId]: employee.reason || ''
      }));
    }
    setEditingSalaryId(null);
  };

  const totalEmployees = useMemo(() => employees.length, [employees]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-700">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Sector Administration</h1>
            {sectorName && (
              <p className="text-gray-600 mt-1">
                Sector: <span className="font-semibold">{sectorName}</span> • {totalEmployees} employees
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
            <button
              onClick={() => navigate(`/employee-dashboard/${sectorId}`)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Employee View
            </button>
            <button
              onClick={() => navigate('/database')}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
            >
              Database Management
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={openAddForm}
              className={`px-5 py-2 rounded-lg font-semibold transition ${
                activeTab === 'add' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
              }`}
            >
              Add Employee
            </button>
            <button
              onClick={() => changeTab('personal')}
              className={`px-5 py-2 rounded-lg font-semibold transition ${
                activeTab === 'personal'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
              }`}
            >
              Employee Personal Details
            </button>
            <button
              onClick={() => changeTab('work')}
              className={`px-5 py-2 rounded-lg font-semibold transition ${
                activeTab === 'work' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
              }`}
            >
              Employee Work Details
            </button>
            <button
              onClick={() => changeTab('contractEmployee')}
              className={`px-5 py-2 rounded-lg font-semibold transition ${
                activeTab === 'contractEmployee'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
              }`}
            >
              Contract Employee Details
            </button>
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

        {activeTab === 'add' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              {editingEmployeeId ? 'Edit Employee Details' : 'Add Employee Details'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Employee Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleFormChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Bank Account</label>
                  <input
                    type="text"
                    value={formData.bank_account}
                    onChange={(e) => handleFormChange('bank_account', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Bank IFSC</label>
                  <input
                    type="text"
                    value={formData.bank_ifsc}
                    onChange={(e) => handleFormChange('bank_ifsc', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => handleFormChange('bank_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Designation</label>
                  <select
                    value={formData.designation}
                    onChange={(e) => handleFormChange('designation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {designationOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Salaried Status</label>
                  <select
                    value={formData.salary_frequency}
                    onChange={(e) => handleFormChange('salary_frequency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {salaryFrequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Daily Salary Amount</label>
                  <input
                    type="text"
                    value={formData.salary}
                    onChange={(e) => handleFormChange('salary', e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Weekly Salary Amount</label>
                  <input
                    type="text"
                    value={formData.weekly_wage}
                    onChange={(e) => handleFormChange('weekly_wage', e.target.value)}
                    placeholder="e.g. 2500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Monthly Salary Amount</label>
                  <input
                    type="text"
                    value={formData.monthly_wage}
                    onChange={(e) => handleFormChange('monthly_wage', e.target.value)}
                    placeholder="e.g. 10000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {saving ? 'Saving...' : editingEmployeeId ? 'Update Employee' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'personal' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Bank Details</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Salary Structure</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                        No employees found in this sector yet.
                      </td>
                    </tr>
                  )}
                  {employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800">{employee.name}</td>
                      <td className="px-6 py-4">
                        <div>{employee.phone || '-'}</div>
                        <div className="text-xs text-gray-400">{employee.salary_frequency ? `Salaried: ${employee.salary_frequency}` : ''}</div>
                      </td>
                      <td className="px-6 py-4">{employee.address || '-'}</td>
                      <td className="px-6 py-4">
                        {employee.bank_account ? (
                          <div>
                            <div>{employee.bank_account}</div>
                            <div className="text-xs text-gray-500">{employee.bank_name || '-'}</div>
                            <div className="text-xs text-gray-500">{employee.bank_ifsc || '-'}</div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          Daily: {employee.salary !== null && employee.salary !== undefined ? formatCurrency(employee.salary) : '-'}
                        </div>
                        <div className="text-sm text-gray-700">
                          Weekly: {employee.weekly_wage !== null && employee.weekly_wage !== undefined ? formatCurrency(employee.weekly_wage) : '-'}
                        </div>
                        <div className="text-sm text-gray-700">
                          Monthly: {employee.monthly_wage !== null && employee.monthly_wage !== undefined ? formatCurrency(employee.monthly_wage) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap space-x-2">
                        <button
                          onClick={() => handleEdit(employee)}
                          className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'work' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Outstanding Advance</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Salary Provided</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Salary Provided Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.filter(emp => emp.designation === 'employee' || !emp.designation).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                        No employee work details available yet.
                      </td>
                    </tr>
                  )}
                  {employees.filter(emp => emp.designation === 'employee' || !emp.designation).map((employee) => {
                    const salaryInfo = salaryUpdates[employee.id] || {
                      status: 'not_provided',
                      amount: '',
                      date: ''
                    };
                    const isEditing = editingSalaryId === employee.id;
                    const isSaved = employee.salary_payment_status === 'provided' && employee.salary_payment_date;

                    return (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800">{employee.name}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">
                            Total: {formatCurrency(employee.total_advance_due)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={salaryInfo.amount}
                              onChange={(e) => handleSalaryChange(employee.id, 'amount', e.target.value)}
                              placeholder="Enter amount"
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          ) : (
                            <div className="text-sm text-gray-700">
                              {employee.salary_payment_amount ? formatCurrency(employee.salary_payment_amount) : '-'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="date"
                              value={salaryInfo.date}
                              onChange={(e) => handleSalaryChange(employee.id, 'date', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          ) : (
                            <div className="text-sm text-gray-700">
                              {employee.salary_payment_date || '-'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap space-x-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSalarySave(employee.id)}
                                disabled={salarySavingId === employee.id}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                              >
                                {salarySavingId === employee.id ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => handleSalaryCancelEdit(employee.id)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition text-sm"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleSalaryEdit(employee.id)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'contractEmployee' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Outstanding Advance</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Salary Provided</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Salary Provided Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contractEmployees.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                        No contract employee work details available yet.
                      </td>
                    </tr>
                  )}
                  {contractEmployees.map((employee) => {
                    const salaryInfo = salaryUpdates[employee.id] || {
                      status: 'not_provided',
                      amount: '',
                      date: ''
                    };
                    const isEditing = editingSalaryId === employee.id;
                    const isSaved = employee.salary_payment_status === 'provided' && employee.salary_payment_date;

                    return (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800">{employee.name}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">
                            Total: {formatCurrency(employee.total_advance_due || 0)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={salaryInfo.amount}
                              onChange={(e) => handleSalaryChange(employee.id, 'amount', e.target.value)}
                              placeholder="Enter amount"
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          ) : (
                            <div className="text-sm text-gray-700">
                              {employee.salary_payment_amount ? formatCurrency(employee.salary_payment_amount) : '-'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="date"
                              value={salaryInfo.date}
                              onChange={(e) => handleSalaryChange(employee.id, 'date', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          ) : (
                            <div className="text-sm text-gray-700">
                              {employee.salary_payment_date || '-'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={reasonUpdates[employee.id] || ''}
                              onChange={(e) => setReasonUpdates(prev => ({ ...prev, [employee.id]: e.target.value }))}
                              placeholder="Enter reason"
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          ) : (
                            <div className="text-sm text-gray-700">
                              {employee.reason || '-'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap space-x-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSalarySave(employee.id)}
                                disabled={salarySavingId === employee.id}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                              >
                                {salarySavingId === employee.id ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => handleSalaryCancelEdit(employee.id)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition text-sm"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleSalaryEdit(employee.id)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default User1Dashboard;

