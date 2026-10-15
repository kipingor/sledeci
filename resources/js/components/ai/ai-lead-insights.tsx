import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    Sparkles, 
    TrendingUp, 
    AlertCircle,
    CheckCircle2,
    Lightbulb,
    Target,
    Zap,
    Brain,
    RefreshCw,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { router } from '@inertiajs/react';
import { route } from 'ziggy-js';

interface LeadScore {
    score: number; // 0-100
    confidence: number; // 0-1
    factors: {
        name: string;
        impact: number; // -100 to +100
        value: string;
    }[];
    prediction: 'high' | 'medium' | 'low';
    recommendations: string[];
}

interface LeadInsights {
    lead_id: number;
    score: LeadScore;
    nextBestActions: {
        action: string;
        priority: number;
        reasoning: string;
        estimated_impact: number;
    }[];
    similarLeads: {
        id: number;
        title: string;
        similarity: number;
        outcome: string;
    }[];
    riskFactors: {
        factor: string;
        severity: 'high' | 'medium' | 'low';
        mitigation: string;
    }[];
    opportunityInsights: {
        insight: string;
        value: string;
        actionable: boolean;
    }[];
}

interface AILeadInsightsProps {
    leadId: number;
    onActionTaken?: (action: string) => void;
}

export function AILeadInsights({ leadId, onActionTaken }: AILeadInsightsProps) {
    const [insights, setInsights] = useState<LeadInsights | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { toast } = useToast();

    const fetchInsights = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(route('ai.lead-insights', leadId));
            const data = await response.json();
            setInsights(data);
        } catch (error) {
            toast({
                title: 'Failed to Load Insights',
                description: 'Could not fetch AI insights. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [leadId, toast]);

    const refreshInsights = useCallback(async () => {
        setIsRefreshing(true);
        await fetchInsights();
        setIsRefreshing(false);
        toast({
            title: 'Insights Refreshed',
            description: 'AI analysis has been updated with latest data.',
        });
    }, [fetchInsights, toast]);

    useEffect(() => {
        fetchInsights();
    }, [fetchInsights]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        AI Insights
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                        <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!insights) return null;

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 80) return 'High Quality';
        if (score >= 60) return 'Medium Quality';
        return 'Needs Attention';
    };

    return (
        <div className="space-y-4">
            {/* Lead Score Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-600" />
                            AI Lead Score
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={refreshInsights}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                    <CardDescription>
                        AI-powered prediction of lead quality and conversion probability
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Score Display */}
                    <div className="text-center space-y-2">
                        <div className={`text-6xl font-bold ${getScoreColor(insights.score.score)}`}>
                            {insights.score.score}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {getScoreLabel(insights.score.score)}
                        </div>
                        <Progress value={insights.score.score} className="h-2" />
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Target className="h-4 w-4" />
                            Confidence: {(insights.score.confidence * 100).toFixed(0)}%
                        </div>
                    </div>

                    {/* Score Factors */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Key Factors</h4>
                        {insights.score.factors.map((factor, index) => (
                            <div key={index} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">{factor.name}</span>
                                    <span className={factor.impact > 0 ? 'text-green-600' : 'text-red-600'}>
                                        {factor.impact > 0 ? '+' : ''}{factor.impact}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Progress
                                        value={Math.abs(factor.impact)}
                                        className="h-1"
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {factor.value}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Next Best Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-600" />
                        Recommended Actions
                    </CardTitle>
                    <CardDescription>
                        AI-suggested next steps to maximize conversion
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {insights.nextBestActions.map((action, index) => (
                            <Alert key={index}>
                                <Lightbulb className="h-4 w-4" />
                                <AlertTitle className="flex items-center justify-between">
                                    <span>{action.action}</span>
                                    <Badge variant={action.priority === 1 ? 'default' : 'secondary'}>
                                        Priority {action.priority}
                                    </Badge>
                                </AlertTitle>
                                <AlertDescription className="space-y-2">
                                    <p className="text-sm">{action.reasoning}</p>
                                    <div className="flex items-center gap-2 text-xs">
                                        <TrendingUp className="h-3 w-3" />
                                        Est. Impact: +{action.estimated_impact}% conversion
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            if (onActionTaken) onActionTaken(action.action);
                                        }}
                                    >
                                        Take Action
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Risk Factors */}
            {insights.riskFactors.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-600" />
                            Risk Factors
                        </CardTitle>
                        <CardDescription>
                            Potential issues that could impact conversion
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {insights.riskFactors.map((risk, index) => (
                                <div key={index} className="border-l-4 border-orange-500 pl-4 py-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-sm">{risk.factor}</span>
                                        <Badge
                                            variant={
                                                risk.severity === 'high' ? 'destructive' :
                                                risk.severity === 'medium' ? 'default' :
                                                'secondary'
                                            }
                                        >
                                            {risk.severity}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        <strong>Mitigation:</strong> {risk.mitigation}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Similar Leads */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        Similar Leads
                    </CardTitle>
                    <CardDescription>
                        Historical leads with similar characteristics
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {insights.similarLeads.map((similar) => (
                            <div
                                key={similar.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                                onClick={() => router.visit(route('leads.show', similar.id))}
                            >
                                <div className="flex-1">
                                    <div className="font-medium text-sm">{similar.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {(similar.similarity * 100).toFixed(0)}% similar
                                    </div>
                                </div>
                                <Badge
                                    variant={similar.outcome === 'won' ? 'default' : 'secondary'}
                                >
                                    {similar.outcome}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Opportunity Insights */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        Opportunity Insights
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {insights.opportunityInsights.map((opportunity, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg"
                            >
                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{opportunity.insight}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {opportunity.value}
                                    </p>
                                </div>
                                {opportunity.actionable && (
                                    <Badge variant="outline" className="text-xs">
                                        Actionable
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Hook for batch lead scoring
export function useBatchLeadScoring() {
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const scoreLeads = useCallback(async (leadIds: number[]) => {
        setIsProcessing(true);

        try {
            const response = await fetch(route('ai.batch-score'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ lead_ids: leadIds }),
            });

            const results = await response.json();

            toast({
                title: 'Scoring Complete',
                description: `Analyzed ${leadIds.length} leads with AI.`,
            });

            return results;
        } catch (error) {
            toast({
                title: 'Scoring Failed',
                description: 'Failed to score leads. Please try again.',
                variant: 'destructive',
            });
            throw error;
        } finally {
            setIsProcessing(false);
        }
    }, [toast]);

    return {
        scoreLeads,
        isProcessing,
    };
}

// Component for displaying lead score in table
export function LeadScoreBadge({ score }: { score: number }) {
    const getVariant = () => {
        if (score >= 80) return 'default';
        if (score >= 60) return 'secondary';
        return 'destructive';
    };

    const getIcon = () => {
        if (score >= 80) return <TrendingUp className="h-3 w-3" />;
        if (score >= 60) return <Target className="h-3 w-3" />;
        return <AlertCircle className="h-3 w-3" />;
    };

    return (
        <Badge variant={getVariant()} className="gap-1">
            {getIcon()}
            {score}
        </Badge>
    );
}