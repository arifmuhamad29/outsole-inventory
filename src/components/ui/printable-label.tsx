import { QRCodeSVG } from "qrcode.react"
import { Badge } from "@/components/ui/badge"

export function PrintableLabel({
  qrCode,
  model,
  article,
  color,
  size,
  poNumber,
  bottomTreatment,
  createdAt,
  notes,
}: {
  qrCode: string
  model: string
  article: string
  color: string
  size: string
  poNumber?: string
  bottomTreatment?: string
  createdAt?: Date | string
  notes?: string
}) {
  const incomingDate = createdAt 
    ? new Date(createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
    : new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  return (
    <div className="printable-label flex flex-col items-center justify-center text-center p-3 bg-white text-black border-dashed border-2 m-0 w-full max-w-sm mx-auto">
      <div className="p-2 bg-white rounded-xl shadow-sm border mb-2">
        <QRCodeSVG value={qrCode} size={150} />
      </div>
      <div>
        <Badge variant="outline" className="text-base px-3 py-0.5 font-mono tracking-widest border-black text-black">
          {qrCode}
        </Badge>
      </div>
      <div className="text-xs text-black space-y-1 mt-2">
        <p>Model: <strong>{model}</strong></p>
        <p>Article: <strong>{article}</strong></p>
        <p>Color: <strong>{color}</strong></p>
        {bottomTreatment && bottomTreatment !== "None" && <p>Bottom: <strong>{bottomTreatment}</strong></p>}
        <p>Size: <strong>{size}</strong></p>
        {poNumber && poNumber !== "-" && <p>PO Number: <strong>{poNumber}</strong></p>}
        <p>Incoming: <strong>{incomingDate}</strong></p>
        {notes && <p>Notes: <strong>{notes}</strong></p>}
      </div>
    </div>
  )
}
