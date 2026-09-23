/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Trash2, Plus, RefreshCw, Loader2, Printer } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
} from "@/components/ui/alert-dialog"
import { deleteHandoverAction } from "@/app/actions/handover"
import { PrintableHandover } from "@/components/ui/printable-handover"

export function HandoverClient({ toolingData, outsoleData, readOnly = false }: { toolingData: any[], outsoleData: any[], readOnly?: boolean }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [printHandover, setPrintHandover] = useState<any | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (printHandover) {
      const timer = setTimeout(() => {
        window.print()
        setTimeout(() => setPrintHandover(null), 500)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [printHandover])

  const canDelete = !readOnly && session?.user?.role === "SUPER_ADMIN"

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation if wrapped in link
    setDeleteConfirmId(id)
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return

    setIsDeleting(deleteConfirmId)
    const currentId = deleteConfirmId
    setDeleteConfirmId(null)
    
    try {
      const res = await deleteHandoverAction(currentId)
      if (res.success) {
        toast.success("Berhasil", { description: res.message })
        router.refresh()
      } else {
        toast.error("Gagal", { description: res.message })
      }
    } catch (error) {
      toast.error("Error", { description: "Terjadi kesalahan sistem" })
    } finally {
      setIsDeleting(null)
    }
  }

  // Filter Data
  const filterData = (data: any[]) => {
    return data.filter((h) => {
      const search = searchTerm.toLowerCase()
      return (
        h.id.toLowerCase().includes(search) ||
        h.giver.toLowerCase().includes(search) ||
        h.recipient.toLowerCase().includes(search) ||
        h.codeLast?.toLowerCase().includes(search)
      )
    })
  }

  const filteredTooling = filterData(toolingData)
  const filteredOutsole = filterData(outsoleData)

  return (
    <>
    <Card className="border-none shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <Tabs defaultValue="outsole" className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <TabsTrigger value="outsole" className="rounded-lg px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                Outsole Handover
              </TabsTrigger>
              <TabsTrigger value="tooling" className="rounded-lg px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                Tooling Handover
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Input
                placeholder="Cari ID, Pemberi, Penerima..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-[300px] bg-white dark:bg-slate-800 border-slate-200"
              />
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => {
                    router.refresh()
                    toast.success("Tabel diperbarui")
                  }}
                  className="bg-white dark:bg-slate-800"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                {!readOnly && (<Link href="/handover/new">
                  <Button className="w-full sm:w-auto gap-2 bg-slate-900 hover:bg-slate-800 text-white">
                    <Plus className="w-4 h-4" />
                    Buat Handover Baru
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <TabsContent value="tooling" className="mt-0">
            <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50">
                    <TableHead className="font-semibold text-slate-700">Handover ID</TableHead>
                    <TableHead className="font-semibold text-slate-700">Date/Time</TableHead>
                    <TableHead className="font-semibold text-slate-700">Pemberi</TableHead>
                    <TableHead className="font-semibold text-slate-700">Penerima</TableHead>
                    <TableHead className="font-semibold text-slate-700">Code Last</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Total Items</TableHead>
                    <TableHead className="font-semibold text-slate-700">Remark</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTooling.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                        Belum ada data Handover Tooling
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTooling.map((h) => (
                      <TableRow key={h.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableCell className="font-mono font-medium text-slate-900 dark:text-slate-100">{h.id}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {format(new Date(h.date), "dd MMM yyyy, HH:mm 'WIB'")}
                        </TableCell>
                        <TableCell>{h.giver}</TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">{h.recipient}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {h.codeLast}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-sm mb-1">
                              {h.items.length} Alat
                            </span>
                            <div className="text-[10px] text-slate-500 text-center">
                              {h.items.map((i: any) => (
                                <div key={i.id}>• {i.qty} {i.satuan} {i.toolName} ({i.type}) - Sz: {i.size}</div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm max-w-[200px] truncate" title={h.items[0]?.remark || "-"}>
                          {h.items[0]?.remark || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.preventDefault(); setPrintHandover(h); }}
                                className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                title="Cetak Bukti"
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => confirmDelete(h.id, e)}
                                disabled={isDeleting === h.id}
                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                {isDeleting === h.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="outsole" className="mt-0">
            <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50">
                    <TableHead className="font-semibold text-slate-700">Handover ID</TableHead>
                    <TableHead className="font-semibold text-slate-700">Date/Time</TableHead>
                    <TableHead className="font-semibold text-slate-700">Pemberi</TableHead>
                    <TableHead className="font-semibold text-slate-700">Penerima</TableHead>
                    <TableHead className="font-semibold text-slate-700">Detail Items</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOutsole.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                        Belum ada data Handover Outsole
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOutsole.map((h) => (
                      <TableRow key={h.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableCell className="font-mono font-medium text-slate-900 dark:text-slate-100">{h.id}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {format(new Date(h.date), "dd MMM yyyy, HH:mm 'WIB'")}
                        </TableCell>
                        <TableCell>{h.giver}</TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">{h.recipient}</TableCell>
                        <TableCell>
                          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                            {h.items.map((i: any, idx: number) => (
                              <div key={i.id} className="flex gap-2">
                                <span>{idx + 1}.</span>
                                <div>
                                  <div className="font-medium text-slate-800 dark:text-slate-200">
                                    {i.qty} {i.satuan} - {i.type.split(' | ')[0]}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {i.type.includes('| Gender:') ? i.type.split(' | ')[1] : ''} | {i.size}
                                    {i.remark ? ` | Note: ${i.remark}` : ''}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top">
                          <div className="flex justify-end items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.preventDefault(); setPrintHandover(h); }}
                                className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                title="Cetak Bukti"
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => confirmDelete(h.id, e)}
                                disabled={isDeleting === h.id}
                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                {isDeleting === h.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

      
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-none rounded-2xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              Yakin ingin menghapus catatan handover ini? Stok tidak akan dikembalikan otomatis. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">Ya, Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {printHandover && mounted && createPortal(
        <div className="print-container hidden print:flex flex-col items-center justify-start w-full absolute top-0 left-0 bg-white z-[9999]">
          <PrintableHandover handover={printHandover} />
        </div>,
        document.body
      )}
    </>
  )
}