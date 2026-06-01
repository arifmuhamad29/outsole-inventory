"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileText, Activity } from "lucide-react"

export default function ReportsPage() {
  const exports = [
    { title: "Inventory Report", type: "inventory", description: "Export current active inventory levels and SKUs.", icon: FileText },
    { title: "Transaction History", type: "transactions", description: "Export all historical transactions (inbound, outbound, adjustments).", icon: Activity },
    { title: "Audit Logs", type: "audit", description: "Export system audit logs tracking all user actions.", icon: Download },
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Exports</h1>
        <p className="text-muted-foreground mt-2">
          Download system data in CSV format for analysis or record keeping.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {exports.map((item) => (
          <Card key={item.type}>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <item.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </div>
              <CardDescription className="pt-2">{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <a href={`/api/export/${item.type}`} download className="block w-full">
                <Button className="w-full" variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
