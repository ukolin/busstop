import { BusStop, DepartureItem, BusCompany, BusCompanyFilter, CompactRouteSchedule, CompactBusStopTimes } from '../types';

// In-memory cache for expanded stop timetables (DepartureItem[])
const timetableCache = new Map<string, DepartureItem[]>();

// In-memory cache for compact schedules
const compactCache = new Map<string, CompactRouteSchedule[]>();

// Keep track of in-flight fetch promises to avoid duplicate requests
const inFlightRequests = new Map<string, Promise<DepartureItem[]>>();

// Global promise for loading the full busStopTimes.json dataset
let fullBusStopTimesPromise: Promise<CompactBusStopTimes | null> | null = null;

// Company-specific dataset promises
const companyPromises = new Map<BusCompany, Promise<CompactBusStopTimes | null>>();

// Helper to get consistent brand color for bus companies
export function getCompanyColor(company?: string): string {
  if (!company) return '#16a34a';
  if (company === '広島バス' || company.includes('広島バス')) return '#dc2626';
  if (company === '広島交通' || company.includes('広島交通')) return '#ea580c';
  if (company === 'JRバス中国' || company.includes('JRバス')) return '#0284c7';
  return '#16a34a'; // 広電バス (Hiroden) default
}

// Helper to get safe base URL for fetching public assets on GitHub Pages
function getSafeBaseUrl(): string {
  let base = import.meta.env.BASE_URL || '/';
  if (base === './' || base === '.') {
    let path = window.location.pathname;
    if (!path.endsWith('/')) {
      path = path.substring(0, path.lastIndexOf('/') + 1);
    }
    return path;
  }
  return base;
}

// Company specific JSON file map (Hiroden and Hiroshima Bus split datasets)
export const COMPANY_JSON_FILES: Record<BusCompany, string[]> = {
  '広電バス': [`data/timetables_hiroshimadentetsu.json?v=1.0.2`, `data/busStopTimes_hiroshimadentetsu.json?v=1.0.2`],
  '広島バス': [`data/timetables_hiroshimabus.json?v=1.0.2`, `data/busStopTimes_hiroshimabus.json?v=1.0.2`],
  '広島交通': [],
  'JRバス中国': [],
};

export interface JapanTimeInfo {
  hours: number;
  minutes: number;
  totalMinutes: number; // 0..1439
  timeString: string;   // "HH:MM"
  isOffPeakNight: boolean; // between 23:30 and 05:45
}

/**
 * Get current time in Japan Standard Time (Asia/Tokyo)
 * or calculate custom simulated minute of day
 */
export function getJapanCurrentTime(customMinutes?: number | null): JapanTimeInfo {
  if (typeof customMinutes === 'number' && !isNaN(customMinutes)) {
    const norm = ((customMinutes % 1440) + 1440) % 1440;
    const hours = Math.floor(norm / 60);
    const minutes = norm % 60;
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return {
      hours,
      minutes,
      totalMinutes: norm,
      timeString,
      isOffPeakNight: norm >= 23 * 60 + 30 || norm < 5 * 60 + 45,
    };
  }

  try {
    const now = new Date();
    const jstStr = now.toLocaleTimeString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = jstStr.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const totalMinutes = hours * 60 + minutes;
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return {
      hours,
      minutes,
      totalMinutes,
      timeString,
      isOffPeakNight: totalMinutes >= 23 * 60 + 30 || totalMinutes < 5 * 60 + 45,
    };
  } catch (e) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    return {
      hours,
      minutes,
      totalMinutes,
      timeString: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
      isOffPeakNight: totalMinutes >= 23 * 60 + 30 || totalMinutes < 5 * 60 + 45,
    };
  }
}

// Convert "HH:MM" to minutes of day (0..1439)
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const clean = timeStr.trim().substring(0, 5);
  const parts = clean.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

