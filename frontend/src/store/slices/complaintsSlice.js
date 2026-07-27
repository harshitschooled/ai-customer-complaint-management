import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { complaintsApi, aiApi } from '../../services/api';

// Thunks
export const fetchComplaints = createAsyncThunk(
  'complaints/fetchAll',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await complaintsApi.getAll(filters);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch complaints');
    }
  }
);

export const fetchComplaintById = createAsyncThunk(
  'complaints/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await complaintsApi.getOne(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch complaint details');
    }
  }
);

export const createComplaint = createAsyncThunk(
  'complaints/create',
  async (complaintData, { rejectWithValue }) => {
    try {
      const response = await complaintsApi.create(complaintData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to submit complaint');
    }
  }
);

export const deleteComplaint = createAsyncThunk(
  'complaints/delete',
  async (id, { rejectWithValue }) => {
    try {
      await complaintsApi.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to delete complaint');
    }
  }
);

export const extractComplaintData = createAsyncThunk(
  'complaints/extractData',
  async (text, { rejectWithValue }) => {
    try {
      const response = await aiApi.extract(text);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to extract data');
    }
  }
);

export const uploadComplaintDocument = createAsyncThunk(
  'complaints/uploadDoc',
  async (file, { rejectWithValue, dispatch }) => {
    try {
      const response = await aiApi.uploadFile(file);
      const docText = response.data.text;
      // Immediately trigger extraction with parsed text
      dispatch(extractComplaintData(docText));
      return { filename: response.data.filename, text: docText };
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to parse file');
    }
  }
);

export const sendMessageToCopilot = createAsyncThunk(
  'complaints/sendChatMessage',
  async (chatParams, { rejectWithValue }) => {
    try {
      const response = await aiApi.chat(chatParams);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to chat with Copilot');
    }
  }
);

const initialState = {
  list: [],
  loading: false,
  error: null,
  
  currentComplaint: null,
  detailLoading: false,
  detailError: null,
  
  // Intake extraction states
  uploading: false,
  extracting: false,
  extractedDraft: null,
  rawUploadedText: '',
  uploadedFilename: '',
  extractionError: null,
  
  // Copilot chat states
  chatHistory: [],
  chatLoading: false,
  chatError: null,
};

const complaintsSlice = createSlice({
  name: 'complaints',
  initialState,
  reducers: {
    clearDraft: (state) => {
      state.extractedDraft = null;
      state.rawUploadedText = '';
      state.uploadedFilename = '';
      state.extractionError = null;
    },
    resetChat: (state, action) => {
      state.chatHistory = action.payload || [];
      state.chatError = null;
    },
    setCurrentComplaintNull: (state) => {
      state.currentComplaint = null;
      state.chatHistory = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchComplaints.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch by ID
      .addCase(fetchComplaintById.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
      })
      .addCase(fetchComplaintById.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.currentComplaint = action.payload;
        // Populate chat history with initial AI answers if available
        const c = action.payload;
        state.chatHistory = [
          {
            role: 'assistant',
            content: `Hello! I am your QA Assistant. I've analyzed complaint **${c.id.substring(0,8)}** for **${c.product_name}**.\n\nHere is a quick summary:\n* **Summary**: ${c.ai_summary || 'N/A'}\n* **Risk Classification**: ${c.risk_classification || 'N/A'}\n\nAsk me anything about this complaint, like root causes, FDA requirements, or potential CAPAs.`
          }
        ];
      })
      .addCase(fetchComplaintById.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError = action.payload;
      })
      
      // Create complaint
      .addCase(createComplaint.pending, (state) => {
        state.loading = true;
      })
      .addCase(createComplaint.fulfilled, (state, action) => {
        state.loading = false;
        state.list.unshift(action.payload);
        state.extractedDraft = null;
      })
      .addCase(createComplaint.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete complaint
      .addCase(deleteComplaint.fulfilled, (state, action) => {
        state.list = state.list.filter(c => c.id !== action.payload);
        if (state.currentComplaint?.id === action.payload) {
          state.currentComplaint = null;
          state.chatHistory = [];
        }
      })
      
      // Document upload
      .addCase(uploadComplaintDocument.pending, (state) => {
        state.uploading = true;
        state.extractionError = null;
        state.extractedDraft = null;
      })
      .addCase(uploadComplaintDocument.fulfilled, (state, action) => {
        state.uploading = false;
        state.uploadedFilename = action.payload.filename;
        state.rawUploadedText = action.payload.text;
      })
      .addCase(uploadComplaintDocument.rejected, (state, action) => {
        state.uploading = false;
        state.extractionError = action.payload;
      })
      
      // AI Extraction
      .addCase(extractComplaintData.pending, (state) => {
        state.extracting = true;
        state.extractionError = null;
      })
      .addCase(extractComplaintData.fulfilled, (state, action) => {
        state.extracting = false;
        if (action.payload.success) {
          state.extractedDraft = {
            fields: action.payload.extracted_fields,
            analysis: action.payload.analysis
          };
        } else {
          state.extractionError = action.payload.error || 'Failed to extract structure';
          state.extractedDraft = {
            fields: action.payload.extracted_fields,
            analysis: action.payload.analysis
          };
        }
      })
      .addCase(extractComplaintData.rejected, (state, action) => {
        state.extracting = false;
        state.extractionError = action.payload;
      })
      
      // Copilot Chat
      .addCase(sendMessageToCopilot.pending, (state) => {
        state.chatLoading = true;
        state.chatError = null;
      })
      .addCase(sendMessageToCopilot.fulfilled, (state, action) => {
        state.chatLoading = false;
        state.chatHistory = action.payload.history;
      })
      .addCase(sendMessageToCopilot.rejected, (state, action) => {
        state.chatLoading = false;
        state.chatError = action.payload;
      });
  },
});

export const { clearDraft, resetChat, setCurrentComplaintNull } = complaintsSlice.actions;
export default complaintsSlice.reducer;
