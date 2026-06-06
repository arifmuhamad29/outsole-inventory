"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { PERMISSIONS } from "@/lib/permissions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { createUserAction } from "@/app/actions/users"
import { toast } from "sonner"

const userFormSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "OPERATOR"]),
  permissions: z.array(z.string()),
})

type UserFormProps = {
  onSuccess: () => void;
  onCancel: () => void;
}

export function UserForm({ onSuccess, onCancel }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      role: "OPERATOR",
      permissions: [],
    }
  })

  const onSubmit = async (data: z.infer<typeof userFormSchema>) => {
    setIsSubmitting(true)
    try {
      const res = await createUserAction(data)
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
      <div className="space-y-2">
        <label className="text-sm font-medium">Nama Lengkap</label>
        <Input {...form.register("name")} placeholder="Contoh: John Doe" />
        {form.formState.errors.name && <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Username</label>
        <Input {...form.register("username")} placeholder="Contoh: john.doe" />
        {form.formState.errors.username && <p className="text-xs text-red-500">{form.formState.errors.username.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Password</label>
        <Input type="password" {...form.register("password")} placeholder="Minimal 6 karakter" />
        {form.formState.errors.password && <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Role (Akses)</label>
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPERATOR">OPERATOR (Basic Access)</SelectItem>
                <SelectItem value="ADMIN">ADMIN (Managerial Access)</SelectItem>
                <SelectItem value="SUPER_ADMIN">SUPER_ADMIN (Full Control)</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.role && <p className="text-xs text-red-500">{form.formState.errors.role.message}</p>}
      </div>

      <div className="space-y-2 border-t pt-4 mt-2">
        <label className="text-sm font-medium text-indigo-700">Hak Akses Spesifik (Permissions)</label>
        <div className="grid grid-cols-1 gap-2 mt-2">
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

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t sticky bottom-0 bg-white">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : "Simpan Pengguna"}
        </Button>
      </div>
    </form>
  )
}
