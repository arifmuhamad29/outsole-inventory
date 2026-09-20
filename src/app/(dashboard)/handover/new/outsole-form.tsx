"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, Send, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSession } from "next-auth/react"
import { submitOutsoleHandoverAction } from "@/app/actions/handover"

const GENDER_CATEGORIES = ["Men", "Women", "Unisex", "Infant", "Kids/Jr"]

const SIZES_MATRIX: Record<string, string[]> = {
  "Men": ["5", "5T", "6", "6T", "7", "7T", "8", "8T", "9", "9T", "10", "10T", "11", "11T", "12", "12T", "13", "13T", "14", "14T", "15", "16", "17"],
  "Unisex": ["3", "3T", "4", "4T", "5", "5T", "6", "6T", "7", "7T", "8", "8T", "9", "9T", "10", "10T", "11", "11T", "12", "12T", "13", "13T", "14", "14T", "15", "15T", "16", "16T", "17", "17T", "18"],
  "Women": ["3", "3T", "4", "4T", "5", "5T", "6", "6T", "7", "7T", "8", "8T", "9", "9T", "10", "10T"],
  "Infant": ["2", "2TK", "2K", "3K", "3TK", "4K", "4TK", "5K", "5TK", "6K", "6TK", "7K", "7TK", "8K", "8TK", "9K", "9TK", "10K"],
  "Kids/Jr": ["10K", "10TK", "11K", "11TK", "12K", "12TK", "13K", "13TK", "1", "1T", "2", "2T", "3", "3T", "4", "4T", "5", "5T", "6", "6T", "7"],
}

const STAGE_OPTIONS = ["MST", "Estreme", "FSR", "SS", "Duplicate", "Other"]

type OutsoleItem = {
  model: string
  article: string
  color: string
  genderCategory: string
  stage: string
  remark: string
  sizes: Record<string, number>
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

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      recipient: "",
      giver: "",
      items: [{ model: "", article: "", color: "", genderCategory: "Men", stage: "MST", remark: "", sizes: {} }],
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
        toast.error("Validasi Gagal", { description: `Item ke-${idx + 1}: Model dan Article wajib diisi.` })
        hasError = true
      }

      const sizes = item.sizes || {}
      const totalQty = Object.values(sizes).reduce((acc, curr) => acc + (Number(curr) || 0), 0)

      if (totalQty <= 0) {
        toast.error("Validasi Gagal", { description: `Item ke-${idx + 1}: Qty keseluruhan harus lebih dari 0. Harap isi minimal 1 ukuran.` })
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

      <div className="space-y-4">
        {fields.map((field, index) => {
          const watchGender = watch(`items.${index}.genderCategory`) || "Men"
          const availableSizes = SIZES_MATRIX[watchGender] || SIZES_MATRIX["Men"]

          return (
            <Card key={field.id} className="relative border-slate-200 shadow-sm animate-in fade-in duration-300">
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                onClick={() => remove(index)} 
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                disabled={fields.length === 1}
                title="Hapus Item"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Model <span className="text-red-500">*</span></label>
                    <Input placeholder="Model..." {...register(`items.${index}.model` as const)} className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Article <span className="text-red-500">*</span></label>
                    <Input placeholder="Article..." {...register(`items.${index}.article` as const)} className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Color</label>
                    <Input placeholder="Color..." {...register(`items.${index}.color` as const)} className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Gender <span className="text-red-500">*</span></label>
                    <select
                      {...register(`items.${index}.genderCategory` as const)}
                      className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    >
                      {GENDER_CATEGORIES.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Stage <span className="text-red-500">*</span></label>
                    <select
                      {...register(`items.${index}.stage` as const)}
                      className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    >
                      {STAGE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Size Run Matrix */}
                <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight">Size Run Matrix</p>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                      {watchGender}
                    </span>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar pb-2 pt-1">
                    <div className="flex gap-2 min-w-max">
                      {availableSizes.map((sizeLabel) => (
                        <div key={sizeLabel} className="flex flex-col items-center gap-1.5 w-14">
                          <div className="h-6 px-2 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-bold w-full">
                            {sizeLabel}
                          </div>
                          <Input
                            type="number"
                            min="0"
                            placeholder="-"
                            className="h-8 text-center px-1 font-mono text-sm shadow-none focus-visible:ring-violet-500"
                            {...register(`items.${index}.sizes.${sizeLabel}` as const, {
                              setValueAs: v => v === "" ? 0 : parseInt(v, 10)
                            })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="text-xs font-semibold">Remark</label>
                  <Input placeholder="Catatan tambahan (opsional)..." {...register(`items.${index}.remark` as const)} className="h-9" />
                </div>
              </CardContent>
            </Card>
          )
        })}

        <Button
          type="button"
          variant="outline"
          onClick={() => append({ model: "", article: "", color: "", genderCategory: "Men", stage: "MST", remark: "", sizes: {} })}
          className="w-full border-dashed border-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2 h-12 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Tambah Item Lain
        </Button>
      </div>

      <div className="flex items-center justify-end pt-2 pb-6">
        <Button type="submit" disabled={isSubmitting || fields.length === 0} className="gap-2 px-8 h-10 shadow-sm bg-slate-900 hover:bg-slate-800 text-white">
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
