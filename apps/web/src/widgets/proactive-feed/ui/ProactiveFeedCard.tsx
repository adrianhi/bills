import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Sparkles,
  Tag,
  TrendingUp,
  X,
} from 'lucide-react';
import type { ProactiveActionDto, ProactiveFeedDto } from '@/entities/proactive';
import { Button, Card, CardContent } from '@/shared/ui';
import type { QuickTriageItem } from '@/features/quick-triage';

interface ProactiveFeedCardProps {
  feed: ProactiveFeedDto | null;
  loading: boolean;
  onDismiss: (actionId: string) => void;
  onNavigateBudget: () => void;
  onNavigateRecurring: () => void;
  onQuickCategorize: (items: QuickTriageItem[]) => void;
  onOpenWeeklyCheckin?: () => void;
}

function ActionIcon({ kind, priority }: { kind: ProactiveActionDto['kind']; priority: ProactiveActionDto['priority'] }) {
  if (kind === 'WEEKLY_CHECKIN') {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
        <Sparkles className="h-4 w-4" />
      </span>
    );
  }
  if (kind === 'IMMINENT_BILL') {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <CalendarClock className="h-4 w-4" />
      </span>
    );
  }
  if (kind === 'BUDGET_PACING_RISK') {
    const isHigh = priority === 'HIGH';
    return (
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
          isHigh ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
        }`}
      >
        <AlertTriangle className="h-4 w-4" />
      </span>
    );
  }
  if (kind === 'UNCLASSIFIED_EXPENSES') {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
        <Tag className="h-4 w-4" />
      </span>
    );
  }
  if (kind === 'PRICE_HIKE') {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-600 dark:text-red-400">
        <TrendingUp className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
      <Sparkles className="h-4 w-4" />
    </span>
  );
}

export function ProactiveFeedCard(props: ProactiveFeedCardProps) {
  if (props.loading) {
    return <div className="h-28 animate-pulse rounded-2xl bg-muted" />;
  }

  const feed = props.feed;
  if (!feed || feed.actions.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="font-medium">
          Todo en orden hoy · Tus cobros fijos y presupuestos van al día.
        </span>
      </div>
    );
  }

  const handleActionClick = (action: ProactiveActionDto) => {
    if (action.actionType === 'QUICK_CATEGORIZE') {
      const sample = (action.metadata?.sample as QuickTriageItem[]) || [];
      props.onQuickCategorize(sample);
    } else if (action.actionType === 'OPEN_WEEKLY_CHECKIN') {
      props.onOpenWeeklyCheckin?.();
    } else if (action.actionType === 'NAVIGATE_RECURRING') {
      props.onNavigateRecurring();
    } else if (action.actionType === 'NAVIGATE_BUDGET' || action.actionType === 'VIEW_OVERVIEW') {
      props.onNavigateBudget();
    }
  };

  return (
    <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/5 via-card to-background shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold tracking-tight">Tu copiloto hoy</h3>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
            {feed.actions.length} {feed.actions.length === 1 ? 'sugerencia' : 'sugerencias'}
          </span>
        </div>

        <div className="space-y-2.5">
          {feed.actions.map((action: ProactiveActionDto) => (
            <div
              key={action.id}
              className="group relative flex flex-col justify-between gap-3 rounded-xl border border-border/70 bg-card/80 p-3.5 transition-all hover:border-primary/40 sm:flex-row sm:items-center"
            >
              <div className="flex items-start gap-3 min-w-0">
                <ActionIcon kind={action.kind} priority={action.priority} />
                <div className="min-w-0 pr-6 sm:pr-0">
                  <p className="text-xs font-bold sm:text-sm text-foreground">
                    {action.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 sm:pt-0 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleActionClick(action)}
                  className="h-8 gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary"
                >
                  {action.ctaLabel}
                  <ArrowRight className="h-3 w-3" />
                </Button>

                {action.dismissible && (
                  <button
                    type="button"
                    onClick={() => props.onDismiss(action.id)}
                    className="absolute top-2 right-2 rounded-lg p-1 text-muted-foreground/60 transition hover:bg-muted hover:text-foreground sm:static"
                    aria-label="Descartar sugerencia"
                    title="Descartar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