// Normalize stop ID to match filenames safely
export function sanitizeStopIdForFile(stopId: string): string {
  if (!stopId) return '';
  return stopId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Normalizes any departure item object to guaranteed DepartureItem structure
 */
export function normalizeDepartureItem(item: any, stopId: string = 'stop', idx: number = 0): DepartureItem {
  const rawTime = item.scheduledTime || item.departureTime || item.time || item.departure_time || '';
  const cleanScheduledTime =
    typeof rawTime === 'string' && rawTime.includes(':')
      ? rawTime.trim().substring(0, 5)
      : '08:00';

  const routeNumber = item.routeNumber || item.route || item.routeName || '路線バス';
  const company = (item.company as BusCompany) || '広電バス';
  const companyColor = item.companyColor || getCompanyColor(company);

  const destination = item.destination || item.dest || '市内方面行';
  const delayMinutes =
    typeof item.delayMinutes === 'number'
      ? item.delayMinutes
      : typeof item.delay === 'number'
      ? item.delay
      : 0;

  const minutesAway = typeof item.minutesAway === 'number' ? item.minutesAway : 0;
  const status =
    item.status === 'delayed' || item.status === 'slight-delay'
      ? 'delayed'
      : item.status === 'approaching'
      ? 'approaching'
      : item.status === 'departed'
      ? 'departed'
      : 'on_time';

  return {
    id: item.id || `dep-${stopId}-${idx}-${cleanScheduledTime.replace(':', '')}`,
    routeNumber,
    company,
    companyColor,
    destination,
    via: item.via,
    scheduledTime: cleanScheduledTime,
    minutesAway,
    delayMinutes,
    status,
    congestion: item.congestion || 'low',
    barrierFree: item.barrierFree ?? true,
    busId: item.busId || `bus-${stopId}-${idx}`,
  };
}

/**
 * Format platform string by stripping legacy 上り/下り/方面 terms and returning clean platform text
 */
export function formatPlatformText(platform?: string): string {
  if (!platform) return 'のりば';
  const cleaned = platform
    .replace(/[（\(]?(広電バス|広島バス|広島交通|JRバス)[）\)]?/g, '')
    .replace(/[（\(]?[・\s]*(上り|下り)[・\s]*[）\)]?/g, '')
    .replace(/上りのりば/g, 'のりば')
    .replace(/下りのりば/g, 'のりば')
    .replace(/（市内・広島駅方面）/g, '')
    .replace(/（郊外方面）/g, '')
    .replace(/（市内方面）/g, '')
    .replace(/\(市内方面\)/g, '')
    .replace(/\(郊外方面\)/g, '')
    .replace(/市内・広島駅方面のりば/g, 'のりば')
    .replace(/郊外方面のりば/g, 'のりば')
    .replace(/・市内方面/g, '')
    .replace(/・郊外方面/g, '')
    .trim();

  return cleaned || 'のりば';
}

/**
 * Get clean platform display label (e.g. "1番のりば", "2番のりば", "降車専用", "のりば")
 * ※上り下りの判定は困難なため表記しない
 */
export function getStopPlatformLabel(stop: BusStop): string {
  if (stop.direction === 'dropoff') {
    return '降車専用';
  }

  // 1. Check explicit platformCode (e.g. "1", "2", "10", "27")
  if (stop.platformCode) {
    const cleanCode = stop.platformCode.replace(/[^0-9/・]/g, '');
    if (cleanCode) {
      return `${cleanCode}番のりば`;
    }
  }

  // 2. Check platform string for numbered platforms (e.g. "1番のりば")
  if (stop.platform) {
    const numMatch = stop.platform.match(/(\d+)番/);
    if (numMatch) {
      return `${numMatch[1]}番のりば`;
    }
    const cleaned = formatPlatformText(stop.platform);
    if (cleaned && cleaned !== 'のりば') {
      return cleaned.endsWith('のりば') ? cleaned : `${cleaned}のりば`;
    }
  }

  if (stop.direction === 'terminal') {
    return 'ターミナルのりば';
  }

  return 'のりば';
}

/**
 * Get compact platform badge (e.g. "1番", "2番", "降車", "のりば")
 * ※上り下りは表記しない
 */
export function getShortPlatformBadge(stop: BusStop): string {
  if (stop.direction === 'dropoff') {
    return '降車';
  }

  // 1. Numbered platform (広島駅, バスセンター, 大学病院, 番号付き停留所)
  if (stop.platformCode) {
    const clean = stop.platformCode.replace(/[^0-9/・]/g, '');
    if (clean) return `${clean}番`;
  }

  if (stop.platform) {
    const m = stop.platform.match(/(\d+)番/);
    if (m) {
      return `${m[1]}番`;
    }
  }

  if (stop.direction === 'terminal') {
    return '発車';
  }

  return 'のりば';
}

/**
 * Expand compact route schedules into sorted DepartureItem list
 */
export function expandCompactSchedulesToDepartures(
  stopId: string,
  items: (CompactRouteSchedule | DepartureItem | any)[],
  companyFilter?: BusCompanyFilter
): DepartureItem[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const result: DepartureItem[] = [];

  items.forEach((item, sIdx) => {
    // Legacy / direct item check (has time property)
    if (
      ('scheduledTime' in item && typeof item.scheduledTime === 'string') ||
      ('departureTime' in item && typeof item.departureTime === 'string') ||
      ('time' in item && typeof item.time === 'string')
    ) {
      const norm = normalizeDepartureItem(item, stopId, sIdx);
      if (!companyFilter || companyFilter === 'all' || norm.company === companyFilter) {
        result.push(norm);
      }
      return;
    }

    const compact = item as CompactRouteSchedule;
    if (companyFilter && companyFilter !== 'all' && compact.company !== companyFilter) {
      return;
    }

    if (Array.isArray(compact.times)) {
      compact.times.forEach((timeStr, tIdx) => {
        const cleanTime = typeof timeStr === 'string' ? timeStr.trim().substring(0, 5) : '';
        if (!cleanTime || !cleanTime.includes(':')) return;

        const hh = parseInt(cleanTime.split(':')[0] || '0', 10);
        result.push({
          id: `t-${stopId.replace(/[^a-zA-Z0-9_-]/g, '_')}-${sIdx}-${tIdx}-${cleanTime.replace(':', '')}`,
          routeNumber: compact.route || '路線バス',
          company: compact.company || '広電バス',
          companyColor: compact.color || (compact.company === '広島バス' ? '#dc2626' : '#16a34a'),
          destination: compact.destination || '主要方面行',
          via: compact.via,
          scheduledTime: cleanTime,
          minutesAway: 0,
          delayMinutes: 0,
          status: 'on_time',
          congestion: (hh >= 7 && hh <= 9) || (hh >= 17 && hh <= 19) ? 'high' : 'low',
          barrierFree: true,
          busId: `bus-${stopId.replace(/[^a-zA-Z0-9_-]/g, '_')}-${sIdx}-${tIdx + 1}`,
        });
      });
    }
  });

  result.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  return result;
}

/**
 * Load company-specific timetable JSON into memory cache (e.g. /data/busStopTimes_広電バス.json)
 */
export async function loadCompanyBusStopTimes(company: BusCompany): Promise<CompactBusStopTimes | null> {
  if (companyPromises.has(company)) {
    return companyPromises.get(company)!;
  }

  const promise = (async () => {
    const filePaths = COMPANY_JSON_FILES[company] || [];
    const baseUrl = getSafeBaseUrl();
    for (let url of filePaths) {
      if (!url.startsWith('http') && !url.startsWith('/')) {
        url = `${baseUrl}${url}`;
      }
      try {
        const res = await fetch(url);
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            console.error(`Fetch returned HTML instead of JSON for ${url} (possibly a 404 disguised as 200)`);
            continue;
          }
          const data = (await res.json()) as any;
          if (data && typeof data === 'object') {
            const normalizedData: CompactBusStopTimes = {};
            Object.entries(data).forEach(([key, items]: [string, any]) => {
              if (Array.isArray(items) && items.length > 0) {
                const existing = compactCache.get(key) || [];
                const merged = [...existing, ...items];
                compactCache.set(key, merged);
                normalizedData[key] = merged;
              } else if (items && typeof items === 'object' && Array.isArray(items.timetables)) {
                // Support format from timetables.json: { name, lat, lon, timetables: [{ time, headsign, serviceId }] }
                const rawList = items.timetables as Array<{ time?: string; headsign?: string; serviceId?: string }>;
                if (rawList.length > 0) {
                  const groups = new Map<string, string[]>();
                  for (const entry of rawList) {
                    if (!entry.time) continue;
                    const cleanTime = entry.time.substring(0, 5);
                    const headsign = entry.headsign || '主要方面';
                    if (!groups.has(headsign)) {
                      groups.set(headsign, []);
                    }
                    groups.get(headsign)!.push(cleanTime);
                  }
                  const converted: CompactRouteSchedule[] = Array.from(groups.entries()).map(([headsign, times]) => ({
                    route: headsign.includes('線') ? headsign : `${headsign}方面`,
                    destination: headsign.endsWith('行') ? headsign : `${headsign}行`,
                    via: '主要経由地',
                    company,
                    color: company === '広島バス' ? '#dc2626' : '#16a34a',
                    times: Array.from(new Set(times)).sort(),
                  }));
                  const existing = compactCache.get(key) || [];
                  const merged = [...existing, ...converted];
                  compactCache.set(key, merged);
                  normalizedData[key] = merged;
                }
              }
            });
            console.log(`Loaded ${Object.keys(normalizedData).length} stop timetables for [${company}] from ${url}`);
            return normalizedData;
          }
        } else {
          console.error(`HTTP error fetching ${url}: ${res.status}`);
        }
      } catch (e) {
        console.error(`Failed to fetch or parse JSON from ${url}:`, e);
        // try next
      }
    }
    return null;
  })();

  companyPromises.set(company, promise);
  return promise;
}

