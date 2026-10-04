"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"

type HandoverChartData = {
  dateObj?: Date
  name: string
  fullDate?: string
  tooling: number
  outsole: number
  stages?: Record<string, number>
}

const mockHandoverData: HandoverChartData[] = [
  { name: "Mon", tooling: 2, outsole: 10, stages: { "SS": 20 } },
  { name: "Tue", tooling: 4, outsole: 15, stages: { "FSR": 100 } },
  { name: "Wed", tooling: 1, outsole: 14, stages: { "DUPLICATE": 50 } },
  { name: "Thu", tooling: 5, outsole: 17, stages: { "MST": 10 } },
  { name: "Fri", tooling: 3, outsole: 25, stages: { "EXTREME": 5 } },
  { name: "Sat", tooling: 0, outsole: 10, stages: {} },
  { name: "Sun", tooling: 0, outsole: 5, stages: {} },
]

export function HandoverLineChart({ data }: { data?: HandoverChartData[] }) {
  const chartData = data || mockHandoverData

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload as HandoverChartData;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-100 min-w-[200px] z-50">
          <p className="font-bold text-slate-800 mb-2">{d.fullDate || d.name}</p>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="text-blue-600 font-medium">Outsole (Docs):</span>
              <span className="font-bold">{d.outsole}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-amber-500 font-medium">Tooling (Docs):</span>
              <span className="font-bold">{d.tooling}</span>
            </div>
            {d.stages && Object.keys(d.stages).length > 0 && (
              <div className="pt-2 mt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-semibold mb-1">Outsole Pairs by Stage:</p>
                {Object.entries(d.stages).map(([stage, qty]) => (
                  <div key={stage} className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">{stage}</span>
                    <span className="font-medium">{qty} prs</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 12, fill: "#6b7280" }} 
          dy={10} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 12, fill: "#6b7280" }} 
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
        <Line 
          name="Outsole Handovers"
          type="monotone" 
          dataKey="outsole" 
          stroke="#2563eb" 
          strokeWidth={3}
          dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
        <Line 
          name="Tooling Handovers"
          type="monotone" 
          dataKey="tooling" 
          stroke="#f59e0b" 
          strokeWidth={3}
          dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
        <Legend wrapperStyle={{ paddingTop: '20px' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface InventoryDistributionProps {
  outsoleCount: number
  toolingCount: number
  bpmCount: number
}

const PIE_COLORS = ["#2563eb", "#64748b", "#eab308"] // Blue, Gray, Yellow

export function InventoryDistributionPieChart({ outsoleCount, toolingCount, bpmCount }: InventoryDistributionProps) {
  const data = [
    { name: "Outsole", value: outsoleCount },
    { name: "Tooling", value: toolingCount },
    { name: "BPM/TFM", value: bpmCount },
  ]

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36} 
          iconType="circle"
          formatter={(value) => <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
