import { useState, useEffect } from "react";
import { X, Search, Loader2, Check } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface EntityOption {
  id: string;
  nameEn: string;
  nameAr?: string;
  entityType: string;
}

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  contactType: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "contact-to-entity" | "entity-to-contact";
  sourceId: string;
  existingRelationIds: string[];
}

export default function AddRelationshipDialog({ open, onOpenChange, mode, sourceId, existingRelationIds }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [role, setRole] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedId("");
      setRole("");
      setIsPrimary(false);
    }
  }, [open]);

  const { data: entities = [] } = useQuery<EntityOption[]>({
    queryKey: ["/api/entities"],
    queryFn: () => apiRequest<EntityOption[]>("/entities"),
    enabled: open && mode === "contact-to-entity",
  });

  const { data: contacts = [] } = useQuery<ContactOption[]>({
    queryKey: ["/api/contacts"],
    queryFn: () => apiRequest<ContactOption[]>("/contacts"),
    enabled: open && mode === "entity-to-contact",
  });

  const createMutation = useMutation({
    mutationFn: (body: { contactId: string; entityId: string; role: string; isPrimary: boolean }) =>
      apiRequest("/relations", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (mode === "contact-to-entity") {
        queryClient.invalidateQueries({ queryKey: ["/api/contacts", sourceId, "relations"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/entities", sourceId, "contacts"] });
      }
      toast({ title: t("relation.added") });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Failed to add relationship", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!selectedId || !role.trim()) return;
    const contactId = mode === "contact-to-entity" ? sourceId : selectedId;
    const entityId = mode === "contact-to-entity" ? selectedId : sourceId;
    createMutation.mutate({ contactId, entityId, role: role.trim(), isPrimary });
  };

  const filteredEntities = entities.filter(
    (e) =>
      !existingRelationIds.includes(e.id) &&
      (e.nameEn.toLowerCase().includes(search.toLowerCase()) || (e.nameAr || "").includes(search))
  );

  const filteredContacts = contacts.filter(
    (c) =>
      !existingRelationIds.includes(c.id) &&
      (`${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        `${c.firstNameAr || ""} ${c.lastNameAr || ""}`.includes(search))
  );

  if (!open) return null;

  const title = mode === "contact-to-entity" ? t("relation.selectEntity") : t("relation.selectContact");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange(false)}>
      <div
        className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted" data-testid="button-close-relation-dialog">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("relation.searchPlaceholder")}
            className="input-enterprise pl-9 rtl:pl-3 rtl:pr-9"
            data-testid="input-search-relation"
          />
        </div>

        <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-border">
          {mode === "contact-to-entity" &&
            filteredEntities.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-start transition-colors hover:bg-muted ${selectedId === e.id ? "bg-primary/10" : ""}`}
                data-testid={`option-entity-${e.id}`}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{e.nameEn}</p>
                  <p className="text-xs text-muted-foreground">{e.nameAr}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-status badge-type">{e.entityType}</span>
                  {selectedId === e.id && <Check className="h-4 w-4 text-primary" />}
                </div>
              </button>
            ))}
          {mode === "entity-to-contact" &&
            filteredContacts.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-start transition-colors hover:bg-muted ${selectedId === c.id ? "bg-primary/10" : ""}`}
                data-testid={`option-contact-${c.id}`}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{c.firstName} {c.lastName}</p>
                  <p className="text-xs text-muted-foreground">{c.firstNameAr} {c.lastNameAr}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-status badge-type">{t(`contactType.${c.contactType}`) || c.contactType}</span>
                  {selectedId === c.id && <Check className="h-4 w-4 text-primary" />}
                </div>
              </button>
            ))}
          {mode === "contact-to-entity" && filteredEntities.length === 0 && (
            <p className="p-3 text-center text-sm text-muted-foreground">{t("relation.noOptions")}</p>
          )}
          {mode === "entity-to-contact" && filteredContacts.length === 0 && (
            <p className="p-3 text-center text-sm text-muted-foreground">{t("relation.noOptions")}</p>
          )}
        </div>

        <div className="mb-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">{t("relation.role")}</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={t("relation.rolePlaceholder")}
              className="input-enterprise"
              data-testid="input-relation-role"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary"
              data-testid="checkbox-relation-primary"
            />
            {t("relation.isPrimary")}
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            data-testid="button-cancel-relation"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedId || !role.trim() || createMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            data-testid="button-save-relation"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
