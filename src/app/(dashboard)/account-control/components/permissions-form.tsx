"use client"

import { useForm, Controller } from "react-hook-form"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { PERMISSIONS } from "@/lib/permissions"
import { Loader2 } from "lucide-react"
import { updateUserPermissionsAction } from "@/app/actions/users"
import { toast } from "sonner"

type PermissionsFormProps = {
  userId: string;
  initialPermissions: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function PermissionsForm({ userId, initialPermissions, onSuccess, onCancel }: PermissionsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<{ permissions: string[] }>({
    defaultValues: {
      permissions: initialPermissions || [],
    }
  })

  const onSubmit = async (data: { permissions: string[] }) => {
    setIsSubmitting(true)
    try {
      const res = await updateUserPermissionsAction(userId, data.permissions)
      if (res.success) {
        toast.success("Berhasil", { description: res.message })
        onSuccess()
      } else {
        toast.error("Gagal", { description: res.message })
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-2 mt-2 max-h-[300px] overflow-y-auto pr-2">
          {PERMISSIONS.map((permission) => (
            <Controller
              key={permission.id}
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <label className="flex items-start space-x-3 cursor-pointer p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                  <div className="mt-0.5">
                    <Checkbox
                      checked={field.value.includes(permission.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          field.onChange([...field.value, permission.id])
                        } else {
                          field.onChange(field.value.filter((val) => val !== permission.id))
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">{permission.label}</span>
                    <span className="text-xs text-slate-500">{permission.id}</span>
                  </div>
                </label>
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : "Simpan Hak Akses"}
        </Button>
      </div>
    </form>
  )
}
