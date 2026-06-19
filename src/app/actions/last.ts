"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notification";

export async function getShoeLasts() {
  return await prisma.shoeLast.findMany({
    orderBy: { code: "asc" },
  });
}

export async function saveShoeLast(data: {
  id?: string;
  code: string;
  models: string;
  status: string;
  sizes: Record<string, number>;
}) {
  if (data.id) {
    await prisma.shoeLast.update({
      where: { id: data.id },
      data: {
        code: data.code,
        models: data.models,
        status: data.status,
        sizes: data.sizes,
      },
    });
  } else {
    await prisma.shoeLast.create({
      data: {
        code: data.code,
        models: data.models,
        status: data.status,
        sizes: data.sizes,
      },
    });
  }
  revalidatePath("/lasts");

  await createNotification(
    data.id ? "Shoe Last Diupdate" : "Shoe Last Baru",
    `Shoe Last "${data.code}" (${data.models}) berhasil ${data.id ? "diupdate" : "ditambahkan"}.`,
    data.id ? "info" : "success"
  );
}

export async function deleteShoeLast(id: string) {
  const last = await prisma.shoeLast.findUnique({ where: { id } });
  await prisma.shoeLast.delete({ where: { id } });
  revalidatePath("/lasts");

  await createNotification(
    "Shoe Last Dihapus",
    `Shoe Last "${last?.code || id}" telah dihapus.`,
    "warning"
  );
}
