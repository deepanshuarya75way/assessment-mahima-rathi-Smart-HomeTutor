/**
 * Utility functions for checking whether a scheduled class or demo session
 * is currently active, upcoming in the future, or past/completed.
 */

/**
 * Parses date + startTime / endTime string into exact JavaScript Date object
 * explicitly in Indian Standard Time (IST, UTC+05:30).
 * Prevents OS/browser timezone differences across devices and servers.
 */
export const parseScheduleTime = (baseDate, timeStr) => {
  if (!baseDate) return new Date();
  const rawDate = typeof baseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(baseDate.trim())
    ? new Date(`${baseDate.trim()}T00:00:00+05:30`)
    : new Date(baseDate);

  if (isNaN(rawDate.getTime())) return new Date();

  // Extract YYYY, MM, DD in IST (Asia/Kolkata) timezone
  const istFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Format returns "YYYY-MM-DD"
  const dateParts = istFormatter.format(rawDate);

  let hours = 18;
  let minutes = 0;

  if (timeStr) {
    const str = String(timeStr).trim();
    // 12-hour format: e.g. "06:00 PM"
    const twelveMatch = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (twelveMatch) {
      hours = parseInt(twelveMatch[1], 10);
      minutes = parseInt(twelveMatch[2], 10);
      const ampm = twelveMatch[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    } else {
      // 24-hour format: e.g. "18:00"
      const twentyFourMatch = str.match(/^(\d{1,2}):(\d{2})$/);
      if (twentyFourMatch) {
        hours = parseInt(twentyFourMatch[1], 10);
        minutes = parseInt(twentyFourMatch[2], 10);
      }
    }
  }

  const pad = (num) => String(num).padStart(2, '0');
  const isoISTString = `${dateParts}T${pad(hours)}:${pad(minutes)}:00+05:30`;
  return new Date(isoISTString);
};

export const format12HourTime = (timeStr) => {
  if (!timeStr) return '06:00 PM';
  const str = String(timeStr).trim();

  const twelveMatch = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveMatch) return str;

  const twentyFourMatch = str.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    let hours = parseInt(twentyFourMatch[1], 10);
    const minutes = twentyFourMatch[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    return `${formattedHours}:${minutes} ${ampm}`;
  }

  return str;
};

export const checkClassJoinable = (date, startTime, endTime, status) => {
  const inactiveStatuses = ['Completed', 'Cancelled', 'Discontinued', 'Rejected', 'Rejected by Admin', 'Rejected by Tutor', 'Missed'];
  if (inactiveStatuses.includes(status)) {
    return {
      canJoin: false,
      isPast: true,
      isFuture: false,
      statusLabel: status === 'Completed' ? 'Completed' : status,
      actionNote: status === 'Completed' ? 'Session Completed' : 'Session Inactive',
    };
  }

  if (!date) {
    return {
      canJoin: true,
      isPast: false,
      isFuture: false,
      statusLabel: status || 'Scheduled',
      actionNote: 'Ready to Join',
    };
  }

  const sStart = startTime || '18:00';
  const sEnd = endTime || '19:00';

  const startDateTime = parseScheduleTime(date, sStart);
  const endDateTime = parseScheduleTime(date, sEnd);
  const now = new Date();

  // Allow joining from 15 minutes before start time until 60 minutes after end time
  const joinWindowStart = new Date(startDateTime.getTime() - 15 * 60 * 1000);
  const joinWindowEnd = new Date(endDateTime.getTime() + 60 * 60 * 1000);

  const formattedDate = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const formattedStartTime = format12HourTime(sStart);

  if (now < joinWindowStart) {
    return {
      canJoin: false,
      isFuture: true,
      isPast: false,
      statusLabel: 'Scheduled',
      actionNote: `Available ${formattedDate} at ${formattedStartTime}`,
      joinWindowStart,
    };
  }

  if (now > joinWindowEnd) {
    return {
      canJoin: false,
      isFuture: false,
      isPast: true,
      statusLabel: 'Past Class',
      actionNote: 'Scheduled Time Passed',
    };
  }

  return {
    canJoin: true,
    isFuture: false,
    isPast: false,
    statusLabel: 'Active / Live Now',
    actionNote: 'Live Now',
  };
};
