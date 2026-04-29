import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, Plus, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Upload, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import ImportDialog, { ImportField } from "@/components/ImportDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const contactImportFields: ImportField[] = [
  { key: "firstName", label: "First Name", aliases: ["first_name", "الاسم الأول"], required: true },
  { key: "lastName", label: "Last Name", aliases: ["last_name", "اسم العائلة"], required: true },
  { key: "prefix", label: "Prefix", aliases: ["اللقب"] },
  { key: "middleName", label: "Middle Name", aliases: ["middle_name", "الاسم الأوسط"] },
  { key: "suffix", label: "Suffix", aliases: ["اللاحقة"] },
  { key: "firstNameAr", label: "First Name (Arabic)", aliases: ["first_name_ar", "الاسم الأول بالعربية"] },
  { key: "lastNameAr", label: "Last Name (Arabic)", aliases: ["last_name_ar", "اسم العائلة بالعربية"] },
  { key: "prefixAr", label: "Prefix (Arabic)", aliases: ["prefix_ar", "اللقب بالعربية"] },
  { key: "middleNameAr", label: "Middle Name (Arabic)", aliases: ["middle_name_ar", "الاسم الأوسط بالعربية"] },
  { key: "suffixAr", label: "Suffix (Arabic)", aliases: ["suffix_ar", "اللاحقة بالعربية"] },
  { key: "gender", label: "Gender", aliases: ["الجنس"], validate: (v) => { const l = v.trim().toLowerCase(); return ["male", "female", "m", "f", "ذكر", "أنثى"].includes(l); }, normalize: (v) => { const l = v.trim().toLowerCase(); if (l === "m" || l === "male" || v.trim() === "ذكر") return "male"; if (l === "f" || l === "female" || v.trim() === "أنثى") return "female"; return v; } },
  { key: "dateOfBirth", label: "Date of Birth", aliases: ["date_of_birth", "تاريخ الميلاد"], validate: (v) => { const d = new Date(v); return !isNaN(d.getTime()) && d <= new Date(); } },
  { key: "nationality", label: "Nationality", aliases: ["الجنسية"] },
  { key: "nationalId", label: "National ID", aliases: ["national_id", "الرقم الوطني"], validate: (v) => /^\d+$/.test(v) },
  { key: "contactType", label: "Contact Type", aliases: ["contact_type", "نوع جهة الاتصال"], validate: (v) => ["citizen", "employee", "external", "vip"].includes(v.trim().toLowerCase()), normalize: (v) => v.trim().toLowerCase() },
  { key: "currentPosition", label: "Current Position", aliases: ["current_position", "المنصب الحالي"] },
  { key: "currentEntityName", label: "Current Entity", aliases: ["current_entity_name", "الجهة الحالية"] },
  { key: "email", label: "Email", aliases: ["emails", "البريد الإلكتروني"], validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
  { key: "phone", label: "Phone", aliases: ["phones", "الهاتف"], validate: (v) => /^[\d\s\-\(\)\+]+$/.test(v) },
];

interface ContactRecord {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  contactType: string;
  emails: string;
  phones: string;
  profileCompleteness: number;
  isActive: boolean;
}