/**
 * Load full timetables into memory cache by loading company files in parallel
 */
export async function loadAllBusStopTimes(): Promise<CompactBusStopTimes | null> {
  if (fullBusStopTimesPromise) {
    return fullBusStopTimesPromise;
  }

  fullBusStopTimesPromise = (async () => {
    try {
      const [hdData, hbData] = await Promise.all([
        loadCompanyBusStopTimes('広電バス'),
        loadCompanyBusStopTimes('広島バス'),
      ]);

      const merged: CompactBusStopTimes = {};
      if (hdData) {
        for (const [k, routes] of Object.entries(hdData)) {
          merged[`hd:${k}`] = routes;
          merged[k] = [...(merged[k] || []), ...routes];
        }
      }
      if (hbData) {
        for (const [k, routes] of Object.entries(hbData)) {
          merged[`hb:${k}`] = routes;
          merged[k] = [...(merged[k] || []), ...routes];
        }
      }

      console.log(`Loaded and combined stop timetables from company files without collision`);
      return merged;
    } catch (e) {
      console.warn('Could not load company timetable files, will use fallback:', e);
    }
    return null;
  })();

  return fullBusStopTimesPromise;
}

/**
 * Generate a fallback synthetic timetable if network file is absent
 */
export function generateSyntheticTimetable(
  stopName: string,
  stopId: string,
  operator: 'hiroden' | 'hiroshimabus' = 'hiroden',
  companyFilter?: BusCompanyFilter
): DepartureItem[] {
  const isHiroshimaBus = operator === 'hiroshimabus' || stopId.includes('-hb-');

  let routes: Array<{
    route: string;
    company: BusCompany;
    color: string;
    dest: string;
    via: string;
    intervalMin: number;
    startHour: number;
    endHour: number;
  }> = [];

  if (isHiroshimaBus) {
    if (stopName.includes('宇品') || stopName.includes('広島港') || stopName.includes('元宇品')) {
      routes = [
        {
          route: '21号 宇品線',
          company: '広島バス',
          color: '#dc2626',
          dest: '広島駅行',
          via: '宇品西・市役所前・八丁堀経由',
          intervalMin: 15,
          startHour: 6,
          endHour: 22,
        },
      ];
    } else if (stopName.includes('吉島') || stopName.includes('加古町')) {
      routes = [
        {
          route: '24号 吉島線',
          company: '広島バス',
          color: '#dc2626',
          dest: '広島駅行',
          via: '平和記念公園・本通り・八丁堀経由',
          intervalMin: 12,
          startHour: 6,
          endHour: 22,
        },
      ];
    } else {
      routes = [
        {
          route: '25号 草津線',
          company: '広島バス',
          color: '#dc2626',
          dest: '広島駅・紙屋町行',
          via: '平和大通り経由',
          intervalMin: 15,
          startHour: 6,
          endHour: 22,
        },
      ];
    }
  } else {
    // Hiroden routes
    if (stopName.includes('東浄') || stopName.includes('戸坂')) {
      routes = [
        {
          route: '12号 東浄線',
          company: '広電バス',
          color: '#16a34a',
          dest: '戸坂東浄団地行',
          via: '八丁堀・広島駅経由',
          intervalMin: 15,
          startHour: 6,
          endHour: 22,
        },
      ];
    } else if (stopName.includes('鈴が台') || stopName.includes('井口')) {
      routes = [
        {
          route: '53号 西広島バイパス線',
          company: '広電バス',
          color: '#16a34a',
          dest: '広島バスセンター行',
          via: '古江・舟入・八丁堀経由',
          intervalMin: 15,
          startHour: 6,
          endHour: 22,
        },
      ];
    } else if (stopName.includes('広島駅') || stopName.includes('八丁堀') || stopName.includes('紙屋町')) {
      routes = [
        {
          route: '3号線',
          company: '広電バス',
          color: '#16a34a',
          dest: 'マリーナホップ行',
          via: '八丁堀・市役所前経由',
          intervalMin: 15,
          startHour: 6,
          endHour: 22,
        },
        {
          route: '101号 エキまちループ',
          company: '広電バス',
          color: '#0284c7',
          dest: '市街地循環（左回り）',
          via: '八丁堀・本通・白神社前経由',
          intervalMin: 10,
          startHour: 7,
          endHour: 21,
        },
      ];
    } else {
      routes = [
        {
          route: '広電路線バス',
          company: '広電バス',
          color: '#16a34a',
          dest: '広島バスセンター行',
          via: '主要幹線経由',
          intervalMin: 20,
          startHour: 6,
          endHour: 22,
        },
      ];
    }
  }

  if (companyFilter && companyFilter !== 'all') {
    routes = routes.filter((r) => r.company === companyFilter);
  }

  const compactList: CompactRouteSchedule[] = routes.map((r, rIdx) => {
    const times: string[] = [];
    let currentMin = r.startHour * 60 + (rIdx * 7 + 5);
    const endMin = r.endHour * 60 + 50;

    while (currentMin <= endMin) {
      const hh = Math.floor(currentMin / 60);
      const mm = currentMin % 60;
      times.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
      currentMin += r.intervalMin;
    }

    return {
      route: r.route,
      destination: r.dest,
      via: r.via,
      company: r.company,
      color: r.color,
      times,
    };
  });

  return expandCompactSchedulesToDepartures(stopId, compactList, companyFilter);
}

