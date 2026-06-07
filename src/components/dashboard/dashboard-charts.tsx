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

const mockHandoverData = [
  { name: "Mon", handovers: 12 },
  { name: "Tue", handovers: 19 },
  { name: "Wed", handovers: 15 },
  { name: "Thu", handovers: 22 },
  { name: "Fri", handovers: 28 },
  { name: "Sat", handovers: 10 },
  { name: "Sun", handovers: 5 },
]

export function HandoverLineChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={mockHandoverData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
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
        <Tooltip 
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
        />
        <Line 
          type="monotone" 
          dataKey="handovers" 
          stroke="#2563eb" 
          strokeWidth={3}
          dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
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
