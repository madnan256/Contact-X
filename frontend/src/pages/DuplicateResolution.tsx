import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, X, AlertTriangle, Eye, Loader2, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface DuplicateCandidate {
  id: string;
  entityType: string;
  record1Id: string;
  record2Id: string;
  matchScore: number;
  matchReasons: string[];
  status: string;
  record1: any;
  record2: any;
  createdAt?: string;
  resolvedAt?: string;
  resolvedByName?: string;
}

type TypeFilter = "all" | "contact" | "entity";
type StatusFilter = "all" | "pending" | "merged" | "dismissed";

export default function DuplicateResolution() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mainProfiles, setMainProfiles] = useState<Record<string, "A" | "B">>({});
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  const { data: duplicates = [], isLoading } = useQuery<DuplicateCandidate[]>({
    queryKey: ["/api/duplicates", statusFilter],
    queryFn: () => apiRequest<DuplicateCandidate[]>(`/duplicates?status=${statusFilter}`),
  });

  const detectMutation = useMutation({
    mutationFn: () => apiRequest<{ detected: number }>("/duplicates/detect", { method: "POST" }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates"] });
      toast({ title: t("duplicates.detected").replace("{count}", String(data.detected)) });
    },
  });

  const mergeMutation = useMutation({
    mutationFn: ({ id, masterId }: { id: string; masterId: string }) =>
      apiRequest(`/duplicates/${id}/merge`, { method: "POST", body: JSON.stringify({ masterId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: t("duplicates.recordsMerged") });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/duplicates/${id}/dismiss`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: t("duplicates.duplicateDismissed") });
    },
  });

  const selectMain = (dupId: string, record: "A" | "B") => {
    setMainProfiles(prev => ({ ...prev, [dupId]: record }));
  };

  const filtered = duplicates.filter(d => {
    if (typeFilter !== "all" && d.entityType !== typeFilter) return false;
    return true;
  });

  const getRecordFields = (dup: DuplicateCandidate, record: any): Record<string, string> => {
    if (!record) return { name: "—" };
    if (dup.entityType === "contact") {
      return {
        name: `${record.firstName || record.FirstName || ""} ${record.lastName || record.LastName || ""}`.trim(),
        nameAr: `${record.firstNameAr || record.FirstNameAr || ""} ${record.lastNameAr || record.LastNameAr || ""}`.trim(),
        email: (() => { try { const raw = record.emails || record.Emails || "[]"; const e = typeof raw === "string" ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []); if (!e[0]) return ""; return typeof e[0] === "string" ? e[0] : (e[0].value || ""); } catch { return ""; } })(),
        phone: (() => { try { const raw = record.phones || record.Phones || "[]"; const p = typeof raw === "string" ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []); if (!p[0]) return ""; return typeof p[0] === "string" ? p[0] : (p[0].value || ""); } catch { return ""; } })(),
        type: record.contactType || record.ContactType || "",
      };
    }
    return {
      name: record.nameEn || record.NameEn || "",
      nameAr: record.nameAr || record.NameAr || "",
      type: record.entityType || record.EntityType || "",
      registrationId: record.registrationId || record.RegistrationId || "",
    };
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const statusBadge = (status: string) => {
    if (status === "merged") return "bg-primary/10 text-primary";
    if (status === "dismissed") return "bg-muted text-muted-foreground";
    return "badge-pending";
  };

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{t("duplicates.title")}</h1>
          <p className="page-subtitle">{filtered.length} {t("duplicates.found")}</p>
        </div>
        <button
          onClick={() => detectMutation.mutate()}
          disabled={detectMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          data-testid="button-detect-duplicates"
        >
          {detectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("duplicates.detect")}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)} className="input-enterprise w-auto" data-testid="select-type-filter">
          <option value="all">{t("search.all")}</option>
          <option value="contact">{t("page.contacts")}</option>
          <option value="entity">{t("page.entities")}</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="input-enterprise w-auto" data-testid="select-status-filter">
          <option value="all">{t("search.all")}</option>
          <option value="pending">{t("duplicates.pending")}</option>
          <option value="merged">{t("duplicates.merged")}</option>
          <option value="dismissed">{t("duplicates.dismissed")}</option>
        </select>
      </div>

      <div className="space-y-6">
        {filtered.map((dup) => {
          const isPending = dup.status === "pending";
          const mainProfile = mainProfiles[dup.id];
          const fieldsA = getRecordFields(dup, dup.record1);
          const fieldsB = getRecordFields(dup, dup.record2);
          const reasons = Array.isArray(dup.matchReasons) ? dup.matchReasons : [];

          return (
            <div key={dup.id} className="card-enterprise" data-testid={`duplicate-${dup.id}`}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertTriangle className={cn("h-4 w-4", dup.matchScore >= 85 ? "text-destructive" : "text-warning")} />
                  <span className="text-sm font-medium text-foreground">{t("duplicates.confidence")}</span>
                  <span className={cn("badge-status", dup.matchScore >= 85 ? "bg-destructive/10 text-destructive" : "badge-pending")}>
                    {dup.matchScore}%
                  </span>
                  <span className="badge-status badge-type text-[10px]">{dup.entityType}</span>
                  <span className={cn("badge-status text-[10px]", statusBadge(dup.status))}>
                    {dup.status === "merged" ? t("duplicates.merged") : dup.status === "dismissed" ? t("duplicates.dismissed") : t("duplicates.pending")}
                  </span>
                  {reasons.map((r, i) => (
                    <span key={i} className="badge-status bg-muted text-muted-foreground text-[10px]">{r}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {isPending && (
                    <>
                      <button
                        disabled={!mainProfile || mergeMutation.isPending}
                        onClick={() => {
                          const masterId = mainProfile === "A" ? dup.record1Id : dup.record2Id;
                          mergeMutation.mutate({ id: dup.id, masterId });
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
                          !mainProfile && "opacity-50 cursor-not-allowed"
                        )}
                        data-testid={`button-merge-${dup.id}`}
                      >
                        <Check className="h-4 w-4" />
                        {t("duplicates.merge")}
                      </button>
                      <button
                        onClick={() => dismissMutation.mutate(dup.id)}
                        disabled={dismissMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        data-testid={`button-dismiss-${dup.id}`}
                      >
                        <X className="h-4 w-4" />
                        {t("duplicates.dismiss")}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isPending && !mainProfile && (
                <p className="mb-3 text-xs text-muted-foreground">{t("duplicates.selectMain")}</p>
              )}

              {!isPending && (
                <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t("duplicates.resolvedAt")}: {formatDate(dup.resolvedAt)}
                  </span>
                  {dup.resolvedByName && (
                    <span>{t("duplicates.resolvedBy")}: {dup.resolvedByName}</span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {(["A", "B"] as const).map((label) => {
                  const fields = label === "A" ? fieldsA : fieldsB;
                  const recordId = label === "A" ? dup.record1Id : dup.record2Id;
                  const isMain = mainProfile === label;
                  const detailPath = dup.entityType === "contact" ? `/contacts/${recordId}` : `/entities/${recordId}`;

                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => isPending && selectMain(dup.id, label)}
                      disabled={!isPending}
                      className={cn(
                        "w-full rounded-xl border-2 p-4 space-y-3 text-start transition-all",
                        isPending && isMain ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border",
                        isPending && !isMain && "hover:border-primary/40",
                        !isPending && "cursor-default"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          {label === "A" ? t("duplicates.recordA") : t("duplicates.recordB")}
                        </span>
                        <div className="flex items-center gap-2">
                          {isPending && isMain && (
                            <span className="badge-status bg-primary/10 text-primary text-[10px]">
                              {t("duplicates.mainProfile")}
                            </span>
                          )}
                          {isPending && (
                            <Link
                              to={detailPath}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                              title={t("common.view")}
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                      {Object.entries(fields).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-xs uppercase text-muted-foreground">{key}</span>
                          <span className="text-sm text-foreground">{value || "\u2014"}</span>
                        </div>
                      ))}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">{t("search.noResults")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
