"use client";

import { useState, useEffect, useCallback } from "react";
import { getShoeLasts } from "@/app/actions/last";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Footprints, X } from "lucide-react";

const INFANT_KIDS_SIZES = [
  "2K","2.5K","3K","3.5K","4K","4.5K","5K","5.5K",
  "6K","6.5K","7K","7.5K","8K","8.5K","9K","9.5K",
  "10K","10.5K","11K","11.5K","12K","12.5K","13K","13.5K",
  "1","1.5","2","2.5",
];
const ADULT_SIZES = [
  "3","3.5","4","4.5","5","5.5","6","6.5",
  "7","7.5","8","8.5","9","9.5","10","10.5",
  "11","11.5","12","12.5","13","13.5","14","14.5",
  "15","15.5","16","16.5","17",
];
const ALL_SIZES = [...INFANT_KIDS_SIZES, ...ADULT_SIZES];

function totalStock(sizes: Record<string, number>): number {
  return Object.values(sizes).reduce((sum, v) => sum + (v || 0), 0);
}

interface ShoeLastRow {
  id: string;
  code: string;
  models: string;
  status: string;
  sizes: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export function PublicShoeLastView() {
  const [data, setData] = useState<ShoeLastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getShoeLasts();
      setData(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.map((r: any) => ({
          ...r,
          sizes: (r.sizes as Record<string, number>) || {},
        }))
      );
    } catch {
      console.error("Gagal memuat data Shoe Last");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = data.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      row.code.toLowerCase().includes(q) ||
      row.models.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/20">
            <Footprints className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shoe Last Inventory</h1>
            <p className="text-sm text-muted-foreground">
              {data.length} Shoe Last{data.length !== 1 ? "s" : ""} registered
            </p>
          </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search code, model..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="rounded-xl border border-border/50 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <TableHead className="w-[50px] text-center font-semibold text-slate-600 dark:text-slate-300">#</TableHead>
                <TableHead className="min-w-[120px] font-semibold text-slate-600 dark:text-slate-300">Code</TableHead>
                <TableHead className="min-w-[220px] font-semibold text-slate-600 dark:text-slate-300">Models</TableHead>
                <TableHead className="min-w-[280px] font-semibold text-slate-600 dark:text-slate-300">Active Sizes</TableHead>
                <TableHead className="min-w-[90px] text-center font-semibold text-slate-600 dark:text-slate-300">Total Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading data...</p>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                    {search ? "No results found" : "No shoe lasts registered yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row, idx) => {
                  const total = totalStock(row.sizes);
                  return (
                    <TableRow key={row.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell className="text-center text-muted-foreground text-xs">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-bold text-sm text-foreground">{row.code}</span>
                          <Badge variant={row.status === "NEW" ? "default" : "outline"} className={`text-[9px] px-1.5 py-0 ${row.status === "NEW" ? "bg-blue-500 hover:bg-blue-600" : ""}`}>
                            {row.status || "EXISTING"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.models.split(",").map((m, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] font-medium px-1.5 py-0">
                              {m.trim()}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 min-w-[280px]">
                          {(() => {
                            const activeSizes = Object.entries(row.sizes).filter(([, q]) => q > 0);
                            if (activeSizes.length === 0) return <span className="text-muted-foreground">—</span>;
                            
                            activeSizes.sort((a, b) => {
                              const indexA = ALL_SIZES.indexOf(a[0]);
                              const indexB = ALL_SIZES.indexOf(b[0]);
                              if (indexA === -1) return 1;
                              if (indexB === -1) return -1;
                              return indexA - indexB;
                            });

                            return activeSizes.map(([size, quantity]) => (
                              <div key={size} className="flex flex-col items-center justify-center border rounded px-1 min-w-[26px] bg-muted/30">
                                <span className="text-[9px] font-bold text-muted-foreground border-b border-slate-200 dark:border-slate-700 w-full text-center pb-[1px] leading-[14px]">
                                  {size}
                                </span>
                                <span className="text-[10px] font-medium text-foreground pt-[1px] leading-[14px]">
                                  {quantity}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`font-bold text-xs ${total > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
                          {total}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
