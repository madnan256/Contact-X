import { Fragment, useState } from "react";
import { Eye, EyeOff, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

interface AuditLogRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes?: string;
  performedBy?: string;
  createdAt: string;
}

type TypeFilter = "all" | "contact" | "entity" | "import";
type ActionFilter = "all" | "create" | "update" | "delete" | "import" | "merge";

const actionColors: Record<string, string> = {
  create: "bg-primary/10 text-primary",
  update: "bg-muted text-muted-foreground",
  delete: "bg-destructive/10 text-destructive",
  import: "bg-primary/10 text-primary",
  merge: "bg-warning/10 text-warning",
};

export default function AuditLogs() {
  const { t } = useTranslation();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (typeFilter !== "all") queryParams.set("entityType", typeFilter);
  if (actionFilter !== "all") queryParams.set("action", actionFilter);

  const { data: logs = [], isLoading } = useQuery<AuditLogRecord[]>({
    queryKey: ["/api/audit-logs", typeFilter, actionFilter],
    queryFn: () => apiRequest<AuditLogRecord[]>(`/audit-logs?${queryParams.toString()}`),
  });

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">{t("audit.title")}</h1>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as TypeFilter); setExpandedLog(null); }} className="input-enterprise w-auto" data-testid="select-audit-type">
          <option value="all">{t("search.all")}</option>
          <option value="contact">{t("page.contacts")}</option>
          <option value="entity">{t("page.entities")}</option>
          <option value="import">{t("audit.import")}</option>
        </select>
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value as ActionFilter); setExpandedLog(null); }} className="input-enterprise w-auto" data-testid="select-audit-action">
          <option value="all">{t("search.all")}</option>
          <option value="create">{t("audit.create")}</option>
          <option value="update">{t("audit.update")}</option>
          <option value="delete">{t("audit.delete")}</option>
          <option value="import">{t("audit.import")}</option>
          <option value="merge">{t("audit.merge")}</option>
        </select>
      </div>

      <div className="card-enterprise overflow-x-auto">
        <table className="table-enterprise">
          <thead>
            <tr>
              <th>{t("audit.timestamp")}</th>
              <th>{t("audit.action")}</th>
              <th>{t("audit.entityType")}</th>
              <th>{t("audit.entityId")}</th>
              <th>{t("audit.changes")}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const isExpanded = expandedLog === log.id;
              let parsedChanges: Record<string, unknown> | null = null;
              if (log.changes) {
                try { parsedChanges = JSON.parse(log.changes); } catch { /* keep null */ }
              }
              return (
                <Fragment key={log.id}>
                  <tr
                    data-testid={`row-audit-${log.id}`}
                    className={cn(
                      "cursor-pointer transition-colors",
                      isExpanded && "bg-primary/5 dark:bg-primary/10",
                      log.changes && "hover:bg-muted/50"
                    )}
                    onClick={() => log.changes && setExpandedLog(isExpanded ? null : log.id)}
                  >
                    <td className="text-muted-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td>
                      <span className={cn("inline-block rounded-md px-2.5 py-1 text-xs font-semibold", actionColors[log.action] || "bg-muted text-muted-foreground")}>
                        {log.action}
                      </span>
                    </td>
                    <td className="text-foreground">{log.entityType}</td>
                    <td className="text-muted-foreground font-mono text-xs max-w-[220px] truncate">{log.entityId}</td>
                    <td>
                      {log.changes ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedLog(isExpanded ? null : log.id); }}
                          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                          data-testid={`button-view-changes-${log.id}`}
                        >
                          {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          {isExpanded ? t("audit.hide") : t("audit.view")}
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && log.changes && (
                    <tr key={`${log.id}-detail`} data-testid={`row-audit-detail-${log.id}`}>
                      <td colSpan={5} className="p-0">
                        <div className="border-t border-border bg-muted/30 dark:bg-muted/20 px-5 py-4 animate-fade-in">
                          <div className="flex flex-wrap gap-4 mb-3">
                            <div className="text-xs">
                              <span className="font-semibold text-muted-foreground">{t("audit.entityType")}: </span>
                              <span className="text-foreground">{log.entityType}</span>
                            </div>
                            <div className="text-xs">
                              <span className="font-semibold text-muted-foreground">{t("audit.action")}: </span>
                              <span className={cn("inline-block rounded-md px-2 py-0.5 font-semibold", actionColors[log.action] || "bg-muted text-muted-foreground")}>
                                {log.action}
                              </span>
                            </div>
                            <div className="text-xs">
                              <span className="font-semibold text-muted-foreground">{t("audit.timestamp")}: </span>
                              <span className="text-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                          <h4 className="text-xs font-semibold text-foreground mb-2">{t("audit.changesDetail")}</h4>
                          {parsedChanges && typeof parsedChanges === "object" && !Array.isArray(parsedChanges) ? (
                            <div className="rounded-lg border border-border bg-background dark:bg-card overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border bg-muted/50 dark:bg-muted/30">
                                    <th className="px-3 py-2 text-start font-semibold text-muted-foreground">{t("audit.field")}</th>
                                    <th className="px-3 py-2 text-start font-semibold text-muted-foreground">{t("audit.value")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.entries(parsedChanges).map(([field, value]) => (
                                    <tr key={field} className="border-b border-border last:border-b-0">
                                      <td className="px-3 py-2 font-medium text-primary whitespace-nowrap">{field}</td>
                                      <td className="px-3 py-2 text-foreground break-all">
                                        {typeof value === "object" && value !== null
                                          ? <pre className="whitespace-pre-wrap m-0 font-mono text-xs">{JSON.stringify(value, null, 2)}</pre>
                                          : String(value ?? "-")}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <pre className="overflow-x-auto rounded-lg bg-background dark:bg-card border border-border p-4 text-xs text-foreground font-mono">
                              {parsedChanges ? JSON.stringify(parsedChanges, null, 2) : log.changes}
                            </pre>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">{t("audit.noLogs")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
