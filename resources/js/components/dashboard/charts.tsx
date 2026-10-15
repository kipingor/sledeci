import React from 'react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    FunnelChart,
    Funnel,
    LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BaseChartProps {
    title?: string;
    data: any[];
    loading?: boolean;
    height?: number;
}

const COLORS = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
];

const LoadingSkeleton: React.FC<{ height: number }> = ({ height }) => (
    <div className="animate-pulse" style={{ height }}>
        <div className="h-full bg-gray-200 rounded"></div>
    </div>
);

// Bar Chart Component
interface BarChartCardProps extends BaseChartProps {
    dataKey: string;
    xAxisKey: string;
    barColor?: string;
}

export function BarChartCard({
    title,
    data,
    dataKey,
    xAxisKey,
    barColor = COLORS[0],
    loading = false,
    height = 300,
}: BarChartCardProps) {
    return (
        <Card>
            {title && (
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
            )}
            <CardContent>
                {loading ? (
                    <LoadingSkeleton height={height} />
                ) : (
                    <ResponsiveContainer width="100%" height={height}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey={dataKey} fill={barColor} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

// Line Chart Component
interface LineChartCardProps extends BaseChartProps {
    dataKey: string;
    xAxisKey: string;
    lineColor?: string;
}

export function LineChartCard({
    title,
    data,
    dataKey,
    xAxisKey,
    lineColor = COLORS[0],
    loading = false,
    height = 300,
}: LineChartCardProps) {
    return (
        <Card>
            {title && (
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
            )}
            <CardContent>
                {loading ? (
                    <LoadingSkeleton height={height} />
                ) : (
                    <ResponsiveContainer width="100%" height={height}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Line
                                type="monotone"
                                dataKey={dataKey}
                                stroke={lineColor}
                                strokeWidth={2}
                                dot={{ fill: lineColor, r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

// Pie Chart Component
interface PieChartCardProps extends BaseChartProps {
    nameKey: string;
    valueKey: string;
}

export function PieChartCard({
    title,
    data,
    nameKey,
    valueKey,
    loading = false,
    height = 300,
}: PieChartCardProps) {
    return (
        <Card>
            {title && (
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
            )}
            <CardContent>
                {loading ? (
                    <LoadingSkeleton height={height} />
                ) : (
                    <ResponsiveContainer width="100%" height={height}>
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey={valueKey}
                                nameKey={nameKey}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={({ name, percent }) =>
                                    `${name}: ${(percent * 100).toFixed(0)}%`
                                }
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

// Funnel Chart Component
interface FunnelChartCardProps extends BaseChartProps {
    nameKey: string;
    valueKey: string;
}

export function FunnelChartCard({
    title,
    data,
    nameKey,
    valueKey,
    loading = false,
    height = 400,
}: FunnelChartCardProps) {
    return (
        <Card>
            {title && (
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
            )}
            <CardContent>
                {loading ? (
                    <LoadingSkeleton height={height} />
                ) : (
                    <ResponsiveContainer width="100%" height={height}>
                        <FunnelChart>
                            <Tooltip />
                            <Funnel
                                dataKey={valueKey}
                                data={data}
                                isAnimationActive
                            >
                                <LabelList
                                    position="right"
                                    fill="#000"
                                    stroke="none"
                                    dataKey={nameKey}
                                />
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

// Multi-Line Chart Component
interface MultiLineChartCardProps extends BaseChartProps {
    lines: Array<{
        dataKey: string;
        name: string;
        color?: string;
    }>;
    xAxisKey: string;
}

export function MultiLineChartCard({
    title,
    data,
    lines,
    xAxisKey,
    loading = false,
    height = 300,
}: MultiLineChartCardProps) {
    return (
        <Card>
            {title && (
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
            )}
            <CardContent>
                {loading ? (
                    <LoadingSkeleton height={height} />
                ) : (
                    <ResponsiveContainer width="100%" height={height}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            {lines.map((line, index) => (
                                <Line
                                    key={line.dataKey}
                                    type="monotone"
                                    dataKey={line.dataKey}
                                    name={line.name}
                                    stroke={line.color || COLORS[index % COLORS.length]}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}