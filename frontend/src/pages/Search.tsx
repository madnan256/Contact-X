import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon, Building2, ChevronRight, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

interface SearchContact {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  contactType: string;
  emails: string;
}

interface SearchEntity {
  id: string;
  nameEn: string;
  nameAr?: string;
  entityType: string;
}

interface SearchResult {
  contacts: SearchContact[];
  entities: SearchEntity[];
}

const contactTypes = ["citizen", "employee", "external", "vip"];
const entityTypes = ["public", "semi-government", "private", "international", "ngo"];

export default function SearchPage() {
  const { t, lang } = useTranslation();
  const isAr = lang === "ar";
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "contacts" | "entities">("all");
  const [contactTypeFilter, setContactTypeFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useQuery<SearchResult>({
    queryKey: ["/api/search", debouncedQuery],
    queryFn: () => apiRequest<SearchResult>(`/search?query=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length >= 1,
  });

  const allContacts = data?.contacts || [];
  const allEntities = data?.entities || [];

  const filteredContacts = filter === "entities" ? [] :
    contactTypeFilter ? allContacts.filter(c => c.contactType === contactTypeFilter) : allContacts;
  const filteredEntities = filter === "contacts" ? [] :
    entityTypeFilter ? allEntities.filter(e => e.entityType === entityTypeFilter) : allEntities;

  const totalCount = filteredContacts.length + filteredEntities.length;
  const hasResults = totalCount > 0;

  const getEmailDisplay = (emailsJson: string) => {
    try {
      const emails = JSON.parse(emailsJson || "[]");
      if (emails.length === 0) return "";
      const first = emails[0];
      return typeof first === "string" ? first : first.value || "";
    } catch { return ""; }
  };

  return (
    <div className="page-container space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">{t("search.title")}</h1>
        <p className="page-subtitle">{t("search.subtitle")}</p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          className="input-enterprise pl-10 rtl:pl-4 rtl:pr-10"
          autoFocus
          data-testid="input-search"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "contacts", "entities"] as const).map((f) => {
          const count = f === "all" ? totalCount : f === "contacts" ? filteredContacts.length : filteredEntities.length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {t(`search.${f}`)} {query && `(${count})`}
            </button>
          );
        })}
      </div>

      {query && (
        <div className="flex flex-wrap gap-3">
          {(filter === "all" || filter === "contacts") && filteredContacts.length > 0 && (
            <select value={contactTypeFilter} onChange={(e) => setContactTypeFilter(e.target.value)} className="input-enterprise w-auto">
              <option value="">{t("search.allContactTypes")}</option>
              {contactTypes.map(ct => <option key={ct} value={ct}>{t(`contactType.${ct}`)}</option>)}
            </select>
          )}
          {(filter === "all" || filter === "entities") && filteredEntities.length > 0 && (
            <select value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)} className="input-enterprise w-auto">
              <option value="">{t("search.allEntityTypes")}</option>
              {entityTypes.map(et => <option key={et} value={et}>{t(`entityType.${et}`)}</option>)}
            </select>
          )}
        </div>
      )}

      {!query && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <SearchIcon className="mb-3 h-12 w-12 opacity-30" />
          <p className="text-sm">{t("search.startTyping")}</p>
        </div>
      )}

      {query && isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {query && !isLoading && !hasResults && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">{t("search.noResults")}</p>
        </div>
      )}

      {query && filteredContacts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("page.contacts")} ({filteredContacts.length})</h3>
          {filteredContacts.map((c) => {
            const name = `${c.firstName || ""} ${c.lastName || ""}`.trim();
            const nameAr = `${c.firstNameAr || ""} ${c.lastNameAr || ""}`.trim();
            return (
              <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted" data-testid={`search-result-contact-${c.id}`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {(c.firstName || "?")[0]}{(c.lastName || "?")[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{isAr ? nameAr || name : name}</p>
                    <p className="text-xs text-muted-foreground">{isAr ? name : nameAr} {getEmailDisplay(c.emails) ? `\u00B7 ${getEmailDisplay(c.emails)}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-status badge-type">{t(`contactType.${c.contactType}`) || c.contactType}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {query && filteredEntities.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("page.entities")} ({filteredEntities.length})</h3>
          {filteredEntities.map((e) => (
            <Link key={e.id} to={`/entities/${e.id}`} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted" data-testid={`search-result-entity-${e.id}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{isAr ? e.nameAr || e.nameEn : e.nameEn}</p>
                  <p className="text-xs text-muted-foreground">{isAr ? e.nameEn : e.nameAr}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge-status badge-type">{e.entityType}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