/**
 * Fetch timetable for a specific stop ID on-demand from company-specific JSON or busStopTimes.json
 */
export async function fetchTimetableForStop(
  stopId: string,
  stopName?: string,
  operator?: 'hiroden' | 'hiroshimabus',
  companyFilter?: BusCompanyFilter
): Promise<DepartureItem[]> {
  if (!stopId) return [];

  // Check synchronous in-memory cache first
  const existing = getCachedTimetable(stopId);
  if (existing && existing.length > 0) {
    if (companyFilter && companyFilter !== 'all') {
      return existing.filter((item) => item.company === companyFilter);
    }
    return existing;
  }

  // Check if a request is already in progress
  const requestKey = `${stopId}__${companyFilter || 'all'}`;
  if (inFlightRequests.has(requestKey)) {
    return inFlightRequests.get(requestKey)!;
  }

  const fetchPromise = (async () => {
    const cleanId = stopId.replace(/^stop-(hb|hd)-/, '');
    const candidateIds = [
      stopId,
      sanitizeStopIdForFile(stopId),
      cleanId,
      cleanId.replace(/-/g, ' '),
      cleanId.replace(/ /g, '-'),
      sanitizeStopIdForFile(cleanId),
    ];

    // 1. If a specific company is requested or known from operator/stopId, try loading that company's dataset
    const targetCompany: BusCompany | undefined =
      companyFilter && companyFilter !== 'all'
        ? companyFilter
        : operator === 'hiroshimabus' || stopId.includes('-hb-')
        ? '広島バス'
        : operator === 'hiroden' || stopId.includes('-hd-')
        ? '広電バス'
        : undefined;

    if (targetCompany) {
      try {
        const companyMap = await loadCompanyBusStopTimes(targetCompany);
        if (companyMap) {
          for (const cid of candidateIds) {
            if (companyMap[cid] && companyMap[cid].length > 0) {
              const expanded = expandCompactSchedulesToDepartures(stopId, companyMap[cid], companyFilter);
              setCachedTimetable(stopId, expanded);
              return expanded;
            }
          }
        }
      } catch (e) {
        // continue to all
      }
    }

    // 2. Try loading main unified busStopTimes.json
    try {
      const fullMap = await loadAllBusStopTimes();
      if (fullMap) {
        if (targetCompany) {
          const compPrefix = targetCompany === '広島バス' ? 'hb' : 'hd';
          for (const cid of candidateIds) {
            const prefKey = `${compPrefix}:${cid}`;
            if (fullMap[prefKey] && fullMap[prefKey].length > 0) {
              const expanded = expandCompactSchedulesToDepartures(stopId, fullMap[prefKey], companyFilter);
              setCachedTimetable(stopId, expanded);
              return expanded;
            }
          }
        }
        for (const cid of candidateIds) {
          if (fullMap[cid] && fullMap[cid].length > 0) {
            const expanded = expandCompactSchedulesToDepartures(stopId, fullMap[cid], companyFilter);
            setCachedTimetable(stopId, expanded);
            return expanded;
          }
        }
      }
    } catch (e) {
      // Continue
    }

    // 3. Fallback: generate synthetic timetable and cache
    const fallbackData = generateSyntheticTimetable(stopName || '停留所', stopId, operator, companyFilter);
    setCachedTimetable(stopId, fallbackData);
    return fallbackData;
  })();

  inFlightRequests.set(requestKey, fetchPromise);

  try {
    const result = await fetchPromise;
    return result;
  } finally {
    inFlightRequests.delete(requestKey);
  }
}

