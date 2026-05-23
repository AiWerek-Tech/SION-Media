import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { useBootStore } from './bootStore'
import { LoadingSkeleton } from '@renderer/components/design-system/LoadingSkeleton'

const statusColorMap: Record<string, string> = {
  pending: 'bg-slate-600',
  running: 'bg-amber-400',
  done: 'bg-emerald-400',
  error: 'bg-rose-500'
}

export function RendererBootScreen(): React.JSX.Element {
  const phase = useBootStore((state) => state.phase)
  const safeMode = useBootStore((state) => state.safeMode)
  const tasks = useBootStore((state) => state.tasks)
  const metrics = useBootStore((state) => state.metrics)
  const bootTrace = useBootStore((state) => state.bootTrace)
  const lastBootTrace = useBootStore((state) => state.lastBootTrace)

  const timelineSource = bootTrace.length > 0 ? bootTrace : lastBootTrace
  const totalDuration = useMemo(() => {
    if (timelineSource.length === 0) return 1
    return Math.max(timelineSource[timelineSource.length - 1].elapsedMs, 1)
  }, [timelineSource])

  const items = useMemo(
    () =>
      tasks.slice().sort((a, b) => {
        const priorityValue = (priority: string): number =>
          priority === 'critical' ? 0 : priority === 'optional' ? 1 : 2
        return priorityValue(a.priority) - priorityValue(b.priority)
      }),
    [tasks]
  )

  return (
    <AnimatePresence>
      {['native', 'renderer', 'critical'].includes(phase) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] }}
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-slate-950/95 backdrop-blur-sm transition-opacity"
        >
          <div className="w-full max-w-4xl rounded-[32px] border border-white/10 bg-slate-950/95 p-8 shadow-[0_32px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3 text-center text-white">
                <p className="text-xs uppercase tracking-[0.45em] text-slate-400">
                  SION Media Startup
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Booting native-grade production shell
                </h1>
                <p className="mx-auto max-w-2xl text-sm text-slate-400 sm:text-base">
                  Critical services are online, shell components are rendering, and optional systems
                  are warming up while the app remains interactive.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                  {items.length > 0 ? (
                    items.map((task) => (
                      <div key={task.id} className="space-y-2 rounded-3xl bg-slate-950/90 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-medium text-slate-100">{task.label}</p>
                          <span
                            className={`inline-flex h-2.5 w-2.5 rounded-full ${statusColorMap[task.status] ?? 'bg-slate-500'}`}
                          />
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <motion.div
                            layout
                            className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary"
                            style={{ width: `${task.progress}%` }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>
                            {task.status === 'done'
                              ? 'Ready'
                              : task.status === 'running'
                                ? 'Starting'
                                : task.status === 'error'
                                  ? 'Failed'
                                  : 'Waiting'}
                          </span>
                          <span>{task.progress}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <LoadingSkeleton count={4} className="p-2" />
                  )}
                </div>

                <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                  <div className="flex items-center justify-between gap-3 rounded-3xl bg-slate-950/90 p-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                        Trace timeline
                      </p>
                      <p className="text-sm font-semibold text-white">Boot trace</p>
                    </div>
                    <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">
                      {lastBootTrace.length > 0 ? 'Persisted' : 'Live'}
                    </span>
                  </div>
                  <div className="space-y-3 text-slate-300">
                    {timelineSource.slice(-6).map((step, index) => (
                      <div
                        key={`${step.id}-${step.timestamp}-${index}`}
                        className="rounded-2xl bg-slate-950/90 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-slate-100">{step.label}</span>
                          <span className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
                            {step.status}
                          </span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${step.status === 'failed' ? 'bg-rose-500' : 'bg-gradient-to-r from-brand-primary to-brand-secondary'}`}
                            style={{
                              width: `${Math.max(6, Math.min(100, Math.round((step.elapsedMs / totalDuration) * 100)))}%`
                            }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span>{step.phase.toUpperCase()}</span>
                          <span>{step.elapsedMs}ms</span>
                        </div>
                      </div>
                    ))}
                    {timelineSource.length === 0 && (
                      <p className="text-xs text-slate-500">
                        Boot trace will appear here as startup progresses.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.35em] text-slate-500">
                        Diagnostics
                      </p>
                      <h2 className="text-xl font-semibold text-white">Startup metrics</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
                        {phase.toUpperCase()}
                      </span>
                      {safeMode && (
                        <span className="inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-amber-300">
                          SAFE START
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 text-slate-300">
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Cold start</span>
                        <span>{metrics.coldStartMs ? `${metrics.coldStartMs}ms` : '--'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Renderer mount</span>
                        <span>{metrics.rendererBootMs ? `${metrics.rendererBootMs}ms` : '--'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Shell ready</span>
                        <span>{metrics.shellReadyMs ? `${metrics.shellReadyMs}ms` : '--'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Ready</span>
                        <span>{metrics.readyMs ? `${metrics.readyMs}ms` : '--'}</span>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500">
                      Progress is broken into renderer, critical, optional and background layers for
                      a production-grade desktop launch experience.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
