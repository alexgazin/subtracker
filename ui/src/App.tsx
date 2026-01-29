import React from 'react';
import PaymentStatusCard, { InboxCard } from './components/PaymentStatusCard';
import Toasts from './components/Toast';
import { confirmPayment, undoConfirm, snoozeCard } from './lib/api';

const MOCK: InboxCard[] = [
  {
    id: '1', merchant: 'Spotify', amount: 9.99, currency: 'USD', date: new Date(Date.now() - 1000 * 60 * 60 * 24), confidence: 'high', detected: true
  },
  {
    id: '2', merchant: 'Netflix', amount: 13.99, currency: 'USD', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), confidence: 'medium', detected: true
  },
  {
    id: '3', merchant: 'Notion', amount: 4, currency: 'USD', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8), confidence: 'low', detected: false
  }
];

export default function App() {
  const [cards, setCards] = React.useState(MOCK);

  async function handleAction(id: string, status: string) {
    console.log('client: handleAction', id, status);
    // optimistic removal handled by card after short animation; here call API
    try {
      await confirmPayment({ cardId: id, status: status as any, confidence: 'manual' });
      console.log('confirmed', id, status);
    } catch (err: any) {
      // show toast with retry
      const idToast = Math.random().toString(36).slice(2);
      (window as any)._toasts && (window as any)._toasts.push({ id: idToast, message: 'Failed to confirm — retry?', actionLabel: 'Retry', onAction: () => handleAction(id, status) });
      console.error('confirm error', err);
    }

    // finally remove local card for demo
    setCards(prev => prev.filter(c => c.id !== id));
  }

  async function handleUndo(id: string) {
    try {
      await undoConfirm(id);
      console.log('undo OK', id);
      // for demo, re-add a placeholder card
      setCards(prev => [{ id, merchant: 'Unknown', amount: 0, currency: 'USD', date: new Date() }, ...prev]);
    } catch (err) {
      console.error('undo error', err);
    }
  }

  async function handleSnooze(id: string) {
    try {
      await snoozeCard(id);
    } catch (err) {
      console.error('snooze err', err);
    }
    setCards(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div className="app">
      <h1>Payments Inbox</h1>
      <section className="needs-confirmation">
        <h2>Needs confirmation</h2>
        <div className="list">
          {cards.map(c => (
            <PaymentStatusCard key={c.id} card={c} onAction={handleAction} onSnooze={handleSnooze} onUndo={handleUndo} />
          ))}
        </div>
      </section>
      <Toasts />
    </div>
  );
}
