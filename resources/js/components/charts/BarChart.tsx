import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BarChartProps {
    data: any[];
    xKey: string;
    yKey: string;
    color?: string;
    height?: number;
    showGrid?: boolean;
    formatTooltip?: (value: any, name: string) => [string, string];
}

export function BarChart({ 
    data, 
    xKey, 
    yKey, 
    color = '#10b981', 
    height = 300,
    showGrid = true,
    formatTooltip
}: BarChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsBarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                <Bar 
                    dataKey={yKey} 
                    fill={color}
                    radius={[4, 4, 0, 0]}
                />
            </RechartsBarChart>
        </ResponsiveContainer>
    );
}
