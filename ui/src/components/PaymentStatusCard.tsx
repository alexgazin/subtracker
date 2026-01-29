import React from 'react';
import { track } from '../lib/tracker';

export type InboxCard = {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  date: Date;
  confidence?: 'low'|'medium'|'high';
  detected?: boolean;
}

type Props = {
  card: InboxCard;
  onAction: (id: string, status: 'paid'|'failed'|'canceled') => void;
  onSnooze: (id: string) => void;
  onUndo?: (id: string) => void;
}

export default function PaymentStatusCard({ card, onAction, onSnooze, onUndo }: Props) {
  const [expanded, setExpanded] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState<null | 'paid'|'failed'|'canceled'>(null);
  const [undoTimer, setUndoTimer] = React.useState<number | null>(null);
  const [undoCountdown, setUndoCountdown] = React.useState<number>(15);
  const countdownRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    track('inbox_card_shown', { id: card.id, merchant: card.merchant, confidence: card.confidence });
    return () => {
      if (undoTimer) window.clearTimeout(undoTimer);
      if (countdownRef.current) window.clearInterval(countdownRef.current);
    }
  }, []);

  const suggested: 'paid'|'failed'|'canceled' = card.confidence === 'high' && card.detected ? 'paid' : (card.confidence === 'medium' ? 'failed' : 'paid');

  function pushToast(t: { message: string; actionLabel?: string; onAction?: () => void }){
    const id = Math.random().toString(36).slice(2);
    (window as any)._toasts && (window as any)._toasts.push({ id, message: t.message, actionLabel: t.actionLabel, onAction: t.onAction });
    return id;
  }

  function confirm(status: 'paid'|'failed'|'canceled') {
    setConfirmed(status);
    track('inbox_card_action_clicked', { id: card.id, status });

    // optimistic UI: small delay for transition then call onAction
    const t = window.setTimeout(() => {
      onAction(card.id, status);
    }, 300);

    // start undo countdown
    setUndoCountdown(15);
    countdownRef.current = window.setInterval(() => {
      setUndoCountdown(c => {
        if (c <= 1) {
          if (countdownRef.current) window.clearInterval(countdownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    const u = window.setTimeout(() => {
      // finalise: close undo window
      setUndoTimer(null);
      if (countdownRef.current) window.clearInterval(countdownRef.current);
    }, 15000);

    setUndoTimer(u);

    // show toast with undo action
    pushToast({ message: `${card.merchant} • ${card.amount.toFixed(2)} ${card.currency} — recorded`, actionLabel: 'Undo', onAction: () => undo() });

    return () => { window.clearTimeout(t); window.clearTimeout(u); };
  }

  function undo() {
    if (undoTimer) {
      window.clearTimeout(undoTimer);
      setUndoTimer(null);
    }
    if (countdownRef.current) window.clearInterval(countdownRef.current);
    track('inbox_card_undo', { id: card.id });
    setConfirmed(null);
    // notify parent to call undo API or revert
    onUndo && onUndo(card.id);
  }

  function toggleExpand() {
    setExpanded(x => !x);
    track('inbox_card_expanded', { id: card.id, expanded: !expanded });
  }

  function snooze() {
    track('inbox_card_dismissed', { id: card.id });
    onSnooze(card.id);
  }

  const timeAgo = (() => {
    const d = Date.now() - card.date.getTime();
    const days = Math.floor(d / (1000*60*60*24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  })();

  // keyboard handler for segmented control
  function onPillKeyDown(e: React.KeyboardEvent, status: 'paid'|'failed'|'canceled'){
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      confirm(status);
    }
  }

  return (
    <article className={`psc ${expanded ? 'expanded' : 'compact'} ${confirmed ? 'confirmed' : ''}`} aria-labelledby={`psc-${card.id}-title`}>
      <header className="psc-header">
        <div className="merchant">
          <div className="icon" aria-hidden>🧾</div>
          <div>
            <div id={`psc-${card.id}-title`} className="merchant-name">{card.merchant}</div>
            <div className="meta">{card.amount.toFixed(2)} {card.currency} • {timeAgo}</div>
          </div>
        </div>
        <div className="actions-overflow">
          <button className="btn-ellipsis" aria-label="More options">⋯</button>
        </div>
      </header>

      <div className="psc-body">
        {!confirmed && (
          <div className="segmented" role="radiogroup" aria-label="Payment actions">
            <button role="radio" aria-checked={false} tabIndex={0} className={`pill ${suggested === 'paid' ? 'primary' : ''}`} onClick={() => confirm('paid')} onKeyDown={(e) => onPillKeyDown(e, 'paid')}>Paid successfully</button>
            <button role="radio" aria-checked={false} tabIndex={0} className={`pill ${suggested === 'failed' ? 'primary' : ''}`} onClick={() => confirm('failed')} onKeyDown={(e) => onPillKeyDown(e, 'failed')}>Failed / declined</button>
            <button role="radio" aria-checked={false} tabIndex={0} className={`pill ${suggested === 'canceled' ? 'primary' : ''}`} onClick={() => confirm('canceled')} onKeyDown={(e) => onPillKeyDown(e, 'canceled')}>Canceled subscription</button>
          </div>
        )}

        {confirmed && (
          <div className="confirmed-row">
            <div className="status-badge">{confirmed === 'paid' ? 'Paid' : confirmed === 'failed' ? 'Failed' : 'Canceled' } ✓</div>
            {undoTimer && <button className="undo" onClick={undo}>Undo • {undoCountdown}s</button>}
          </div>
        )}

        <div className="footer">
          <button className="btn-link" onClick={toggleExpand} aria-expanded={expanded}>{expanded ? 'Hide details' : 'Not sure'}</button>
          <button className="btn-link" onClick={snooze}>Not now</button>
        </div>

        {expanded && (
          <div className="expanded-panel">
            <p className="helper">This updates reminders and insights. If failed, you can add a reason below.</p>
            <div className="followups">
              {confirmed === 'failed' && (
                <>
                  <button className="chip">Card expired</button>
                  <button className="chip">Insufficient funds</button>
                  <button className="chip">Merchant issue</button>
                </>
              )}

              <button className="chip">Report wrong subscription</button>
            </div>

            <div className="edit-details">
              <button className="btn-outline">Edit details</button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
