import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PullToRefresh } from "@/components/PullToRefresh";
import { PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SafeImage } from "@/components/ui/SafeImage";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminFetch } from "@/lib/adminFetcher";
import { useQuery } from "@tanstack/react-query";
import { Heart, Loader2, Package, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type WishlistProduct = {
  productId: string;
  wishlistCount: number;
  productName: string;
  productImage: string | null;
  productCategory: string;
  productPrice: string;
  productInStock: boolean;
  vendorName: string | null;
};

const CHART_COLORS = [
  "#f43f5e",
  "#fb7185",
  "#f9a8d4",
  "#fda4af",
  "#fecdd3",
  "#ec4899",
  "#db2777",
  "#be185d",
  "#9d174d",
  "#831843",
];

function useWishlistAnalytics() {
  return useQuery({
    queryKey: ["admin-wishlist-analytics"],
    queryFn: () => adminFetch("/wishlist-analytics"),
    refetchInterval: 60_000,
  });
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="max-w-[180px] rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-0.5 leading-snug font-bold text-gray-800">{d?.payload?.fullName}</p>
      <p className="font-semibold text-pink-600">{d?.value} saves</p>
    </div>
  );
};

export default function WishlistInsights() {
  const { data, isLoading, refetch } = useWishlistAnalytics();
  const products: WishlistProduct[] = data?.products || [];

  const topCount = products.length > 0 ? products[0].wishlistCount : 0;

  const totalWishlists = products.reduce((s, p) => s + p.wishlistCount, 0);
  const outOfStock = products.filter((p) => !p.productInStock).length;

  // Top 10 products for bar chart
  const chartData = products.slice(0, 10).map((p) => ({
    name: p.productName.length > 16 ? p.productName.slice(0, 14) + "…" : p.productName,
    fullName: p.productName,
    count: p.wishlistCount,
  }));

  return (
    <ErrorBoundary
      fallback={
        <div className="p-8 text-center text-sm text-red-500">
          Wishlist Insights page crashed. Please reload.
        </div>
      }
    >
      <PullToRefresh
        onRefresh={async () => {
          await refetch();
        }}
      >
        <div className="space-y-6">
          <PageHeader
            icon={Heart}
            title="Wishlist Insights"
            subtitle="Products ranked by customer demand — see what users want most"
            iconBgClass="bg-pink-100"
            iconColorClass="text-pink-600"
          />

          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50">
                  <Heart className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Unique Products</p>
                  <p className="text-xl font-bold">{products.length}</p>
                </div>
              </div>
            </Card>
            <Card className="rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                  <TrendingUp className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total Wishlist Saves</p>
                  <p className="text-xl font-bold">{totalWishlists.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className="rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Package className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Out of Stock</p>
                  <p className="text-xl font-bold">{outOfStock}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Bar chart — most wishlisted */}
          <Card className="overflow-hidden rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 border-b bg-gradient-to-r from-pink-50 to-rose-50 px-4 py-3">
              <Heart className="h-4 w-4 text-pink-500" />
              <span className="text-sm font-semibold text-gray-800">
                Most Wishlisted Products — Top 10
              </span>
            </div>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="flex h-56 animate-pulse items-center justify-center">
                  <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="text-muted-foreground py-16 text-center">
                  <Heart className="mx-auto mb-3 h-10 w-10 opacity-30" />
                  <p className="text-sm">No wishlist data yet</p>
                </div>
              ) : (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 0, right: 32, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#fce7f3" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={110}
                          tick={{ fontSize: 10, fill: "#374151" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#fff1f2" }} />
                        <Bar
                          dataKey="count"
                          name="Wishlist saves"
                          radius={[0, 6, 6, 0]}
                          barSize={16}
                          label={{ position: "right", fontSize: 10, fill: "#9ca3af" }}
                        >
                          {chartData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-1 text-right text-[10px] text-gray-400">
                    Showing top {chartData.length} of {products.length} wishlisted products
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Full ranked table */}
          <Card className="overflow-hidden rounded-2xl">
            <div className="flex items-center gap-2 border-b bg-gradient-to-r from-pink-50 to-rose-50 px-4 py-3">
              <TrendingUp className="h-4 w-4 text-pink-500" />
              <span className="text-sm font-semibold text-gray-800">Full Wishlist Ranking</span>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-muted-foreground py-20 text-center">
                <Heart className="mx-auto mb-3 h-10 w-10 opacity-30" />
                <p>No wishlist data yet</p>
              </div>
            ) : (
              <>
                {/* Mobile card list */}
                <section className="divide-border divide-y md:hidden" aria-label="Wishlist ranking">
                  {products.map((p, i) => {
                    const pct = topCount > 0 ? Math.round((p.wishlistCount / topCount) * 100) : 0;
                    return (
                      <div key={p.productId} className="flex items-center gap-3 p-3">
                        <span className="text-muted-foreground w-6 shrink-0 text-center text-sm font-bold">
                          {i + 1}
                        </span>
                        {p.productImage ? (
                          <SafeImage
                            src={p.productImage}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                            <Package className="text-muted-foreground h-5 w-5" aria-hidden="true" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{p.productName}</p>
                          <div className="text-muted-foreground flex items-center gap-2 text-xs">
                            <Badge variant="secondary" className="text-[10px]">
                              {p.productCategory}
                            </Badge>
                            <span>{p.vendorName || "—"}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
                              <div
                                className="h-full rounded-full bg-pink-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-pink-600">
                              {p.wishlistCount}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-xs font-semibold">
                            Rs {Number(p.productPrice).toLocaleString()}
                          </p>
                          <Badge
                            variant="outline"
                            className={`mt-0.5 text-[10px] ${p.productInStock ? "border-green-200 bg-green-50 text-green-600" : "border-red-200 bg-red-50 text-red-600"}`}
                          >
                            {p.productInStock ? "In Stock" : "Out"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </section>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-center">Stock</TableHead>
                        <TableHead className="text-center">Wishlist Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p, i) => {
                        const pct =
                          topCount > 0 ? Math.round((p.wishlistCount / topCount) * 100) : 0;
                        return (
                          <TableRow key={p.productId} className="hover:bg-muted/30">
                            <TableCell className="text-muted-foreground font-bold">
                              {i + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {p.productImage ? (
                                  <SafeImage
                                    src={p.productImage}
                                    alt=""
                                    className="h-10 w-10 rounded-lg border object-cover"
                                  />
                                ) : (
                                  <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                                    <Package
                                      className="text-muted-foreground h-5 w-5"
                                      aria-hidden="true"
                                    />
                                  </div>
                                )}
                                <span className="text-sm font-semibold">{p.productName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {p.productCategory}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-muted-foreground text-sm">
                                {p.vendorName || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              Rs {Number(p.productPrice).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={
                                  p.productInStock
                                    ? "border-green-200 bg-green-50 text-green-600"
                                    : "border-red-200 bg-red-50 text-red-600"
                                }
                              >
                                {p.productInStock ? "In Stock" : "Out"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="bg-muted h-2 w-16 overflow-hidden rounded-full">
                                  <div
                                    className="h-full rounded-full bg-pink-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-pink-600">
                                  {p.wishlistCount}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </Card>
        </div>
      </PullToRefresh>
    </ErrorBoundary>
  );
}
