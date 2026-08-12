import { exportToCsv } from '../lib/exportCsv'

export default function TableToolbar({ filename, rows, columns }) {
  return (
    <div className="no-print" style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={() => exportToCsv(filename, rows, columns)}
        style={toolbarButtonStyle}
      >
        ⬇ Export CSV
      </button>
      <button
        onClick={() => window.print()}
        style={toolbarButtonStyle}
      >
        🖨 Print / Save as PDF
      </button>
    </div>
  )
}

const toolbarButtonStyle = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
  borderRadius: 10, border: '1px solid var(--divider)', background: '#fff',
  fontSize: 12.5, fontWeight: 600, color: 'var(--navy)',
}
