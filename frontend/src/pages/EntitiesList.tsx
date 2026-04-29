import { Link } from "react-router-dom";
import { useState } from "react";
import { Search, Filter, Plus, Building2, Eye, Pencil, Trash2, Upload, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import ImportDialog, { ImportField } from "@/components/ImportDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const normalizeEntityType = (v: string): string => {
  const lower = v.trim().toLowerCase();
  if (lower === "public") return "public";
  if (["semi-government", "semi_government", "semigovernment", "semi government"].includes(lower)) return "semi-government";
  if (lower === "private") return "private";
  if (lower === "international") return "international";
  if (lower === "ngo") return "ngo";
  return v;
};

const entityImportFields: ImportField[] = [
  { key: "nameEn", label: "Name (English)", aliases: ["name_en", "الاسم بالإنجليزية"], required: true, validate: (v) => /^[A-Za-z\s\-'.,&()]+$/.test(v) },
  { key: "nameAr", label: "Name (Arabic)", aliases: ["name_ar", "الاسم بالعربية"], validate: (v) => /^[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s\-'.,&()]+$/.test(v) },
  { key: "entityType", label: "Entity Type", aliases: ["entity_type", "نوع الجهة"], validate: (v) => ["public", "semi-government", "semi_government", "semigovernment", "semi government", "private", "international", "ngo"].includes(v.trim().toLowerCase()), normalize: normalizeEntityType },
  { key: "country", label: "Country", aliases: ["الدولة"] },
  { key: "sector", label: "Sector", aliases: ["القطاع"] },
];

interface EntityRecord {
  id: string;
  nameEn: string;
  nameAr?: string;
  entityType: string;
  parentEntityId?: string;
  profileCompleteness: number;
  isActive: boolean;
}

export default function EntitiesList() {
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entities = [], isLoading } = useQuery<EntityRecord[]>({
    queryKey: ["/api/entities"],
    queryFn: () => apiRequest<EntityRecord[]>("/entities"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/entities/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
      toast({ title: t("entities.deleted") });
    },
  });

  const importMutation = useMutation({
    mutationFn: (rows: Record<string, string>[]) =>
      apiRequest<{ imported: number }>("/import/entities", {
        method: "POST",
        body: JSON.stringify(rows),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
      toast({ title: `Imported ${data.imported} entities` });
    },
  });

  const filtered = entities.filter(
    (e) => e.nameEn.toLowerCase().includes(search.toLowerCase()) || (e.nameAr || "").includes(search)
  );

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">{t("page.entities")}</h1>
          <p className="page-subtitle">{entities.length} {t("entities.totalEntities")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/entities/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            data-testid="link-add-entity"
          >
            <Plus className="h-4 w-4" />
            {t("entities.addEntity")}
          </Link>
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            data-testid="button-import-entities"
          >
            <Upload className="h-4 w-4" />
            {t("import.importEntities")}
          </button>
        </div>
      </div>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        domain="entity"
        fields={entityImportFields}
        onImport={(rows) => importMutation.mutate(rows)}
      />

      <div className="card-enterprise">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
            <input type="text" placeholder={t("entities.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="input-enterprise pl-9 rtl:pl-3 rtl:pr-9" data-testid="input-search-entities" />
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
            <Filter className="h-4 w-4" />
            {t("contacts.filters")}
          </button>
        </div>
      </div>

      <div className="card-enterprise hidden md:block">
        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>{t("entities.entityName")}</th>
                <th>{t("entities.type")}</th>
                <th>{t("contacts.completeness")}</th>
                <th>{t("entities.parent")}</th>
                <th>{t("entities.status")}</th>
                <th className="w-28"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} data-testid={`row-entity-${e.id}`}>
                  <td>
                    <Link to={`/entities/${e.id}`} className="hover:text-primary">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{e.nameEn}</p>
                          <p className="text-xs text-muted-foreground">{e.nameAr}</p>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td><span className="badge-status badge-type">{e.entityType}</span></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${e.profileCompleteness >= 80 ? "completeness-high" : e.profileCompleteness >= 50 ? "completeness-medium" : "completeness-low"}`} style={{ width: `${e.profileCompleteness}%` }} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground" data-testid={`text-completeness-${e.id}`}>{e.profileCompleteness}%</span>
                    </div>
                  </td>
                  <td className="text-sm text-muted-foreground">{e.parentEntityId ? t("entities.hasParent") : "\u2014"}</td>
                  <td><span className={`badge-status ${e.isActive ? "badge-active" : "badge-inactive"}`}>{e.isActive ? t("common.active") : t("common.inactive")}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Link to={`/entities/${e.id}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title={t("common.view")}>
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link to={`/entities/${e.id}/edit`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title={t("common.update")}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => { if (confirm(t("entities.confirmDelete"))) deleteMutation.mutate(e.id); }}
                        className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                        title={t("common.delete")}
                        data-testid={`button-delete-entity-${e.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.map((e) => (
          <Link key={e.id} to={`/entities/${e.id}`} className="card-enterprise block" data-testid={`card-entity-${e.id}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{e.nameEn}</p>
                <p className="text-xs text-muted-foreground">{e.nameAr}</p>
              </div>
              <span className="badge-status badge-type">{e.entityType}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className={`badge-status ${e.isActive ? "badge-active" : "badge-inactive"}`}>{e.isActive ? t("common.active") : t("common.inactive")}</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-12 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${e.profileCompleteness >= 80 ? "completeness-high" : e.profileCompleteness >= 50 ? "completeness-medium" : "completeness-low"}`} style={{ width: `${e.profileCompleteness}%` }} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{e.profileCompleteness}%</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
