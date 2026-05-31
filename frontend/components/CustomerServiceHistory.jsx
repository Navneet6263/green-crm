import React, { useState } from 'react';
import TaskActionDrawer from './TaskActionDrawer';

export default function CustomerServiceHistory({ tasksList = [], session, onRefresh }) {
  const [selectedTask, setSelectedTask] = useState(null);

  // Grouping tasks based on real workflow_status fields
  const revisionTasks = tasksList.filter(t => t.workflow_status === 'revisions_needed');
  const inProgressTasks = tasksList.filter(t => t.workflow_status === 'in_progress');
  const pendingQATasks = tasksList.filter(t => t.workflow_status === 'pending_qa');

  // Metrics
  const pendingQaCount = pendingQATasks.length;
  const completedCount = tasksList.filter(l => ["approved", "completed"].includes(l.workflow_status)).length;
  const inProgressCount = inProgressTasks.length + revisionTasks.length;

  // Helper Components
  const MetricCard = ({ title, value, valueColor, subtext }) => (
    <div className="bg-[#F8F9FA] rounded-xl p-5 flex-1 min-w-[140px]">
      <h3 className="text-gray-600 text-sm font-medium mb-3">{title}</h3>
      <div className={`text-4xl font-semibold mb-1 ${valueColor}`}>{value}</div>
      <p className="text-gray-500 text-xs leading-snug">{subtext}</p>
    </div>
  );

  const getPriorityColors = (priority) => {
    switch (String(priority).toLowerCase()) {
      case 'high': return 'bg-red-50 text-red-700';
      case 'medium': return 'bg-blue-50 text-blue-700';
      case 'low': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColors = (status) => {
    switch (status) {
      case 'revisions_needed': return 'bg-[#FDF3E1] text-[#9A6A24]';
      case 'in_progress': return 'bg-blue-50 text-blue-700';
      case 'pending_qa': return 'bg-indigo-50 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatStatusBadge = (status) => {
    if (status === 'revisions_needed') return 'Revision needed';
    if (status === 'in_progress') return 'Expert working';
    if (status === 'pending_qa') return 'Pending review';
    return 'Active';
  };

  const getDeadlineInfo = (task) => {
    if (task.workflow_status === 'pending_qa') {
      return { text: 'Submitted', color: 'text-green-700', icon: 'check' };
    }
    
    if (!task.follow_up_date) {
      return { text: 'No Deadline', color: 'text-gray-500', icon: 'clock' };
    }

    const diffTime = new Date(task.follow_up_date) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)} days`, color: 'text-red-600', icon: 'overdue' };
    }
    if (diffDays === 0) {
      return { text: 'Due today', color: 'text-amber-700', icon: 'clock' };
    }
    if (diffDays <= 3) {
      return { text: `${diffDays} days left`, color: 'text-amber-700', icon: 'clock' };
    }
    return { text: `${diffDays} days left`, color: 'text-green-700', icon: 'clock' };
  };

  const renderDeadlineIcon = (iconType) => {
    if (iconType === 'overdue' || iconType === 'clock') {
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (iconType === 'check') {
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    return null;
  };

  const renderTaskCard = (task) => {
    const isSelected = selectedTask?.lead_id === task.lead_id;
    
    // Dynamic border color based on category for selection
    let selectionBorder = 'border-blue-500';
    if (task.workflow_status === 'revisions_needed') selectionBorder = 'border-amber-500';
    if (task.workflow_status === 'pending_qa') selectionBorder = 'border-indigo-500';

    const deadlineInfo = getDeadlineInfo(task);
    const title = task.requirements 
      ? (task.requirements.length > 60 ? task.requirements.slice(0, 60) + "..." : task.requirements) 
      : `Task for ${task.company_name || task.contact_person || "Unnamed"}`;

    const capitalizedPriority = task.priority 
      ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1).toLowerCase() 
      : 'Medium';

    const buttonText = task.workflow_status === 'pending_qa' ? 'View' : 'Open task';

    return (
      <div 
        key={task.lead_id}
        onClick={() => setSelectedTask(task)}
        className={`bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${
          isSelected 
            ? `border-l-4 border-l-${selectionBorder.split('-')[1]}-500 border-y-${selectionBorder.split('-')[1]}-200 border-r-${selectionBorder.split('-')[1]}-200 shadow-sm` 
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex gap-2 mb-4">
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">#{task.lead_id}</span>
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColors(task.priority)}`}>{capitalizedPriority}</span>
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColors(task.workflow_status)}`}>{formatStatusBadge(task.workflow_status)}</span>
        </div>
        
        {task.workflow_status === 'revisions_needed' && task.admin_comments && (
          <div className="bg-[#FAF2E5] rounded-lg p-4 mb-4 flex gap-3">
            <svg className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">Admin feedback</p>
              <p className="text-sm text-amber-800">{task.admin_comments}</p>
            </div>
          </div>
        )}

        <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
        
        <div className="flex justify-between items-center">
          <div className={`flex items-center gap-2 text-sm font-medium ${deadlineInfo.color}`}>
            {renderDeadlineIcon(deadlineInfo.icon)}
            {deadlineInfo.text}
          </div>
          <button className={`px-5 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors ${buttonText === 'View' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' : ''}`}>
            {buttonText}
          </button>
        </div>
      </div>
    );
  };

  const initials = session?.user?.name 
    ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase() 
    : 'E';

  return (
    <div className="flex h-full w-full bg-white overflow-hidden font-sans">
      
      {/* Middle Column: Task List */}
      <div className="flex-1 flex flex-col min-w-[450px] border-r border-gray-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white z-10">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">My tasks</h1>
            <p className="text-gray-500 text-sm">Expert workspace</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-600 text-sm">{session?.user?.name || "Expert"}</span>
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-medium text-sm">
              {initials}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* Metrics */}
          <div className="flex gap-4 mb-10">
            <MetricCard title="In progress" value={inProgressCount} valueColor="text-[#185FA5]" subtext="Active tasks" />
            <MetricCard title="Pending review" value={pendingQaCount} valueColor="text-[#534AB7]" subtext="Awaiting admin QA" />
            <MetricCard title="Done" value={completedCount} valueColor="text-[#3B6D11]" subtext={<>Approved<br/>+ delivered</>} />
          </div>

          {/* 1. Revision Needed Section */}
          {revisionTasks.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-4">Revision needed</h2>
              <div className="space-y-4">
                {revisionTasks.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* 2. In Progress Section */}
          {inProgressTasks.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-4">In progress</h2>
              <div className="space-y-4">
                {inProgressTasks.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* 3. Pending QA Section */}
          {pendingQATasks.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-4">Pending QA</h2>
              <div className="space-y-4">
                {pendingQATasks.map(renderTaskCard)}
              </div>
            </div>
          )}

          {inProgressTasks.length === 0 && revisionTasks.length === 0 && pendingQATasks.length === 0 && (
             <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 rounded-2xl">
               <span className="text-4xl mb-3">🎉</span>
               <h3 className="text-lg font-bold text-gray-700">All caught up!</h3>
               <p className="text-sm text-gray-500 mt-1">No tasks currently need your attention.</p>
             </div>
          )}

        </div>
      </div>

      {/* Right Column: Drawer */}
      {selectedTask && (
        <TaskActionDrawer 
          task={selectedTask} 
          session={session}
          onClose={() => setSelectedTask(null)}
          onSuccess={() => {
            setSelectedTask(null);
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* Custom Scrollbar Styles injected globally for this component scope */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #d1d5db; border-radius: 20px; }
      `}} />
    </div>
  );
}
