export type ConfirmPayload = { cardId: string; status: 'paid'|'failed'|'canceled'; confidence?: string };

const MOCK_MODE = true; // set to false to call real backend
const BASE = '/api'; // change to your backend base

export async function confirmPayment(payload: ConfirmPayload) {
  if (MOCK_MODE) {
    console.log('[api] mock confirm', payload);
    // simulate latency and occasional failure
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
    if (Math.random() < 0.05) throw new Error('Network error');
    return { ok: true, id: payload.cardId, status: payload.status };
  }

  const res = await fetch(`${BASE}/inbox/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function undoConfirm(cardId: string) {
  if (MOCK_MODE) {
    console.log('[api] mock undo', cardId);
    await new Promise(r => setTimeout(r, 300));
    return { ok: true };
  }

  const res = await fetch(`${BASE}/inbox/undo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId }) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function snoozeCard(cardId: string, until?: string) {
  if (MOCK_MODE) {
    console.log('[api] mock snooze', cardId, until);
    await new Promise(r => setTimeout(r, 200));
    return { ok: true };
  }

  const res = await fetch(`${BASE}/inbox/snooze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId, until }) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
