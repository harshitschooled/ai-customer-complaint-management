import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, BrainCircuit, ShieldCheck, Database, UserCheck } from 'lucide-react';

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 glass flex-shrink-0 border-r border-slate-800 flex flex-col justify-between">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
            <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                PharmaCare QMS
              </h1>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
                Complaint Intake Portal
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-2 mt-4">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border border-transparent'
                }`
              }
            >
              <LayoutDashboard className="h-5 w-5 group-hover:scale-105 transition-transform" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/intake"
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border border-transparent'
                }`
              }
            >
              <PlusCircle className="h-5 w-5 group-hover:scale-105 transition-transform" />
              <span>Complaint Intake</span>
            </NavLink>
          </nav>
        </div>

        {/* Footer/Status Info */}
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center">
              <Database className="h-3.5 w-3.5 text-emerald-500 mr-1.5" />
              DB: Active
            </span>
            <span className="flex items-center">
              <UserCheck className="h-3.5 w-3.5 text-teal-400 mr-1.5" />
              QA Manager
            </span>
          </div>
          <div className="text-[10px] text-center text-slate-600">
            © 2026 PharmaCare Solutions
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900/20">
        {/* Header */}
        <header className="h-16 glass flex items-center justify-between px-8 border-b border-slate-800/80">
          <div className="text-sm font-medium text-slate-400">
            Quality Assurance Compliance & Analysis System
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-full px-4 py-1.5 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>AI Engine Ready</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
