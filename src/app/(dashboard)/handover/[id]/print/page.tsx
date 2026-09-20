
import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { PrintButton } from "./print-button"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PrintHandoverPage({ params }: PageProps) {
  const resolvedParams = await params;
  const handover = await prisma.handover.findUnique({
    where: { id: resolvedParams.id },
    include: { items: true },
  })

  if (!handover) notFound()

  const isOutsole = handover.items.some(item => item.toolName === "Outsole")
  const title = isOutsole ? "BUKTI SERAH TERIMA OUTSOLE" : "BUKTI SERAH TERIMA TOOLING"

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-8 flex justify-center">
      <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] p-10 shadow-lg relative print:shadow-none print:m-0 print:p-0 print:w-auto">
        
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-xl font-bold uppercase tracking-wider">DEVELOPMENT OUTSOLE & TOOLING INVENTORY</h1>
          <h2 className="text-2xl font-bold mt-2 uppercase">{title}</h2>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
          <div>
            <div className="flex mb-1"><span className="w-32 font-semibold">No. Handover</span><span>: {handover.id}</span></div>
            <div className="flex mb-1"><span className="w-32 font-semibold">Tanggal</span><span>: {format(new Date(handover.date), "dd MMM yyyy")}</span></div>
          </div>
          <div>
            <div className="flex mb-1"><span className="w-32 font-semibold">Pemberi</span><span>: {handover.giver}</span></div>
            <div className="flex mb-1"><span className="w-32 font-semibold">Penerima / Line</span><span>: {handover.recipient}</span></div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-black mb-8 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 w-12">No</th>
              {!isOutsole && <th className="border border-black p-2">Tool Name</th>}
              <th className="border border-black p-2">{isOutsole ? "Item (Model - Article - Color)" : "Type/Model"}</th>
              <th className="border border-black p-2">{isOutsole ? "Stage" : "Size"}</th>
              <th className="border border-black p-2">Qty</th>
              <th className="border border-black p-2">Remark</th>
            </tr>
          </thead>
          <tbody>
            {handover.items.map((item, idx) => (
              <tr key={item.id}>
                <td className="border border-black p-2 text-center">{idx + 1}</td>
                {!isOutsole && <td className="border border-black p-2">{item.toolName}</td>}
                <td className="border border-black p-2">{item.type || "-"}</td>
                <td className="border border-black p-2 text-center">{item.size || "-"}</td>
                <td className="border border-black p-2 text-center font-semibold">{item.qty} {item.satuan}</td>
                <td className="border border-black p-2">{item.remark || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="flex justify-between mt-16 px-10 text-sm">
          <div className="text-center">
            <p className="mb-16">Pemberi,</p>
            <p className="font-semibold underline">({handover.giver})</p>
          </div>
          <div className="text-center">
            <p className="mb-16">Penerima,</p>
            <p className="font-semibold underline">({handover.recipient})</p>
          </div>
        </div>

        {/* Print Button */}
        <div className="absolute top-4 right-4 print:hidden">
          <PrintButton />
        </div>
      </div>
    </div>
  )
}
