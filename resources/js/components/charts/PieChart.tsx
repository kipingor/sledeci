import React from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface PieChartProps {
    data: any[];
    dataKey: string;
    nameKey: string;
    height?: number;
    colors?: string[];
    showLegend?: boolean;
    formatTooltip?: (value: any, name: string) => [string, string];
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function PieChart({ 
    data, 
    dataKey, 
    nameKey,
    height = 300,
    colors = DEFAULT_COLORS,
    showLegend = true,
    formatTooltip
}: PieChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsPieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey={dataKey}
                    nameKey={nameKey}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                </Pie>
                <Tooltip 
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={formatTooltip}
                />
                {showLegend && (
                    <Legend 
                        wrapperStyle={{
                            fontSize: '12px',
                            color: 'hsl(var(--muted-foreground))'
                        }}
                    />
                )}
            </RechartsPieChart>
        </ResponsiveContainer>
    );
}

export default PieChart;
