/**
 * Normalisasi nomor WhatsApp Indonesia ke format internasional digits-only.
 *  0812-3456-7890 -> 6281234567890
 *  +62 812 ...    -> 62812...
 *  812...         -> 62812...
 */
export function normalizePhone(raw: string): string {
  let digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return digits;
  if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith('62')) {
    // sudah internasional
  } else if (digits.startsWith('8')) {
    digits = `62${digits}`;
  }
  return digits;
}

/** Nomor -> JID chat pribadi WhatsApp. */
export function toJid(phone: string): string {
  return `${normalizePhone(phone)}@s.whatsapp.net`;
}

/** JID -> digits nomor (menangani "628xx:12@s.whatsapp.net" dsb). */
export function jidToPhone(jid: string): string {
  const user = jid.split('@')[0] ?? '';
  const phone = user.split(':')[0] ?? '';
  return phone.replace(/\D/g, '');
}

export function isPrivateChatJid(jid: string | null | undefined): jid is string {
  return typeof jid === 'string' && jid.endsWith('@s.whatsapp.net');
}
