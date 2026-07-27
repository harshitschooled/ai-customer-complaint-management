import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  uploadComplaintDocument, 
  extractComplaintData, 
  createComplaint, 
  clearDraft 
} from '../../store/slices/complaintsSlice';
import { complaintsApi, aiApi } from '../../services/api';
import { 
  Upload, FileText, Brain, Sparkles, Send, 
  RefreshCw, CheckCircle, AlertCircle, Info, AlertTriangle, 
  HelpCircle, RefreshCw as ResetIcon, Save as SaveIcon
} from 'lucide-react';

const Intake = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { 
    uploading, 
    extracting, 
    extractedDraft, 
    rawUploadedText,
    uploadedFilename,
    extractionError,
    loading: submitLoading
  } = useSelector((state) => state.complaints);

  // Toggle for Paste text area
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pastedText, setPastedText] = useState('');
  
  // Progress Bar mock state
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef(null);

  // 13 Form Fields state
  const [formData, setFormData] = useState({
    complaint_source: 'Email',
    customer_name: '',
    product_name: '',
    product_strength: '',
    batch_number: '',
    manufacturing_date: '',
    expiry_date: '',
    quantity_affected: '',
    complaint_type: 'Other',
    complaint_date: new Date().toISOString().split('T')[0],
    complaint_description: '',
    severity: 'Medium',
    priority: 'Medium'
  });

  // AI-generated suggestions
  const [aiSuggestions, setAiSuggestions] = useState({
    ai_summary: '',
    risk_classification: '',
    root_cause_recommendation: '',
    capa_recommendation: ''
  });

  // Duplicate Check local alert
  const [duplicateAlert, setDuplicateAlert] = useState(null);

  // Local Intake Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: 'Upload a complaint document or paste text above. I will automatically extract the details and populate the Log Customer Complaint form for you.'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const chatEndRef = useRef(null);

  // Clear draft on unmount
  useEffect(() => {
    return () => {
      dispatch(clearDraft());
    };
  }, [dispatch]);

  // Handle progress bar animation during upload/extraction
  useEffect(() => {
    if (uploading || extracting) {
      setProgress(10);
      progressTimer.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.floor(Math.random() * 15) + 5;
        });
      }, 600);
    } else {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
      }
      if (extractedDraft) {
        setProgress(100);
      } else {
        setProgress(0);
      }
    }

    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [uploading, extracting, extractedDraft]);

  // Sync extracted fields to form state
  useEffect(() => {
    if (extractedDraft) {
      const fields = extractedDraft.fields || {};
      const analysis = extractedDraft.analysis || {};
      
      const formatStrDate = (dt) => {
        if (!dt) return '';
        try {
          const parsed = new Date(dt);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
          }
        } catch (e) {}
        return '';
      };

      setFormData({
        complaint_source: fields.complaint_source || 'Email',
        customer_name: fields.customer_name || '',
        product_name: fields.product_name || '',
        product_strength: fields.product_strength || '',
        batch_number: fields.batch_number || '',
        manufacturing_date: formatStrDate(fields.manufacturing_date),
        expiry_date: formatStrDate(fields.expiry_date),
        quantity_affected: fields.quantity_affected || '',
        complaint_type: fields.complaint_type || 'Other',
        complaint_date: formatStrDate(fields.complaint_date) || new Date().toISOString().split('T')[0],
        complaint_description: fields.complaint_description || '',
        severity: fields.severity || 'Medium',
        priority: fields.priority || 'Medium'
      });

      setAiSuggestions({
        ai_summary: analysis.ai_summary || '',
        risk_classification: analysis.risk_classification || '',
        root_cause_recommendation: analysis.root_cause_recommendation || '',
        capa_recommendation: analysis.capa_recommendation || ''
      });

      // Update AI chat to say extraction completed
      setChatMessages([
        {
          role: 'assistant',
          content: `✨ **Extraction Successful!** I've prefilled the form on the left.\n\n* **Product**: ${fields.product_name || 'N/A'} (${fields.product_strength || 'N/A'})\n* **Batch**: ${fields.batch_number || 'N/A'}\n* **Severity**: ${fields.severity || 'Medium'}\n\nAsk me anything about this complaint context (e.g. CAPA advice, risk assessment or writing a customer draft).`
        }
      ]);
    }
  }, [extractedDraft]);

  // Duplicate check logic
  useEffect(() => {
    const checkDuplicate = async () => {
      const prod = formData.product_name?.trim();
      const batch = formData.batch_number?.trim();
      if (prod && batch) {
        try {
          const res = await complaintsApi.checkDuplicate({ product_name: prod, batch_number: batch });
          if (res.data.duplicate) {
            setDuplicateAlert(res.data);
          } else {
            setDuplicateAlert(null);
          }
        } catch (err) {
          console.error("Duplicate check error:", err);
        }
      } else {
        setDuplicateAlert(null);
      }
    };

    const delayDebounce = setTimeout(checkDuplicate, 600);
    return () => clearTimeout(delayDebounce);
  }, [formData.product_name, formData.batch_number]);

  // Scroll intake chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Drag and drop file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      dispatch(uploadComplaintDocument(file));
    }
  };

  // Run extraction on pasted text
  const handleExtractText = () => {
    if (pastedText.trim()) {
      dispatch(extractComplaintData(pastedText));
    }
  };

  // Submit the validated/edited form
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const finalData = {
      ...formData,
      quantity_affected: formData.quantity_affected ? parseInt(formData.quantity_affected) : null,
      ...aiSuggestions
    };

    dispatch(createComplaint(finalData)).then((res) => {
      if (!res.error) {
        navigate('/');
      }
    });
  };

  // Reset form
  const handleResetForm = () => {
    dispatch(clearDraft());
    setDuplicateAlert(null);
    setFormData({
      complaint_source: 'Email',
      customer_name: '',
      product_name: '',
      product_strength: '',
      batch_number: '',
      manufacturing_date: '',
      expiry_date: '',
      quantity_affected: '',
      complaint_type: 'Other',
      complaint_date: new Date().toISOString().split('T')[0],
      complaint_description: '',
      severity: 'Medium',
      priority: 'Medium'
    });
    setAiSuggestions({
      ai_summary: '',
      risk_classification: '',
      root_cause_recommendation: '',
      capa_recommendation: ''
    });
    setChatMessages([
      {
        role: 'assistant',
        content: 'Upload a complaint document or paste text above. I will automatically extract the details and populate the Log Customer Complaint form for you.'
      }
    ]);
  };

  // Completeness Checker Calculation
  const calculateCompleteness = () => {
    const fields = [
      formData.complaint_source,
      formData.customer_name,
      formData.product_name,
      formData.product_strength,
      formData.batch_number,
      formData.manufacturing_date,
      formData.expiry_date,
      formData.quantity_affected,
      formData.complaint_type,
      formData.complaint_date,
      formData.complaint_description,
      formData.severity,
      formData.priority
    ];
    const filled = fields.filter(f => f !== null && f !== undefined && String(f).trim() !== '').length;
    return Math.round((filled / 13) * 100);
  };

  const completenessScore = calculateCompleteness();

  // Chat Copilot in Intake Screen
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatLoading(true);
    setChatError(null);

    // Update history locally first
    const updatedHistory = [...chatMessages, { role: 'user', content: userMsg }];
    setChatMessages(updatedHistory);

    try {
      const response = await aiApi.chat({
        message: userMsg,
        history: updatedHistory.slice(0, -1), // pass previous history
        context: rawUploadedText || pastedText || `Draft details: Product ${formData.product_name}, Batch ${formData.batch_number}, Description: ${formData.complaint_description}`
      });
      setChatMessages(response.data.history);
    } catch (err) {
      setChatError(err.response?.data?.detail || 'Failed to send message');
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an issue checking the details of your document.' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Log Customer Complaint
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            API & FDF Quality Assurance Module
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Triage Status Badge */}
          <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-full text-xs font-semibold">
            Pending Triage
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Log Customer Complaint Form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="glass p-6 rounded-2xl border border-slate-800 space-y-6">
            
            {/* Form Header with Completeness Checker */}
            <div className="flex justify-between items-center border-b border-slate-850 pb-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <FileText className="h-4.5 w-4.5 text-emerald-400" />
                <span>GMP Complaint Intake Form</span>
              </h3>
              
              {/* Completeness score display */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-400">Completeness:</span>
                <span className={`font-bold ${completenessScore === 100 ? 'text-emerald-400' : completenessScore > 50 ? 'text-blue-400' : 'text-amber-400'}`}>
                  {completenessScore}%
                </span>
                <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${completenessScore === 100 ? 'bg-emerald-500' : completenessScore > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                    style={{ width: `${completenessScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Duplicate Warning Alert Banner */}
            {duplicateAlert && (
              <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl flex items-start space-x-3 text-xs text-amber-400 animate-pulse">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Duplicate Complaint Detected</span>
                  <p className="text-[10px] text-amber-500/80 mt-1 leading-relaxed">
                    A complaint record for **{formData.product_name}** with batch number **{formData.batch_number}** already exists (Logged on {duplicateAlert.complaint_date} for customer {duplicateAlert.customer_name}). Please verify this isn't a duplicate filing.
                  </p>
                </div>
              </div>
            )}

            {/* Section 1: Origin & Customer Details */}
            <div className="space-y-4">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block border-b border-slate-900 pb-1">
                1. Origin & Customer Details
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Complaint Source</label>
                  <select
                    name="complaint_source"
                    value={formData.complaint_source}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-emerald-500/40"
                  >
                    <option value="Email">Email</option>
                    <option value="Phone">Phone</option>
                    <option value="Portal">Portal</option>
                    <option value="Letter">Letter</option>
                    <option value="Web">Web</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Customer Name</label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. John Doe / St. Jude Hospital"
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Product & Batch Identification */}
            <div className="space-y-4">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block border-b border-slate-900 pb-1">
                2. Product & Batch Identification
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Product Name</label>
                  <input
                    type="text"
                    name="product_name"
                    value={formData.product_name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. Paracetamol"
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Product Strength/Grade</label>
                  <input
                    type="text"
                    name="product_strength"
                    value={formData.product_strength}
                    onChange={handleInputChange}
                    placeholder="e.g. 500mg / USP Grade"
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Batch/Lot Number</label>
                  <input
                    type="text"
                    name="batch_number"
                    value={formData.batch_number}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. B1203"
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Quantity Affected</label>
                  <div className="relative">
                    <input
                      type="number"
                      name="quantity_affected"
                      value={formData.quantity_affected}
                      onChange={handleInputChange}
                      placeholder="e.g. 10"
                      min="0"
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 pl-3 pr-10 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"
                    />
                    <span className="absolute right-3.5 top-2.5 text-slate-500 font-medium">kg</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Manufacturing Date</label>
                  <input
                    type="date"
                    name="manufacturing_date"
                    value={formData.manufacturing_date}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Expiry Date</label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={formData.expiry_date}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Complaint Details */}
            <div className="space-y-4">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block border-b border-slate-900 pb-1">
                3. Complaint Details
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Complaint Type</label>
                  <select
                    name="complaint_type"
                    value={formData.complaint_type}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-emerald-500/40"
                  >
                    <option value="Efficacy">Efficacy (Not Working)</option>
                    <option value="Adverse Event">Adverse Event (Side Effect)</option>
                    <option value="Packaging">Packaging Issue</option>
                    <option value="Contamination">Contamination</option>
                    <option value="Quality/Physical">Quality / Physical (Cracked, clumpy)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Complaint Date</label>
                  <input
                    type="date"
                    name="complaint_date"
                    value={formData.complaint_date}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-slate-400 mb-1.5 font-medium">Detailed Complaint Description</label>
                <textarea
                  name="complaint_description"
                  rows={4}
                  value={formData.complaint_description}
                  onChange={handleInputChange}
                  required
                  placeholder="Full details of the complaint report..."
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl p-3.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/40 resize-none transition-colors"
                />
              </div>
            </div>

            {/* Section 4: Initial Assessment & Priority */}
            <div className="space-y-4">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block border-b border-slate-900 pb-1">
                4. Initial Assessment & Priority
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Initial Severity</label>
                  <select
                    name="severity"
                    value={formData.severity}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-emerald-500/40"
                  >
                    <option value="Critical">Critical (Immediate Hazard)</option>
                    <option value="High">High (Clinical decrease/Severe side effects)</option>
                    <option value="Medium">Medium (Quality deviation)</option>
                    <option value="Low">Low (Cosmetic issue)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-emerald-500/40"
                  >
                    <option value="Urgent">Urgent (Reportable Alert)</option>
                    <option value="High">High (Investigate in 48 hours)</option>
                    <option value="Medium">Medium (Standard timeline)</option>
                    <option value="Low">Low (Track and trend)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 justify-end pt-4 border-t border-slate-850">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2 border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center space-x-1.5"
              >
                <ResetIcon className="h-3.5 w-3.5" />
                <span>Reset Form</span>
              </button>
              
              <button
                type="submit"
                disabled={submitLoading}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/20 text-xs font-semibold flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                {submitLoading ? (
                  <>
                    <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <SaveIcon className="h-4 w-4" />
                    <span>Save Complaint</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: AI Complaint Intake Assistant */}
        <div className="lg:col-span-5 space-y-6 flex flex-col h-[760px]">
          
          {/* Uploader / Paste Box container */}
          <div className="glass p-6 rounded-2xl border border-slate-800 space-y-4 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold flex items-center space-x-2 text-slate-200">
                <Brain className="h-4.5 w-4.5 text-emerald-400" />
                <span>AI Complaint Intake Assistant</span>
              </h3>
              <span className="text-[9px] font-extrabold tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">
                Beta
              </span>
            </div>

            {/* Document upload dropzone (or Text paste toggle) */}
            {!showPasteArea ? (
              <label className="border-2 border-dashed border-slate-800 hover:border-emerald-500/40 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-900/30 group">
                <input 
                  type="file" 
                  accept=".pdf,.docx" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                <Upload className="h-7 w-7 text-slate-500 group-hover:text-emerald-400 transition-colors mb-2" />
                <span className="text-xs font-medium text-slate-350 block">Drag & drop complaint document here</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">or <span className="text-emerald-400 group-hover:underline">click to browse</span></span>
              </label>
            ) : (
              <div className="space-y-3">
                <textarea
                  rows={4}
                  placeholder="Paste raw email, phone log transcript, or complaint text here..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 resize-none transition-colors"
                />
                <div className="flex space-x-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasteArea(false);
                      setPastedText('');
                    }}
                    className="px-3 py-1.5 border border-slate-800 hover:bg-slate-900 text-[10px] font-semibold text-slate-400 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleExtractText();
                      setShowPasteArea(false);
                    }}
                    disabled={!pastedText.trim() || extracting}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-505 text-[10px] font-semibold text-white rounded-lg disabled:opacity-50 transition-colors"
                  >
                    Analyze & Extract
                  </button>
                </div>
              </div>
            )}

            {/* Paste Button Option (if not already showing) */}
            {!showPasteArea && (
              <button
                type="button"
                onClick={() => setShowPasteArea(true)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-850 text-slate-350 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>Paste Complaint Text / Email</span>
              </button>
            )}

            {/* Supported formats label green box */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl flex items-start space-x-2.5 text-[10px] text-slate-400">
              <Info className="h-4.5 w-4.5 text-emerald-400/80 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-300 block">Supported formats: PDF, DOCX, TXT, EML</span>
                <span className="text-slate-500 block mt-0.5">Max file size: 10MB</span>
              </div>
            </div>

            {/* Upload Filename Box */}
            {uploadedFilename && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-medium truncate max-w-[200px]">
                  📄 {uploadedFilename}
                </span>
                <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" /> Parsed
                </span>
              </div>
            )}
          </div>

          {/* Progress / Chat Container */}
          <div className="glass p-6 rounded-2xl border border-slate-850 flex-1 flex flex-col min-h-0 bg-slate-900/20">
            
            {/* EXTRACTION PROGRESS BAR */}
            {progress > 0 && (
              <div className="space-y-2 mb-4 bg-slate-900/40 p-3.5 rounded-xl border border-slate-850 flex-shrink-0">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-medium uppercase tracking-wider">Extraction Progress</span>
                  <span className="text-emerald-400 font-bold">{progress}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-850">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-500 leading-relaxed block">
                  {progress < 100 
                    ? "Analyzing document content and extracting key details... Please wait, this may take a few moments." 
                    : "Extraction complete. Intake form pre-populated successfully."}
                </span>
              </div>
            )}

            {/* Copilot Chat Log Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 text-xs max-h-[380px]">
              {chatMessages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[90%] rounded-xl p-3 border whitespace-pre-line leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-350'
                        : 'bg-slate-900/70 border-slate-850 text-slate-350'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1 text-[9px] font-bold text-slate-500 uppercase">
                      {msg.role === 'user' ? (
                        <span>You</span>
                      ) : (
                        <span className="flex items-center text-emerald-400">
                          <Sparkles className="h-3 w-3 mr-1" /> Copilot Intake Agent
                        </span>
                      )}
                    </div>
                    {msg.content}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-850 rounded-xl p-3.5 flex items-center space-x-2">
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
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="flex items-center space-x-2 border-t border-slate-850/80 pt-3 flex-shrink-0">
              <input
                type="text"
                placeholder="Ask me anything about this complaint..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                className="flex-1 bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500/40"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl disabled:opacity-50 transition-all flex items-center justify-center flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            
            {/* Warning note */}
            <span className="text-[9px] text-center text-slate-600 block mt-2">
              AI responses may contain errors. Please verify information.
            </span>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Intake;
