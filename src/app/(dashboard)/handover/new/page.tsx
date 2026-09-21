"use client"
import Link from "next/link"
import { ArrowLeft, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToolingHandoverForm } from "./tooling-form"
import { OutsoleHandoverForm } from "./outsole-form"

export default function NewHandoverPage() {
  return (
    <div className="flex flex-col space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/handover" className="inline-flex">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Send className="w-8 h-8" />
          Buat Handover Baru
        </h1>
        <p className="text-muted-foreground mt-1">
          Catat serah terima tooling dan outsole.
        </p>
      </div>

      <Tabs defaultValue="outsole" className="w-full">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-6">
          <TabsTrigger value="outsole">Outsole Handover</TabsTrigger>
          <TabsTrigger value="tooling">Tooling Handover</TabsTrigger>
        </TabsList>
        <TabsContent value="outsole">
          <OutsoleHandoverForm />
        </TabsContent>
        <TabsContent value="tooling">
          <ToolingHandoverForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
