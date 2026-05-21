'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { recentActivityApi } from '@/lib/api/recentActivity.js';
import { formatDistanceToNow } from 'date-fns';

export default function RecentNotesWidget({ limit = 10, type = 'all' }) {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentNotes();
  }, []);

  const loadRecentNotes = async () => {
    try {
      setLoading(true);
      const response = await recentActivityApi.getRecentNotes({ limit, type });
      setNotes(response.items || response.data || response || []);
    } catch (err) {
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

  const truncateContent = (content, maxLength = 80) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Recent Updates</h3>
        <button
          onClick={() => router.push('/recent-updates')}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          View All
        </button>
      </div>

      {/* Notes List */}
      <div className="divide-y divide-gray-100">
        {!notes || notes.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">No recent updates</div>
        ) : (
          notes.slice(0, limit).map((note) => (
            <div
              key={`${note.note_type}-${note.id}`}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => handleViewClick(note)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs">
                      {note.note_type === 'lead' ? '📋' : '👤'}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {note.entity_name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                    {truncateContent(note.content)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {note.created_by_name} • {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewClick(note);
                  }}
                  className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  View
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
