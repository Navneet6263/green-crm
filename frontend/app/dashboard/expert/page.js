"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import CustomerServiceHistory from '@/components/CustomerServiceHistory';
import { apiRequest } from "../../../lib/api";
import { loadSession, clearSession } from "../../../lib/session";

export default function ExpertDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('service_history');
  const [session, setSession] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }
    setSession(activeSession);
    
    setLoading(true);
    apiRequest("/leads?page_size=50&is_workflow=true", { token: activeSession.token })
      .then(res => {
        setLeads(res.items || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [router]);

  // Load and poll notifications
  useEffect(() => {
    if (!session?.token) return;

    const loadNotifications = async () => {
      try {
        const response = await apiRequest("/notifications?page_size=8", {
          token: session.token,
        });
        setNotifications(response.items || []);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    };

    loadNotifications();
    const intervalId = setInterval(loadNotifications, 30000);
    return () => clearInterval(intervalId);
  }, [session]);

  const handleLogout = async () => {
    try {
      if (session?.token) {
        await apiRequest("/auth/logout", {
          method: "POST",
          token: session.token,
        });
      }
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      clearSession();
      router.push("/login");
    }
  };

  const handleMarkRead = async (notifId) => {
    if (!session?.token) return;
    try {
      await apiRequest(`/notifications/${notifId}/read`, {
        method: "PATCH",
        token: session.token,
      });
      setNotifications(prev =>
        prev.map(n => n.notif_id === notifId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.notif_id);
    if (!session?.token || !unreadIds.length) return;

    try {
      await Promise.allSettled(
        unreadIds.map(notifId =>
          apiRequest(`/notifications/${notifId}/read`, {
            method: "PATCH",
            token: session.token,
          })
        )
      );
      setNotifications(prev =>
        prev.map(n => unreadIds.includes(n.notif_id) ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans relative">
      
      {/* Global Left Sidebar (Dark Blue) */}
      <div className="w-16 bg-[#1A183A] flex flex-col items-center py-6 gap-6 shrink-0 z-50">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white cursor-pointer shadow-lg shadow-indigo-900/50" title="Dashboard">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </div>

        {/* Notifications Bell */}
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="w-10 h-10 rounded-xl hover:bg-[#29265B] flex items-center justify-center text-indigo-300 hover:text-white cursor-pointer transition-colors relative"
          title="Notifications"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F59E0B] px-1 text-[10px] font-bold text-white border border-[#1A183A]">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="w-10 h-10 rounded-xl hover:bg-[#29265B] flex items-center justify-center text-indigo-300 hover:text-white cursor-pointer mt-auto transition-colors"
          title="Logout"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {/* Floating Notifications Dropdown Panel */}
      {showNotifications && (
        <div className="fixed left-20 top-6 z-50 w-80 bg-white rounded-2xl border border-gray-200 shadow-2xl p-4 flex flex-col max-h-[500px]">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
              <p className="text-xs text-gray-400">{unreadNotificationsCount} unread</p>
            </div>
            <button 
              onClick={handleMarkAllRead} 
              disabled={unreadNotificationsCount === 0} 
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mark all read
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] custom-scrollbar">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div 
                  key={notif.notif_id}
                  onClick={() => handleMarkRead(notif.notif_id)}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    notif.is_read 
                      ? 'border-gray-50 bg-gray-50 hover:bg-gray-100 text-gray-600' 
                      : 'border-blue-50 bg-blue-50/50 hover:bg-blue-50 text-gray-900'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${notif.is_read ? 'bg-gray-300' : 'bg-blue-500'}`} />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-xs leading-snug">{notif.title}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-normal break-words">{notif.message}</p>
                      <span className="text-[9px] text-gray-400 block mt-1">
                        {notif.created_at ? new Date(notif.created_at).toLocaleDateString() : "Just now"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-gray-400">
                No notifications yet.
              </div>
            )}
          </div>
          <button 
            onClick={() => setShowNotifications(false)}
            className="w-full text-center py-2 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl mt-3 transition-colors font-medium border border-gray-100"
          >
            Close
          </button>
        </div>
      )}

      {/* Main Content App Shell */}
      <div className="flex-1 flex flex-col h-full bg-white relative shadow-sm border-l border-gray-200">
        
        {/* Tab Navigator Top Sub-header */}
        <div className="h-14 border-b border-gray-200 bg-gray-50 flex items-center px-6 gap-8 z-20 shrink-0">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`h-full border-b-2 px-1 text-sm font-medium transition-colors ${
              activeTab === 'profile' 
                ? 'border-blue-600 text-blue-700' 
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            My Profile
          </button>
          <button 
            onClick={() => setActiveTab('service_history')}
            className={`h-full border-b-2 px-1 text-sm font-medium transition-colors ${
              activeTab === 'service_history' 
                ? 'border-blue-600 text-blue-700' 
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Service History & Tasks
          </button>
          
          <div className="ml-auto">
            {/* Create Task button removed as requested */}
          </div>
        </div>

        {/* Viewport Content Rendering */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'profile' && (
            <div className="p-10 max-w-2xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">My Profile Overview</h2>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">{session?.user?.name || "Loading..."}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email Address</p>
                    <p className="font-medium text-gray-900">{session?.user?.email || "Loading..."}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">System Role</p>
                    <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium inline-block mt-1">
                      {session?.user?.role === 'expert' ? 'Expert Console' : (session?.user?.role || "Active")}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Workspace Status</p>
                    <p className="font-medium text-gray-900">Active & Ready</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'service_history' && (
            loading ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Loading assigned tasks...
              </div>
            ) : (
              <CustomerServiceHistory 
                tasksList={leads} 
                session={session} 
                onRefresh={() => {
                  apiRequest("/leads?page_size=50&is_workflow=true", { token: session.token })
                    .then(res => setLeads(res.items || []));
                }}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
