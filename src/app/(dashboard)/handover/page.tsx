"use client"

import Link from "next/link"
import { format } from "date-fns"
import { Send, Plus, Trash2, RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { getHandoversAction, deleteHandoverAction } from "@/app/actions/handover"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

type HandoverList = {
  id: string
  date: Date | string
  createdAt: Date | string
  giver: string
  recipient: string
  codeLast: string | null
  modelName: string | null
  items: { toolName: string; qty: number; satuan: string; type: string | null; size: string; remark: string | null }[]
}

export default function HandoverPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"

  const [search, setSearch] = useState("")
  const [handovers, setHandovers] = useState<HandoverList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const fetchHandovers = async () => {
    setIsLoading(true)
    try {
      const data = await getHandoversAction()
      setHandovers(data)
    } catch (error) {
      console.error(error)
      toast.error("Gagal memuat data handover")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHandovers()
  }, [])

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    setIsDeleting(id)
    try {
      const res = await deleteHandoverAction(id)
      if (res.success) {
        toast.success("Berhasil", { description: res.message })
        fetchHandovers()
      } else {
        toast.error("Gagal", { description: res.message })
      }
    } catch (error) {
      console.error(error)
      toast.error("Terjadi kesalahan saat menghapus")
    } finally {
      setIsDeleting(null)
    }
  }

  const filtered = handovers.filter((h) => {
    const q = search.toLowerCase()
    return (
      h.id.toLowerCase().includes(q) ||
      h.giver.toLowerCase().includes(q) ||
      h.recipient.toLowerCase().includes(q) ||
      (h.codeLast && h.codeLast.toLowerCase().includes(q)) ||
      (h.modelName && h.modelName.toLowerCase().includes(q))
    )
  })

  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Send className="w-8 h-8" />
            Handover Tooling
          </h1>
          <p className="text-muted-foreground mt-1">
            Record outgoing tools and deduct stock for BPM, TFM, and Universal Pad.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchHandovers} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Link href="/handover/new">
            <Button className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Buat Handover Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Input
              placeholder="Cari ID, Pemberi, Penerima, atau Code Last..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 bg-white dark:bg-gray-800"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium whitespace-nowrap">
            Showing {filtered.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-slate-800/30">
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Handover ID</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Date/Time</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Pemberi</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Penerima</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Code Last/Model</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Total Items</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Remark</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                    Tidak ditemukan data handover {search && `"${search}"`}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ho) => (
                  <TableRow key={ho.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <TableCell className="font-mono font-semibold text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {ho.id}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {new Date(ho.date).toLocaleDateString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}, {new Date(ho.createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit', minute: '2-digit'
                      }).replace('.', ':')} WIB
                    </TableCell>
                    <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                      {ho.giver}
                    </TableCell>
                    <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                      {ho.recipient}
                    </TableCell>
                    <TableCell>
                      {ho.codeLast ? (
                        <Badge variant="outline" className="font-mono bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                          {ho.codeLast}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-mono text-slate-500">
                          {ho.modelName}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full text-xs whitespace-nowrap mb-1">
                          {ho.items?.length || 0} Alat
                        </span>
                        {ho.items && ho.items.length > 0 && (
                          <div className="flex flex-col space-y-1 items-start w-full">
                            {ho.items.map((item, index) => (
                              <span key={index} className="text-[10px] text-slate-600 dark:text-slate-400 text-left">
                                • {item.qty} {item.satuan} {item.toolName} {item.type && item.type !== "-" ? `(${item.type})` : ""} - Sz: {item.size}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {ho.items.filter(item => item.remark && item.remark.trim() !== "").length > 0 ? (
                        <div className="flex flex-col space-y-1 items-start w-full">
                          {ho.items
                            .filter(item => item.remark && item.remark.trim() !== "")
                            .map((item, idx) => (
                              <span key={idx} className="text-[11px] text-gray-500 dark:text-gray-400 italic truncate w-full text-left" title={item.remark || ""}>
                                - {item.remark}
                              </span>
                            ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin ? (
                          <AlertDialog>
                            <AlertDialogTrigger 
                              render={
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  disabled={isDeleting === ho.id}
                                  className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                                />
                              }
                            >
                              {isDeleting === ho.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Handover?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tindakan ini tidak dapat dibatalkan. Stok yang telah dipotong akan dikembalikan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting === ho.id}>Batal</AlertDialogCancel>
                                <Button 
                                  variant="destructive" 
                                  onClick={(e) => handleDelete(ho.id, e)}
                                  disabled={isDeleting === ho.id}
                                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                                >
                                  {isDeleting === ho.id ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Menghapus...
                                    </>
                                  ) : (
                                    "Ya, Hapus"
                                  )}
                                </Button>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <div className="w-8 h-8"></div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
