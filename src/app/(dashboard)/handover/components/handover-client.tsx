/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Trash2, Plus, RefreshCw, Loader2, Printer, Search } from "lucide-react"
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

// Component for stabilo kuning text highlighting
function HighlightText({ text, query }: { text: string | number | null | undefined; query: string }) {
  if (text === null || text === undefined || text === "") return null
  const str = String(text)
  const trimmed = query.trim()
  if (!trimmed) return <>{str}</>

  const escapedQuery = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`(${escapedQuery})`, "gi")
  const parts = str.split(regex)

  if (parts.length === 1) return <>{str}</>

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={index}
            className="bg-yellow-300 text-slate-950 dark:bg-yellow-400 dark:text-slate-950 px-0.5 py-0.2 rounded-xs font-bold shadow-2xs"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

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
    } catch {
      toast.error("Error", { description: "Terjadi kesalahan sistem" })
    } finally {
      setIsDeleting(null)
    }
  }

  // Filter Data with Article & Item Search support
  const filterData = (data: any[]) => {
    if (!searchTerm.trim()) return data
    const search = searchTerm.toLowerCase().trim()
    return data.filter((h) => {
      const matchId = h.id?.toLowerCase().includes(search)
      const matchGiver = h.giver?.toLowerCase().includes(search)
      const matchRecipient = h.recipient?.toLowerCase().includes(search)
      const matchCodeLast = h.codeLast?.toLowerCase().includes(search)
      const matchModel = h.modelName?.toLowerCase().includes(search)

      // Search in handover items (Article, Model, Tool Name, Size, Stage, Remark)
      const matchItems = h.items?.some((i: any) => {
        const matchType = i.type?.toLowerCase().includes(search) // Contains article & model & color
        const matchTool = i.toolName?.toLowerCase().includes(search)
        const matchSize = i.size?.toLowerCase().includes(search) // Contains size & stage
        const matchRemark = i.remark?.toLowerCase().includes(search)
        return matchType || matchTool || matchSize || matchRemark
      })

      return matchId || matchGiver || matchRecipient || matchCodeLast || matchModel || matchItems
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
              <TabsTrigger
                value="outsole"
                className="rounded-lg px-5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm flex items-center gap-2"
              >
                <span>Outsole Handover</span>
                <span className="text-[11px] py-0.5 px-2 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-semibold">
                  {filteredOutsole.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="tooling"
                className="rounded-lg px-5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm flex items-center gap-2"
              >
                <span>Tooling Handover</span>
                <span className="text-[11px] py-0.5 px-2 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-semibold">
                  {filteredTooling.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Cari artikel, model, ID, penerima..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-8 bg-white dark:bg-slate-800 border-slate-200 text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold p-1"
                    title="Hapus pencarian"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => {
                    router.refresh()
                    toast.success("Tabel diperbarui")
                  }}
                  className="bg-white dark:bg-slate-800"
                  title="Perbarui data"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                {!readOnly && (
                  <Link href="/handover/new">
                    <Button className="w-full sm:w-auto gap-2 bg-slate-900 hover:bg-slate-800 text-white">
                      <Plus className="w-4 h-4" />
                      Buat Handover Baru
                    </Button>
                  </Link>
                )}
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
                    <TableHead className="font-semibold text-slate-700">Model</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Total Items</TableHead>
                    <TableHead className="font-semibold text-slate-700">Remark</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTooling.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                        {searchTerm ? (
                          <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                            <p className="font-medium text-slate-700 dark:text-slate-300">
                              Tidak ada Handover Tooling yang cocok dengan &quot;{searchTerm}&quot;
                            </p>
                            <p className="text-xs text-slate-400">
                              Coba periksa kata kunci artikel, model, ID, atau nama lainnya.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSearchTerm("")}
                              className="mt-1 text-xs"
                            >
                              Reset Pencarian
                            </Button>
                          </div>
                        ) : (
                          "Belum ada data Handover Tooling"
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTooling.map((h) => (
                      <TableRow key={h.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableCell className="font-mono font-medium text-slate-900 dark:text-slate-100">
                          <HighlightText text={h.id} query={searchTerm} />
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {format(new Date(h.date), "dd MMM yyyy, HH:mm 'WIB'")}
                        </TableCell>
                        <TableCell>
                          <HighlightText text={h.giver} query={searchTerm} />
                        </TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          <HighlightText text={h.recipient} query={searchTerm} />
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            <HighlightText text={h.codeLast || "-"} query={searchTerm} />
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            <HighlightText text={h.modelName || "-"} query={searchTerm} />
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-sm mb-1">
                              {h.items.length} Alat
                            </span>
                            <div className="text-[10px] text-slate-500 text-center">
                              {h.items.map((i: any) => (
                                <div key={i.id}>
                                  • {i.qty} {i.satuan} <HighlightText text={i.toolName} query={searchTerm} /> (<HighlightText text={i.type} query={searchTerm} />) - Sz: <HighlightText text={i.size} query={searchTerm} />
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm max-w-[200px] truncate" title={h.items[0]?.remark || "-"}>
                          <HighlightText text={h.items[0]?.remark || "-"} query={searchTerm} />
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
                        {searchTerm ? (
                          <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                            <p className="font-medium text-slate-700 dark:text-slate-300">
                              Tidak ada Handover Outsole yang cocok dengan &quot;{searchTerm}&quot;
                            </p>
                            <p className="text-xs text-slate-400">
                              Coba periksa kata kunci artikel, model, ID, atau nama lainnya.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSearchTerm("")}
                              className="mt-1 text-xs"
                            >
                              Reset Pencarian
                            </Button>
                          </div>
                        ) : (
                          "Belum ada data Handover Outsole"
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOutsole.map((h) => (
                      <TableRow key={h.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableCell className="font-mono font-medium text-slate-900 dark:text-slate-100">
                          <HighlightText text={h.id} query={searchTerm} />
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {format(new Date(h.date), "dd MMM yyyy, HH:mm 'WIB'")}
                        </TableCell>
                        <TableCell>
                          <HighlightText text={h.giver} query={searchTerm} />
                        </TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          <HighlightText text={h.recipient} query={searchTerm} />
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                            {h.items.map((i: any, idx: number) => {
                              // Match "${model} - ${article} (${color})"
                              const typeMatch = i.type ? i.type.match(/^(.*?) - (.*?) \((.*)\)$/) : null;
                              const model = typeMatch ? typeMatch[1] : null;
                              const article = typeMatch ? typeMatch[2] : null;
                              const color = typeMatch ? typeMatch[3] : null;

                              return (
                                <div key={i.id} className="flex gap-2 items-start py-1 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                                  <span className="text-slate-400 font-mono text-[11px] mt-0.5">{idx + 1}.</span>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {i.qty} {i.satuan}
                                      </span>
                                      {article ? (
                                        <>
                                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                                            - <HighlightText text={model} query={searchTerm} />
                                          </span>
                                          <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 font-mono font-semibold text-[11px]">
                                            Art: <HighlightText text={article} query={searchTerm} />
                                          </span>
                                          {color && (
                                            <span className="text-slate-500 text-[11px]">
                                              (<HighlightText text={color} query={searchTerm} />)
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                          - <HighlightText text={i.type.split(' | ')[0]} query={searchTerm} />
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                      {i.type.includes('| Gender:') && (
                                        <span>
                                          <HighlightText text={i.type.split(' | ')[1]} query={searchTerm} /> •
                                        </span>
                                      )}
                                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[10px] text-slate-600 dark:text-slate-300">
                                        <HighlightText text={i.size} query={searchTerm} />
                                      </span>
                                      {i.remark && (
                                        <span className="text-slate-400 italic">
                                          • Note: <HighlightText text={i.remark} query={searchTerm} />
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
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