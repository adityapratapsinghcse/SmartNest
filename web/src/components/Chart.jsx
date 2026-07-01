import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

// Mirrors the tokens in index.css. Duplicated as hex because recharts renders
// these as raw SVG attributes, not CSS — var(--color-x) doesn't reliably
// resolve there the way it does on Tailwind-classed HTML elements.
const COLORS = {
  accent: '#ffb000',
  panelBorder: '#223028',
  inkMuted: '#8a968f',
}

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  return (
    <div className="border border-panel-border bg-deep rounded-md px-3 py-2 font-mono text-xs">
      <p className="text-ink-muted mb-1">{label}</p>
      <p className="text-accent">{payload[0].value}{unit}</p>
    </div>
  )
}

function Chart({ data, dataKey = 'value', unit = '', height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.panelBorder} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          stroke={COLORS.inkMuted}
          tick={{ fontFamily: 'JetBrains Mono', fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: COLORS.panelBorder }}
        />
        <YAxis
          stroke={COLORS.inkMuted}
          tick={{ fontFamily: 'JetBrains Mono', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: COLORS.accent, strokeOpacity: 0.2 }} />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={COLORS.accent}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: COLORS.accent }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default Chart