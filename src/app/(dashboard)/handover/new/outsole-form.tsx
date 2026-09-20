"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, Send, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSession } from "next-auth/react"
import { submitOutsoleHandoverAction } from "@/app/actions/handover"

type OutsoleItem = {
  model: string
  article: string
  color: string
  size: string
  gender: string
  stage: string
  qtyHandover: number
  remark: string
}

type FormValues = {
  date: string
  recipient: string
  giver: string
  items: OutsoleItem[]
}

const GENDER_OPTIONS = ["Men", "Women", "Unisex", "Kids", "Infant"]
const STAGE_OPTIONS = ["MST", "Estreme", "FSR", "SS", "Duplicate", "Other"]

export function OutsoleHandoverForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      recipient: "",
      giver: "",
      items: [{ model: "", article: "", color: "", size: "", gender: "Men", stage: "MST", qtyHandover: 0, remark: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "items" })
  const globalGiver = watch("giver")

  useEffect(() => {
    if (session?.user && !globalGiver) {
      setValue("giver", session.user.name || session.user.email || "SYSTEM")
    }
  }, [session, globalGiver, setValue])

  const onSubmit = async (data: FormValues) => {
    if (data.items.length === 0) {
      toast.error("Validasi Gagal", { description: "Pilih minimal 1 outsole untuk di-handover." })
      return
    }

    let hasError = false
    data.items.forEach((item, idx) => {
      if (!item.model || !item.article) {
        toast.error("Validasi Gagal", { description: `Baris ${idx + 1}: Model dan Article wajib diisi.` })
        hasError = true
      }
      if (item.qtyHandover <= 0) {
        toast.error("Validasi Gagal", { description: `Baris ${idx + 1}: Qty handover harus lebih dari 0.` })
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
          <CardDescription>Isi detail serah terima barang jadi (setelah stockfit).</CardDescription>
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
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Daftar Outsole
          </CardTitle>
          <CardDescription>Input data komponen yang akan diserahkan secara manual.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                  <TableHead className="w-[40px] text-center font-semibold text-slate-600 dark:text-slate-400">#</TableHead>
                  <TableHead className="min-w-[140px] font-semibold text-slate-600 dark:text-slate-400">Model</TableHead>
                  <TableHead className="min-w-[140px] font-semibold text-slate-600 dark:text-slate-400">Article</TableHead>
                  <TableHead className="min-w-[100px] font-semibold text-slate-600 dark:text-slate-400">Color</TableHead>
                  <TableHead className="min-w-[80px] font-semibold text-slate-600 dark:text-slate-400">Size</TableHead>
                  <TableHead className="min-w-[100px] font-semibold text-slate-600 dark:text-slate-400">Gender</TableHead>
                  <TableHead className="min-w-[120px] font-semibold text-slate-600 dark:text-slate-400">Stage</TableHead>
                  <TableHead className="min-w-[80px] font-semibold text-slate-600 dark:text-slate-400 text-center">Qty</TableHead>
                  <TableHead className="min-w-[140px] font-semibold text-slate-600 dark:text-slate-400">Remark</TableHead>
                  <TableHead className="w-[50px] font-semibold text-slate-600 dark:text-slate-400 text-center">Hapus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id} className="group">
                    <TableCell className="text-center text-sm text-slate-400 font-mono">{index + 1}</TableCell>
                    <TableCell>
                      <Input placeholder="Model..." {...register(`items.${index}.model` as const)} className="h-9" />
                    </TableCell>
                    <TableCell>
                      <Input placeholder="Article..." {...register(`items.${index}.article` as const)} className="h-9" />
                    </TableCell>
                    <TableCell>
                      <Input placeholder="Color..." {...register(`items.${index}.color` as const)} className="h-9" />
                    </TableCell>
<TableCell>
                      <Input placeholder="Size..." {...register(`items.${index}.size` as const)} className="h-9" />
                    </TableCell>
                    <TableCell>
                      <select
                        {...register(`items.${index}.gender` as const)}
                        className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      >
                        {GENDER_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <select
                        {...register(`items.${index}.stage` as const)}
                        className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      >
                        {STAGE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Controller
                        control={control}
                        name={`items.${index}.qtyHandover`}
                        render={({ field: f }) => (
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={f.value === 0 ? "" : f.value}
                            onChange={(e) => f.onChange(parseInt(e.target.value, 10) || 0)}
                            className="h-9 text-center font-semibold bg-white dark:bg-gray-800"
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Input placeholder="Catatan..." {...register(`items.${index}.remark` as const)} className="h-9" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="text-slate-400 hover:text-red-600 disabled:opacity-30" disabled={fields.length === 1}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ model: "", article: "", color: "", size: "", gender: "Men", stage: "MST", qtyHandover: 0, remark: "" })}
              className="w-full border-dashed border-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2 h-10"
            >
              <Plus className="w-4 h-4" />
              Tambah Item Lain
            </Button>
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
