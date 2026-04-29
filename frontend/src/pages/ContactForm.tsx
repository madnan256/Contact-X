import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Star, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import DatePickerField from "@/components/ui/date-picker-field";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { countryCodes } from "@/lib/countryCodes";

const addressTypes = ["Home", "Work", "Office", "Billing", "Shipping", "Other"];

interface EntityOption {
  id: string;
  nameEn: string;
}

export default function ContactForm() {
  const { id } = useParams();
  const isEdit = id && id !== "new";
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [contactType, setContactType] = useState("citizen");
  const [nationalId, setNationalId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();
  const [nationality, setNationality] = useState("");
  const [gender, setGender] = useState("");
  const [prefix, setPrefix] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [prefixAr, setPrefixAr] = useState("");
  const [firstNameAr, setFirstNameAr] = useState("");
  const [middleNameAr, setMiddleNameAr] = useState("");
  const [lastNameAr, setLastNameAr] = useState("");
  const [suffixAr, setSuffixAr] = useState("");
  const [currentEntityId, setCurrentEntityId] = useState("");
  const [currentEntityName, setCurrentEntityName] = useState("");
  const [currentPosition, setCurrentPosition] = useState("");
  const [emails, setEmails] = useState([{ value: "", primary: true }]);
  const [phones, setPhones] = useState([{ value: "", countryCode: "+966", primary: true }]);
  const [addresses, setAddresses] = useState([{ type: "Home", address: "", primary: true }]);

  const { data: entities = [] } = useQuery<EntityOption[]>({
    queryKey: ["/api/entities"],
    queryFn: () => apiRequest<EntityOption[]>("/entities"),
  });

  const { data: nationalities = [] } = useQuery<string[]>({
    queryKey: ["/api/lookups/nationalities"],
    queryFn: () => apiRequest<string[]>("/lookups/nationalities"),
  });

  const { data: existingContact, isLoading } = useQuery({
    queryKey: ["/api/contacts", id],
    queryFn: () => apiRequest<any>(`/contacts/${id}`),
    enabled: !!isEdit,
  });

  useEffect(() => {
    if (existingContact) {
      setContactType(existingContact.contactType || "");
      setNationalId(existingContact.nationalId || "");
      setNationality(existingContact.nationality || "");
      setGender(existingContact.gender || "");
      setPrefix(existingContact.prefix || "");
      setFirstName(existingContact.firstName || "");
      setMiddleName(existingContact.middleName || "");
      setLastName(existingContact.lastName || "");
      setSuffix(existingContact.suffix || "");
      setPrefixAr(existingContact.prefixAr || "");
      setFirstNameAr(existingContact.firstNameAr || "");
      setMiddleNameAr(existingContact.middleNameAr || "");
      setLastNameAr(existingContact.lastNameAr || "");
      setSuffixAr(existingContact.suffixAr || "");
      setCurrentEntityId(existingContact.currentEntityId || "");
      setCurrentEntityName(existingContact.currentEntityName || "");
      setCurrentPosition(existingContact.currentPosition || "");
      if (existingContact.dateOfBirth) setDateOfBirth(new Date(existingContact.dateOfBirth));
      try {
        const parsedEmails = JSON.parse(existingContact.emails || "[]");
        if (parsedEmails.length > 0) setEmails(parsedEmails);
      } catch {}
      try {
        const parsedPhones = JSON.parse(existingContact.phones || "[]");
        if (parsedPhones.length > 0) setPhones(parsedPhones);
      } catch {}
      try {
        const parsedAddresses = JSON.parse(existingContact.addresses || "[]");
        if (parsedAddresses.length > 0) setAddresses(parsedAddresses);
      } catch {}
    }
  }, [existingContact]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (isEdit) {
        return apiRequest(`/contacts/${id}`, { method: "PATCH", body: JSON.stringify(data) });
      }
      return apiRequest("/contacts", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: isEdit ? t("contacts.updateSuccess") : t("contacts.createSuccess") });
      navigate("/contacts");
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    const data: any = {
      contactType,
      nationalId,
      nationality,
      gender,
      prefix,
      firstName,
      middleName,
      lastName,
      suffix,
      prefixAr,
      firstNameAr,
      middleNameAr,
      lastNameAr,
      suffixAr,
      currentEntityId: currentEntityId || null,
      currentEntityName,
      currentPosition,
      emails,
      phones,
      addresses,
    };
    if (dateOfBirth) data.dateOfBirth = dateOfBirth.toISOString().split("T")[0];
    saveMutation.mutate(data);
  };

  const addEmail = () => setEmails([...emails, { value: "", primary: false }]);
  const removeEmail = (i: number) => {
    const next = emails.filter((_, idx) => idx !== i);
    if (next.length > 0 && !next.some(e => e.primary)) next[0].primary = true;
    setEmails(next);
  };
  const setPrimaryEmail = (i: number) => setEmails(emails.map((e, idx) => ({ ...e, primary: idx === i })));

  const addPhone = () => setPhones([...phones, { value: "", countryCode: "+966", primary: false }]);
  const removePhone = (i: number) => {
    const next = phones.filter((_, idx) => idx !== i);
    if (next.length > 0 && !next.some(p => p.primary)) next[0].primary = true;
    setPhones(next);
  };
  const setPrimaryPhone = (i: number) => setPhones(phones.map((p, idx) => ({ ...p, primary: idx === i })));

  const addAddress = () => setAddresses([...addresses, { type: "Home", address: "", primary: false }]);
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
      <Link to="/contacts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        {t("contact.backToContacts")}
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{isEdit ? t("form.editContact") : t("form.newContact")}</h1>
          <p className="page-subtitle">{isEdit ? t("form.updateContact") : t("form.addNewContact")}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          data-testid="button-save-contact"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("form.save")}
        </button>
      </div>

      <div className="space-y-6">
        <div className="card-enterprise">
          <h3 className="mb-4 text-base font-semibold text-foreground">{t("form.personalInfo")}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.contactType")}</label>
              <select className="input-enterprise" value={contactType} onChange={(e) => setContactType(e.target.value)} data-testid="select-contact-type">
                <option value="citizen">{t("contactType.citizen")}</option>
                <option value="employee">{t("contactType.employee")}</option>
                <option value="external">{t("contactType.external")}</option>
                <option value="vip">{t("contactType.vip")}</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.nationalId")}</label>
              <input type="text" placeholder={t("form.placeholder.nationalId")} className="input-enterprise" value={nationalId} onChange={(e) => setNationalId(e.target.value)} data-testid="input-national-id" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.dateOfBirth")}</label>
              <DatePickerField value={dateOfBirth} onChange={setDateOfBirth} placeholder={t("form.placeholder.pickDate")} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.nationality")}</label>
              <select className="input-enterprise" value={nationality} onChange={(e) => setNationality(e.target.value)} data-testid="select-nationality">
                <option value="">{t("form.select")}</option>
                {nationalities.map((n: string) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.gender")}</label>
              <select className="input-enterprise" value={gender} onChange={(e) => setGender(e.target.value)} data-testid="select-gender">
                <option value="">{t("form.select")}</option>
                <option value="male">{t("form.male")}</option>
                <option value="female">{t("form.female")}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card-enterprise">
          <h3 className="mb-4 text-base font-semibold text-foreground">{t("form.englishName")}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.prefix")}</label>
              <input type="text" placeholder={t("form.placeholder.prefix")} className="input-enterprise" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.firstName")}</label>
              <input type="text" placeholder={t("form.placeholder.firstName")} className="input-enterprise" value={firstName} onChange={(e) => setFirstName(e.target.value)} data-testid="input-first-name" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.middleName")}</label>
              <input type="text" placeholder={t("form.placeholder.middleName")} className="input-enterprise" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.lastName")}</label>
              <input type="text" placeholder={t("form.placeholder.lastName")} className="input-enterprise" value={lastName} onChange={(e) => setLastName(e.target.value)} data-testid="input-last-name" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.suffix")}</label>
              <input type="text" placeholder={t("form.placeholder.suffix")} className="input-enterprise" value={suffix} onChange={(e) => setSuffix(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card-enterprise">
          <h3 className="mb-4 text-base font-semibold text-foreground">{t("form.arabicName")}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.prefixAr")}</label>
              <input type="text" placeholder={t("form.placeholder.prefixAr")} className="input-enterprise" dir={prefixAr ? "rtl" : "auto"} value={prefixAr} onChange={(e) => setPrefixAr(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.firstNameAr")}</label>
              <input type="text" placeholder={t("form.placeholder.firstNameAr")} className="input-enterprise" dir={firstNameAr ? "rtl" : "auto"} value={firstNameAr} onChange={(e) => setFirstNameAr(e.target.value)} data-testid="input-first-name-ar" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.middleNameAr")}</label>
              <input type="text" placeholder={t("form.placeholder.middleNameAr")} className="input-enterprise" dir={middleNameAr ? "rtl" : "auto"} value={middleNameAr} onChange={(e) => setMiddleNameAr(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.lastNameAr")}</label>
              <input type="text" placeholder={t("form.placeholder.lastNameAr")} className="input-enterprise" dir={lastNameAr ? "rtl" : "auto"} value={lastNameAr} onChange={(e) => setLastNameAr(e.target.value)} data-testid="input-last-name-ar" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.suffixAr")}</label>
              <input type="text" placeholder={t("form.placeholder.suffixAr")} className="input-enterprise" dir={suffixAr ? "rtl" : "auto"} value={suffixAr} onChange={(e) => setSuffixAr(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card-enterprise">
          <h3 className="mb-4 text-base font-semibold text-foreground">{t("form.professionalInfo")}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.currentEntity")}</label>
              <select className="input-enterprise" value={currentEntityId} onChange={(e) => setCurrentEntityId(e.target.value)} data-testid="select-current-entity">
                <option value="">{t("form.select")}</option>
                {entities.map((e: EntityOption) => (
                  <option key={e.id} value={e.id}>{e.nameEn}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.entityName")}</label>
              <input type="text" placeholder={t("form.placeholder.entityName")} className="input-enterprise" value={currentEntityName} onChange={(e) => setCurrentEntityName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("form.position")}</label>
              <input type="text" placeholder={t("form.placeholder.position")} className="input-enterprise" value={currentPosition} onChange={(e) => setCurrentPosition(e.target.value)} data-testid="input-position" />
            </div>
          </div>
        </div>

        <div className="card-enterprise">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">{t("form.emails")}</h3>
            <button onClick={addEmail} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
              <Plus className="h-3.5 w-3.5" />
              {t("form.addEmail")}
            </button>
          </div>
          <div className="space-y-3">
            {emails.map((email, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="email"
                  placeholder={t("form.placeholder.email")}
                  className="input-enterprise flex-1"
                  value={email.value}
                  onChange={(e) => { const next = [...emails]; next[i] = { ...next[i], value: e.target.value }; setEmails(next); }}
                  data-testid={`input-email-${i}`}
                />
                <button
                  onClick={() => setPrimaryEmail(i)}
                  className={`rounded-lg p-2 transition-colors ${email.primary ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5"}`}
                  title={t("form.setPrimary")}
                >
                  <Star className={`h-4 w-4 ${email.primary ? "fill-primary" : ""}`} />
                </button>
                {emails.length > 1 && (
                  <button onClick={() => removeEmail(i)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card-enterprise">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">{t("form.phones")}</h3>
            <button onClick={addPhone} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
              <Plus className="h-3.5 w-3.5" />
              {t("form.addPhone")}
            </button>
          </div>
          <div className="space-y-3">
            {phones.map((phone, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={phone.countryCode}
                  onChange={(e) => {
                    const next = [...phones];
                    next[i] = { ...next[i], countryCode: e.target.value };
                    setPhones(next);
                  }}
                  className="input-enterprise w-28 shrink-0"
                >
                  {countryCodes.map(cc => (
                    <option key={`${cc.code}-${cc.name}`} value={cc.code}>{cc.flag} {cc.code} {cc.name}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder={t("form.placeholder.phone")}
                  className="input-enterprise flex-1"
                  value={phone.value}
                  onChange={(e) => { const next = [...phones]; next[i] = { ...next[i], value: e.target.value }; setPhones(next); }}
                  data-testid={`input-phone-${i}`}
                />
                <button
                  onClick={() => setPrimaryPhone(i)}
                  className={`rounded-lg p-2 transition-colors ${phone.primary ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5"}`}
                  title={t("form.setPrimary")}
                >
                  <Star className={`h-4 w-4 ${phone.primary ? "fill-primary" : ""}`} />
                </button>
                {phones.length > 1 && (
                  <button onClick={() => removePhone(i)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
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
                  onChange={(e) => {
                    const next = [...addresses];
                    next[i] = { ...next[i], type: e.target.value };
                    setAddresses(next);
                  }}
                  className="input-enterprise w-32 shrink-0"
                >
                  {addressTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder={t("form.placeholder.address")}
                  className="input-enterprise flex-1"
                  value={addr.address}
                  onChange={(e) => { const next = [...addresses]; next[i] = { ...next[i], address: e.target.value }; setAddresses(next); }}
                  data-testid={`input-address-${i}`}
                />
                <button
                  onClick={() => setPrimaryAddress(i)}
                  className={`rounded-lg p-2 transition-colors ${addr.primary ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5"}`}
                  title={t("form.setPrimary")}
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
