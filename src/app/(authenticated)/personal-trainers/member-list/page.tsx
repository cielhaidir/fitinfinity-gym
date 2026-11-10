"use client";

import React, { useState, useMemo } from "react";

import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import ModalEdit from "./modaledit";
import { Phone, Edit, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { type Member } from "./schema";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

type StatusFilter = "ACTIVE" | "FROZEN" | "INACTIVE";

const STATUS_TABS: { value: StatusFilter; label: string; color: string }[] = [
  { value: "ACTIVE", label: "Active", color: "bg-green-500/20 text-green-400 border-green-500/50" },
  { value: "FROZEN", label: "Frozen", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" },
  { value: "INACTIVE", label: "Inactive", color: "bg-red-500/20 text-red-400 border-red-500/50" },
];

interface MemberData {
  id: string;
  membershipId: string;
  name: string;
  email: string;
  phone: string;
  height: number | null;
  weight: number | null;
  birthDate: string | null;
  remainingSessions: number;
  subscriptionEndDate: string;
  packageName?: string;
  isFrozen?: boolean;
  frozenAt?: string | null;
  freezeDays?: number | null;
  freezeMode?: string | null;
}



export default function MemberListPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [inactiveSubFilter, setInactiveSubFilter] = useState<"ALL" | "HAS_SESSIONS">("ALL");
  const [mobileSearch, setMobileSearch] = useState("");

  const {
    data: members,
    isLoading,
    refetch: refetchMembers,
  } = api.personalTrainer.getMembers.useQuery(
    { status: statusFilter },
    {
      enabled: !!session,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
    },
  );

  // Map each subscription/package as its own row (no deduplication)
  const combinedMembers = useMemo(() => {
    if (!members) return [];

    return members.map((member: MemberData) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      height: member.height,
      weight: member.weight,
      birthDate: member.birthDate,
      remainingSessions: member.remainingSessions,
      subscriptionEndDate: member.subscriptionEndDate,
      packageName: member.packageName ?? "",
      isFrozen: (member as any).isFrozen ?? false,
      frozenAt: (member as any).frozenAt ?? null,
      freezeDays: (member as any).freezeDays ?? null,
      freezeMode: (member as any).freezeMode ?? null,
    }));
  }, [members]);

  // Apply inactive sub-filter + sort by expiration date
  const filteredMembers = useMemo(() => {
    let list = combinedMembers;
    if (statusFilter === "INACTIVE" && inactiveSubFilter === "HAS_SESSIONS") {
      list = list.filter((m) => m.remainingSessions > 0);
    }

    // Sort by subscriptionEndDate
    // Active: ascending (nearest expiry first - prioritas follow up)
    // Inactive: descending (baru expired dulu - leads terbaru)
    return [...list].sort((a, b) => {
      const dateA = a.subscriptionEndDate ? new Date(a.subscriptionEndDate).getTime() : 0;
      const dateB = b.subscriptionEndDate ? new Date(b.subscriptionEndDate).getTime() : 0;
      if (statusFilter === "ACTIVE") return dateA - dateB;
      return dateB - dateA;
    });
  }, [combinedMembers, statusFilter, inactiveSubFilter]);

  // Group members by name
  type GroupedMember = { name: string; phone: string; email: string; packages: Member[] };
  const groupedMembers = useMemo(() => {
    const groups = new Map<string, GroupedMember>();
    filteredMembers.forEach((m) => {
      const existing = groups.get(m.name);
      if (existing) {
        existing.packages.push(m);
      } else {
        groups.set(m.name, { name: m.name, phone: m.phone, email: m.email, packages: [m] });
      }
    });
    return Array.from(groups.values());
  }, [filteredMembers]);

  // Search filter for grouped
  const searchFilteredGroups = useMemo(() => {
    if (!mobileSearch.trim()) return groupedMembers;
    const q = mobileSearch.toLowerCase();
    return groupedMembers.filter(
      (g) => g.name.toLowerCase().includes(q) || g.phone?.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q)
    );
  }, [groupedMembers, mobileSearch]);

  // Paginate groups (not individual packages)
  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * limit;
    return searchFilteredGroups.slice(start, start + limit);
  }, [searchFilteredGroups, page, limit]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const updateMemberMutation = api.personalTrainer.updateMember.useMutation();

  const handleEdit = (member: Member) => {
    setSelectedMember(member);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setSelectedMember(null);
  };

  const handleSave = async (updated: Member) => {
    try {
      await updateMemberMutation.mutateAsync(updated);
      refetchMembers();
    } catch (error) {
      console.error("Failed to update member:", error);
    }
    setModalOpen(false);
    setSelectedMember(null);
  };

  return (
    <ProtectedRoute requiredPermissions={["menu:member-list-pt"]}>
      <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Member List</h2>
            <p className="text-muted-foreground">
              View and manage your members here
            </p>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-2 flex gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setInactiveSubFilter("ALL"); setPage(1); }}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? tab.color
                  : "border-border bg-background text-muted-foreground hover:bg-accent/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Inactive Sub-Filter */}
        {statusFilter === "INACTIVE" && (
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => { setInactiveSubFilter("ALL"); setPage(1); }}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                inactiveSubFilter === "ALL"
                  ? "border-red-500/50 bg-red-500/10 text-red-400"
                  : "border-border text-muted-foreground hover:bg-accent/50"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => { setInactiveSubFilter("HAS_SESSIONS"); setPage(1); }}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                inactiveSubFilter === "HAS_SESSIONS"
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                  : "border-border text-muted-foreground hover:bg-accent/50"
              }`}
            >
              Sesi &gt; 0 (Expired)
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari member..."
            value={mobileSearch}
            onChange={(e) => { setMobileSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Info Bar */}
        <div className="mb-3 text-xs text-muted-foreground">
          {paginatedGroups.length > 0
            ? `${(page - 1) * limit + 1}-${(page - 1) * limit + paginatedGroups.length} dari ${searchFilteredGroups.length} member`
            : "0 data"}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C9D953] mr-3" />
            <span className="text-muted-foreground text-sm">Loading...</span>
          </div>
        ) : paginatedGroups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Tidak ada member.
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedGroups.map((group, gIdx) => (
              <div key={`${group.name}-${gIdx}`} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Member Header */}
                <div className="flex items-center gap-3 p-3.5 border-b border-border/50 bg-accent/20">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C9D953]/20 text-[#C9D953] text-sm font-bold">
                    {group.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{group.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{group.email}</div>
                  </div>
                  {group.phone && (
                    <a
                      href={`tel:${group.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#C9D953]/10 px-3 py-1.5 text-xs font-medium text-[#C9D953] shrink-0"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{group.phone}</span>
                    </a>
                  )}
                </div>

                {/* Package Rows */}
                {group.packages.map((pkg, pIdx) => (
                  <div
                    key={`${pkg.id}-${pIdx}`}
                    className={`flex items-center justify-between gap-2 px-3.5 py-2.5 ${
                      pIdx < group.packages.length - 1 ? "border-b border-border/30" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{pkg.packageName || "-"}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                        <span>Sesi: <span className="text-foreground font-medium">{pkg.remainingSessions}</span></span>
                        {pkg.subscriptionEndDate && (
                          <span>Exp: <span className="text-foreground font-medium">{new Date(pkg.subscriptionEndDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span></span>
                        )}
                      </div>
                    </div>
                    <button
                      className="p-1.5 rounded-lg hover:bg-accent/50 shrink-0"
                      onClick={() => handleEdit(pkg)}
                    >
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {searchFilteredGroups.length > limit && (
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border p-2 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              Halaman {page} dari {Math.ceil(searchFilteredGroups.length / limit)}
            </span>
            <button
              onClick={() => setPage(Math.min(Math.ceil(searchFilteredGroups.length / limit), page + 1))}
              disabled={page >= Math.ceil(searchFilteredGroups.length / limit)}
              className="rounded-lg border border-border p-2 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
        <ModalEdit
          open={modalOpen}
          onClose={handleClose}
          member={selectedMember}
          onSave={handleSave}
        />
      </div>
    </ProtectedRoute>
  );
}
