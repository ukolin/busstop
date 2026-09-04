import { BusStop, DepartureItem, BusCompany, CompactRouteSchedule, CompactBusStopTimes } from '../types';
import { setCachedTimetable, getCachedTimetable } from './timetableService';

export interface GtfsStopTimeRow {
  tripId: string;
  arrivalTime: string;
  departureTime: string;
  stopId: string;
  stopSequence: number;
  stopHeadsign: string;
  pickupType: number;
  dropOffType: number;
}

export const SAMPLE_GTFS_STOP_TIMES = `333ae5bf-f4d7-4273-b70b-0021875d3e62,07:54:00,07:54:00,73390 0,1,広島駅,0,1,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,07:54:00,07:54:00,73950 0,2,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,07:55:00,07:55:00,73940 0,3,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,07:56:00,07:56:00,74200 0,4,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,07:56:00,07:56:00,73990 0,5,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,07:57:00,07:57:00,71460 0,6,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,07:58:00,07:58:00,73980 0,7,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,08:03:00,08:03:00,47014 0,8,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,08:05:00,08:05:00,70350 0,9,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,08:07:00,08:07:00,70347 0,10,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,08:09:00,08:09:00,73400 0,11,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,08:13:00,08:13:00,71760 0,12,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,08:15:00,08:15:00,73280 0,13,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,08:16:00,08:16:00,72090 0,14,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,08:19:00,08:19:00,50350 0,15,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,08:20:00,08:20:00,50340 0,16,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,08:22:00,08:22:00,50320 0,17,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,08:25:00,08:25:00,50020 5,18,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,08:27:00,08:27:00,50030 4,19,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,08:28:00,08:28:00,50040 0,20,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,08:30:00,08:30:00,50050 0,21,広島駅,0,0,,
333ae5bf-f4d7-4273-b70b-0021875d3e62,08:40:00,08:40:00,50060 5,22,広島駅,1,0,,`;

// Parse CSV text formatted as GTFS stop_times.txt into GtfsStopTimeRow array
export function parseGtfsStopTimesCsv(csvText: string): GtfsStopTimeRow[] {
  const lines = csvText.trim().split('\n');
  const rows: GtfsStopTimeRow[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    // Skip header line if present
    if (line.toLowerCase().startsWith('trip_id')) continue;

    const cols = line.split(',');
    if (cols.length < 5) continue;

    const tripId = cols[0]?.trim() || '';
    const arrivalTime = cols[1]?.trim() || '';
    const departureTime = cols[2]?.trim() || arrivalTime;
    const stopId = cols[3]?.trim() || '';
    const stopSequence = parseInt(cols[4]?.trim() || '0', 10);
    const stopHeadsign = cols[5]?.trim() || '';
    const pickupType = parseInt(cols[6]?.trim() || '0', 10);
    const dropOffType = parseInt(cols[7]?.trim() || '0', 10);

    if (!tripId || !departureTime || !stopId) continue;

    rows.push({
      tripId,
      arrivalTime,
      departureTime,
      stopId,
      stopSequence,
      stopHeadsign,
      pickupType,
      dropOffType,
    });
  }

  return rows;
}

// Convert "HH:MM:SS" or "HH:MM" to 5-char "HH:MM"
export function formatGtfsTime(timeStr: string): string {
  if (!timeStr) return '00:00';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return timeStr;
}

