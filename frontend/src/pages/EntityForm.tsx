import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Star, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { countryCodes } from "@/lib/countryCodes";

const entityTypes = ["public", "semi-government", "private", "international", "ngo"];

const countries = [
  "Saudi Arabia", "United Arab Emirates", "Bahrain", "Qatar", "Oman", "Kuwait",
  "Egypt", "Jordan", "Lebanon", "Iraq", "Morocco", "Tunisia",
  "United States", "United Kingdom", "Germany", "France", "India", "Pakistan",
];

const addressTypes = ["Home", "Work", "Office", "Billing", "Shipping", "Other"];

interface EntityOption {
  id: string;
  nameEn: string;
}

export default function EntityForm() {
  const { id } = useParams();
  const isEdit = id && id !== "new";
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [entityType, setEntityType] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");
  const [parentEntityId, setParentEntityId] = useState("");
  const [contactPoints, setContactPoints] = useState([{ name: "", email: "", phone: "", countryCode: "+966", country: "" }]);
  const [addresses, setAddresses] = useState([{ type: "Work", address: "", primary: true }]);
  const [cpErrors, setCpErrors] = useState<Record<string, string>>({});

  const { data: allEntities = [] } = useQuery<EntityOption[]>({
    queryKey: ["/api/entities"],
    queryFn: () => apiRequest<EntityOption[]>("/entities"),
  });

  const { data: existingEntity, isLoading } = useQuery({
    queryKey: ["/api/entities", id],
    queryFn: () => apiRequest<any>(`/entities/${id}`),
    enabled: !!isEdit,
  });

  useEffect(() => {
    if (existingEntity) {
      setNameEn(existingEntity.nameEn || "");
      setNameAr(existingEntity.nameAr || "");
      setEntityType(existingEntity.entityType || "");
      setRegistrationId(existingEntity.registrationId || "");
      setCountry(existingEntity.country || "");
      setSector(existingEntity.sector || "");
      setParentEntityId(existingEntity.parentEntityId || "");
      try {
        const cp = JSON.parse(existingEntity.contactPoints || "[]");
        if (cp.length > 0) setContactPoints(cp);
      } catch {}
      try {
        const addr = JSON.parse(existingEntity.addresses || "[]");
        if (addr.length > 0) setAddresses(addr);
      } catch {}
    }
  }, [existingEntity]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (isEdit) {
        return apiRequest(`/entities/${id}`, { method: "PATCH", body: JSON.stringify(data) });
      }
      return apiRequest("/entities", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
      toast({ title: isEdit ? t("entity.updated") : t("entity.created") });
      navigate("/entities");
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const phoneRegex = /^\d+$/;

  const validateContactPoints = (): boolean => {
    const errors: Record<string, string> = {};
    let valid = true;
    contactPoints.forEach((cp, i) => {
      if (cp.email && !emailRegex.test(cp.email)) {
        errors[`${i}-email`] = t("validation.invalidEmail");
        valid = false;
      }
      if (cp.phone && !phoneRegex.test(cp.phone.replace(/[\s\-()]/g, ""))) {
        errors[`${i}-phone`] = t("validation.phoneNumbersOnly");
        valid = false;
      }
    });
    setCpErrors(errors);
    return valid;
  };

  const handleSave = () => {
    if (!validateContactPoints()) return;
    saveMutation.mutate({
      nameEn,
      nameAr,
      entityType,
      registrationId,
      country,
      sector,
      parentEntityId: parentEntityId || null,
      contactPoints,
      addresses,
    });
  };

  const existingEntities = allEntities.filter((e: EntityOption) => e.id !== id);

  const addContactPoint = () => setContactPoints([...contactPoints, { name: "", email: "", phone: "", countryCode: "+966", country: "" }]);
  const removeContactPoint = (i: number) => setContactPoints(contactPoints.filter((_, idx) => idx !== i));

  const addAddress = () => setAddresses([...addresses, { type: "Work", address: "", primary: false }]);
  const removeAddress = (i: number) => {
    const next = addresses.filter((_, idx) => idx !== i);
    if (next.length > 0 && !next.some(a => a.primary)) next[0].primary = true;
    setAddresses(next);
  };
  const setPrimaryAddress = (i: number) => setAddresses(addresses.map((a, idx) => ({ ...a, primary: idx === i })));

  if (isEdit && isLoading) {
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{isEdit ? t("entity.edit") : t("entity.create")}</h1>
          <p className="page-subtitle">{isEdit ? t("entity.updateDesc") : t("entity.createDesc")}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          data-testid="button-save-entity"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("entity.save")}
        </button>
      </div>

      <div className="space-y-6">
        <div className="card-enterprise">
          <h3 className="mb-4 text-base font-semibold text-foreground">{t("entity.nameSection")}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("entity.nameEn")}</label>
              <input type="text" placeholder={t("form.placeholder.entityName")} className="input-enterprise" value={nameEn} onChange={(e) => setNameEn(e.target.value)} data-testid="input-entity-name-en" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("entity.nameAr")}</label>
              <input type="text" placeholder={t("form.placeholder.entityNameAr")} className="input-enterprise" dir={nameAr ? "rtl" : "auto"} value={nameAr} onChange={(e) => setNameAr(e.target.value)} data-testid="input-entity-name-ar" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("entity.type")}</label>
              <select className="input-enterprise" value={entityType} onChange={(e) => setEntityType(e.target.value)} data-testid="select-entity-type">
                <option value="">{t("form.select")}</option>
                {entityTypes.map(et => (
                  <option key={et} value={et}>{et.charAt(0).toUpperCase() + et.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("entity.registrationId")}</label>
              <input type="text" placeholder="e.g. REG-001" className="input-enterprise" value={registrationId} onChange={(e) => setRegistrationId(e.target.value)} data-testid="input-registration-id" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.country")}</label>
              <select className="input-enterprise" value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">{t("form.select")}</option>
                {countries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("entity.sector")}</label>
              <input type="text" placeholder="e.g. Technology, Healthcare" className="input-enterprise" value={sector} onChange={(e) => setSector(e.target.value)} data-testid="input-entity-sector" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("entity.parentEntity")}</label>
              <select className="input-enterprise" value={parentEntityId} onChange={(e) => setParentEntityId(e.target.value)}>
                <option value="">{t("form.select")}</option>
                {existingEntities.map(e => (
                  <option key={e.id} value={e.id}>{e.nameEn}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card-enterprise">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">{t("entity.contactPoints")}</h3>
            <button onClick={addContactPoint} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
              <Plus className="h-3.5 w-3.5" />
              {t("entity.addContactPoint")}
            </button>
          </div>
          <div className="space-y-4">
            {contactPoints.map((cp, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">#{i + 1}</span>
                  {contactPoints.length > 1 && (
                    <button onClick={() => removeContactPoint(i)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">{t("entity.cpName")}</label>
                    <input type="text" placeholder="Contact name" className="input-enterprise"
                      value={cp.name}
                      onChange={(e) => { const next = [...contactPoints]; next[i] = { ...next[i], name: e.target.value }; setContactPoints(next); }}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">{t("entity.email")}</label>
                    <input type="email" placeholder="email@example.com" className={`input-enterprise ${cpErrors[`${i}-email`] ? "border-destructive" : ""}`}
                      value={cp.email}
                      onChange={(e) => {
                        const next = [...contactPoints]; next[i] = { ...next[i], email: e.target.value }; setContactPoints(next);
                        if (cpErrors[`${i}-email`]) { const errs = { ...cpErrors }; delete errs[`${i}-email`]; setCpErrors(errs); }
                      }}
                    />
                    {cpErrors[`${i}-email`] && <p className="mt-1 text-xs text-destructive" data-testid={`error-cp-email-${i}`}>{cpErrors[`${i}-email`]}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">{t("entity.phone")}</label>
                    <div className="flex gap-1">
                      <select
                        value={cp.countryCode}
                        onChange={(e) => { const next = [...contactPoints]; next[i] = { ...next[i], countryCode: e.target.value }; setContactPoints(next); }}
                        className="input-enterprise w-24 shrink-0"
                      >
                        {countryCodes.map(cc => (
                          <option key={`${cc.code}-${cc.name}`} value={cc.code}>{cc.flag} {cc.code} {cc.name}</option>
                        ))}
                      </select>
                      <input type="tel" placeholder="5XXXXXXXX" className={`input-enterprise flex-1 ${cpErrors[`${i}-phone`] ? "border-destructive" : ""}`}
                        value={cp.phone}
                        onChange={(e) => {
                          const next = [...contactPoints]; next[i] = { ...next[i], phone: e.target.value }; setContactPoints(next);
                          if (cpErrors[`${i}-phone`]) { const errs = { ...cpErrors }; delete errs[`${i}-phone`]; setCpErrors(errs); }
                        }}
                      />
                    </div>
                    {cpErrors[`${i}-phone`] && <p className="mt-1 text-xs text-destructive" data-testid={`error-cp-phone-${i}`}>{cpErrors[`${i}-phone`]}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.country")}</label>
                    <select className="input-enterprise"
                      value={cp.country}
                      onChange={(e) => { const next = [...contactPoints]; next[i] = { ...next[i], country: e.target.value }; setContactPoints(next); }}
                    >
                      <option value="">{t("form.select")}</option>
                      {countries.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-enterprise">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">{t("form.addresses")}</h3>
            <button onClick={addAddress} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
              <Plus className="h-3.5 w-3.5" />
              {t("form.addAddress")}
            </button>
          </div>
          <div className="space-y-3">
            {addresses.map((addr, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={addr.type}
                  onChange={(e) => { const next = [...addresses]; next[i] = { ...next[i], type: e.target.value }; setAddresses(next); }}
                  className="input-enterprise w-32 shrink-0"
                >
                  {addressTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input type="text" placeholder="Enter address" className="input-enterprise flex-1"
                  value={addr.address}
                  onChange={(e) => { const next = [...addresses]; next[i] = { ...next[i], address: e.target.value }; setAddresses(next); }}
                />
                <button
                  onClick={() => setPrimaryAddress(i)}
                  className={`rounded-lg p-2 transition-colors ${addr.primary ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5"}`}
                  title="Primary"
                >
                  <Star className={`h-3.5 w-3.5 ${addr.primary ? "fill-primary" : ""}`} />
                </button>
                {addresses.length > 1 && (
                  <button onClick={() => removeAddress(i)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
