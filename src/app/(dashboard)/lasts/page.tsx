"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { getShoeLasts, saveShoeLast, deleteShoeLast } from "@/app/actions/last";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Loader2, Package, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// ── SIZE CONSTANTS ──────────────────────────────────────────
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

function buildEmptySizes(): Record<string, number> {
  const obj: Record<string, number> = {};
  ALL_SIZES.forEach((s) => (obj[s] = 0));
  return obj;
}

function totalStock(sizes: Record<string, number>): number {
  return Object.values(sizes).reduce((sum, v) => sum + (v || 0), 0);
}

function activeSizeSummary(sizes: Record<string, number>): string {
  const active = Object.entries(sizes)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}(${v})`);
  if (active.length === 0) return "—";
  if (active.length <= 6) return active.join(", ");
  return active.slice(0, 6).join(", ") + ` +${active.length - 6} more`;
}

// ── TYPES ───────────────────────────────────────────────────
interface ShoeLastRow {
  id: string;
  code: string;
  models: string;
  sizes: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

interface FormData {
  id?: string;
  code: string;
  models: string;
  sizes: Record<string, number>;
}

// ── SIZE GRID COMPONENT ─────────────────────────────────────
function SizeGrid({
  label,
  sizes,
  sizeList,
  onChange,
}: {
  label: string;
  sizes: Record<string, number>;
  sizeList: string[];
  onChange: (size: string, qty: number) => void;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">
          {label}
        </Badge>
        <span className="text-xs text-muted-foreground font-normal">
          {sizeList.length} sizes
        </span>
      </h4>
      <div className="grid grid-cols-7 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-14 gap-1.5">
        {sizeList.map((size) => {
          const val = sizes[size] || 0;
          const hasStock = val > 0;
          return (
            <div
              key={size}
              className={`flex flex-col items-center rounded-md border p-1 transition-colors ${
                hasStock
                  ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-900/20"
                  : "border-border/50 bg-muted/30"
              }`}
            >
              <span className="text-[10px] font-semibold text-muted-foreground leading-none mb-0.5">
                {size}
              </span>
              <Input
                type="number"
                min="0"
                className="h-7 w-full px-0.5 text-center text-xs font-mono border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-primary/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={val === 0 ? "" : val}
                placeholder="0"
                onChange={(e) => {
                  const num = parseInt(e.target.value) || 0;
                  onChange(size, Math.max(0, num));
                }}
                onFocus={(e) => e.target.select()}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN PAGE ───────────────────────────────────────────────
export default function ShoeLastPage() {
  const [data, setData] = useState<ShoeLastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShoeLastRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState<FormData>({
    code: "",
    models: "",
    sizes: buildEmptySizes(),
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getShoeLasts();
      setData(
        result.map((r: any) => ({
          ...r,
          sizes: (r.sizes as Record<string, number>) || {},
        }))
      );
    } catch {
      toast.error("Gagal memuat data Shoe Last");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── FILTER ─────────────────────────────────────────────────
  const filtered = data.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      row.code.toLowerCase().includes(q) ||
      row.models.toLowerCase().includes(q)
    );
  });

  // ── FORM HELPERS ───────────────────────────────────────────
  const openNew = () => {
    setFormData({ code: "", models: "", sizes: buildEmptySizes() });
    setDialogOpen(true);
  };

  const openEdit = (row: ShoeLastRow) => {
    // Merge existing sizes into a full matrix so missing keys default to 0
    const merged = buildEmptySizes();
    Object.entries(row.sizes).forEach(([k, v]) => {
      if (k in merged) merged[k] = v;
    });
    setFormData({ id: row.id, code: row.code, models: row.models, sizes: merged });
    setDialogOpen(true);
  };

  const handleSizeChange = (size: string, qty: number) => {
    setFormData((prev) => ({
      ...prev,
      sizes: { ...prev.sizes, [size]: qty },
    }));
  };

  const handleSave = () => {
    if (!formData.code.trim()) {
      toast.error("Code wajib diisi");
      return;
    }
    if (!formData.models.trim()) {
      toast.error("Models wajib diisi");
      return;
    }

    // Strip zeros to keep DB lean
    const cleanSizes: Record<string, number> = {};
    Object.entries(formData.sizes).forEach(([k, v]) => {
      if (v > 0) cleanSizes[k] = v;
    });

    startTransition(async () => {
      try {
        await saveShoeLast({
          id: formData.id,
          code: formData.code.trim(),
          models: formData.models.trim(),
          sizes: cleanSizes,
        });
        toast.success(formData.id ? "Shoe Last berhasil diupdate" : "Shoe Last berhasil ditambahkan");
        setDialogOpen(false);
        fetchData();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal menyimpan";
        if (msg.includes("Unique constraint")) {
          toast.error("Code sudah terdaftar, gunakan code lain");
        } else {
          toast.error(msg);
        }
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteShoeLast(deleteTarget.id);
        toast.success(`Shoe Last "${deleteTarget.code}" berhasil dihapus`);
        setDeleteTarget(null);
        fetchData();
      } catch {
        toast.error("Gagal menghapus");
      }
    });
  };

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shoe Last Inventory</h1>
            <p className="text-sm text-muted-foreground">
              {data.length} Shoe Last{data.length !== 1 ? "s" : ""} registered
            </p>
          </div>
        </div>

        <Button onClick={openNew} className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> New Shoe Last
        </Button>
      </div>

      {/* Search */}
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

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[50px] text-center font-semibold">#</TableHead>
                <TableHead className="min-w-[120px] font-semibold">Code</TableHead>
                <TableHead className="min-w-[220px] font-semibold">Models</TableHead>
                <TableHead className="min-w-[280px] font-semibold">Active Sizes</TableHead>
                <TableHead className="min-w-[90px] text-center font-semibold">Total Stock</TableHead>
                <TableHead className="w-[100px] text-center font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading data...</p>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    {search ? "No results found" : "No shoe lasts registered yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row, idx) => {
                  const total = totalStock(row.sizes);
                  return (
                    <TableRow key={row.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center text-muted-foreground text-xs">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-sm text-foreground">{row.code}</span>
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
                        <span className="text-xs text-muted-foreground font-mono">
                          {activeSizeSummary(row.sizes)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`font-bold text-xs ${total > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
                          {total}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(row)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ─ ADD / EDIT DIALOG ─ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {formData.id ? "Edit Shoe Last" : "Add Shoe Last"}
            </DialogTitle>
            <DialogDescription>
              {formData.id
                ? "Update code, models, and size quantities."
                : "Enter code, associated models, and set quantities per size."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-4">
            {/* Code & Models */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="last-code" className="text-xs font-semibold">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last-code"
                  placeholder="e.g. 41TUR"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, code: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last-models" className="text-xs font-semibold">
                  Models <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last-models"
                  placeholder="e.g. ADVANTAGE, GRANDCOURT"
                  value={formData.models}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, models: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Size summary */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
              <span className="text-xs text-muted-foreground">
                Active sizes: <strong className="text-foreground">{Object.values(formData.sizes).filter((v) => v > 0).length}</strong>
              </span>
              <span className="text-xs text-muted-foreground">|</span>
              <span className="text-xs text-muted-foreground">
                Total stock: <strong className="text-foreground">{totalStock(formData.sizes)}</strong>
              </span>
            </div>

            {/* Size Matrix */}
            <SizeGrid label="Infant & Kids" sizes={formData.sizes} sizeList={INFANT_KIDS_SIZES} onChange={handleSizeChange} />

            <div className="border-t border-border/50" />

            <SizeGrid label="Adult" sizes={formData.sizes} sizeList={ADULT_SIZES} onChange={handleSizeChange} />
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending} className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {formData.id ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─ DELETE CONFIRM ─ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Hapus Shoe Last?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Shoe Last <strong>&quot;{deleteTarget?.code}&quot;</strong> akan dihapus secara permanen.
              Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
