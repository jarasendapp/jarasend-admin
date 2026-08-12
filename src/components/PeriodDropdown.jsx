export const PERIOD_OPTIONS = ['All time', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly']

export default function PeriodDropdown({ value, onChange }) {
  return (
    <select
      className="no-print"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '8px 12px', borderRadius: 10, border: '1px solid var(--divider)',
        fontSize: 12.5, fontFamily: 'inherit', background: '#fff', color: 'var(--text)',
      }}
    >
      {PERIOD_OPTIONS.map((p) => (
        <option key={p} value={p}>{p}</option>
      ))}
    </select>
  )
}

// Filters an array of rows down to the selected period, based on a date
// field extracted from each row via getDate(row). Shared so every page
// applies the exact same day/week/month/quarter/year boundaries.
export function filterByPeriod(rows, period, getDate) {
  if (period === 'All time') return rows
  const now = new Date()

  return rows.filter((row) => {
    const d = getDate(row)
    if (!d) return false

    if (period === 'Daily') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    }
    if (period === 'Weekly') {
      const day = now.getDay() === 0 ? 7 : now.getDay() // Sunday=0 -> 7, so Monday is always start of week
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day - 1))
      return d >= startOfWeek
    }
    if (period === 'Monthly') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }
    if (period === 'Quarterly') {
      const currentQuarter = Math.floor(now.getMonth() / 3)
      const rowQuarter = Math.floor(d.getMonth() / 3)
      return d.getFullYear() === now.getFullYear() && rowQuarter === currentQuarter
    }
    if (period === 'Yearly') {
      return d.getFullYear() === now.getFullYear()
    }
    return true
  })
}