export default function ContactsList() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pageSize = 20;

  const { data: contacts = [], isLoading } = useQuery<ContactRecord[]>({
    queryKey: ["/api/contacts"],
    queryFn: () => apiRequest<ContactRecord[]>("/contacts"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: t("contacts.deleted") });
    },
  });

  const importMutation = useMutation({
    mutationFn: (rows: Record<string, string>[]) =>
      apiRequest<{ imported: number; errors: { row: number; error: string }[] }>("/import/contacts", {
        method: "POST",
        body: JSON.stringify(rows),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: `Imported ${data.imported} contacts` });
    },
  });

  const getEmailDisplay = (emailsJson: string) => {
    try {
      const emails = JSON.parse(emailsJson || "[]");
      if (emails.length === 0) return "";
      const first = emails[0];
      return typeof first === "string" ? first : first.value || "";
    } catch { return ""; }
  };

  const getPhoneDisplay = (phonesJson: string) => {
    try {
      const phones = JSON.parse(phonesJson || "[]");
      if (phones.length === 0) return "";
      const first = phones[0];
      return typeof first === "string" ? first : first.value || "";
    } catch { return ""; }
  };

  const filtered = contacts.filter(
    (c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      `${c.firstNameAr || ""} ${c.lastNameAr || ""}`.includes(search) ||
      getEmailDisplay(c.emails).toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const completenessColor = (v: number) => v >= 80 ? "completeness-high" : v >= 50 ? "completeness-medium" : "completeness-low";
  const statusLabel = (active: boolean) => active ? t("common.active") : t("common.inactive");
  const statusBadge = (active: boolean) => active ? "badge-active" : "badge-inactive";

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
          <h1 className="page-title">{t("page.contacts")}</h1>
          <p className="page-subtitle">{contacts.length} {t("contacts.totalContacts")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/contacts/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            data-testid="link-add-contact"
          >
            <Plus className="h-4 w-4" />
            {t("contacts.addContact")}
          </Link>
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            data-testid="button-import-contacts"
          >
            <Upload className="h-4 w-4" />
            {t("import.importContacts")}
          </button>
        </div>
      </div>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        domain="contact"
        fields={contactImportFields}
        onImport={(rows) => importMutation.mutate(rows)}
      />

      <div className="card-enterprise">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
            <input
              type="text"
              placeholder={t("contacts.search")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input-enterprise pl-9 rtl:pl-3 rtl:pr-9"
              data-testid="input-search-contacts"
            />
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
                <th>{t("contacts.name")}</th>
                <th>{t("contacts.type")}</th>
                <th>{t("contacts.emailPhone")}</th>
                <th>{t("contacts.completeness")}</th>
                <th>{t("contacts.status")}</th>
                <th className="w-28"></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => (
                <tr key={c.id} data-testid={`row-contact-${c.id}`}>
                  <td>
                    <Link to={`/contacts/${c.id}`} className="hover:text-primary">
                      <p className="font-medium text-foreground">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-muted-foreground">{c.firstNameAr} {c.lastNameAr}</p>
                    </Link>
                  </td>
                  <td><span className="badge-status badge-type">{t(`contactType.${c.contactType}`) || c.contactType}</span></td>
                  <td>
                    <p className="text-sm text-foreground">{getEmailDisplay(c.emails)}</p>
                    <p className="text-xs text-muted-foreground">{getPhoneDisplay(c.phones)}</p>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${completenessColor(c.profileCompleteness)}`} style={{ width: `${c.profileCompleteness}%` }} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{c.profileCompleteness}%</span>
                    </div>
                  </td>
                  <td><span className={`badge-status ${statusBadge(c.isActive)}`}>{statusLabel(c.isActive)}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Link to={`/contacts/${c.id}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title={t("common.view")}>
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link to={`/contacts/${c.id}/edit`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title={t("common.update")}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => { if (confirm(t("contacts.confirmDelete"))) deleteMutation.mutate(c.id); }}
                        className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                        title={t("common.delete")}
                        data-testid={`button-delete-contact-${c.id}`}
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

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">{t("contacts.showing")} {(page-1)*pageSize+1}-{Math.min(page*pageSize, filtered.length)} {t("contacts.of")} {filtered.length}</p>
          <div className="flex items-center gap-1">
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted" disabled={page <= 1} onClick={() => setPage(p => p-1)}><ChevronLeft className="h-4 w-4" /></button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
              <button key={i+1} onClick={() => setPage(i+1)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${page === i+1 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{i+1}</button>
            ))}
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted" disabled={page >= totalPages} onClick={() => setPage(p => p+1)}><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {paged.map((c) => (
          <Link key={c.id} to={`/contacts/${c.id}`} className="card-enterprise block" data-testid={`card-contact-${c.id}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-foreground">{c.firstName} {c.lastName}</p>
                <p className="text-xs text-muted-foreground">{c.firstNameAr} {c.lastNameAr}</p>
              </div>
              <span className={`badge-status ${statusBadge(c.isActive)}`}>{statusLabel(c.isActive)}</span>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("contacts.type")}</span>
                <span className="badge-status badge-type">{t(`contactType.${c.contactType}`) || c.contactType}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("contacts.completeness")}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-12 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${completenessColor(c.profileCompleteness)}`} style={{ width: `${c.profileCompleteness}%` }} />
                  </div>
                  <span className="text-xs font-medium">{c.profileCompleteness}%</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
