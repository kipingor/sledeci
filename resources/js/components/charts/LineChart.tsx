import React from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LineChartProps {
    data: any[];
    xKey: string;
    yKey: string;
    color?: string;
    height?: number;
    showGrid?: boolean;
    formatTooltip?: (value: any, name: string) => [string, string];
}

export function LineChart({ 
    data, 
    xKey, 
    yKey, 
    color = '#3b82f6', 
    height = 300,
    showGrid = true,
    formatTooltip
}: LineChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
                <XAxis 
                    dataKey={xKey} 
                    className="text-xs text-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis 
                    className="text-xs text-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip 
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={formatTooltip}
                />
                <Line 
                    type="monotone" 
                    dataKey={yKey} 
                    stroke={color} 
                    strokeWidth={2}
                    dot={{ fill: color, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
                />
            </RechartsLineChart>
        </ResponsiveContainer>
    );
}