/**
 * Get synchronously from memory cache if already fetched
 */
export function getCachedTimetable(stopId: string): DepartureItem[] | undefined {
  if (!stopId) return undefined;
  // Look up by exact stopId (e.g. stop-hd-51980-1 or stop-hb-51980-1)
  const exact = timetableCache.get(stopId) || timetableCache.get(sanitizeStopIdForFile(stopId));
  if (exact) return exact;

  // If the stopId has no company prefix, we can check cleanId
  if (!stopId.includes('-hd-') && !stopId.includes('-hb-')) {
    const cleanId = stopId.replace(/^stop-/, '');
    return (
      timetableCache.get(cleanId) ||
      timetableCache.get(cleanId.replace(/-/g, ' ')) ||
      timetableCache.get(cleanId.replace(/ /g, '-')) ||
      timetableCache.get(sanitizeStopIdForFile(cleanId))
    );
  }

  return undefined;
}

/**
 * Store or update a stop's timetable in cache
 */
export function setCachedTimetable(stopId: string, timetable: DepartureItem[]): void {
  if (!stopId) return;
  timetableCache.set(stopId, timetable);
  timetableCache.set(sanitizeStopIdForFile(stopId), timetable);

  // Only index by bare cleanId if there is no specific company namespace in stopId
  if (!stopId.includes('-hd-') && !stopId.includes('-hb-')) {
    const cleanId = stopId.replace(/^stop-/, '');
    timetableCache.set(cleanId, timetable);
  }
}

