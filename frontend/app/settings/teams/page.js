"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import { formatScopedError, isPlatformConsoleRole, loadTeamsForCompany, loadUsersForScope, resolveScopedCompanyId } from "../../../lib/teamScope";
import { AlertError, AlertSuccess } from "../../../components/ui/Alert";
import { T, StatCard } from "./teams-tokens";
import { TeamList } from "./TeamList";
import { TeamDetail } from "./TeamDetail";
import { TeamEditorDrawer } from "./TeamEditorDrawer";

const ALLOWED_ROLES = ["super-admin","platform-admin","platform-manager","admin","manager"];
const MANAGER_CAPABLE_ROLES = new Set(["super-admin","platform-admin","platform-manager","admin","manager"]);

function createDraft(cid="") { return { company_id:cid, name:"", code:"", description:"", is_active:true }; }
function draftFrom(t,cid="") { return { company_id:cid||t?.company_id||"", name:t?.name||"", code:t?.code||"", description:t?.description||"", is_active:t?.is_active!==false }; }
function buildPath(tid,cid) { return cid?`/teams/${tid}?company_id=${cid}`:`/teams/${tid}`; }
function buildAssignable(tid,cid) { return cid?`/teams/${tid}/assignable-users?company_id=${cid}`:`/teams/${tid}/assignable-users`; }
function normalizeId(v,fb="") { if(!v) return String(fb||"").trim(); if(typeof v==="string"||typeof v==="number") return String(v).trim(); if(typeof v==="object"&&v?.user_id) return String(v.user_id).trim(); return String(fb||"").trim(); }

