/**
 * EXAMPLE: Dashboard with Recent Notes Widget
 * 
 * Yeh ek example hai ki aap apne dashboard mein Recent Notes Widget kaise add kar sakte ho
 * 
 * Usage:
 * 1. Is file ko copy karo
 * 2. Apne actual dashboard file mein paste karo
 * 3. Customize karo apne layout ke hisaab se
 */

'use client';

import React from 'react';
import RecentNotesWidget from '@/components/RecentNotesWidget';

export default function DashboardWithRecentNotes() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Leads</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">245</p>
              <p className="text-sm text-green-600 mt-1">↑ 12% from last month</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Active Customers</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">89</p>
              <p className="text-sm text-green-600 mt-1">↑ 8% from last month</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Conversion Rate</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">36%</p>
              <p className="text-sm text-red-600 mt-1">↓ 2% from last month</p>
            </div>
          </div>

          {/* Charts or Other Content */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Pipeline</h2>
            <div className="h-64 flex items-center justify-center text-gray-400">
              {/* Your chart component here */}
              <p>Chart Component</p>
            </div>
          </div>

          {/* Tasks or Other Widgets */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Tasks</h2>
            <div className="space-y-3">
              {/* Your tasks list here */}
              <p className="text-gray-500">No upcoming tasks</p>
            </div>
          </div>
        </div>

        {/* Right Column - Recent Notes Widget */}
        <div className="lg:col-span-1 space-y-6">
          {/* Recent Notes Widget - YEH HAI MAIN WIDGET */}
          <RecentNotesWidget limit={10} type="all" />

          {/* Optional: Add more widgets below */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 text-sm text-left text-blue-600 hover:bg-blue-50 rounded">
                + Add New Lead
              </button>
              <button className="w-full px-4 py-2 text-sm text-left text-blue-600 hover:bg-blue-50 rounded">
                + Add New Customer
              </button>
              <button className="w-full px-4 py-2 text-sm text-left text-blue-600 hover:bg-blue-50 rounded">
                + Create Task
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ALTERNATIVE LAYOUTS:
 * 
 * 1. Full Width Recent Notes (Top of Dashboard):
 * 
 * <div className="mb-6">
 *   <RecentNotesWidget limit={5} type="all" />
 * </div>
 * 
 * 
 * 2. Two Column Layout (Recent Notes + Another Widget):
 * 
 * <div className="grid grid-cols-2 gap-6">
 *   <RecentNotesWidget limit={10} type="leads" />
 *   <RecentNotesWidget limit={10} type="customers" />
 * </div>
 * 
 * 
 * 3. Tabbed Layout:
 * 
 * <Tabs>
 *   <Tab label="Overview">
 *     <DashboardStats />
 *   </Tab>
 *   <Tab label="Recent Activity">
 *     <RecentNotesWidget limit={20} />
 *   </Tab>
 * </Tabs>
 * 
 * 
 * 4. Modal/Popup:
 * 
 * <button onClick={() => setShowRecentNotes(true)}>
 *   View Recent Updates
 * </button>
 * 
 * <Modal open={showRecentNotes}>
 *   <RecentNotesWidget limit={20} />
 * </Modal>
 */
