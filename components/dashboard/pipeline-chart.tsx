'use client';

/**
 * Pipeline Chart Component
 *
 * Displays a pie chart showing candidates by stage with color-coded segments.
 * Uses recharts library for the visualization.
 */

import * as React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Stage } from '@/lib/generated/prisma/client';
import { recruitment } from '@/config';

/**
 * Stage colors matching stage-badge.tsx
 * These are the solid hex values used for the pie chart
 */
const STAGE_COLORS: Record<Stage, string> = {
  APPLICATION: '#64748b', // slate-500
  GENERAL_COMPETENCIES: '#7c3aed', // purple-600
  SPECIALIZED_COMPETENCIES: '#4f46e5', // indigo-600
  INTERVIEW: '#d97706', // amber-600
  AGREEMENT: '#0891b2', // cyan-600
  SIGNED: '#16a34a', // green-600
};

const STAGE_ORDER: Stage[] = [
  'APPLICATION',
  'GENERAL_COMPETENCIES',
  'SPECIALIZED_COMPETENCIES',
  'INTERVIEW',
  'AGREEMENT',
  'SIGNED',
];

interface PipelineChartProps {
  data: Record<Stage, number>;
  className?: string;
}

interface ChartDataItem {
  stage: Stage;
  name: string;
  value: number;
  color: string;
}

/**
 * Get the display name for a stage
 */
function getStageName(stage: Stage): string {
  const stageInfo = recruitment.stages.find((s) => s.id === stage);
  return stageInfo?.name || stage.replace(/_/g, ' ');
}

/**
 * Custom tooltip for the pie chart
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataItem }>;
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
        <p className="font-medium">{data.name}</p>
        <p className="text-muted-foreground">
          {data.value} candidate{data.value !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }
  return null;
}

export function PipelineChart({ data, className }: PipelineChartProps) {
  // Transform data for recharts
  const chartData: ChartDataItem[] = STAGE_ORDER.map((stage) => ({
    stage,
    name: getStageName(stage),
    value: data[stage] || 0,
    color: STAGE_COLORS[stage],
  })).filter((item) => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  // Handle empty state
  if (total === 0) {
    return (
      <div
        className={`flex h-[400px] items-center justify-center text-muted-foreground ${className || ''}`}
      >
        No applications in the pipeline
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className || ''}`}>
      {/* Chart */}
      <div className="w-full max-w-[280px] aspect-square">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="45%"
              outerRadius="75%"
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend - centered block with left-aligned text */}
      <div className="mt-6 flex justify-center">
        <ul className="flex flex-col gap-2 text-sm">
          {chartData.map((item, index) => (
            <li key={`legend-${index}`} className="flex items-center gap-2.5">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">
                {item.name}: {item.value}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Total count */}
      <div className="mt-6 text-center">
        <span className="text-3xl font-bold">{total}</span>
        <span className="ml-2 text-sm text-muted-foreground">
          total candidate{total !== 1 ? 's' : ''} in pipeline
        </span>
      </div>
    </div>
  );
}
