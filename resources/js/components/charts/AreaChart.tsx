import React from 'react';
import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AreaChartProps {
    data: any[];
    xKey: string;
    yKey: string;
    color?: string;
    height?: number;
    showGrid?: boolean;
    formatTooltip?: (value: any, name: string) => [string, string];
}

export function AreaChart({ 
    data, 
    xKey, 
    yKey, 
    color = '#8b5cf6', 
    height = 300,
    showGrid = true,
    formatTooltip
}: AreaChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsAreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                <Area 
                    type="monotone" 
                    dataKey={yKey} 
                    stroke={color} 
                    fill={color}
                    fillOpacity={0.3}
                    strokeWidth={2}
                />
            </RechartsAreaChart>
        </ResponsiveContainer>
    );
}
