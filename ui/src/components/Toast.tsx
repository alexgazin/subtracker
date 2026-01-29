import React from 'react';

export type ToastItem = { id: string; message: string; actionLabel?: string; onAction?: () => void };

export default function Toasts() {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    (window as any)._toasts = {
      push: (t: ToastItem) => setItems(s => [...s, t]),
      remove: (id: string) => setItems(s => s.filter(x => x.id !== id))
    }
  }, []);

  return (
    <div className="toasts" aria-live="polite" aria-atomic="true">
      {items.map(it => (
        <div key={it.id} className="toast">
          <div className="toast-msg">{it.message}</div>
          {it.onAction && it.actionLabel && <button className="toast-action" onClick={() => { it.onAction && it.onAction(); (window as any)._toasts.remove(it.id); }}>{it.actionLabel}</button>}
          <button className="toast-close" onClick={() => (window as any)._toasts.remove(it.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