// Determine route metadata from trip/headsign/stopIds
export function inferRouteInfo(rows: GtfsStopTimeRow[]): {
  routeNumber: string;
  company: BusCompany;
  companyColor: string;
  destination: string;
  via: string;
} {
  const lastRow = rows[rows.length - 1];
  const destName = lastRow?.stopHeadsign || '広島駅';
  const destFormatted = destName.endsWith('行') ? destName : `${destName}行`;

  const stopIdString = rows.map((r) => r.stopId).join(' ');

  // Hiroshima Bus 21 Ujina Line check (e.g. 73390, 73950, 47014, 70350, 73400)
  if (
    stopIdString.includes('73390') ||
    stopIdString.includes('73950') ||
    stopIdString.includes('47014') ||
    stopIdString.includes('70350') ||
    stopIdString.includes('73400')
  ) {
    return {
      routeNumber: '21号 宇品線',
      company: '広島バス',
      companyColor: '#dc2626',
      destination: destFormatted,
      via: '宇品西・市役所前・八丁堀経由',
    };
  }

  // Hiroden 3rd line check
  if (destFormatted.includes('マリーナホップ') || destFormatted.includes('観音')) {
    return {
      routeNumber: '3号線',
      company: '広電バス',
      companyColor: '#16a34a',
      destination: destFormatted,
      via: '紙屋町・市役所前・舟入経由',
    };
  }

  // Hiroden Ekimachi loop line
  if (destFormatted.includes('循環') || destFormatted.includes('エキまち')) {
    return {
      routeNumber: '101号 エキまちループ',
      company: '広電バス',
      companyColor: '#0284c7',
      destination: destFormatted,
      via: '八丁堀・本通・白神社前経由',
    };
  }

  // Hiroshima bus 24 Yoshijima line
  if (destFormatted.includes('吉島')) {
    return {
      routeNumber: '24号 吉島線',
      company: '広島バス',
      companyColor: '#dc2626',
      destination: destFormatted,
      via: '平和記念公園・加古町経由',
    };
  }

  // Hiroshima bus 25 Kusatsu line
  if (destFormatted.includes('草津') || destFormatted.includes('アルパーク') || destFormatted.includes('井口')) {
    return {
      routeNumber: '25号 草津線',
      company: '広島バス',
      companyColor: '#dc2626',
      destination: destFormatted,
      via: '平和大通り・庚午経由',
    };
  }

  // Default Hiroden route
  return {
    routeNumber: '市内幹線バス',
    company: '広電バス',
    companyColor: '#16a34a',
    destination: destFormatted,
    via: '主要幹線経由',
  };
}

