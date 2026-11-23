const inrFormatterWithDecimals = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrFormatterNoDecimals = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatINR(
  amount: number,
  options?: {
    showSign?: boolean;
    decimals?: number;
    masked?: boolean;
  }
): string {
  if (options?.masked) {
    return '₹••••••';
  }
  const abs = Math.abs(amount);
  const decimals = options?.decimals ?? 2;
  const formatted =
    decimals === 0
      ? inrFormatterNoDecimals.format(Math.round(abs))
      : inrFormatterWithDecimals.format(abs);

  const prefix = options?.showSign
    ? amount > 0
      ? '+'
      : amount < 0
      ? '-'
      : ''
    : amount < 0
    ? '-'
    : '';

  return `${prefix}₹${formatted}`;
}

export function splitINRParts(
  amount: number,
  masked = false
): { whole: string; fraction: string } {
  if (masked) {
    return { whole: '₹•,••,•••', fraction: '••' };
  }
  const abs = Math.abs(amount);
  const fixed = abs.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = inrFormatterNoDecimals.format(Number(intPart));
  return {
    whole: `${amount < 0 ? '-' : ''}₹${formattedInt}`,
    fraction: `.${decPart}`,
  };
}

export function getTimeGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatTopDate(date = new Date()): string {
  return date
    .toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
    .toUpperCase();
}

export function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDayGroupLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfTarget.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'YESTERDAY';
  return d
    .toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    .toUpperCase();
}

export function formatDateTimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function formatReadableDateTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfTarget.getTime()) / (1000 * 60 * 60 * 24)
  );
  const timeStr = formatTimeShort(iso);
  if (diffDays === 0) return `Today, ${timeStr}`;
  if (diffDays === 1) return `Yesterday, ${timeStr}`;
  return `${d.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  })}, ${timeStr}`;
}
