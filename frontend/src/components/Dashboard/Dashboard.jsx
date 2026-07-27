import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchComplaints, deleteComplaint } from '../../store/slices/complaintsSlice';
import { 
  Search, AlertTriangle, CheckCircle, PackageOpen, 
  Trash2, Eye, ShieldAlert, Layers, Activity 
} from 'lucide-react';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { list: complaints, loading, error } = useSelector((state) => state.complaints);
  
  // Local state for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Fetch complaints on load or filter change
  useEffect(() => {
    dispatch(fetchComplaints({
      search: searchTerm || undefined,
      severity: severityFilter || undefined,
      complaint_type: typeFilter || undefined
    }));
  }, [dispatch, searchTerm, severityFilter, typeFilter]);

  const handleDelete = (id, e) => {
    e.preventDefault();
    if (window.confirm("Are you sure you want to delete this complaint record?")) {
      dispatch(deleteComplaint(id));
    }
  };

  // Calculate statistics
  const totalCount = complaints.length;
  const criticalCount = complaints.filter(c => c.severity === 'Critical' || c.severity === 'High').length;
  const totalQtyAffected = complaints.reduce((sum, c) => sum + (c.quantity_affected || 0), 0);
  
  // Unique products affected
  const uniqueProducts = new Set(complaints.map(c => c.product_name).filter(Boolean)).size;

  // Badge stylers
  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'Critical':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'High':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Medium':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const getPriorityBadge = (pri) => {
    switch (pri) {
      case 'Urgent':
        return 'bg-red-500 text-red-100 animate-pulse';
      case 'High':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'Medium':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Action */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Quality Assurance Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking, risk classifications, and AI copilot investigation reports.
          </p>
        </div>
        <Link
          to="/intake"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/20 text-xs font-semibold flex items-center space-x-2 transition-all"
        >
          <span>+ File New Complaint</span>
        </Link>
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total complaints */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Total Complaints</span>
            <h3 className="text-3xl font-extrabold tracking-tight">{totalCount}</h3>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50 text-slate-300">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        {/* Critical complaints */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between border-l-2 border-l-rose-500/40">
          <div className="space-y-2">
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Critical / High Risk</span>
            <h3 className="text-3xl font-extrabold tracking-tight text-rose-400">{criticalCount}</h3>
          </div>
          <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-rose-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
        </div>

        {/* Affected Qty */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Quantity Affected</span>
            <h3 className="text-3xl font-extrabold tracking-tight text-teal-400">{totalQtyAffected}</h3>
          </div>
          <div className="bg-teal-500/10 p-3 rounded-xl border border-teal-500/20 text-teal-400">
            <Activity className="h-6 w-6" />
          </div>
        </div>

        {/* Products */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Affected Products</span>
            <h3 className="text-3xl font-extrabold tracking-tight text-emerald-400">{uniqueProducts}</h3>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-emerald-400">
            <PackageOpen className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="glass p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by customer, product, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/40 transition-colors"
          />
        </div>

        {/* Severity filter */}
        <div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/40 transition-colors"
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Type filter */}
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/40 transition-colors"
          >
            <option value="">All Complaint Types</option>
            <option value="Efficacy">Efficacy</option>
            <option value="Adverse Event">Adverse Event</option>
            <option value="Packaging">Packaging</option>
            <option value="Contamination">Contamination</option>
            <option value="Quality/Physical">Quality/Physical</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Complaints List Table */}
      <div className="glass rounded-2xl overflow-hidden border border-slate-800/80">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
            <span className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></span>
            <span className="text-xs">Loading complaint logs...</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-400 text-xs">
            {error}
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-4">
            <div className="bg-slate-900/60 p-4 rounded-full border border-slate-850">
              <CheckCircle className="h-10 w-10 text-emerald-500/60" />
            </div>
            <div className="space-y-1">
              <h4 className="text-slate-200 font-semibold text-sm">No complaints logged</h4>
              <p className="text-xs max-w-xs">All products are within tolerance, or filters matched no records.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-800 text-slate-400 font-medium">
                  <th className="p-4 pl-6">ID / Date</th>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Product Name</th>
                  <th className="p-4">Batch Number</th>
                  <th className="p-4">Complaint Type</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/40 transition-colors group">
                    <td className="p-4 pl-6 space-y-0.5">
                      <div className="font-semibold text-slate-200">
                        {c.id.substring(0, 8).toUpperCase()}
                      </div>
                      <div className="text-[10px] text-slate-500">{c.complaint_date || 'No Date'}</div>
                    </td>
                    <td className="p-4 text-slate-300 font-medium">{c.customer_name || 'N/A'}</td>
                    <td className="p-4">
                      <div className="text-slate-200 font-medium">{c.product_name || 'N/A'}</div>
                      <div className="text-[10px] text-slate-500">{c.product_strength || ''}</div>
                    </td>
                    <td className="p-4 font-mono text-slate-400">{c.batch_number || 'N/A'}</td>
                    <td className="p-4 text-slate-300">{c.complaint_type || 'N/A'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${getSeverityBadge(c.severity)}`}>
                        {c.severity || 'Medium'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${getPriorityBadge(c.priority)}`}>
                        {c.priority || 'Medium'}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/complaints/${c.id}`}
                          className="p-1.5 bg-slate-850 hover:bg-emerald-600/20 text-slate-400 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/30 rounded-lg transition-colors flex items-center justify-center"
                          title="Open AI Copilot Review"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={(e) => handleDelete(c.id, e)}
                          className="p-1.5 bg-slate-850 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 rounded-lg transition-colors flex items-center justify-center"
                          title="Delete Record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
