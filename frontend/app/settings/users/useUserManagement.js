import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import {
  BASE_ROLES,
  formDraft,
  editDraft,
  calculateStats,
  calculateUsage,
  filterUsers,
} from "./userManagementHelpers";
import {
  loadWorkspace as loadWorkspaceAction,
  handleCreateUser,
  handleSaveUser,
  handleToggleUser,
  handleRemoveUser,
} from "./userManagementActions";

export function useUserManagement() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState([]);
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [createForm, setCreateForm] = useState(formDraft());
  const [memberForm, setMemberForm] = useState(editDraft());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState("");

  const role = session?.user?.role || "";
  const isSuperAdmin = role === "super-admin";
  const scopedCompanyId = isSuperAdmin
    ? selectedCompanyId
    : session?.company?.company_id || session?.user?.company_id || "";

  const roles = useMemo(
    () => (isSuperAdmin ? [["admin", "Admin"], ...BASE_ROLES] : BASE_ROLES),
    [isSuperAdmin]
  );

  const selectedUser = useMemo(
    () => users.find((u) => u.user_id === selectedUserId) || null,
    [selectedUserId, users]
  );

  const filteredUsers = useMemo(
    () => filterUsers(users, search, roleFilter, statusFilter),
    [roleFilter, search, statusFilter, users]
  );

  const stats = useMemo(() => calculateStats(users), [users]);
  const usage = useMemo(() => calculateUsage(users, company), [users, company]);

  async function loadWorkspace(s, cid = "") {
    await loadWorkspaceAction(s, cid, {
      setUsers,
      setCompany,
      setCompanies,
      setLoading,
      setError,
    });
  }

  useEffect(() => {
    const s = loadSession();
    if (!s) return router.replace("/login");
    if (!["super-admin", "admin", "manager"].includes(s.user?.role))
      return router.replace("/dashboard");
    setSession(s);
    if (s.user?.role === "super-admin") {
      apiRequest("/companies?page_size=120", { token: s.token })
        .then((r) => {
          const items = r.items || [];
          const cid = s.company?.company_id || s.user?.company_id || items[0]?.company_id || "";
          setCompanies(items);
          setSelectedCompanyId(cid);
          setCreateForm(formDraft(cid));
        })
        .catch((e) => {
          setLoading(false);
          setError(e.message);
        });
      return;
    }
    const cid = s.company?.company_id || s.user?.company_id || "";
    setSelectedCompanyId(cid);
    setCreateForm(formDraft(cid));
    loadWorkspace(s, cid);
  }, [router]);

  useEffect(() => {
    if (session && isSuperAdmin) {
      setCreateForm((f) => ({ ...f, company_id: selectedCompanyId }));
      loadWorkspace(session, selectedCompanyId);
    }
  }, [isSuperAdmin, selectedCompanyId, session]);

  useEffect(() => {
    if (!users.length) {
      setSelectedUserId("");
      setMemberForm(editDraft());
      return;
    }
    if (!users.some((u) => u.user_id === selectedUserId)) setSelectedUserId(users[0].user_id);
  }, [selectedUserId, users]);

  useEffect(() => {
    if (selectedUser) setMemberForm(editDraft(selectedUser));
  }, [selectedUser]);

  async function createUser(e) {
    e.preventDefault();
    await handleCreateUser(
      session,
      createForm,
      scopedCompanyId,
      isSuperAdmin,
      {
        setCreating,
        setError,
        setMessage,
        setMessageTone,
        setCreateForm,
        setSelectedUserId,
      },
      { loadWorkspace }
    );
  }

  async function saveUser(e) {
    e.preventDefault();
    await handleSaveUser(
      session,
      selectedUser,
      memberForm,
      scopedCompanyId,
      { setSaving, setError, setMessage, setMessageTone },
      { loadWorkspace }
    );
  }

  async function toggleUser() {
    await handleToggleUser(
      session,
      selectedUser,
      scopedCompanyId,
      { setWorkingId, setError, setMessage, setMessageTone },
      { loadWorkspace }
    );
  }

  async function removeUser() {
    await handleRemoveUser(
      session,
      selectedUser,
      scopedCompanyId,
      { setWorkingId, setError, setMessage, setMessageTone },
      { loadWorkspace }
    );
  }

  return {
    session,
    users,
    company,
    companies,
    selectedCompanyId,
    setSelectedCompanyId,
    selectedUserId,
    setSelectedUserId,
    createForm,
    setCreateForm,
    memberForm,
    setMemberForm,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    error,
    message,
    messageTone,
    loading,
    creating,
    saving,
    workingId,
    isSuperAdmin,
    roles,
    selectedUser,
    filteredUsers,
    stats,
    usage,
    createUser,
    saveUser,
    toggleUser,
    removeUser,
  };
}
