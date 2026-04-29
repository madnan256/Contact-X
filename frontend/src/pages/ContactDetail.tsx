import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, Calendar, Edit, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useLayout } from "@/contexts/LayoutContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import AddRelationshipDialog from "@/components/AddRelationshipDialog";

interface ContactRecord {
  id: string;
  prefix?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  firstNameAr?: string;
  lastNameAr?: string;
  contactType: string;
  gender?: string;
  dateOfBirth?: string;
  nationality?: string;
  nationalId?: string;
  currentPosition?: string;
  currentEntityName?: string;
  emails: string;
  phones: string;
  addresses: string;
  profileCompleteness: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RelationRecord {
  id: string;
  role: string;
  isPrimary: boolean;
  entity?: { id: string; nameEn: string; nameAr?: string; entityType: string };
}

interface AuditRecord {
  id: string;
  action: string;
  changes?: string;
  createdAt: string;
  performedBy?: string;
}

export default function ContactDetail() {
  const { id } = useParams();
  const { t, lang } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tabs = [t("contact.overview"), t("contact.relationships"), t("contact.auditLog")];
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [relationDialogOpen, setRelationDialogOpen] = useState(false);

  const unlinkMutation = useMutation({
    mutationFn: (relationId: string) => apiRequest(`/relations/${relationId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", id, "relations"] });
      toast({ title: t("relation.removed") });
    },
  });

  const activeTabIndex = tabs.indexOf(activeTab);
  const resolvedTab = activeTabIndex >= 0 ? activeTabIndex : 0;

  const { data: contact, isLoading } = useQuery<ContactRecord>({
    queryKey: ["/api/contacts", id],
    queryFn: () => apiRequest<ContactRecord>(`/contacts/${id}`),
    enabled: !!id,
  });

  const { data: relations = [] } = useQuery<RelationRecord[]>({
    queryKey: ["/api/contacts", id, "relations"],
    queryFn: () => apiRequest<RelationRecord[]>(`/contacts/${id}/relations`),
    enabled: !!id,
  });

  const { data: auditLogs = [] } = useQuery<AuditRecord[]>({
    queryKey: ["/api/audit-logs", "contact", id],
    queryFn: () => apiRequest<AuditRecord[]>(`/audit-logs?entityType=contact&entityId=${id}`),
    enabled: !!id,
  });

  const { setPageTitle } = useLayout();
  const contactAuditLogs = auditLogs.slice(0, 10);

  const nameEn = contact ? `${contact.prefix ? contact.prefix + " " : ""}${contact.firstName} ${contact.lastName}${contact.suffix ? " " + contact.suffix : ""}` : "";
  const nameAr = contact ? `${contact.firstNameAr || ""} ${contact.lastNameAr || ""}`.trim() : "";
  const displayName = lang === "ar" && nameAr ? nameAr : nameEn;

  useEffect(() => {
    if (displayName) setPageTitle(displayName);
    return () => setPageTitle(null);
  }, [displayName, setPageTitle]);

  if (isLoading || !contact) {
    return (
      <div className="page-container flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getEmailDisplay = () => {
    try {
      const emails = JSON.parse(contact.emails || "[]");
      if (emails.length === 0) return "—";
      const primary = emails.find((e: any) => e.primary) || emails[0];
      return typeof primary === "string" ? primary : primary.value || "—";
    } catch { return "—"; }
  };

  const getPhoneDisplay = () => {
    try {
      const phones = JSON.parse(contact.phones || "[]");
      if (phones.length === 0) return "—";
      const primary = phones.find((p: any) => p.primary) || phones[0];
      return typeof primary === "string" ? primary : primary.value || "—";
    } catch { return "—"; }
  };

  const getAddressDisplay = () => {
    try {
      const addresses = JSON.parse(contact.addresses || "[]");
      if (addresses.length === 0) return "—";
      const primary = addresses.find((a: any) => a.primary) || addresses[0];
      return primary.address || "—";
    } catch { return "—"; }
  };

  const completenessColor = contact.profileCompleteness >= 80 ? "completeness-high" : contact.profileCompleteness >= 50 ? "completeness-medium" : "completeness-low";

  return (
    <div className="page-container space-y-6 animate-fade-in">
      <Link to="/contacts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        {t("contact.backToContacts")}
      </Link>

      <div className="card-enterprise">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
              {contact.firstName[0]}{contact.lastName[0]}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground" data-testid="text-contact-name">{nameEn}</h1>
              <p className="text-sm text-muted-foreground">{nameAr}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="badge-status badge-type">{t(`contactType.${contact.contactType}`) || contact.contactType}</span>
                <span className={`badge-status ${contact.isActive ? "badge-active" : "badge-inactive"}`}>{contact.isActive ? "Active" : "Inactive"}</span>
              </div>
            </div>
          </div>
          <Link to={`/contacts/${id}/edit`} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted" data-testid="link-edit-contact">
            <Edit className="h-4 w-4" />
            {t("contact.edit")}
          </Link>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">{t("contact.profileCompleteness")}</span>
            <span className="font-semibold text-foreground">{contact.profileCompleteness}%</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full transition-all ${completenessColor}`} style={{ width: `${contact.profileCompleteness}%` }} />
          </div>
        </div>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {resolvedTab === 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card-enterprise space-y-4">
            <h3 className="text-base font-semibold text-foreground">{t("contact.contactInfo")}</h3>
            <div className="space-y-3">
              <InfoRow icon={Mail} label={t("contact.email")} value={getEmailDisplay()} />
              <InfoRow icon={Phone} label={t("contact.phone")} value={getPhoneDisplay()} />
              <InfoRow icon={MapPin} label={t("contact.address")} value={getAddressDisplay()} />
            </div>
          </div>
          <div className="card-enterprise space-y-4">
            <h3 className="text-base font-semibold text-foreground">{t("contact.professionalInfo")}</h3>
            <div className="space-y-3">
              <InfoRow icon={Briefcase} label={t("contact.organization")} value={contact.currentEntityName || "—"} />
              <InfoRow icon={Briefcase} label={t("contact.position")} value={contact.currentPosition || "—"} />
              <InfoRow icon={Calendar} label={t("contact.created")} value={new Date(contact.createdAt).toLocaleDateString()} />
              <InfoRow icon={Calendar} label={t("contact.updated")} value={new Date(contact.updatedAt).toLocaleDateString()} />
            </div>
          </div>
        </div>
      )}

      {resolvedTab === 1 && (
        <div className="card-enterprise">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">{t("contact.relatedEntities")}</h3>
            <button
              onClick={() => setRelationDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              data-testid="button-add-relationship"
            >
              <Plus className="h-4 w-4" />
              {t("relation.addRelationship")}
            </button>
          </div>
          <div className="space-y-3">
            {relations.length === 0 && <p className="text-sm text-muted-foreground">No relationships found</p>}
            {relations.map((rel) => (
              <div key={rel.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium text-foreground">{rel.entity?.nameEn}</p>
                  <p className="text-xs text-muted-foreground">{rel.entity?.nameAr}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-status badge-type">{rel.entity?.entityType}</span>
                  <span className="text-sm text-muted-foreground">{rel.role}</span>
                  {rel.isPrimary && <span className="badge-status badge-active">{t("relation.isPrimary")}</span>}
                  <button
                    onClick={() => { if (confirm(t("relation.unlinkConfirm"))) unlinkMutation.mutate(rel.id); }}
                    disabled={unlinkMutation.isPending}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    data-testid={`button-unlink-${rel.id}`}
                  >
                    {t("relation.unlink")}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <AddRelationshipDialog
            open={relationDialogOpen}
            onOpenChange={setRelationDialogOpen}
            mode="contact-to-entity"
            sourceId={id!}
            existingRelationIds={relations.map(r => r.entity?.id || "").filter(Boolean)}
          />
        </div>
      )}

      {resolvedTab === 2 && (
        <div className="card-enterprise">
          <h3 className="mb-4 text-base font-semibold text-foreground">{t("contact.activityHistory")}</h3>
          <div className="space-y-4">
            {contactAuditLogs.length === 0 && <p className="text-sm text-muted-foreground">No audit logs found</p>}
            {contactAuditLogs.map((log) => (
              <div key={log.id} className="relative border-l-2 border-border pl-4 rtl:border-l-0 rtl:border-r-2 rtl:pl-0 rtl:pr-4">
                <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-primary bg-card rtl:left-auto rtl:-right-1.5" />
                <p className="font-medium text-foreground">Contact {log.action}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
