import React, { useState, useEffect } from "react";
import { Plus, RefreshCw, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import moment from "moment";

import CreateSessionForm from "./CreateSessionForm";
import SummaryCard from "../../components/Cards/SummaryCard";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import { CARD_BG } from "../../utils/data";
import { API_PATHS } from "../../utils/apiPaths";
import axiosInstance from "../../utils/axiosInstance";

import "./Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState({ open: false, data: null });
  const [deleting, setDeleting] = useState(false);

  // ----------------- Fetch Sessions -----------------
  const fetchAllSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get(API_PATHS.SESSION.GET_ALL);

      let sessionData = [];

      if (Array.isArray(response.data)) {
        sessionData = response.data;
      } else if (response.data?.sessions) {
        sessionData = response.data.sessions;
      } else if (response.data?.data?.sessions) {
        sessionData = response.data.data.sessions;
      } else if (response.data?.result) {
        sessionData = response.data.result;
      } else if (response.data?.items) {
        sessionData = response.data.items;
      } else {
        // Try to find any array in response
        Object.keys(response.data || {}).forEach((key) => {
          if (Array.isArray(response.data[key])) {
            sessionData = response.data[key];
          }
        });
      }

      setSessions(sessionData);
    } catch (err) {
      const message = err.message || "Failed to fetch sessions";
      setError(message);
      toast.error(message);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSessions();
  }, []);

  // ----------------- Create / Delete Handlers -----------------
  const handleSessionCreated = (newSession) => {
    console.log("🎆 New session created:", newSession);
    
    if (!newSession || !newSession._id) {
      console.error('❌ Invalid session data received:', newSession);
      toast.error('Invalid session data received');
      return;
    }
    
    // Add the new session to the beginning of the list
    setSessions((prevSessions) => {
      console.log(`🔄 Adding session to dashboard. Previous count: ${prevSessions.length}`);
      const updatedSessions = [newSession, ...prevSessions];
      console.log(`✅ New session count: ${updatedSessions.length}`);
      return updatedSessions;
    });
    
    console.log('🏆 Session successfully added to dashboard!');
  };


  const deleteSession = async (sessionData) => {
    setDeleting(true);
    
    try {
      console.log(`🗑️  Deleting session: ${sessionData.role} (ID: ${sessionData._id})`);
      
      // Show loading toast
      const loadingToast = toast.loading(`Deleting "${sessionData.role}" session...`);
      
      // Call the backend delete API
      await axiosInstance.delete(API_PATHS.SESSION.DELETE(sessionData._id));
      
      console.log('✅ Session deleted from database successfully');
      
      // Update the local state to remove the deleted session
      setSessions((prev) => prev.filter((s) => s._id !== sessionData._id));
      
      // Close the modal
      setOpenDeleteAlert({ open: false, data: null });
      
      // Show success message
      toast.success(`"${sessionData.role}" session deleted permanently`, {
        id: loadingToast,
        duration: 4000
      });
      
    } catch (error) {
      console.error('❌ Error deleting session:', error);
      
      // Show specific error message if available
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          "Failed to delete session from database";
      
      toast.error(`Failed to delete: ${errorMessage}`, {
        duration: 6000
      });
      
      // Keep the delete modal open so user can try again
    } finally {
      setDeleting(false);
    }
  };

  const retryFetch = () => fetchAllSessions();

  // ----------------- Render -----------------
  if (loading) {
    return (
      <DashboardLayout>
        <div className="dashboard-content">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Your Sessions</h2>
            <button disabled className="btn-new-session disabled">
              <Plus size={18} /> New Session
            </button>
          </div>
          <div className="loading-container">
            <RefreshCw className="loading-spinner" />
            <p className="loading-text">Loading your sessions...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="dashboard-content">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Your Sessions</h2>
            <button onClick={() => setOpenCreateModal(true)} className="btn-new-session">
              <Plus size={18} /> New Session
            </button>
          </div>

          <div className="error-container">
            <AlertCircle className="error-icon" />
            <h3 className="error-title">Failed to Load Sessions</h3>
            <p className="error-message">{error}</p>
            <button onClick={retryFetch} className="btn-retry">
              <RefreshCw size={16} /> Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        {/* ---------- Header ---------- */}
        <div className="dashboard-header">
          <div className="dashboard-title-section">
            <h1 className="dashboard-title">Interview Preparation</h1>
            <p className="dashboard-subtitle">Master your technical interviews with AI-powered practice sessions</p>
          </div>
          <button onClick={() => setOpenCreateModal(true)} className="btn-new-session">
            <Plus size={20} /> New Session
          </button>
        </div>

        {/* ---------- Session Grid ---------- */}
        <div className="sessions-grid">
          {sessions.length > 0 ? (
            sessions.map((data, index) => (
              <SummaryCard
                key={data?._id || data?.id || index}
                colors={CARD_BG[index % CARD_BG.length]}
                role={data?.role || data?.title || "Untitled Session"}
                topicsToFocus={data?.topicsToFocus || data?.topicToFocus || data?.topics || "No topics specified"}
                experience={data?.experience || data?.experienceLevel || "-"}
                questions={
                  Array.isArray(data?.questions)
                    ? data.questions.length
                    : data?.questionCount || "-"
                }
                description={data?.description || data?.summary || "No description available"}
                lastUpdated={
                  data?.updatedAt || data?.lastModified
                    ? moment(data.updatedAt || data.lastModified).format("Do MMM YYYY")
                    : data?.createdAt
                      ? moment(data.createdAt).format("Do MMM YYYY")
                      : "Unknown"
                }
                onSelect={() => navigate(`/interview-prep/${data?._id || data?.id}`)}
                onDelete={() => setOpenDeleteAlert({ open: true, data })}
              />
            ))
          ) : (
            <div className="empty-state">
              <Plus className="empty-icon" />
              <h3 className="empty-state-title">No Sessions Found</h3>
              <p className="empty-state-description">
                Get started by creating your first interview preparation session.
              </p>
              <button onClick={() => setOpenCreateModal(true)} className="btn-create-first">
                <Plus size={18} /> Create Your First Session
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Delete Modal ---------- */}
      {openDeleteAlert.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">🗑️ Delete Session</h3>
            <p className="modal-message">
              Are you sure you want to permanently delete the{" "}
              <strong>"{ openDeleteAlert.data?.role || "this session"}"</strong> session?
            </p>
            <p className="modal-warning" style={{color: '#ef4444', fontSize: '0.9rem', marginTop: '8px'}}>
              ⚠️ This action cannot be undone. All {openDeleteAlert.data?.questions?.length || 'associated'} questions will be deleted from the database.
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setOpenDeleteAlert({ open: false, data: null })}
                className="btn-cancel"
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                onClick={() => deleteSession(openDeleteAlert.data)} 
                className="btn-delete"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <RefreshCw size={16} className="spinner" style={{ marginRight: '8px' }} />
                    Deleting...
                  </>
                ) : (
                  'Delete Permanently'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Create Modal ---------- */}
      {openCreateModal && (
        <CreateSessionForm
          onClose={() => setOpenCreateModal(false)}
          onSessionCreated={handleSessionCreated}
        />
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
