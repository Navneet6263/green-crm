'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { recentActivityApi } from '../lib/api/recentActivity.js';
import { formatDistanceToNow } from 'date-fns';

export default function RecentNotesPanel({
  defaultType = 'all',
  limit = 20,
  showFilters = true,
}) {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState(defaultType);
  const [myNotesOnly, setMyNotesOnly] = useState(false);

  useEffect(() => {
    loadRecentNotes();
  }, [filterType, myNotesOnly]);

  const loadRecentNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await recentActivityApi.getRecentNotes({
        limit,
        type: filterType,
        myNotesOnly,
      });
      setNotes(response.items || response.data || response || []);
    } catch (err) {
      setError(err.message || 'Failed to load recent notes');
      console.error('Error loading recent notes:', err);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewClick = (note) => {
    if (note.note_type === 'lead' && note.entity_id) {
      router.push(`/leads/${note.entity_id}`);
    } else if (note.note_type === 'customer' && note.customer_id) {
      router.push(`/customers/${note.customer_id}`);
    }
  };

  const truncateContent = (content, maxLength = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const getStatusBadgeColor = (status) => {
    const statusColors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-purple-100 text-purple-800',
      proposal: 'bg-indigo-100 text-indigo-800',
      negotiation: 'bg-orange-100 text-orange-800',
      won: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600 text-center">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={loadRecentNotes}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Updates</h2>
          <button
            onClick={loadRecentNotes}
            className="text-sm text-blue-600 hover:text-blue-700"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 text-sm rounded-full ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('leads')}
                className={`px-3 py-1 text-sm rounded-full ${
                  filterType === 'leads'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Leads
              </button>
              <button
                onClick={() => setFilterType('customers')}
                className={`px-3 py-1 text-sm rounded-full ${
                  filterType === 'customers'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Customers
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={myNotesOnly}
                onChange={(e) => setMyNotesOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              My notes only
            </label>
          </div>
        )}
      </div>

      {/* Notes List */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {!notes || notes.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-2">No recent notes found</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={`${note.note_type}-${note.id}`} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Entity Info */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        note.note_type === 'lead'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {note.note_type === 'lead' ? '📋 Lead' : '👤 Customer'}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeColor(
                        note.entity_status
                      )}`}
                    >
                      {note.entity_status}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    {note.entity_name}
                    {note.entity_company_name && (
                      <span className="text-gray-500 font-normal ml-2">
                        • {note.entity_company_name}
                      </span>
                    )}
                  </h3>

                  {/* Note Content */}
                  <p className="text-sm text-gray-700 mb-2">{truncateContent(note.content)}</p>

                  {/* Meta Info */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>
                      By <span className="font-medium">{note.created_by_name}</span>
                    </span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
                  </div>
                </div>

                {/* View Button */}
                <button
                  onClick={() => handleViewClick(note)}
                  className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded border border-blue-300 hover:border-blue-400 transition-colors"
                >
                  View
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notes.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center text-sm text-gray-600">
          Showing {notes.length} recent {filterType === 'all' ? 'updates' : filterType}
        </div>
      )}
    </div>
  );
}
