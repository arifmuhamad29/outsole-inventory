import { QRCodeSVG } from "qrcode.react"
import { Badge } from "@/components/ui/badge"

export function PrintableLabel({
  qrCode,
  model,
  article,
  color,
  size,
  createdAt,
  notes,
}: {
  qrCode: string
  model: string
  article: string
  color: string
  size: string
  createdAt?: Date | string
  notes?: string
}) {
  const incomingDate = createdAt 
    ? new Date(createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
    : new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  return (
    <div id="printable-label" className="flex flex-col items-center justify-center text-center p-6 bg-white text-black border-dashed border-2 m-0 w-full max-w-md mx-auto">
      <div className="p-4 bg-white rounded-xl shadow-sm border mb-4">
        <QRCodeSVG value={qrCode} size={200} />
      </div>
      <div>
        <Badge variant="outline" className="text-lg px-4 py-1 font-mono tracking-widest border-black text-black">
          {qrCode}
        </Badge>
      </div>
      <div className="text-sm text-black space-y-1 mt-4">
        <p>Model: <strong>{model}</strong></p>
        <p>Article: <strong>{article}</strong></p>
        <p>Color: <strong>{color}</strong></p>
        <p>Size: <strong>{size}</strong></p>
        <p>Incoming: <strong>{incomingDate}</strong></p>
        {notes && <p>Notes: <strong>{notes}</strong></p>}
      </div>
    </div>
  )
}
