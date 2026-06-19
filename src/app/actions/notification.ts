"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Creates a notification record in the database.
 * Called from other server actions after successful mutations.
 */
export async function createNotification(
  title: string,
  message: string,
  type: string = "info"
) {
  try {
    await prisma.notification.create({
      data: { title, message, type },
    });
    // Revalidate layout so the bell updates across the app
    revalidatePath("/", "layout");
  } catch (error) {
    // Notification creation should never block main operations
    console.error("Failed to create notification:", error);
  }
}

/**
 * Fetches the 20 most recent notifications.
 */
export async function getActiveNotifications() {
  try {
    return await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }
}

/**
 * Marks a single notification as read.
 */
export async function markAsRead(id: string) {
  try {
    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    revalidatePath("/", "layout");
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
  }
}

/**
 * Marks all unread notifications as read.
 */
export async function markAllAsRead() {
  try {
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    revalidatePath("/", "layout");
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
  }
}