/**
 * Preload timetables for multiple stop IDs in parallel
 */
export async function preloadTimetables(stopIds: string[], companyFilter?: BusCompanyFilter): Promise<void> {
  const needed = stopIds.filter((id) => !timetableCache.has(id));
  await Promise.all(needed.slice(0, 20).map((id) => fetchTimetableForStop(id, undefined, undefined, companyFilter)));
}

/**
 * Fetch timetable for a BusStop object, aggregating all subStops if consolidated
 */
export async function fetchTimetableForStopObject(
  stop: BusStop,
  companyFilter?: BusCompanyFilter
): Promise<DepartureItem[]> {
  if (!stop) return [];

  // If this is a consolidated stop with multiple subStops, fetch all subStops in parallel
  if (stop.subStops && stop.subStops.length > 1) {
    const promises = stop.subStops.map((sub) =>
      fetchTimetableForStop(sub.id, sub.name, sub.operator, companyFilter)
    );
    const results = await Promise.all(promises);
    const seen = new Set<string>();
    const combined: DepartureItem[] = [];

    results.flat().forEach((item, idx) => {
      const norm = normalizeDepartureItem(item, stop.id, idx);
      const key = `${norm.scheduledTime}-${norm.routeNumber}-${norm.destination}-${norm.company}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(norm);
      }
    });

    combined.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    setCachedTimetable(stop.id, combined);
    return combined;
  }

  return fetchTimetableForStop(stop.id, stop.name, stop.operator, companyFilter);
}