// Map GTFS stop_times into structured DepartureItems grouped by stop ID
export function convertGtfsStopTimesToJson(csvText: string): {
  tripRows: GtfsStopTimeRow[];
  timetableByStopId: Map<string, DepartureItem[]>;
  allDepartureItems: Array<DepartureItem & { stopId: string; stopSequence: number }>;
} {
  const rows = parseGtfsStopTimesCsv(csvText);
  // Group by tripId
  const tripGroups = new Map<string, GtfsStopTimeRow[]>();
  for (const row of rows) {
    if (!tripGroups.has(row.tripId)) {
      tripGroups.set(row.tripId, []);
    }
    tripGroups.get(row.tripId)!.push(row);
  }

  const timetableByStopId = new Map<string, DepartureItem[]>();
  const allDepartureItems: Array<DepartureItem & { stopId: string; stopSequence: number }> = [];

  tripGroups.forEach((tripRows, tripId) => {
    // Sort by sequence
    tripRows.sort((a, b) => a.stopSequence - b.stopSequence);
    const routeInfo = inferRouteInfo(tripRows);

    tripRows.forEach((row, rIdx) => {
      const scheduledTime = formatGtfsTime(row.departureTime);

      const deptItem: DepartureItem = {
        id: `t-${tripId.replace(/[^a-zA-Z0-9_-]/g, '_')}-seq${row.stopSequence}-${scheduledTime.replace(':', '')}-${rIdx}`,
        routeNumber: routeInfo.routeNumber,
        company: routeInfo.company,
        companyColor: routeInfo.companyColor,
        destination: routeInfo.destination,
        via: routeInfo.via,
        scheduledTime,
        minutesAway: 0,
        delayMinutes: 0,
        status: 'on_time',
        congestion: 'low',
        barrierFree: true,
        busId: `bus-gtfs-${tripId.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      };

      // Store by normalized stop_id variants (e.g., "73390 0", "73390-0", "stop-hb-73390-0")
      const normalizedIds = [
        row.stopId,
        row.stopId.replace(/\s+/g, '-'),
        `stop-hb-${row.stopId.replace(/\s+/g, '-')}`,
        `stop-hd-${row.stopId.replace(/\s+/g, '-')}`,
        `stop-${row.stopId.replace(/\s+/g, '-')}`,
      ];

      for (const nid of normalizedIds) {
        if (!timetableByStopId.has(nid)) {
          timetableByStopId.set(nid, []);
        }
        timetableByStopId.get(nid)!.push(deptItem);
      }

      allDepartureItems.push({
        ...deptItem,
        stopId: row.stopId,
        stopSequence: row.stopSequence,
      });
    });
  });

  return {
    tripRows: rows,
    timetableByStopId,
    allDepartureItems,
  };
}

// Apply converted GTFS stop_times directly into an array of BusStops and timetable cache
export function applyGtfsStopTimesToStops(stops: BusStop[], csvText: string): BusStop[] {
  const { timetableByStopId } = convertGtfsStopTimesToJson(csvText);

  let appliedCount = 0;
  const updatedStops = stops.map((stop) => {
    // Check if this stop matches any GTFS stop_id
    const matchingDepartures =
      timetableByStopId.get(stop.id) ||
      timetableByStopId.get(stop.id.replace(/^stop-(hb|hd)-/, '')) ||
      timetableByStopId.get(stop.id.replace(/^stop-/, '')) ||
      [];

    if (matchingDepartures.length === 0) {
      return stop;
    }

    appliedCount++;
    const cached = getCachedTimetable(stop.id) || stop.timetable || [];
    // Merge new GTFS departures with existing timetable without duplicate IDs
    const existingIds = new Set(matchingDepartures.map((d) => d.id));
    const merged = [
      ...matchingDepartures,
      ...cached.filter((d) => !existingIds.has(d.id)),
    ];

    // Sort by scheduled time "HH:MM"
    merged.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    // Update timetable cache for fast on-demand access
    setCachedTimetable(stop.id, merged);

    // Update stop routes set
    const routesSet = new Set(stop.routes || []);
    matchingDepartures.forEach((d) => {
      if (d.routeNumber) routesSet.add(d.routeNumber);
    });

    return {
      ...stop,
      routes: Array.from(routesSet),
      timetableCount: merged.length,
      timetable: merged,
    };
  });

  console.log(`Applied GTFS stop_times to ${appliedCount} bus stops.`);
  return updatedStops;
}

/**
 * Convert raw_stop_times.csv text into clean, compact busStopTimes.json dictionary (grouped by route & destination)
 */
export function convertRawStopTimesToBusStopTimesJson(csvText: string): CompactBusStopTimes {
  const rows = parseGtfsStopTimesCsv(csvText);
  const { timetableByStopId } = convertGtfsStopTimesToJson(csvText);
  const result: CompactBusStopTimes = {};

  timetableByStopId.forEach((items, stopId) => {
    const routeGroups = new Map<string, {
      route: string;
      destination: string;
      via?: string;
      company: BusCompany;
      color: string;
      timesSet: Set<string>;
    }>();

    items.forEach((item) => {
      const key = `${item.routeNumber}__${item.destination}__${item.company}`;
      if (!routeGroups.has(key)) {
        routeGroups.set(key, {
          route: item.routeNumber,
          destination: item.destination,
          via: item.via,
          company: item.company,
          color: item.companyColor,
          timesSet: new Set(),
        });
      }
      routeGroups.get(key)!.timesSet.add(item.scheduledTime);
    });

    const schedules: CompactRouteSchedule[] = [];
    routeGroups.forEach((g) => {
      const sortedTimes = Array.from(g.timesSet).sort((a, b) => a.localeCompare(b));
      schedules.push({
        route: g.route,
        destination: g.destination,
        via: g.via,
        company: g.company,
        color: g.color,
        times: sortedTimes,
      });
    });

    schedules.sort((a, b) => a.route.localeCompare(b.route, 'ja'));
    result[stopId] = schedules;
  });

  return result;
}

/**
 * Split a unified CompactBusStopTimes object into individual company-specific maps:
 * { '広電バス': CompactBusStopTimes, '広島バス': CompactBusStopTimes, ... }
 */
export function splitBusStopTimesByCompany(
  fullMap: CompactBusStopTimes
): Record<BusCompany, CompactBusStopTimes> {
  const result: Record<BusCompany, CompactBusStopTimes> = {
    '広電バス': {},
    '広島バス': {},
    '広島交通': {},
    'JRバス中国': {},
  };

  Object.entries(fullMap).forEach(([stopId, schedules]) => {
    if (!Array.isArray(schedules)) return;

    schedules.forEach((schedule) => {
      const comp = schedule.company || '広電バス';
      if (!result[comp]) {
        result[comp] = {};
      }
      if (!result[comp][stopId]) {
        result[comp][stopId] = [];
      }
      result[comp][stopId].push(schedule);
    });
  });

  return result;
}


