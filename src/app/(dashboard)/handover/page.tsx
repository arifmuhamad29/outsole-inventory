"use client"

import Link from "next/link"
import { format } from "date-fns"
import { Send, Plus, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { useState } from "react"

// Dummy data for UI mockup
const dummyHandovers = [
  {
    id: "HO-20260601-001",
    date: new Date("2026-06-01"),
    recipient: "LINE 3 - ASSY",
    codeLast: "43011",
    totalItems: 4,
    status: "COMPLETED",
  },
  {
    id: "HO-20260602-002",
    date: new Date("2026-06-02"),
    recipient: "LINE 5 - BOTTOM",
    codeLast: "23021",
    totalItems: 3,
    status: "COMPLETED",
  },
  {
    id: "HO-20260603-003",
    date: new Date("2026-06-03"),
    recipient: "LINE 1 - ASSY",
    codeLast: "55010",
    totalItems: 6,
    status: "PENDING",
  },
  {
    id: "HO-20260604-004",
    date: new Date("2026-06-04"),
    recipient: "LINE 2 - BOTTOM",
    codeLast: "43011",
    totalItems: 2,
    status: "COMPLETED",
  },
  {
    id: "HO-20260605-005",
    date: new Date("2026-06-05"),
    recipient: "LINE 4 - STOCKFIT",
    codeLast: "12099",
    totalItems: 5,
    status: "PENDING",
  },
]

export default function HandoverPage() {
  const [search, setSearch] = useState("")

  const filtered = dummyHandovers.filter((h) => {
    const q = search.toLowerCase()
    return (
      h.id.toLowerCase().includes(q) ||
      h.recipient.toLowerCase().includes(q) ||
      h.codeLast.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Send className="w-8 h-8" />
            Handover Tooling
          </h1>
          <p className="text-muted-foreground mt-1">
            Record outgoing tools and deduct stock for BPM, TFM, and Universal Pad.
          </p>
        </div>
        <Link href="/handover/new">
          <Button className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            Buat Handover Baru
          </Button>
        </Link>
      </div>

      {/* Search & Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Input
              placeholder="Cari ID, Recipient, atau Code Last..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 bg-white dark:bg-gray-800"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium whitespace-nowrap">
            Showing {filtered.length} of {dummyHandovers.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-slate-800/30">
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Handover ID</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Date</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Recipient / Line</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Code Last</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Total Items</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Status</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    Tidak ditemukan data handover &quot;{search}&quot;
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ho) => (
                  <TableRow key={ho.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <TableCell className="font-mono font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {ho.id}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">
                      {format(ho.date, "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                      {ho.recipient}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                        {ho.codeLast}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold text-sm">
                        {ho.totalItems}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={ho.status === "COMPLETED" ? "default" : "secondary"}
                        className={
                          ho.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700"
                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                        }
                      >
                        {ho.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
