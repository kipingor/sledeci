// File: resources/js/hooks/use-pipeline.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { echo } from "@/lib/echo";
import { Lead } from "@/types";
import { toast } from "sonner";

type EchoChannel = {
  listen: (event: string, callback: (payload: any) => void) => void;
  stopListening: (event: string, callback: (payload: any) => void) => void;
};

type EchoClient = {
  private: (channel: string) => EchoChannel;
};

/**
 * Pipeline hook
 * Provides:
 * - Real-time updates (Echo)
 * - Optimistic local move with rollback
 * - Proper error handling with user feedback
 * - Refresh support
 */
type Stage = { key: string; name: string; id?: number };

export function usePipeline(initialData?: {
  stages: Stage[];
  leadsByStage: Record<string, Lead[]>;
}) {
  const [stages, setStages] = useState<Stage[]>(initialData?.stages ?? []);
  const [itemsByStage, setItemsByStage] = useState<Record<string, Lead[]>>(
    initialData?.leadsByStage ?? {}
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const stableRef = useRef({
    stages: initialData?.stages ?? [],
    itemsByStage: structuredClone(initialData?.leadsByStage ?? {}),
  });

  const cloneItems = (src: Record<string, Lead[]>) =>
    Object.fromEntries(
      Object.entries(src).map(([k, leads]) => [k, leads.map((l) => ({ ...l }))])
    );

  /** Fetch pipeline data */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/pipelines");
      setStages(data.stages);
      setItemsByStage(data.leadsByStage || {});
      stableRef.current = {
        stages: data.stages,
        itemsByStage: cloneItems(data.leadsByStage || {}),
      };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to load pipeline";
      setError(errorMessage);
      toast.error("Failed to load pipeline", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) void refresh();
    else {
      stableRef.current = {
        stages: initialData.stages,
        itemsByStage: cloneItems(initialData.leadsByStage || {}),
      };
    }
  }, []);

  /** Real-time pipeline event listener */
  useEffect(() => {
    if (!echo) {
      console.warn('Echo is not configured, skipping real-time updates');
      return;
    }
    
    const channel = (echo as unknown as EchoClient).private("pipeline");

    const onPipelineMoved = (payload: { lead: Lead }) => {
      const updated = payload.lead;
      setItemsByStage((current) => {
        const copy = cloneItems(current);
        
        // Remove from all stages
        for (const k of Object.keys(copy)) {
          copy[k] = copy[k].filter((l) => String(l.id) !== String(updated.id));
        }
        
        // Add to new stage using pipeline_stage_id
        const stageKey = updated.pipeline_stage_id?.toString() || 
                         stages.find(s => s.id === updated.pipeline_stage_id)?.key;
        
        if (stageKey) {
          (copy[stageKey] ||= []).unshift(updated);
        }
        
        // Keep stableRef in sync
        stableRef.current.itemsByStage = cloneItems(copy);
        return copy;
      });
      
      toast.success("Lead moved", {
        description: `${updated.title} was moved to a new stage`,
      });
    };

    channel.listen(".PipelineMoved", onPipelineMoved);

    return () => {
      channel.stopListening(".PipelineMoved", onPipelineMoved);
    };
  }, [stages]);


  /** Move lead with optimistic update + rollback */
  const moveLead = useCallback(
    async ({ leadId, toStageKey }: { leadId: string | number; toStageKey: string }) => {
      setError(null);

      // Capture current state BEFORE optimistic update
      const prevItems = cloneItems(itemsByStage);

      // Find lead + current stage
      let found: Lead | undefined;
      let fromKey: string | undefined;

      for (const [key, leads] of Object.entries(prevItems)) {
        const idx = leads.findIndex((l) => String(l.id) === String(leadId));
        if (idx !== -1) {
          found = { ...leads[idx] };
          fromKey = key;
          break;
        }
      }

      if (!found) {
        toast.error("Lead not found");
        return;
      }

      // Don't move if already in target stage
      if (fromKey === toStageKey) {
        return;
      }

      // Optimistic update
      const optimisticItems = cloneItems(prevItems);
      optimisticItems[fromKey!] = optimisticItems[fromKey!].filter(
        (l) => String(l.id) !== String(leadId)
      );
      (optimisticItems[toStageKey] ||= []).unshift({
        ...found!,
        pipeline_stage_id: parseInt(toStageKey) || found!.pipeline_stage_id,
      });
      setItemsByStage(optimisticItems);

      // Show optimistic feedback
      toast.loading("Moving lead...", { id: `move-${leadId}` });

      try {
        // FIXED: Send correct payload matching backend expectation
        const { data } = await api.put(`/leads/${leadId}/move`, {
          stage: toStageKey,
        });

        // Dismiss loading toast
        toast.dismiss(`move-${leadId}`);

        // Apply server response if it has updated lead data
        if (data?.data) {
          const updated = data.data;
          setItemsByStage((current) => {
            const copy = cloneItems(current);
            
            // Remove from all stages
            for (const k of Object.keys(copy)) {
              copy[k] = copy[k].filter((l) => String(l.id) !== String(updated.id));
            }
            
            // Add to correct stage
            const stageKey = updated.pipeline_stage_id?.toString() || toStageKey;
            (copy[stageKey] ||= []).unshift(updated);
            
            return copy;
          });
        }

        // Success feedback
        toast.success("Lead moved successfully", {
          description: `${found!.title} moved to new stage`,
        });
      } catch (err: any) {
        console.error("Failed to move lead:", err);
        
        // Extract error message
        const errorMessage = 
          err.response?.data?.message || 
          err.response?.data?.error ||
          err.message || 
          "Failed to move lead";
        
        // Rollback to previous state
        setItemsByStage(prevItems);
        
        // Dismiss loading toast
        toast.dismiss(`move-${leadId}`);
        
        // Show error feedback
        toast.error("Failed to move lead", {
          description: errorMessage,
          duration: 5000,
        });
        
        setError(errorMessage);
      }
    },
    [itemsByStage]
  );

  return { stages, itemsByStage, loading, error, refresh, moveLead };
}

/** Optional React Query helper for alternative usage */
export function useMoveLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, stageId }: { leadId: number; stageId: number }) => {
      const { data } = await api.put(`/leads/${leadId}/move`, { 
        stage: stageId.toString(),
      });
      return data;
    },
    onMutate: async ({ leadId, stageId }: { leadId: number; stageId: number }) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const prev = queryClient.getQueryData<Lead[]>(["leads"]);
      queryClient.setQueryData<Lead[]>(["leads"], (old = []) =>
        (old as Lead[]).map((l) =>
          l.id === leadId ? { ...l, pipeline_stage_id: stageId } : l
        )
      );
      return { prev };
    },
    onError: (_e: unknown, _v: unknown, ctx?: { prev?: Lead[] }) => {
      if (ctx?.prev) queryClient.setQueryData(["leads"], ctx.prev);
      toast.error("Failed to move lead");
    },
    onSuccess: () => {
      toast.success("Lead moved successfully");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}