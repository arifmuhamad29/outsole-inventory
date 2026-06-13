import * as XLSX from "xlsx"

/**
 * Generate and download an Excel (.xlsx) file from JSON data.
 * Runs entirely on the client side.
 */
export function downloadExcel(data: Record<string, unknown>[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Auto-size columns based on header + data length
  const colWidths = Object.keys(data[0] || {}).map((key) => {
    const maxDataLen = data.reduce((max, row) => {
      const val = String(row[key] ?? "")
      return Math.max(max, val.length)
    }, key.length)
    return { wch: Math.min(maxDataLen + 2, 50) }
  })
  worksheet["!cols"] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report")
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
