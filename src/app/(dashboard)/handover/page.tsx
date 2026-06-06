"use client"

import Link from "next/link"
import { format } from "date-fns"
import { Send, Plus, Trash2, RefreshCw } from "lucide-react"
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

type HandoverList = {
  id: string
  date: Date | string
  giver: string
  recipient: string
  codeLast: string | null
  modelName: string | null
  items: { toolName: string; qty: number }[]
}

export default function HandoverPage() {
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

  const handleDelete = async (id: string) => {
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
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Date</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Pemberi</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Penerima</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Code Last</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Total Items</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    Tidak ditemukan data handover {search && `"${search}"`}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ho) => (
                  <TableRow key={ho.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <TableCell className="font-mono font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {ho.id.split('-')[0]}-{ho.id.slice(-6)} {/* Shorten CUID */}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">
                      {format(new Date(ho.date), "dd MMM yyyy")}
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
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold text-sm">
                        {ho.items?.length || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              disabled={isDeleting === ho.id}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                            >
                              {isDeleting === ho.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Konfirmasi Hapus Data</AlertDialogTitle>
                              <AlertDialogDescription>
                                Apakah Anda yakin ingin menghapus data handover ini? Tindakan ini tidak dapat dibatalkan dan stok akan dikembalikan otomatis ke inventaris.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(ho.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Ya, Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
