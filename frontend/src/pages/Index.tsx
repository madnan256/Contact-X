import { Link } from "react-router-dom";
import { Users, Building2, CheckCircle, GitCompare, FileWarning, AlertTriangle, Target, ChevronRight, TrendingUp, Clock, Loader2, Activity } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import { useTranslation } from "@/hooks/useTranslation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

const COLORS = ["hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(199, 89%, 48%)"];

interface StatsData {
  totalContacts: number;
  totalEntities: number;
  activeContacts: number;
  activeEntities: number;
  averageCompleteness: number;
  duplicateCandidates: number;
  recentActivity: number;
  contactsByType: { type: string; count: number }[];
  entitiesByType: { type: string; count: number }[];
}

export default function Dashboard() {
  const { t } = useTranslation();

  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest<StatsData>("/stats"),
  });

  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/audit-logs-recent"],
    queryFn: () => apiRequest<any[]>("/audit-logs"),
  });

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const contactsByType = (stats?.contactsByType || []).map(ct => ({ name: ct.type, value: ct.count }));
  const entitiesByType = (stats?.entitiesByType || []).map(et => ({ name: et.type, value: et.count }));
  const recentActivity = auditLogs.slice(0, 5);

  return (
    <div className="page-container space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">{t("page.dashboard")}</h1>
        <p className="page-subtitle">{t("dashboard.overview")}</p>
      </div>

      <Tabs defaultValue="main" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="main">{t("dashboard.tabMain")}</TabsTrigger>
          <TabsTrigger value="executive">{t("dashboard.tabExecutive")}</TabsTrigger>
          <TabsTrigger value="governance">{t("dashboard.tabGovernance")}</TabsTrigger>
          <TabsTrigger value="operational">{t("dashboard.tabOperational")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("dashboard.tabAnalytics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="main" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KPICard title={t("dashboard.totalContacts")} value={stats?.totalContacts?.toLocaleString() || "0"} change={`${stats?.activeContacts || 0} ${t("common.active")}`} changeType="positive" icon={Users} data-testid="kpi-total-contacts" />
            <KPICard title={t("dashboard.totalEntities")} value={stats?.totalEntities?.toLocaleString() || "0"} change={`${stats?.activeEntities || 0} ${t("common.active")}`} changeType="positive" icon={Building2} data-testid="kpi-total-entities" />
            <KPICard title={t("dashboard.avgCompleteness")} value={`${stats?.averageCompleteness || 0}%`} change="" changeType="neutral" icon={CheckCircle} data-testid="kpi-avg-completeness" />
            <KPICard title={t("dashboard.pendingDuplicates")} value={String(stats?.duplicateCandidates || 0)} change="" changeType="neutral" icon={GitCompare} data-testid="kpi-pending-duplicates" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KPICard title={t("common.active") + " " + t("page.contacts")} value={String(stats?.activeContacts || 0)} change="" changeType="positive" icon={Users} />
            <KPICard title={t("common.active") + " " + t("page.entities")} value={String(stats?.activeEntities || 0)} change="" changeType="positive" icon={Building2} />
            <KPICard title={t("dashboard.recentActivity")} value={String(stats?.recentActivity || 0)} change={t("common.last30days")} changeType="neutral" icon={Activity} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card-enterprise">
              <h3 className="mb-4 text-base font-semibold text-foreground">{t("dashboard.contactsByType")}</h3>
              {contactsByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={contactsByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                      {contactsByType.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(214, 32%, 91%)", boxShadow: "var(--shadow-md)" }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground py-8 text-center">{t("common.noData")}</p>}
            </div>

            <div className="card-enterprise">
              <h3 className="mb-4 text-base font-semibold text-foreground">{t("dashboard.entitiesByType")}</h3>
              {entitiesByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={entitiesByType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
                    <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(214, 32%, 91%)", boxShadow: "var(--shadow-md)" }} />
                    <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground py-8 text-center">{t("common.noData")}</p>}
            </div>
          </div>

          <div className="card-enterprise">
            <h3 className="mb-4 text-base font-semibold text-foreground">{t("dashboard.recentActivity")}</h3>
            <div className="overflow-x-auto">
              <table className="table-enterprise">
                <thead>
                  <tr>
                    <th>{t("dashboard.action")}</th>
                    <th>{t("dashboard.type")}</th>
                    <th>{t("dashboard.time")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((item: any) => (
                    <tr key={item.id}>
                      <td className="font-medium text-foreground">{item.action}</td>
                      <td><span className="badge-status badge-type">{item.entityType}</span></td>
                      <td className="text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {recentActivity.length === 0 && (
                    <tr><td colSpan={3} className="text-center text-muted-foreground">{t("common.noRecentActivity")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="executive" className="space-y-6">
          <ExecutiveTab />
        </TabsContent>

        <TabsContent value="governance" className="space-y-6">
          <GovernanceTab />
        </TabsContent>

        <TabsContent value="operational" className="space-y-6">
          <OperationalTab />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExecutiveTab() {
  const { t } = useTranslation();

  const { data: exec, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboards/executive"],
    queryFn: () => apiRequest("/dashboards/executive"),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const completenessDistribution = (exec?.completenessDistribution || []).map((d: any) => ({ range: d.range, count: d.count }));
  const contactsByType = (exec?.contactsByType || []).map((ct: any) => ({ name: ct.type, value: ct.count }));
  const entitiesByType = (exec?.entitiesByType || []).map((et: any) => ({ name: et.type, value: et.count }));
  const topEngaged = (exec?.topEngagedEntities || []).map((e: any) => ({ name: (e.nameEn || e.NameEn || "").substring(0, 20), contacts: e.contactCount }));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KPICard title={t("executive.totalContacts")} value={String(exec?.totalContacts || 0)} change="" changeType="positive" icon={Users} data-testid="exec-total-contacts" />
        <KPICard title={t("executive.totalEntities")} value={String(exec?.totalEntities || 0)} change="" changeType="positive" icon={Building2} data-testid="exec-total-entities" />
        <KPICard title={t("executive.contactCompleteness")} value={`${exec?.contactCompleteness || 0}%`} change="" changeType="positive" icon={CheckCircle} data-testid="exec-contact-completeness" />
        <KPICard title={t("executive.entityCompleteness")} value={`${exec?.entityCompleteness || 0}%`} change="" changeType="positive" icon={CheckCircle} data-testid="exec-entity-completeness" />
        <KPICard title={t("executive.duplicateRisk")} value={`${exec?.duplicateRiskIndex || 0}%`} change="" changeType={exec?.duplicateRiskIndex > 20 ? "negative" : "neutral"} icon={AlertTriangle} data-testid="exec-duplicate-risk" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {topEngaged.length > 0 && (
          <div className="card-enterprise">
            <h3 className="mb-4 text-base font-semibold text-foreground">{t("executive.topEngaged")}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topEngaged} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} stroke="hsl(215, 16%, 47%)" />
                <Tooltip contentStyle={{ borderRadius: "0.75rem" }} />
                <Bar dataKey="contacts" fill="hsl(217, 91%, 60%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {contactsByType.length > 0 && (
          <div className="card-enterprise">
            <h3 className="mb-4 text-base font-semibold text-foreground">{t("dashboard.contactsByType")}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={contactsByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                  {contactsByType.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "0.75rem" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {entitiesByType.length > 0 && (
          <div className="card-enterprise">
            <h3 className="mb-4 text-base font-semibold text-foreground">{t("dashboard.entitiesByType")}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={entitiesByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                  {entitiesByType.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "0.75rem" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {completenessDistribution.length > 0 && (
          <div className="card-enterprise">
            <h3 className="mb-4 text-base font-semibold text-foreground">{t("executive.completenessDistribution")}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={completenessDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="range" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
                <Tooltip contentStyle={{ borderRadius: "0.75rem" }} />
                <Bar dataKey="count" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
}

function GovernanceTab() {
  const { t } = useTranslation();

  const { data: gov, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboards/governance"],
    queryFn: () => apiRequest("/dashboards/governance"),
  });

  const { data: weakContacts = [] } = useQuery<any[]>({
    queryKey: ["/api/kpis/weak-contacts"],
    queryFn: () => apiRequest("/kpis/weak-contacts?limit=5"),
  });

  const { data: orphanContacts = [] } = useQuery<any[]>({
    queryKey: ["/api/kpis/orphan-contacts"],
    queryFn: () => apiRequest("/kpis/orphan-contacts"),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const weakTotal = (gov?.weakProfiles?.contacts || 0) + (gov?.weakProfiles?.entities || 0);
  const orphanTotal = (gov?.orphanRecords?.contacts || 0) + (gov?.orphanRecords?.entities || 0);
  const dupMetrics = gov?.duplicateMetrics || {};
  const violations = gov?.mandatoryFieldViolations || {};
  const totalViolations = (violations.contactsMissingNationality || 0) + (violations.contactsMissingPosition || 0) + (violations.entitiesMissingCountry || 0) + (violations.entitiesMissingSector || 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/contacts" data-testid="gov-weak-profiles">
          <KPICard title={t("governance.weakProfiles")} value={String(weakTotal)} change={`${gov?.weakProfiles?.contacts || 0} ${t("chart.contacts")}, ${gov?.weakProfiles?.entities || 0} ${t("chart.entities")}`} changeType="negative" icon={FileWarning} />
        </Link>
        <Link to="/contacts" data-testid="gov-orphan-records">
          <KPICard title={t("governance.orphanRecords")} value={String(orphanTotal)} change={`${gov?.orphanRecords?.contacts || 0} ${t("chart.contacts")}, ${gov?.orphanRecords?.entities || 0} ${t("chart.entities")}`} changeType="negative" icon={Users} />
        </Link>
        <KPICard title={t("governance.mandatoryViolations")} value={String(totalViolations)} change="" changeType="negative" icon={AlertTriangle} data-testid="gov-violations" />
        <Link to="/duplicates" data-testid="gov-vip-incomplete">
          <KPICard title={t("governance.vipIncomplete")} value={String(gov?.vipIncomplete || 0)} change="VIP < 100%" changeType="negative" icon={Target} />
        </Link>
      </div>

      <Link to="/duplicates" className="block">
        <div className="card-enterprise hover:bg-muted/30 transition-colors cursor-pointer">
          <h3 className="mb-4 text-base font-semibold text-foreground">{t("governance.duplicateMetrics")}</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{dupMetrics.total || 0}</p>
              <p className="text-xs text-muted-foreground">{t("governance.totalDuplicates")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{dupMetrics.pending || 0}</p>
              <p className="text-xs text-muted-foreground">{t("governance.pendingDuplicates")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{dupMetrics.resolved || 0}</p>
              <p className="text-xs text-muted-foreground">{t("governance.resolvedDuplicates")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{dupMetrics.resolutionRate || 0}%</p>
              <p className="text-xs text-muted-foreground">{t("governance.resolutionRate")}</p>
            </div>
          </div>
        </div>
      </Link>

      <div className="card-enterprise">
        <h3 className="mb-4 text-base font-semibold text-foreground">{t("governance.mandatoryViolations")}</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-xl font-bold text-foreground">{violations.contactsMissingNationality || 0}</p>
            <p className="text-xs text-muted-foreground">{t("common.missingNationality")}</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-xl font-bold text-foreground">{violations.contactsMissingPosition || 0}</p>
            <p className="text-xs text-muted-foreground">{t("common.missingPosition")}</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-xl font-bold text-foreground">{violations.entitiesMissingCountry || 0}</p>
            <p className="text-xs text-muted-foreground">{t("common.missingCountry")}</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-xl font-bold text-foreground">{violations.entitiesMissingSector || 0}</p>
            <p className="text-xs text-muted-foreground">{t("common.missingSector")}</p>
          </div>
        </div>
      </div>

      <div className="card-enterprise">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{t("governance.weakProfiles")}</h3>
          <Link to="/contacts" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">{t("governance.viewAll")}</Link>
        </div>
        <div className="space-y-2">
          {weakContacts.length === 0 && <p className="text-sm text-muted-foreground">{t("common.noWeakProfiles")}</p>}
          {weakContacts.map((p: any) => (
            <Link key={p.id} to={`/contacts/${p.id}`} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">{p.firstName} {p.lastName}</p>
                <p className="text-xs text-muted-foreground">{p.firstNameAr} {p.lastNameAr}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-12 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full completeness-low" style={{ width: `${p.profileCompleteness}%` }} />
                  </div>
                  <span className="text-xs font-medium text-destructive">{p.profileCompleteness}%</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="card-enterprise">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{t("governance.orphanRecords")}</h3>
          <Link to="/contacts" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">{t("governance.viewAll")}</Link>
        </div>
        <div className="space-y-2">
          {orphanContacts.length === 0 && <p className="text-sm text-muted-foreground">{t("common.noOrphanRecords")}</p>}
          {orphanContacts.slice(0, 5).map((r: any) => (
            <Link key={r.id} to={`/contacts/${r.id}`} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">{r.firstName} {r.lastName}</p>
                <p className="text-xs text-muted-foreground">{r.firstNameAr} {r.lastNameAr}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge-status badge-pending">{t("common.noEntity")}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

function OperationalTab() {
  const { t } = useTranslation();

  const { data: op, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboards/operational"],
    queryFn: () => apiRequest("/dashboards/operational"),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const mostActive = (op?.mostActiveContacts || []).map((c: any) => ({
    name: `${c.firstName || c.FirstName || ""} ${c.lastName || c.LastName || ""}`.substring(0, 15),
    entities: c.relationCount,
  }));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card-enterprise">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{t("operational.recentlyCreated")}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div><p className="text-2xl font-bold text-foreground">{op?.recentlyCreated?.contacts || 0}</p><p className="text-xs text-muted-foreground">{t("operational.recentContacts")}</p></div>
            <div><p className="text-2xl font-bold text-foreground">{op?.recentlyCreated?.entities || 0}</p><p className="text-xs text-muted-foreground">{t("operational.recentEntities")}</p></div>
          </div>
        </div>

        <div className="card-enterprise">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{t("operational.activeContacts")}</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-2xl font-bold text-foreground">{op?.activeContacts?.days30 || 0}</p><p className="text-xs text-muted-foreground">{t("common.last30days")}</p></div>
            <div><p className="text-2xl font-bold text-foreground">{op?.activeContacts?.days90 || 0}</p><p className="text-xs text-muted-foreground">{t("common.last90days")}</p></div>
            <div><p className="text-2xl font-bold text-foreground">{op?.activeContacts?.days365 || 0}</p><p className="text-xs text-muted-foreground">{t("common.last365days")}</p></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card-enterprise">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{t("operational.activeEntities")}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div><p className="text-2xl font-bold text-foreground">{op?.activeEntities?.days30 || 0}</p><p className="text-xs text-muted-foreground">{t("common.last30days")}</p></div>
            <div><p className="text-2xl font-bold text-foreground">{op?.activeEntities?.days90 || 0}</p><p className="text-xs text-muted-foreground">{t("common.last90days")}</p></div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card-enterprise">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("operational.multiEntity")}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{op?.multiEntityContacts || 0}</p>
              </div>
              <GitCompare className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <div className="card-enterprise">
            <p className="text-sm text-muted-foreground">{t("operational.avgEntities")}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{op?.avgEntitiesPerContact || 0}</p>
          </div>
          <div className="card-enterprise">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("operational.inactive90")}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{op?.recentlyInactiveContacts || 0}</p>
              </div>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {mostActive.length > 0 && (
        <div className="card-enterprise">
          <h3 className="mb-4 text-base font-semibold text-foreground">{t("operational.mostActive")}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={mostActive} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} stroke="hsl(215, 16%, 47%)" />
              <Tooltip contentStyle={{ borderRadius: "0.75rem" }} />
              <Bar dataKey="entities" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}

function AnalyticsTab() {
  const { t } = useTranslation();

  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboards/analytics"],
    queryFn: () => apiRequest("/dashboards/analytics"),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const completenessDistribution = (analytics?.completenessDistribution || []).map((d: any) => ({ range: d.range, count: d.count }));
  const contactsByType = (analytics?.contactsByType || []).map((ct: any) => ({ name: ct.type, value: ct.count }));
  const entitiesByType = (analytics?.entitiesByType || []).map((et: any) => ({ name: et.type, value: et.count }));
  const activityTrends = analytics?.activityTrends || [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="card-enterprise">
        <h3 className="mb-4 text-base font-semibold text-foreground">{t("analytics.contactsByType")}</h3>
        {contactsByType.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={contactsByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                {contactsByType.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "0.75rem" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-muted-foreground py-8 text-center">{t("common.noData")}</p>}
      </div>

      <div className="card-enterprise">
        <h3 className="mb-4 text-base font-semibold text-foreground">{t("analytics.entitiesByType")}</h3>
        {entitiesByType.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={entitiesByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                {entitiesByType.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "0.75rem" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-muted-foreground py-8 text-center">{t("common.noData")}</p>}
      </div>

      <div className="card-enterprise">
        <h3 className="mb-4 text-base font-semibold text-foreground">{t("analytics.completenessDistribution")}</h3>
        {completenessDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={completenessDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(214, 32%, 91%)" }} />
              <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-muted-foreground py-8 text-center">{t("common.noData")}</p>}
      </div>

      <div className="card-enterprise">
        <h3 className="mb-4 text-base font-semibold text-foreground">{t("analytics.activityTrends")}</h3>
        {activityTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={activityTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(214, 32%, 91%)" }} />
              <Legend />
              <Line type="monotone" dataKey="contacts" name={t("chart.contacts")} stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="entities" name={t("chart.entities")} stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="actions" name={t("chart.actions")} stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-muted-foreground py-8 text-center">{t("common.noData")}</p>}
      </div>
    </div>
  );
}
