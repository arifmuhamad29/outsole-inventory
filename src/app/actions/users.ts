"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const userSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "OPERATOR"]),
  permissions: z.array(z.string()),
})

export async function getUsersAction() {
  try {
    const session = await auth()
    if (!session || session.user.role !== "SUPER_ADMIN") {
      throw new Error("Unauthorized Access")
    }

    const users = await prisma.user.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        permissions: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" }
    })
    return users
  } catch (error) {
    console.error("Error fetching users:", error)
    return []
  }
}

export async function createUserAction(data: z.infer<typeof userSchema>) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Unauthorized Access" }
    }

    const validatedFields = userSchema.safeParse(data)

    if (!validatedFields.success) {
      return { success: false, message: validatedFields.error.issues[0].message }
    }

    const { name, username, password, role, permissions } = validatedFields.data

    const existingUser = await prisma.user.findUnique({ where: { username } })
    if (existingUser) {
      return { success: false, message: "Username sudah digunakan" }
    }

    const passwordHash = await bcrypt.hash(password, 10)

    await prisma.user.create({
      data: {
        name,
        username,
        passwordHash,
        role,
        permissions,
      }
    })

    revalidatePath("/account-control")
    return { success: true, message: "User berhasil dibuat" }
  } catch (error) {
    console.error("Error creating user:", error)
    return { success: false, message: "Terjadi kesalahan server" }
  }
}

export async function deleteUserAction(id: string) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Unauthorized Access" }
    }

    if (session.user.id === id) {
      return { success: false, message: "Tidak dapat menghapus akun Anda sendiri!" }
    }

    await prisma.user.update({ 
      where: { id },
      data: { isDeleted: true }
    })
    revalidatePath("/account-control")
    return { success: true, message: "User berhasil dihapus" }
  } catch (error) {
    console.error("Error deleting user:", error)
    return { success: false, message: "Terjadi kesalahan server" }
  }
}

export async function updateUserRoleAction(id: string, role: "SUPER_ADMIN" | "ADMIN" | "OPERATOR") {
  try {
    const session = await auth()
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Unauthorized Access" }
    }

    if (session.user.id === id) {
      return { success: false, message: "Tidak dapat mengubah role akun Anda sendiri!" }
    }

    await prisma.user.update({
      where: { id },
      data: { role }
    })
    
    revalidatePath("/account-control")
    return { success: true, message: "Role berhasil diubah" }
  } catch (error) {
    console.error("Error updating user role:", error)
    return { success: false, message: "Terjadi kesalahan server" }
  }
}

export async function updateUserPermissionsAction(id: string, permissions: string[]) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Unauthorized Access" }
    }

    if (session.user.id === id) {
      return { success: false, message: "Tidak dapat mengubah izin akun Anda sendiri!" }
    }

    await prisma.user.update({
      where: { id },
      data: { permissions }
    })
    
    revalidatePath("/account-control")
    return { success: true, message: "Permissions berhasil diubah" }
  } catch (error) {
    console.error("Error updating user permissions:", error)
    return { success: false, message: "Terjadi kesalahan server" }
  }
}
