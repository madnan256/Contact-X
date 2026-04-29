import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Building2, ChevronRight, Loader2, Edit, Plus } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLayout } from "@/contexts/LayoutContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import AddRelationshipDialog from "@/components/AddRelationshipDialog";

interface EntityRecord {
  id: string;
  nameEn: string;
  nameAr?: string;
  entityType: string;
  registrationId?: string;
  country?: string;
  isActive: boolean;
  parentEntityId?: string;
  profileCompleteness: number;
}

interface ChildEntity {
  id: string;
  nameEn: string;
  nameAr?: string;
  entityType: string;
}

interface RelatedContact {
  id: string;
  role: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    firstNameAr?: string;
    lastNameAr?: string;
    isActive: boolean;
  };
}

export default function EntityDetail() {
  const { id } = useParams();
  const { t, lang } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [relationDialogOpen, setRelationDialogOpen] = useState(false);

  const unlinkMutation = useMutation({
    mutationFn: (relationId: string) => apiRequest(`/relations/${relationId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities", id, "contacts"] });
      toast({ title: t("relation.removed") });
    },
  });

  const { data: entity, isLoading } = useQuery<EntityRecord>({
    queryKey: ["/api/entities", id],
    queryFn: () => apiRequest<EntityRecord>(`/entities/${id}`),
    enabled: !!id,
  });

  const { data: children = [] } = useQuery<ChildEntity[]>({
    queryKey: ["/api/entities", id, "children"],
    queryFn: () => apiRequest<ChildEntity[]>(`/entities/${id}/children`),
    enabled: !!id,
  });

  const { data: relatedContacts = [] } = useQuery<RelatedContact[]>({
    queryKey: ["/api/entities", id, "contacts"],
    queryFn: () => apiRequest<RelatedContact[]>(`/entities/${id}/contacts`),
    enabled: !!id,
  });

  const { setPageTitle } = useLayout();
  const displayName = entity ? (lang === "ar" && entity.nameAr ? entity.nameAr : entity.nameEn) : "";

  useEffect(() => {
    if (displayName) setPageTitle(displayName);
    return () => setPageTitle(null);
  }, [displayName, setPageTitle]);

  if (isLoading || !entity) {
    return (
      <div className="page-container flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container space-y-6 animate-fade-in">
      <Link to="/entities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        {t("entities.backToEntities")}
      </Link>

      <div className="card-enterprise">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground" data-testid="text-entity-name">{entity.nameEn}</h1>
              <p className="text-sm text-muted-foreground">{entity.nameAr}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="badge-status badge-type">{entity.entityType}</span>
                <span className={`badge-status ${entity.isActive ? "badge-active" : "badge-inactive"}`}>{entity.isActive ? t("common.active") : t("common.inactive")}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("contacts.completeness")}:</span>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${entity.profileCompleteness >= 80 ? "completeness-high" : entity.profileCompleteness >= 50 ? "completeness-medium" : "completeness-low"}`} style={{ width: `${entity.profileCompleteness}%` }} />
                </div>
                <span className="text-xs font-medium text-muted-foreground" data-testid="text-entity-completeness">{entity.profileCompleteness}%</span>
              </div>
            </div>
          </div>
          <Link to={`/entities/${id}/edit`} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted" data-testid="link-edit-entity">
            <Edit className="h-4 w-4" />
            {t("entity.edit")}
          </Link>
        </div>
      </div>

      <div className="card-enterprise">
        <h3 className="mb-4 text-base font-semibold text-foreground">{t("entities.orgHierarchy")}</h3>
        <div className="space-y-2">
          {children.length === 0 && <p className="text-sm text-muted-foreground">{t("entities.noChildren")}</p>}
          {children.map((child) => (
            <Link key={child.id} to={`/entities/${child.id}`} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{child.nameEn}</p>
                  <p className="text-xs text-muted-foreground">{child.nameAr}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge-status badge-type">{child.entityType}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="card-enterprise">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{t("entities.relatedContacts")}</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{relatedContacts.length} {t("common.contacts")}</span>
            <button
              onClick={() => setRelationDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              data-testid="button-add-relationship"
            >
              <Plus className="h-4 w-4" />
              {t("relation.addRelationship")}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {relatedContacts.length === 0 && <p className="text-sm text-muted-foreground">{t("entities.noContacts")}</p>}
          {relatedContacts.map((rel) => {
            const contact = rel.contact;
            if (!contact) return null;
            const name = `${contact.firstName} ${contact.lastName}`;
            const nameAr = `${contact.firstNameAr || ""} ${contact.lastNameAr || ""}`.trim();
            return (
              <Link key={rel.id} to={`/contacts/${contact.id}`} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {contact.firstName[0]}{contact.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">{nameAr}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{rel.role}</span>
                  <span className={`badge-status ${contact.isActive ? "badge-active" : "badge-pending"}`}>{contact.isActive ? t("common.active") : t("common.inactive")}</span>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (confirm(t("relation.unlinkConfirm"))) unlinkMutation.mutate(rel.id); }}
                    disabled={unlinkMutation.isPending}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    data-testid={`button-unlink-${rel.id}`}
                  >
                    {t("relation.unlink")}
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
        <AddRelationshipDialog
          open={relationDialogOpen}
          onOpenChange={setRelationDialogOpen}
          mode="entity-to-contact"
          sourceId={id!}
          existingRelationIds={relatedContacts.map(r => r.contact?.id || "").filter(Boolean)}
        />
      </div>
    </div>
  );
}
