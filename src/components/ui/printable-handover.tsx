/* eslint-disable @typescript-eslint/no-explicit-any */
import { format } from "date-fns"

export function PrintableHandover({ handover }: { handover: any }) {
  if (!handover || !handover.items) return null;
  
  const isOutsole = handover.items.some((item: any) => item.toolName === "Outsole")
  const title = isOutsole ? "BUKTI SERAH TERIMA OUTSOLE" : "BUKTI SERAH TERIMA TOOLING"

  const sortedItems = [...handover.items].sort((a: any, b: any) => {
    // Sort by type/model first
    const aType = a.type || "";
    const bType = b.type || "";
    const typeCompare = aType.localeCompare(bType);
    if (typeCompare !== 0) return typeCompare;

    // Then sort by size
    const aSizeStr = isOutsole 
      ? (a.size?.includes('Sz: ') ? a.size.split(' | ')[0].replace('Sz: ', '') : a.size) 
      : a.size;
    const bSizeStr = isOutsole 
      ? (b.size?.includes('Sz: ') ? b.size.split(' | ')[0].replace('Sz: ', '') : b.size) 
      : b.size;

    const parseSize = (sizeStr: string) => {
      const match = String(sizeStr || "").trim().match(/([\d\.]+)([a-zA-Z]*)/);
      if (match) {
        return { num: parseFloat(match[1]), suffix: match[2] || "" };
      }
      return { num: 999, suffix: String(sizeStr || "") };
    };

    const aParsed = parseSize(aSizeStr);
    const bParsed = parseSize(bSizeStr);

    if (aParsed.num !== bParsed.num) {
      return aParsed.num - bParsed.num;
    }
    
    return aParsed.suffix.localeCompare(bParsed.suffix);
  });

  return (
    <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] p-10 print:p-8 print:w-auto relative print:bg-white print:text-black">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6 flex items-center">
        <div className="w-32 flex justify-start shrink-0">
          <img src="/parkland-logo.png" alt="Parkland Logo" className="h-20 w-auto object-contain" />
        </div>
        <div className="flex-1 text-center pr-32">
          <h3 className="text-lg font-bold uppercase tracking-wide text-slate-700 print:text-black">Parkland World Indonesia Rembang</h3>
          <h1 className="text-xl font-bold uppercase tracking-wider mt-1 print:text-black">DEVELOPMENT OUTSOLE & TOOLING INVENTORY</h1>
          <h2 className="text-2xl font-bold mt-2 uppercase print:text-black">{title}</h2>
        </div>
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
            <th className="border border-black p-2 w-12 text-center">No</th>
            {!isOutsole && <th className="border border-black p-2 text-left">Tool Name</th>}
            <th className="border border-black p-2 text-left">{isOutsole ? "Item (Model - Article - Color)" : "Type/Model"}</th>
            {isOutsole && <th className="border border-black p-2 text-center">Gender</th>}
            {isOutsole && <th className="border border-black p-2 text-center">Size</th>}
            <th className="border border-black p-2 text-center">{isOutsole ? "Stage" : "Size"}</th>
            <th className="border border-black p-2 text-center">Qty</th>
            <th className="border border-black p-2 text-left">Remark</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item: any, idx: number) => (
            <tr key={item.id}>
              <td className="border border-black p-2 text-center">{idx + 1}</td>
              {!isOutsole && <td className="border border-black p-2">{item.toolName}</td>}
              {isOutsole ? (
                <>
                  <td className="border border-black p-2">{item.type?.split(' | ')[0] || "-"}</td>
                  <td className="border border-black p-2 text-center">{item.type?.includes('| Gender:') ? item.type.split('Gender: ')[1] : "-"}</td>
                  <td className="border border-black p-2 text-center">{item.size?.includes('Sz: ') ? item.size.split(' | ')[0].replace('Sz: ', '') : "-"}</td>
                  <td className="border border-black p-2 text-center">{item.size?.includes('Stage: ') ? item.size.split('Stage: ')[1] : item.size}</td>
                </>
              ) : (
                <>
                  <td className="border border-black p-2">{item.type || "-"}</td>
                  <td className="border border-black p-2 text-center">{item.size || "-"}</td>
                </>
              )}
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
    </div>
  )
}
