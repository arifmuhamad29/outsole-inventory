"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, Send, Package, AlertTriangle, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSession } from "next-auth/react"

// Action to fetch outsole
import { getOutsoleByQRCode } from "@/app/actions/inventory"
import { submitOutsoleHandoverAction } from "@/app/actions/handover"

type OutsoleItem = {
  qrCode: string
  model: string
  article: string
  color: string
  size: string
  stock: number
  qtyHandover: number
  remark: string
  outsoleId: string
}

type FormValues = {
  date: string
  recipient: string
  giver: string
  items: OutsoleItem[]
}

export function OutsoleHandoverForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scanInput, setScanInput] = useState("")
  const [isScanning, setIsScanning] = useState(false)

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      recipient: "",
      giver: "",
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "items" })
  const globalGiver = watch("giver")

  useEffect(() => {
    if (session?.user && !globalGiver) {
      setValue("giver", session.user.name || session.user.email || "SYSTEM")
    }
  }, [session, globalGiver, setValue])

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scanInput.trim()) return

    const code = scanInput.trim().toUpperCase()
    
    // Check if already added
    if (fields.some(f => f.qrCode === code)) {
      toast.error("Sudah Ditambahkan", { description: "QR Code ini sudah ada di daftar." })
      setScanInput("")
      return
    }

    setIsScanning(true)
    try {
      const outsole = await getOutsoleByQRCode(code)
      if (!outsole) {
        toast.error("Tidak Ditemukan", { description: "QR Code Outsole tidak valid atau tidak ada." })
      } else if (outsole.stock <= 0) {
        toast.error("Stok Habis", { description: `Stok untuk ${outsole.model} (${outsole.size}) sedang kosong.` })
      } else {
        append({
          qrCode: outsole.qrCode,
          model: outsole.model,
          article: outsole.article || "-",
          color: outsole.color,
          size: outsole.size,
          stock: outsole.stock,
          qtyHandover: 0,
          remark: "",
          outsoleId: outsole.id
        })
        toast.success("Berhasil ditambahkan")
      }
    } catch (error) {
      toast.error("Error", { description: "Gagal menarik data outsole." })
    } finally {
      setIsScanning(false)
      setScanInput("")
    }
  }

  const onSubmit = async (data: FormValues) => {
    if (data.items.length === 0) {
      toast.error("Validasi Gagal", { description: "Pilih minimal 1 outsole untuk di-handover." })
      return
    }

    let hasError = false
    data.items.forEach(item => {
      if (item.qtyHandover <= 0) {
        toast.error("Validasi Gagal", { description: "Quantity handover harus lebih dari 0." })
        hasError = true
      }
      if (item.qtyHandover > item.stock) {
        toast.error("Validasi Gagal", { description: `Quantity handover ${item.qrCode} melebihi stok.` })
        hasError = true
      }
    })

    if (hasError) return

    setIsSubmitting(true)
    try {
      const res = await submitOutsoleHandoverAction(data)
      if (res.success) {
        toast.success("Sukses!", { description: "Handover Outsole berhasil disimpan." })
        router.push("/handover")
      } else {
        toast.error("Gagal", { description: res.message })
        setIsSubmitting(false)
      }
    } catch (error) {
      toast.error("Error", { description: "Terjadi kesalahan saat menyimpan handover" })
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="shadow-sm">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Informasi Handover Outsole
          </CardTitle>
          <CardDescription>Isi detail penerima. Stok Outsole akan dikurangi sebagai Outbound.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tanggal</label>
              <Input type="date" {...register("date", { required: "Tanggal wajib diisi" })} className="h-10 bg-white dark:bg-gray-800" />
              {errors.date && <p className="text-xs text-red-500 font-medium">{errors.date.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Penerima / Line</label>
              <Input placeholder="e.g. LINE 3 - ASSY" {...register("recipient", { required: "Penerima wajib diisi" })} className="h-10 bg-white dark:bg-gray-800" />
              {errors.recipient && <p className="text-xs text-red-500 font-medium">{errors.recipient.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-primary" />
              Daftar Outsole
            </CardTitle>
            <CardDescription>Scan QR Code Outsole yang akan diserahkan.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Scan QR Code..." 
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleScan(e)
                }
              }}
              className="w-[200px] h-9"
            />
            <Button type="button" size="sm" onClick={handleScan} disabled={isScanning || !scanInput}>
              {isScanning ? "Scanning..." : "Tambah"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                  <TableHead className="w-[40px] text-center font-semibold text-slate-600 dark:text-slate-400">#</TableHead>
                  <TableHead className="min-w-[120px] font-semibold text-slate-600 dark:text-slate-400">QR Code</TableHead>
                  <TableHead className="min-w-[180px] font-semibold text-slate-600 dark:text-slate-400">Item (Model - Article)</TableHead>
                  <TableHead className="min-w-[80px] font-semibold text-slate-600 dark:text-slate-400">Color</TableHead>
                  <TableHead className="min-w-[60px] font-semibold text-slate-600 dark:text-slate-400">Size</TableHead>
                  <TableHead className="min-w-[80px] font-semibold text-slate-600 dark:text-slate-400 text-center">Stock</TableHead>
                  <TableHead className="min-w-[100px] font-semibold text-slate-600 dark:text-slate-400">Qty Handover</TableHead>
                  <TableHead className="min-w-[140px] font-semibold text-slate-600 dark:text-slate-400">Remark</TableHead>
                  <TableHead className="w-[50px] font-semibold text-slate-600 dark:text-slate-400 text-center">Hapus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center h-24 text-slate-500">
                      Belum ada outsole yang di-scan.
                    </TableCell>
                  </TableRow>
                ) : (
                  fields.map((field, index) => {
                    const currentItem = watch(`items.${index}`)
                    const isOverStock = currentItem.qtyHandover > currentItem.stock
                    
                    return (
                      <TableRow key={field.id} className="group">
                        <TableCell className="text-center text-sm text-slate-400 font-mono">{index + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{field.qrCode}</TableCell>
                        <TableCell className="font-medium text-sm">{field.model} - {field.article}</TableCell>
                        <TableCell className="text-sm">{field.color}</TableCell>
                        <TableCell className="text-sm">{field.size}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-slate-100 text-slate-700">{field.stock}</Badge>
                        </TableCell>
                        <TableCell>
                          <Controller
                            control={control}
                            name={`items.${index}.qtyHandover`}
                            render={({ field: f }) => (
                              <div>
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  value={f.value === 0 ? "" : f.value}
                                  onChange={(e) => f.onChange(parseInt(e.target.value, 10) || 0)}
                                  className={`h-9 text-center font-semibold bg-white dark:bg-gray-800 ${isOverStock ? "border-red-400 ring-2 ring-red-200 text-red-700" : ""}`}
                                />
                                {isOverStock && <p className="text-[10px] text-red-500 mt-1">Melebihi stok</p>}
                              </div>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Input placeholder="Catatan..." {...register(`items.${index}.remark` as const)} className="h-9" />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end pt-2 pb-6">
        <Button type="submit" disabled={isSubmitting || fields.length === 0} className="gap-2 px-8 shadow-sm">
          {isSubmitting ? (
            <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> Menyimpan...</>
          ) : (
            <><Send className="w-4 h-4" /> Simpan Handover Outsole</>
          )}
        </Button>
      </div>
    </form>
  )
}
