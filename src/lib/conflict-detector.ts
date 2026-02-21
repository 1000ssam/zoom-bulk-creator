import { ConflictGroup, ParsedMeeting } from './types';

function timesOverlap(a: ParsedMeeting, b: ParsedMeeting): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

export function detectConflicts(meetings: ParsedMeeting[]): {
  meetings: ParsedMeeting[];
  conflicts: ConflictGroup[];
} {
  // Group by category + date
  const groups = new Map<string, ParsedMeeting[]>();
  for (const meeting of meetings) {
    const key = `${meeting.category}|${meeting.date}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(meeting);
  }

  const conflictMap = new Map<number, Set<number>>(); // rowIndex → set of conflicting rowIndices
  const conflictGroups: ConflictGroup[] = [];

  for (const [, group] of groups) {
    if (group.length <= 1) continue;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (!timesOverlap(group[i], group[j])) continue;

        const ri = group[i].rowIndex;
        const rj = group[j].rowIndex;

        // Build conflict map
        if (!conflictMap.has(ri)) conflictMap.set(ri, new Set());
        if (!conflictMap.has(rj)) conflictMap.set(rj, new Set());
        conflictMap.get(ri)!.add(rj);
        conflictMap.get(rj)!.add(ri);

        // Add or merge into conflict groups
        const existing = conflictGroups.find(
          (c) =>
            c.category === group[i].category &&
            c.date === group[i].date &&
            c.rows.includes(ri)
        );
        if (existing) {
          if (!existing.rows.includes(rj)) existing.rows.push(rj);
        } else {
          conflictGroups.push({
            category: group[i].category,
            date: group[i].date,
            timeSlot: `${group[i].startTime}-${group[i].endTime}`,
            rows: [ri, rj],
          });
        }
      }
    }
  }

  // Update meetings with conflict info
  const updatedMeetings = meetings.map((m) => ({
    ...m,
    hasConflict: conflictMap.has(m.rowIndex),
    conflictWith: conflictMap.has(m.rowIndex)
      ? Array.from(conflictMap.get(m.rowIndex)!)
      : [],
  }));

  return { meetings: updatedMeetings, conflicts: conflictGroups };
}
