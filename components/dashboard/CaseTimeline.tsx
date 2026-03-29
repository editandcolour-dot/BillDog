import { CaseEvent } from '@/types';
import { 
  FileUp, 
  Cpu, 
  FileText, 
  Send, 
  Mail, 
  AlertTriangle, 
  CheckCircle,
  CreditCard,
  CircleDot
} from 'lucide-react';

export function CaseTimeline({ events }: { events: CaseEvent[] }) {
  // Sort events chronologically (oldest at the top, or newest at the top, usually chronologically ascending is better for a story)
  // Let's sort oldest first for a literal timeline, latest at the bottom.
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="relative pl-6 md:pl-8 space-y-6">
      {/* Vertical tracking line */}
      <div className="absolute left-0 top-3 bottom-0 w-0.5 bg-light-grey rounded-full" />

      {sortedEvents.map((event, idx) => {
        const isLast = idx === sortedEvents.length - 1;
        return (
          <div key={event.id} className="relative group">
            <TimelineIcon eventType={event.event_type} isLast={isLast} />
            
            <div className="bg-white border border-light-grey rounded-xl p-4 ml-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start flex-col sm:flex-row gap-2 mb-2">
                <h4 className="font-display tracking-wide text-lg text-navy uppercase">
                  {formatEventTitle(event.event_type)}
                </h4>
                <time className="text-xs font-body text-grey uppercase tracking-wide">
                  {new Intl.DateTimeFormat('en-ZA', { 
                    dateStyle: 'medium', 
                    timeStyle: 'short' 
                  }).format(new Date(event.created_at))}
                </time>
              </div>

              {event.note && (
                <p className="text-sm font-body text-grey leading-relaxed">
                  {event.note}
                </p>
              )}

              {event.metadata && <MetadataBadge metadata={event.metadata} eventType={event.event_type} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatEventTitle(type: string) {
  return type.replace(/_/g, ' ');
}

// Icon Mapping
function TimelineIcon({ eventType, isLast }: { eventType: string; isLast: boolean }) {
  let Icon = CircleDot;
  let colorClass = 'bg-off-white text-navy border-light-grey';

  switch (eventType) {
    case 'uploaded':
      Icon = FileUp;
       break;
    case 'analysed':
      Icon = Cpu;
      colorClass = 'bg-blue/10 text-blue border-blue/20';
      break;
    case 'letter_generated':
      Icon = FileText;
      break;
    case 'letter_sent':
      Icon = Send;
      colorClass = 'bg-blue text-white border-blue';
      break;
    case 'municipality_responded':
    case 'response_received':
      Icon = Mail;
      colorClass = 'bg-orange/10 text-orange border-orange/20';
      break;
    case 'escalated':
      Icon = AlertTriangle;
      colorClass = 'bg-error/10 text-error border-error/20';
      break;
    case 'resolved':
      Icon = CheckCircle;
      colorClass = 'bg-success/10 text-success border-success/20';
      break;
    case 'payment_charged':
      Icon = CreditCard;
      break;
  }

  // Draw pulse effect if this is the active (latest) step and it's not resolved
  const isPulsing = isLast && !['resolved', 'closed'].includes(eventType);

  return (
    <div className={`
      absolute -left-9 sm:-left-[44px] top-1 
      w-[26px] h-[26px] rounded-full border-2 
      flex items-center justify-center
      z-10 bg-white
      ${colorClass}
    `}>
      {isPulsing && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-20 animate-ping"></span>
      )}
      <Icon className="w-3.5 h-3.5" />
    </div>
  );
}

// Optional metadata parser for rich UI details (e.g. email snippets)
function MetadataBadge({ metadata, eventType }: { metadata: { recipient_type?: string, preview?: string, [key: string]: unknown }; eventType: string }) {
  if (eventType === 'letter_sent') {
    return (
      <div className="mt-3 inline-flex items-center gap-2 bg-blue/10 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide text-blue">
        <Send className="w-3 h-3" />
        {metadata.recipient_type || 'External Inbox'}
      </div>
    );
  }

  if (eventType === 'municipality_responded' && metadata.preview) {
    return (
      <div className="mt-3 p-3 bg-orange/5 border border-orange/10 rounded-md">
        <p className="text-xs uppercase tracking-wide font-bold text-orange mb-1">Response Snippet</p>
        <p className="text-sm font-body text-navy/80 italic line-clamp-3">&quot;{metadata.preview}&quot;</p>
      </div>
    );
  }

  return null;
}
