/**
 * FIX: gantt-chart.tsx was 0 bytes — an empty file left from a refactor.
 * The real Gantt implementation is in gantt.tsx (206 lines).
 *
 * This file re-exports from gantt.tsx so any import of 'gantt-chart'
 * continues to work without changing all call sites immediately.
 *
 * TODO: Update all imports to use './gantt' directly, then delete this file.
 */
export { default as GanttChart } from './gantt';