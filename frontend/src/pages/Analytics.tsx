import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { useTranslation } from "@/hooks/useTranslation";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Loader2 } from "lucide-react";

const COLORS = ["hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)"];

export default function Analytics() {
  const { t } = useTranslation();

  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboards/analytics"],
    queryFn: () => apiRequest("/dashboards/analytics"),
  });

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completenessDistribution = (analytics?.completenessDistribution || []).map((d: any) => ({ range: d.range, count: d.count }));
  const contactsByType = (analytics?.contactsByType || []).map((ct: any) => ({ name: ct.type, value: ct.count }));
  const entitiesByType = (analytics?.entitiesByType || []).map((et: any) => ({ name: et.type, value: et.count }));
  const activityTrends = analytics?.activityTrends || [];

  return (
    <div className="page-container space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">{t("analytics.title")}</h1>
        <p className="page-subtitle">{t("analytics.subtitle")}</p>
      </div>

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
    </div>
  );
}