export default function TeamSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teamDetail, setTeamDetail] = useState(null);
  const [teamQuery, setTeamQuery] = useState("");
  const [assignmentQuery, setAssignmentQuery] = useState("");
  const [assignmentRoleFilter, setAssignmentRoleFilter] = useState("all");
  const [memberCandidateId, setMemberCandidateId] = useState("");
  const [managerCandidateId, setManagerCandidateId] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("create");
  const [teamForm, setTeamForm] = useState(createDraft());
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [assignableLoading, setAssignableLoading] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [workingKey, setWorkingKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const role = session?.user?.role || "";
  const isPlatformConsole = isPlatformConsoleRole(role);
  const scopedCompanyId = resolveScopedCompanyId(session, selectedCompanyId);
  const canCreateTeams = !isPlatformConsole;
  const canOpenUserRoster = ["super-admin","admin","manager"].includes(role);
  const selectedCompany = useMemo(()=>companies.find(c=>c.company_id===scopedCompanyId)||companies[0]||session?.company||null,[companies,scopedCompanyId,session?.company]);

  const filteredTeams = useMemo(()=>{ const q=teamQuery.trim().toLowerCase(); return q?teams.filter(t=>[t.name,t.code,t.description,t.created_by_name].filter(Boolean).join(" ").toLowerCase().includes(q)):teams; },[teamQuery,teams]);
  const selectedTeam = useMemo(()=>{ const s=teams.find(t=>t.team_id===selectedTeamId)||null; if(!s) return teamDetail?.team_id===selectedTeamId?teamDetail:null; if(!teamDetail||teamDetail.team_id!==s.team_id) return s; return {...s,...teamDetail,members:teamDetail.members||[],managers:teamDetail.managers||[]}; },[selectedTeamId,teamDetail,teams]);
  const teamMembers = selectedTeam?.members||[];
  const teamManagers = selectedTeam?.managers||[];
  const availableMembers = useMemo(()=>assignableUsers.filter(u=>!teamMembers.some(m=>m.user_id===u.user_id)),[assignableUsers,teamMembers]);
  const availableManagers = useMemo(()=>assignableUsers.filter(u=>MANAGER_CAPABLE_ROLES.has(u.role)&&!teamManagers.some(m=>m.user_id===u.user_id)),[assignableUsers,teamManagers]);
  const filteredAssignmentUsers = useMemo(()=>{
    const q=assignmentQuery.trim().toLowerCase();
    return assignableUsers.filter(u=>{
      if(assignmentRoleFilter!=="all"&&u.role!==assignmentRoleFilter) return false;
      if(!q) return true;
      return [u.name,u.email,u.role,u.user_id].filter(Boolean).join(" ").toLowerCase().includes(q);
    }).sort((a,b)=>{
      const am=teamMembers.some(m=>m.user_id===a.user_id), bm=teamMembers.some(m=>m.user_id===b.user_id);
      if(am!==bm) return am?-1:1;
      return String(a.name||"").localeCompare(String(b.name||""));
    });
  },[assignableUsers,assignmentQuery,assignmentRoleFilter,teamManagers,teamMembers]);
  const stats = useMemo(()=>({ teams:teams.length, members:teams.reduce((s,t)=>s+Number(t.member_count||0),0), managers:teams.reduce((s,t)=>s+Number(t.manager_count||0),0), users:users.length }),[teams,users.length]);

  async function refreshWorkspace(s=session,cid=scopedCompanyId,tid=selectedTeamId) {
    if(!s?.token) return;
    if(!cid){ setTeams([]); setUsers([]); setAssignableUsers([]); setSelectedTeamId(""); setTeamDetail(null); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [tms,urs]=await Promise.all([loadTeamsForCompany(s.token,cid),loadUsersForScope(s.token,{companyId:cid,pageSize:180,path:"/users"})]);
      setTeams(tms); setUsers(urs);
      const next=tms.some(t=>t.team_id===tid)?tid:tms[0]?.team_id||"";
      setSelectedTeamId(next);
      if(!next){ setTeamDetail(null); setAssignableUsers([]); }
    } catch(e){ setTeams([]); setUsers([]); setAssignableUsers([]); setSelectedTeamId(""); setTeamDetail(null); setError(formatScopedError(e,"Failed to load team workspace.")); }
    finally { setLoading(false); }
  }

  async function refreshSelectedTeam(s=session,cid=scopedCompanyId,tid=selectedTeamId) {
    if(!s?.token||!cid||!tid) return;
    const [tms,detail,assignable]=await Promise.all([loadTeamsForCompany(s.token,cid),apiRequest(buildPath(tid,cid),{token:s.token}),apiRequest(buildAssignable(tid,cid),{token:s.token})]);
    setTeams(tms); setTeamDetail(detail); setAssignableUsers(Array.isArray(assignable)?assignable:[]);
  }

  useEffect(()=>{
    let ignore=false;
    async function boot(){
      const s=loadSession();
      if(!s) return router.replace("/login");
      if(!ALLOWED_ROLES.includes(s.user?.role)) return router.replace("/dashboard");
      setSession(s);
      try {
        if(isPlatformConsoleRole(s.user?.role)){
          const r=await apiRequest("/companies?page_size=120",{token:s.token});
          if(ignore) return;
          const items=r.items||[];
          const cid=s.company?.company_id||s.user?.company_id||items[0]?.company_id||"";
          setCompanies(items); setSelectedCompanyId(cid); setTeamForm(createDraft(cid));
        } else {
          const co=s.company?[{company_id:s.company.company_id||s.user?.company_id,name:s.company.name}]:[];
          const cid=s.company?.company_id||s.user?.company_id||"";
          setCompanies(co); setSelectedCompanyId(cid); setTeamForm(createDraft(cid));
        }
      } catch(e){ if(!ignore){ setLoading(false); setError(formatScopedError(e,"Failed to load workspace.")); } }
    }
    boot();
    return ()=>{ ignore=true; };
  },[router]);

  useEffect(()=>{ if(session) refreshWorkspace(session,scopedCompanyId,selectedTeamId); },[scopedCompanyId,session]);

  useEffect(()=>{
    let ignore=false;
    async function loadDetail(){
      if(!session?.token||!scopedCompanyId||!selectedTeamId){ setTeamDetail(null); setDetailLoading(false); return; }
      setDetailLoading(true);
      try { const r=await apiRequest(buildPath(selectedTeamId,scopedCompanyId),{token:session.token}); if(!ignore) setTeamDetail(r); }
      catch(e){ if(!ignore) setError(formatScopedError(e,"Failed to load team details.")); }
      finally { if(!ignore) setDetailLoading(false); }
    }
    loadDetail();
    return ()=>{ ignore=true; };
  },[scopedCompanyId,selectedTeamId,session]);

  useEffect(()=>{
    let ignore=false;
    async function loadAssignable(){
      if(!session?.token||!scopedCompanyId||!selectedTeamId){ setAssignableUsers([]); setAssignableLoading(false); return; }
      setAssignableLoading(true);
      try { const r=await apiRequest(buildAssignable(selectedTeamId,scopedCompanyId),{token:session.token}); if(!ignore) setAssignableUsers(Array.isArray(r)?r:[]); }
      catch(e){ if(!ignore){ setAssignableUsers([]); setError(formatScopedError(e,"Failed to load assignable users.")); } }
      finally { if(!ignore) setAssignableLoading(false); }
    }
    loadAssignable();
    return ()=>{ ignore=true; };
  },[scopedCompanyId,selectedTeamId,session]);

  async function saveTeam(e){
    e.preventDefault();
    if(!session?.token||!scopedCompanyId||savingTeam) return;
    if(!teamForm.name.trim()){ setError("Team name is required."); return; }
    setSavingTeam(true); setError(""); setMessage("");
    try {
      if(editorMode==="create"){
        const r=await apiRequest("/teams",{method:"POST",token:session.token,body:{company_id:scopedCompanyId,name:teamForm.name.trim(),code:teamForm.code.trim()||undefined,description:teamForm.description.trim()||undefined,is_active:teamForm.is_active}});
        await refreshWorkspace(session,scopedCompanyId,r.team_id);
        setMessage("Team created. Add members and managers from the detail panel.");
      } else if(selectedTeamId){
        await apiRequest(`/teams/${selectedTeamId}`,{method:"PUT",token:session.token,body:{company_id:scopedCompanyId,name:teamForm.name.trim(),code:teamForm.code.trim()||undefined,description:teamForm.description.trim()||"",is_active:teamForm.is_active}});
        await refreshWorkspace(session,scopedCompanyId,selectedTeamId);
        setMessage("Team updated.");
      }
      setEditorOpen(false);
    } catch(e){ setError(formatScopedError(e,editorMode==="create"?"Failed to create team.":"Failed to update team.")); }
    finally { setSavingTeam(false); }
  }

  async function addMember(uid=memberCandidateId){
    const id=normalizeId(uid,memberCandidateId);
    if(!session?.token||!selectedTeamId||!id) return;
    setWorkingKey("member:add"); setError(""); setMessage("");
    try { await apiRequest(`/teams/${selectedTeamId}/members`,{method:"POST",token:session.token,body:{company_id:scopedCompanyId,user_id:id}}); setMemberCandidateId(""); await refreshSelectedTeam(); setMessage("Member added."); }
    catch(e){ setError(formatScopedError(e,"Failed to add member.")); }
    finally { setWorkingKey(""); }
  }

  async function removeMember(uid){
    if(!session?.token||!selectedTeamId||!uid) return;
    setWorkingKey(`member:${uid}`); setError(""); setMessage("");
    try { await apiRequest(`/teams/${selectedTeamId}/members/${uid}?company_id=${scopedCompanyId}`,{method:"DELETE",token:session.token}); await refreshSelectedTeam(); setMessage("Member removed."); }
    catch(e){ setError(formatScopedError(e,"Failed to remove member.")); }
    finally { setWorkingKey(""); }
  }

  async function addManager(uid=managerCandidateId){
    const id=normalizeId(uid,managerCandidateId);
    if(!session?.token||!selectedTeamId||!id) return;
    setWorkingKey("manager:add"); setError(""); setMessage("");
    try { await apiRequest(`/teams/${selectedTeamId}/managers`,{method:"POST",token:session.token,body:{company_id:scopedCompanyId,user_id:id}}); setManagerCandidateId(""); await refreshSelectedTeam(); setMessage("Manager assigned."); }
    catch(e){ setError(formatScopedError(e,"Failed to assign manager.")); }
    finally { setWorkingKey(""); }
  }

  async function removeManager(uid){
    if(!session?.token||!selectedTeamId||!uid) return;
    setWorkingKey(`manager:${uid}`); setError(""); setMessage("");
    try { await apiRequest(`/teams/${selectedTeamId}/managers/${uid}?company_id=${scopedCompanyId}`,{method:"DELETE",token:session.token}); await refreshSelectedTeam(); setMessage("Manager removed."); }
    catch(e){ setError(formatScopedError(e,"Failed to remove manager.")); }
    finally { setWorkingKey(""); }
  }

  return (
    <DashboardShell session={session} title="Teams" hideTitle heroStats={[]}>
      <div className="mx-auto max-w-[1320px] space-y-5 px-1">
        <AlertError message={error} onDismiss={()=>setError("")} />
        <AlertSuccess message={message} onDismiss={()=>setMessage("")} />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={T.kicker}>Settings · Teams</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Team Workspace</h1>
            <p className="mt-0.5 text-sm text-slate-400">Create teams, add members, assign managers — controls CRM ownership scoping.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canOpenUserRoster ? <Link href="/settings/users" className={T.ghost}><DashboardIcon name="users" className="h-4 w-4" />Workspace Users</Link> : null}
            {canCreateTeams ? <button className={T.gold} type="button" onClick={()=>{ setTeamForm(createDraft(scopedCompanyId)); setEditorMode("create"); setEditorOpen(true); }} disabled={!scopedCompanyId}><DashboardIcon name="settings" className="h-4 w-4" />Create Team</button> : null}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Active Teams"     value={stats.teams}   accent="border-amber-200 bg-amber-100" />
          <StatCard label="Members Linked"    value={stats.members} accent="border-emerald-200 bg-emerald-100" />
          <StatCard label="Managers Assigned" value={stats.managers} accent="border-sky-200 bg-sky-100" />
          <StatCard label="Workspace Users"   value={stats.users}   accent="border-slate-200 bg-slate-100" />
        </div>

        {/* Company selector (platform console) */}
        {isPlatformConsole ? (
          <div className={`${T.panel} flex flex-wrap items-center gap-4 px-5 py-4`}>
            <p className="text-sm font-semibold text-slate-700">Company</p>
            <select className={`${T.input} max-w-[280px]`} value={selectedCompanyId} onChange={e=>setSelectedCompanyId(e.target.value)}>
              <option value="">Choose company</option>
              {companies.map(c=><option key={c.company_id} value={c.company_id}>{c.name}</option>)}
            </select>
          </div>
        ) : null}

        {/* Main layout */}
        <div className="grid gap-5 xl:grid-cols-[340px_1fr] xl:items-start">
          <TeamList
            teams={teams} filteredTeams={filteredTeams} selectedTeamId={selectedTeamId}
            teamQuery={teamQuery} loading={loading} scopedCompanyId={scopedCompanyId}
            canCreateTeams={canCreateTeams}
            onSelect={setSelectedTeamId} onSearch={setTeamQuery}
            onCreateFirst={()=>{ setTeamForm(createDraft(scopedCompanyId)); setEditorMode("create"); setEditorOpen(true); }}
          />
          <TeamDetail
            selectedTeam={selectedTeam} teamMembers={teamMembers} teamManagers={teamManagers}
            filteredAssignmentUsers={filteredAssignmentUsers}
            availableMembers={availableMembers} availableManagers={availableManagers}
            memberCandidateId={memberCandidateId} managerCandidateId={managerCandidateId}
            assignmentQuery={assignmentQuery} assignmentRoleFilter={assignmentRoleFilter}
            detailLoading={detailLoading} assignableLoading={assignableLoading} workingKey={workingKey}
            onEditTeam={()=>{ if(selectedTeam){ setTeamForm(draftFrom(selectedTeam,scopedCompanyId)); setEditorMode("edit"); setEditorOpen(true); } }}
            onSetMemberCandidate={setMemberCandidateId} onSetManagerCandidate={setManagerCandidateId}
            onAddMember={addMember} onRemoveMember={removeMember}
            onAddManager={addManager} onRemoveManager={removeManager}
            onAssignmentSearch={setAssignmentQuery} onAssignmentRoleFilter={setAssignmentRoleFilter}
          />
        </div>
      </div>

      <TeamEditorDrawer
        open={editorOpen} mode={editorMode} form={teamForm} saving={savingTeam}
        onClose={()=>setEditorOpen(false)} onSave={saveTeam}
        onChange={(k,v)=>setTeamForm(f=>({...f,[k]:v}))}
      />
    </DashboardShell>
  );
}
