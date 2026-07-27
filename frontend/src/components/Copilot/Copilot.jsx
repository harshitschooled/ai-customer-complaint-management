import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchComplaintById, sendMessageToCopilot, setCurrentComplaintNull } from '../../store/slices/complaintsSlice';
import { 
  ArrowLeft, Brain, MessageSquare, AlertCircle, 
  ShieldCheck, FileSpreadsheet, CheckCircle2, 
  Send, Sparkles, AlertOctagon, Terminal
} from 'lucide-react';

const Copilot = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  
  const { 
    currentComplaint: c, 
    detailLoading: loading, 
    detailError: error,
    chatHistory,
    chatLoading,
    chatError
  } = useSelector((state) => state.complaints);

  const [activeTab, setActiveTab] = useState('summary');
  const [chatMessage, setChatMessage] = useState('');
  
  const messagesEndRef = useRef(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    dispatch(fetchComplaintById(id));
    return () => {
      dispatch(setCurrentComplaintNull());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [chatHistory, activeTab]);

  const handleSendChat = (e, customMsg = null) => {
    if (e) e.preventDefault();
    const msgToSend = customMsg || chatMessage;
    if (!msgToSend.trim() || chatLoading) return;

    dispatch(sendMessageToCopilot({
      complaint_id: id,
      message: msgToSend,
      history: chatHistory
    }));
    
    if (!customMsg) setChatMessage('');
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
        <span className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></span>
        <span className="text-xs">Loading complaint workspace...</span>
      </div>
    );
  }

  if (error || !c) {
    return (
      <div className="glass p-8 rounded-2xl border border-rose-500/10 text-center text-rose-400 space-y-4">
        <AlertCircle className="h-10 w-10 mx-auto" />
        <div>
          <h4 className="font-bold text-sm">Complaint Not Found</h4>
          <p className="text-xs text-slate-500 mt-1">{error || 'The requested complaint record does not exist.'}</p>
        </div>
        <Link to="/" className="inline-block px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-800 text-slate-350 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Pre-configured chat prompts
  const quickPrompts = [
    { label: "Check Root Causes", text: "What are the standard root causes to check for this product and complaint type?" },
    { label: "Draft FDA Report", text: "Draft a formal regulatory compliance notice (FDA 21 CFR style) for this complaint." },
    { label: "Draft Customer Response", text: "Draft a polite and professional response email to the customer acknowledging the complaint." }
  ];

  // Helper styles
  const getSeverityBadgeClass = (sev) => {
    switch (sev) {
      case 'Critical': return 'bg-rose-500/15 text-rose-400 border border-rose-500/25';
      case 'High': return 'bg-amber-500/15 text-amber-400 border border-amber-500/25';
      case 'Medium': return 'bg-blue-500/15 text-blue-400 border border-blue-500/25';
      default: return 'bg-slate-550/15 text-slate-400 border border-slate-550/25';
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center space-x-3">
        <Link 
          to="/" 
          className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Complaint Workspace</span>
          <h2 className="text-xl font-bold tracking-tight text-slate-200">
            Case ID: {c.id.substring(0, 8).toUpperCase()} - {c.product_name} ({c.batch_number})
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Detail Log */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass p-6 rounded-2xl border border-slate-800 space-y-6">
            <h3 className="text-sm font-semibold flex items-center space-x-2 text-slate-200 border-b border-slate-850 pb-3">
              <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-400" />
              <span>Complaint Log Record</span>
            </h3>

            {/* Field Details */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Severity</span>
                  <div className="mt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getSeverityBadgeClass(c.severity)}`}>
                      {c.severity || 'Medium'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Priority</span>
                  <div className="mt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-350 border border-slate-700`}>
                      {c.priority || 'Medium'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-[1px] bg-slate-850"></div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block">Customer Name</span>
                  <span className="text-slate-200 font-semibold mt-0.5 block">{c.customer_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Complaint Source</span>
                  <span className="text-slate-200 font-semibold mt-0.5 block">{c.complaint_source || 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block">Product Name</span>
                  <span className="text-slate-200 font-semibold mt-0.5 block">{c.product_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Product Strength</span>
                  <span className="text-slate-200 font-semibold mt-0.5 block">{c.product_strength || 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block">Batch Number</span>
                  <span className="text-slate-200 font-mono font-semibold mt-0.5 block">{c.batch_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Quantity Affected</span>
                  <span className="text-slate-200 font-semibold mt-0.5 block">{c.quantity_affected || 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block">Manufacturing Date</span>
                  <span className="text-slate-200 font-semibold mt-0.5 block">{c.manufacturing_date || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Expiry Date</span>
                  <span className="text-slate-200 font-semibold mt-0.5 block">{c.expiry_date || 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block">Complaint Type</span>
                  <span className="text-slate-200 font-semibold mt-0.5 block">{c.complaint_type || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Intake Date</span>
                  <span className="text-slate-200 font-semibold mt-0.5 block">{c.complaint_date || 'N/A'}</span>
                </div>
              </div>

              <div className="h-[1px] bg-slate-850"></div>

              <div>
                <span className="text-slate-500 block">Raw Complaint Description</span>
                <p className="text-slate-300 bg-slate-900/50 border border-slate-850/80 p-3 rounded-xl mt-1.5 leading-relaxed break-words whitespace-pre-line">
                  {c.complaint_description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: AI Assistant Tabs */}
        <div className="lg:col-span-7 flex flex-col h-[700px]">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 bg-slate-900/60 rounded-t-2xl p-1 gap-1">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === 'summary'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
              }`}
            >
              AI Summary
            </button>
            <button
              onClick={() => setActiveTab('root-cause')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === 'root-cause'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
              }`}
            >
              Risk & Root Cause
            </button>
            <button
              onClick={() => setActiveTab('capa')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === 'capa'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
              }`}
            >
              CAPA Plan
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === 'chat'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
              }`}
            >
              Copilot Chat
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 glass border-t-0 rounded-b-2xl p-6 flex flex-col overflow-y-auto min-h-0 bg-slate-900/25 border border-slate-800">
            
            {/* AI Summary */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-slate-200 font-semibold text-sm">
                  <Brain className="h-4.5 w-4.5 text-emerald-400" />
                  <span>Executive Incident Summary</span>
                </div>
                <p className="text-slate-350 text-xs leading-relaxed bg-slate-900/40 p-4 rounded-xl border border-slate-850">
                  {c.ai_summary || "No summary available for this record."}
                </p>
                
                {c.severity === 'Critical' && (
                  <div className="bg-rose-500/5 border border-rose-500/25 p-4 rounded-xl flex items-start space-x-3 text-rose-400 text-xs">
                    <AlertOctagon className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <span className="font-bold">QA Warning: Critical Classification</span>
                      <p className="text-[10px] text-rose-500/80 mt-1 leading-relaxed">
                        This complaint contains severity tags corresponding to direct patient risk. Ensure sample collection protocols are active and legal counsel / regulatory reporting checks are executed immediately.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Risk & Root Cause */}
            {activeTab === 'root-cause' && (
              <div className="space-y-5 text-xs">
                {/* Risk Classification */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Risk Analysis</span>
                  <p className="text-slate-350 leading-relaxed bg-slate-900/40 p-4 rounded-xl border border-slate-850">
                    {c.risk_classification || "No risk classification details loaded."}
                  </p>
                </div>

                {/* Root Causes */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">GMP Recommended Root Causes</span>
                  <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 text-slate-350 space-y-1 whitespace-pre-line leading-relaxed">
                    {c.root_cause_recommendation || "No root cause suggestions found."}
                  </div>
                </div>
              </div>
            )}

            {/* CAPA Plan */}
            {activeTab === 'capa' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-slate-200 font-semibold text-sm">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
                  <span>Corrective & Preventive Action (CAPA) Suggestions</span>
                </div>
                
                <div className="text-xs text-slate-355 leading-relaxed bg-slate-900/40 p-4 rounded-xl border border-slate-850 whitespace-pre-line">
                  {c.capa_recommendation || "No CAPA suggestions created."}
                </div>
              </div>
            )}

            {/* Copilot Chat */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full min-h-0">
                {/* Messages view */}
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 mb-4 text-xs max-h-[380px]">
                  {chatHistory.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[85%] rounded-xl p-3 border whitespace-pre-line leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-350'
                            : 'bg-slate-900/60 border-slate-850 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 mb-1 text-[10px] font-bold text-slate-500 uppercase">
                          {msg.role === 'user' ? (
                            <span>You</span>
                          ) : (
                            <span className="flex items-center text-emerald-400">
                              <Sparkles className="h-3 w-3 mr-1" /> Copilot
                            </span>
                          )}
                        </div>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-905 border border-slate-850 rounded-xl p-3 flex items-center space-x-2">
                        <span className="h-2 w-2 bg-emerald-400 rounded-full animate-bounce"></span>
                        <span className="h-2 w-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="h-2 w-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  )}

                  {chatError && (
                    <div className="text-center text-rose-400 text-[10px] bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                      {chatError}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Prompts Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-t border-slate-850 pt-3 mb-3">
                  {quickPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => handleSendChat(e, p.text)}
                      disabled={chatLoading}
                      className="px-2.5 py-1.5 bg-slate-900/60 hover:bg-slate-800 text-[10px] border border-slate-850 text-slate-400 hover:text-slate-200 rounded-lg text-left transition-all overflow-hidden text-ellipsis whitespace-nowrap block"
                      title={p.text}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Message input form */}
                <form onSubmit={handleSendChat} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Ask copilot about root causes, FDA notices..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    disabled={chatLoading}
                    className="flex-1 bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder-slate-550 focus:outline-none focus:border-emerald-500/40"
                  />
                  <button
                    type="submit"
                    disabled={!chatMessage.trim() || chatLoading}
                    className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl disabled:opacity-50 transition-all flex items-center justify-center flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Copilot;
