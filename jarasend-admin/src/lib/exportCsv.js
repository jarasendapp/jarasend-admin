// Converts an array of row objects into a downloadable CSV file — this
// covers "export to Excel" without needing a heavy .xlsx library, since
// Excel (and Google Sheets, Numbers, etc.) all open CSV files natively.
export function exportToCsv(filename, rows, columns) {
  if (!rows || rows.length === 0) return

  const escape = (value) => {
    const s = value === null || value === undefined ? '' : String(value)
    // Quote any value containing a comma, quote, or newline, and
    // double up internal quotes per standard CSV escaping.
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const header = columns.map((c) => escape(c.label)).join(',')
  const body = rows
    .map((row) => columns.map((c) => escape(c.value(row))).join(','))
    .join('\n')

  // Leading BOM so Excel correctly detects UTF-8 (otherwise ₦ and other
  // non-ASCII characters can render as garbled text on Windows).
  const csv = '\uFEFF' + header + '\n' + body

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
