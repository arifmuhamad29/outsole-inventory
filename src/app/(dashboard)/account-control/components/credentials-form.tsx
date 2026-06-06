"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateUserCredentialsAction } from "@/app/actions/users"

type FormData = {
  username: string
  password?: string
}

interface CredentialsFormProps {
  userId: string
  currentUsername: string
  onSuccess: () => void
  onCancel: () => void
}

export function CredentialsForm({ userId, currentUsername, onSuccess, onCancel }: CredentialsFormProps) {
  const [isPending, setIsPending] = useState(false)
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      username: currentUsername,
      password: ""
    }
  })

  const onSubmit = async (data: FormData) => {
    setIsPending(true)
    try {
      // Only send password if it's not empty
      const payloadPassword = data.password && data.password.trim() !== "" ? data.password : undefined
      const payloadUsername = data.username !== currentUsername ? data.username : undefined

      if (!payloadPassword && !payloadUsername) {
        toast.info("Tidak ada perubahan yang dilakukan")
        onCancel()
        return
      }

      const res = await updateUserCredentialsAction(userId, payloadUsername, payloadPassword)
      
      if (res.success) {
        toast.success(res.message)
        onSuccess()
      } else {
        toast.error(res.message)
      }
    } catch (error) {
      toast.error("Terjadi kesalahan yang tidak terduga")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">Username Baru</label>
        <Input 
          {...register("username", { 
            required: "Username wajib diisi",
            minLength: { value: 3, message: "Minimal 3 karakter" }
          })} 
          placeholder="username" 
        />
        {errors.username && <p className="text-xs text-red-500">{errors.username.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">Password Baru (Opsional)</label>
        <Input 
          type="password"
          {...register("password", { 
            minLength: { value: 6, message: "Minimal 6 karakter" }
          })} 
          placeholder="Kosongkan jika tidak ingin mengubah sandi" 
        />
        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
        <p className="text-xs text-slate-500">
          Jika dikosongkan, password lama akan tetap digunakan.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Batal
        </Button>
        <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
          {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Simpan Perubahan
        </Button>
      </div>
    </form>
  )
}
