import {
  useGetDashboardSummary,
  useGetDashboardRevenue,
  useGetTopSkus,
  useGetRecentOrders,
  useGetPaymentPlatformSummary,
  type PlatformPaymentSummary,
  type PaymentPlatform,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";
import { Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell } from "recharts";
import { format, parseISO } from "date-fns";
import { useBrand } from "@/lib/use-brand";

const PLATFORM_COLORS = {
  meesho: "hsl(var(--chart-1))",
  flipkart: "hsl(var(--chart-2))",
  amazon: "hsl(var(--chart-3))",
};

export default function Dashboard() {
  const { brand, setBrand, companies } = useBrand();
  const activeCompany = companies.find((c) => c.slug === brand);
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: revenue, isLoading: loadingRevenue } = useGetDashboardRevenue({ days: 30 });
  const { data: topSkus, isLoading: loadingSkus } = useGetTopSkus({ limit: 5 });
  const { data: recentOrders, isLoading: loadingOrders } = useGetRecentOrders({ limit: 5 });
  const { data: platformSummary, isLoading: loadingPlatformSummary } = useGetPaymentPlatformSummary();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Viewing <span className="font-medium text-foreground">{activeCompany?.name ?? brand}</span>.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {loadingPlatformSummary ? (
          <div className="space-y-4">
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
              {Array.from({length: 8}).map((_, j) => (
                <Skeleton key={j} className="h-20 w-full rounded-lg" />
              ))}
            </div>
            {[0,1,2].map((i) => (
              <div key={i} className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
                {Array.from({length: 8}).map((_, j) => (
                  <Skeleton key={j} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ))}
          </div>
        ) : platformSummary ? (
          <div className="space-y-4">
            <AllPlatformSummaryRow data={platformSummary.all} />
            <div className="border-t pt-2 space-y-4">
              {platformSummary.platforms.map((ps) => (
                <PlatformSummaryRow key={ps.platform} platform={ps.platform} data={ps} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4 flex flex-col">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Daily revenue for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            {loadingRevenue ? (
              <Skeleton className="w-full h-full" />
            ) : revenue && revenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => format(parseISO(val), "MMM d")}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip 
                    formatter={(value: number) => [formatINR(value), "Revenue"]}
                    labelFormatter={(label: string) => format(parseISO(label), "MMM d, yyyy")}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem" }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Platform Breakdown</CardTitle>
            <CardDescription>Sales distribution by marketplace</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {loadingSummary ? (
              <Skeleton className="w-full h-[250px]" />
            ) : summary?.platforms && summary.platforms.length > 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.platforms}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="revenue"
                        nameKey="platform"
                      >
                        {summary.platforms.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PLATFORM_COLORS[entry.platform]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => [formatINR(value), "Revenue"]}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full mt-4 space-y-2">
                  {summary.platforms.map((platform) => (
                    <div key={platform.platform} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLATFORM_COLORS[platform.platform] }} />
                        <span className="capitalize font-medium">{platform.platform}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">{platform.orders} orders</span>
                        <span className="font-medium">{formatINR(platform.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top SKUs</CardTitle>
            <CardDescription>Best performing products by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSkus ? (
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : topSkus && topSkus.length > 0 ? (
              <div className="space-y-4">
                {topSkus.map((sku) => (
                  <div key={`${sku.platform}-${sku.sku}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium truncate">{sku.productName}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{sku.sku}</span>
                          <span>•</span>
                          <span className="capitalize" style={{ color: PLATFORM_COLORS[sku.platform] }}>{sku.platform}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 pl-4">
                      <span className="text-sm font-medium">{formatINR(sku.revenue)}</span>
                      <span className="text-xs text-muted-foreground">{sku.units} units</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">No top SKUs found</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest orders across all platforms</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div 
                        className="h-2 w-2 rounded-full shrink-0" 
                        style={{ backgroundColor: PLATFORM_COLORS[order.platform] }} 
                      />
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium truncate">{order.productName}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(parseISO(order.orderDate), "MMM d, h:mm a")}</span>
                          <span>•</span>
                          <span className="truncate">Qty: {order.quantity}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium shrink-0 pl-4">
                      {formatINR(order.price * order.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">No recent orders</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const PLATFORM_LABEL: Record<PaymentPlatform, string> = {
  meesho: "Meesho",
  flipkart: "Flipkart",
  amazon: "Amazon",
};

const PLATFORM_ACCENT: Record<PaymentPlatform, string> = {
  meesho: "border-[#e83e8c]/40 bg-[#e83e8c]/5",
  flipkart: "border-[#007bff]/40 bg-[#007bff]/5",
  amazon: "border-[#fd7e14]/40 bg-[#fd7e14]/5",
};

const PLATFORM_TITLE_COLOR: Record<PaymentPlatform, string> = {
  meesho: "text-[#e83e8c]",
  flipkart: "text-[#007bff]",
  amazon: "text-[#fd7e14]",
};

function buildSummaryCards(data: PlatformPaymentSummary) {
  const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
  return [
    {
      label: "Total Orders",
      value: (data.totalOrders ?? 0).toLocaleString("en-IN"),
      sub: "All orders combined",
      cls: "border-slate-500/30 bg-slate-500/5",
      valCls: "text-slate-700",
    },
    {
      label: "Total Payment Success",
      value: INR.format(data.successAmount),
      sub: `${data.successCount} order${data.successCount === 1 ? "" : "s"} settled`,
      cls: "border-emerald-500/30 bg-emerald-500/5",
      valCls: "text-emerald-700",
    },
    {
      label: "Total Payment Pending",
      value: INR.format(data.pendingAmount),
      sub: `${data.pendingCount} order${data.pendingCount === 1 ? "" : "s"} awaiting`,
      cls: "border-amber-500/30 bg-amber-500/5",
      valCls: "text-amber-700",
    },
    {
      label: "Settlement",
      value: INR.format(data.successAmount + data.pendingAmount),
      sub: "Success + Pending combined",
      cls: "border-indigo-500/30 bg-indigo-500/5",
      valCls: "text-indigo-700",
    },
    {
      label: "RTO Product Amount",
      value: INR.format(data.rtoAmount),
      sub: `${data.rtoCount} order${data.rtoCount === 1 ? "" : "s"} to origin`,
      cls: "border-rose-500/30 bg-rose-500/5",
      valCls: "text-rose-700",
    },
    {
      label: "Return Product Amount",
      value: INR.format(data.returnAmount),
      sub: `${data.returnCount} customer return${data.returnCount === 1 ? "" : "s"}`,
      cls: "border-orange-500/30 bg-orange-500/5",
      valCls: "text-orange-700",
    },
    {
      label: "Return Charge",
      value: INR.format(data.returnSettlement),
      sub: `${data.returnCount} return order${data.returnCount === 1 ? "" : "s"} deducted`,
      cls: data.returnSettlement < 0 ? "border-rose-500/30 bg-rose-500/5" : "",
      valCls: data.returnSettlement < 0 ? "text-rose-700" : "",
    },
    {
      label: "Comp / Claims / Recovery",
      value: INR.format(data.compensation + data.claims + data.recovery),
      sub: "Comp · Claims · Recovery",
      cls: "",
      valCls: "",
    },
  ];
}

function AllPlatformSummaryRow({ data }: { data: PlatformPaymentSummary }) {
  const cards = buildSummaryCards({ ...data, totalOrders: data.totalOrders ?? 0 });
  return (
    <div className="space-y-2">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-violet-500/40 bg-violet-500/5 text-violet-700">
        All Platforms
      </div>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
        {cards.map((c) => (
          <Card key={c.label} className={c.cls}>
            <CardHeader className="pb-1 space-y-0.5 px-3 pt-3">
              <CardDescription className="text-[11px] leading-tight">{c.label}</CardDescription>
              <CardTitle className={`text-sm font-semibold tabular-nums truncate ${c.valCls}`}>{c.value}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 text-[11px] text-muted-foreground truncate">{c.sub}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PlatformSummaryRow({ platform, data }: { platform: PaymentPlatform; data: PlatformPaymentSummary }) {
  const cards = buildSummaryCards(data);

  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${PLATFORM_ACCENT[platform]} ${PLATFORM_TITLE_COLOR[platform]}`}>
        {PLATFORM_LABEL[platform]}
      </div>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
        {cards.map((c) => (
          <Card key={c.label} className={c.cls}>
            <CardHeader className="pb-1 space-y-0.5 px-3 pt-3">
              <CardDescription className="text-[11px] leading-tight">{c.label}</CardDescription>
              <CardTitle className={`text-sm font-semibold tabular-nums truncate ${c.valCls}`}>{c.value}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 text-[11px] text-muted-foreground truncate">{c.sub}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}