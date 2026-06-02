import { QRCodeSVG } from "qrcode.react"
import { Badge } from "@/components/ui/badge"

export function PrintableLabel({
  qrCode,
  model,
  article,
  color,
  size,
  incomingDate,
  notes,
}: {
  qrCode: string
  model: string
  article: string
  color: string
  size: string
  incomingDate?: string
  notes?: string
}) {
  return (
    <div id="printable-label" className="flex flex-col items-center justify-center text-center p-6 bg-white text-black border-dashed border-2 m-0 w-full max-w-md mx-auto">
      <div className="w-[100px] h-[100px] mx-auto mb-2 flex items-center justify-center">
        <QRCodeSVG value={qrCode} size={100} />
      </div>
      <div>
        <Badge variant="outline" className="text-lg px-4 py-1 font-mono tracking-widest border-black text-black">
          {qrCode}
        </Badge>
      </div>
      <div className="text-sm text-black space-y-1 mt-2">
        <p className="font-bold">{model}</p>
        <p className="font-bold">{article}</p>
        <p className="font-bold">{color}</p>
        <p className="font-bold text-xl mt-1">{size}</p>
        {incomingDate && <p className="text-xs font-normal">Incoming Date: <strong>{incomingDate}</strong></p>}
        {notes && <p className="text-xs font-normal">Notes: <strong>{notes}</strong></p>}
      </div>
    </div>
  )
}
