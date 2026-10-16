/**
 * Formats phone number for WhatsApp URL (handles 10-digit Indian numbers by prefixing 91).
 */
export function formatWhatsAppNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.substring(1)}`;
  }
  if (digits.length >= 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

/**
 * Returns effective WhatsApp number, falling back to regular phone if not explicitly set.
 */
export function getEffectiveWhatsAppNumber(whatsapp?: string, phone?: string): string {
  const primary = (whatsapp || '').trim();
  if (primary) return primary;
  return (phone || '').trim();
}

/**
 * Clean visual display format e.g. "+91 98230 12345"
 */
export function formatDisplayPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.substring(0, 5)} ${digits.substring(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.substring(2, 7)} ${digits.substring(7)}`;
  }
  return rawPhone;
}

/**
 * Opens WhatsApp chat with pre-filled message.
 */
export function openWhatsApp(rawPhone: string, message: string): void {
  const cleanNumber = formatWhatsAppNumber(rawPhone);
  if (!cleanNumber) {
    alert('WhatsApp number not available');
    return;
  }
  const encodedMsg = encodeURIComponent(message);
  const waUrl = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Triggers native phone dialer.
 */
export function dialPhone(rawPhone: string): void {
  if (!rawPhone) return;
  window.location.href = `tel:${rawPhone}`;
}

/**
 * Opens Google Maps Navigation.
 */
export function openGoogleMaps(latitude: number, longitude: number, title?: string): void {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
