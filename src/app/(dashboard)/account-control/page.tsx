"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ShieldAlert, Plus, Trash2, Loader2, RefreshCw, KeyRound } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

import { UserForm } from "./components/user-form"
import { PermissionsForm } from "./components/permissions-form"
import { CredentialsForm } from "./components/credentials-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { getUsersAction, createUserAction, deleteUserAction, updateUserRoleAction } from "@/app/actions/users"
import { UserCog } from "lucide-react"

type UserItem = {
  id: string
  name: string
  username: string
  email: string | null
  role: string
  permissions: string[]
  createdAt: Date
}

export default function AccountControlPage() {
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"

  const [users, setUsers] = useState<UserItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPermissionsFor, setEditingPermissionsFor] = useState<UserItem | null>(null)
  const [editingCredentialsFor, setEditingCredentialsFor] = useState<UserItem | null>(null)

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const data = await getUsersAction()
      setUsers(data)
    } catch (error) {
      toast.error("Gagal memuat daftar pengguna")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers()
    } else {
      setIsLoading(false)
    }
  }, [isSuperAdmin])

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    setIsDeleting(id)
    try {
      const res = await deleteUserAction(id)
      if (res.success) {
        toast.success("Berhasil", { description: res.message })
        fetchUsers()
      } else {
        toast.error("Gagal", { description: res.message })
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat menghapus")
    } finally {
      setIsDeleting(null)
    }
  }

  const handleRoleChange = async (id: string, newRole: "SUPER_ADMIN" | "ADMIN" | "OPERATOR") => {
    try {
      const res = await updateUserRoleAction(id, newRole)
      if (res.success) {
        toast.success("Berhasil", { description: res.message })
        fetchUsers()
      } else {
        toast.error("Gagal", { description: res.message })
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat merubah role")
    }
  }

  if (!isLoading && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-500" />
        <h1 className="text-2xl font-bold">Unauthorized Access</h1>
        <p className="text-gray-500">Only Super Administrators can access this page.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-indigo-600" />
            Account Control
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage system users, roles, and access levels.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchUsers} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger 
              render={<Button className="gap-2 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white" />}
            >
              <Plus className="w-4 h-4" />
              Tambah Pengguna
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tambah Pengguna Baru</DialogTitle>
                <DialogDescription>
                  Buat akun baru dan tentukan hak akses (role & permissions) pengguna tersebut.
                </DialogDescription>
              </DialogHeader>
              <UserForm 
                onSuccess={() => { setIsDialogOpen(false); fetchUsers(); }} 
                onCancel={() => setIsDialogOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                    Memuat data...
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                  Belum ada pengguna yang terdaftar.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    <Select 
                      value={user.role} 
                      onValueChange={(val) => {
                        if (val) handleRoleChange(user.id, val as "SUPER_ADMIN" | "ADMIN" | "OPERATOR")
                      }}
                      disabled={user.id === session?.user?.id}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUPER_ADMIN">
                          <span className="text-indigo-600 font-bold">SUPER ADMIN</span>
                        </SelectItem>
                        <SelectItem value="ADMIN">
                          <span className="text-blue-600 font-bold">ADMIN</span>
                        </SelectItem>
                        <SelectItem value="OPERATOR">
                          <span className="text-slate-600 font-bold">OPERATOR</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.createdAt), "dd MMM yyyy, HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1">
                      {user.id !== session?.user?.id ? (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setEditingCredentialsFor(user)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600"
                            title="Edit Username & Password"
                          >
                            <UserCog className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setEditingPermissionsFor(user)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                            title="Edit Permissions"
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger 
                              render={
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  disabled={isDeleting === user.id}
                                  className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                                  title="Delete User"
                                />
                              }
                            >
                              {isDeleting === user.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Pengguna?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Apakah Anda yakin ingin menghapus <strong>{user.name}</strong> (@{user.username})? Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting === user.id}>Batal</AlertDialogCancel>
                                <Button 
                                  variant="destructive" 
                                  onClick={(e) => handleDelete(user.id, e)}
                                  disabled={isDeleting === user.id}
                                  className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                                >
                                  {isDeleting === user.id ? (
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
                        </>
                      ) : (
                        <div className="w-16 h-8"></div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingPermissionsFor} onOpenChange={(open) => !open && setEditingPermissionsFor(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Hak Akses (Permissions)</DialogTitle>
            <DialogDescription>
              Atur hak akses granular untuk <strong>{editingPermissionsFor?.name}</strong> (@{editingPermissionsFor?.username}).
            </DialogDescription>
          </DialogHeader>
          {editingPermissionsFor && (
            <PermissionsForm
              userId={editingPermissionsFor.id}
              initialPermissions={editingPermissionsFor.permissions || []}
              onSuccess={() => { setEditingPermissionsFor(null); fetchUsers(); }}
              onCancel={() => setEditingPermissionsFor(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCredentialsFor} onOpenChange={(open) => !open && setEditingCredentialsFor(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ubah Username / Password</DialogTitle>
            <DialogDescription>
              Ganti username atau password untuk <strong>{editingCredentialsFor?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          {editingCredentialsFor && (
            <CredentialsForm
              userId={editingCredentialsFor.id}
              currentUsername={editingCredentialsFor.username}
              onSuccess={() => { setEditingCredentialsFor(null); fetchUsers(); }}
              onCancel={() => setEditingCredentialsFor(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
