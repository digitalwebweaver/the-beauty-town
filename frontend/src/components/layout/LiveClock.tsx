import { useEffect, useState } from 'react';

// Always Asia/Kolkata regardless of the viewer's own device timezone — the
// salon operates in IST, so a staff member checking this while travelling
// still sees the salon's actual local time, not their own.
const TIME_FORMAT = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});
const DATE_FORMAT = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

interface LiveClockProps {
  className?: string;
}

function LiveClock({ className }: LiveClockProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={className}>
      <p className="text-sm font-semibold leading-tight tabular-nums">{TIME_FORMAT.format(now)}</p>
      <p className="text-[10px] leading-tight opacity-75">{DATE_FORMAT.format(now)} IST</p>
    </div>
  );
}

export default LiveClock;
