"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getShoeLasts() {
  return await prisma.shoeLast.findMany({
    orderBy: { code: "asc" },
  });
}

export async function saveShoeLast(data: {
  id?: string;
  code: string;
  models: string;
  sizes: Record<string, number>;
}) {
  if (data.id) {
    await prisma.shoeLast.update({
      where: { id: data.id },
      data: {
        code: data.code,
        models: data.models,
        sizes: data.sizes,
      },
    });
  } else {
    await prisma.shoeLast.create({
      data: {
        code: data.code,
        models: data.models,
        sizes: data.sizes,
      },
    });
  }
  revalidatePath("/lasts");
}

export async function deleteShoeLast(id: string) {
  await prisma.shoeLast.delete({ where: { id } });
  revalidatePath("/lasts");
}
