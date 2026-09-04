import fs from 'fs';
import path from 'path';
import { BusStop, CompactRouteSchedule, CompactBusStopTimes, BusCompany } from '../src/types';

const rawStopTimesCsvPath = path.join(process.cwd(), 'src/data/raw_stop_times.csv');
const busStopsPath = path.join(process.cwd(), 'src/data/busStops.json');
const srcDataDir = path.join(process.cwd(), 'src/data');
const publicDataDir = path.join(process.cwd(), 'public/data');

console.log('Reading raw_stop_times.csv...');
if (!fs.existsSync(rawStopTimesCsvPath)) {
  console.error('raw_stop_times.csv not found at ' + rawStopTimesCsvPath);
  process.exit(1);
}

const csvText = fs.readFileSync(rawStopTimesCsvPath, 'utf-8');
const lines = csvText.split(/\r?\n/);
console.log(`Total CSV lines: ${lines.length}`);

interface ParsedRow {
  tripId: string;
  departureTime: string;
  stopId: string;
  stopSequence: number;
  stopHeadsign: string;
}

const tripRowsMap = new Map<string, ParsedRow[]>();
let validRows = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line || line.startsWith('trip_id')) continue;
  const cols = line.split(',');
  if (cols.length < 5) continue;

  const tripId = cols[0].trim();
  const depTime = cols[2].trim().substring(0, 5); // "HH:MM"
  const stopId = cols[3].trim();
  const seq = parseInt(cols[4].trim() || '0', 10);
  const headsign = cols[5]?.trim() || '';

  if (!tripRowsMap.has(tripId)) {
    tripRowsMap.set(tripId, []);
  }

  tripRowsMap.get(tripId)!.push({
    tripId,
    departureTime: depTime,
    stopId,
    stopSequence: seq,
    stopHeadsign: headsign,
  });
  validRows++;
}

console.log(`Parsed ${validRows} valid rows across ${tripRowsMap.size} trips.`);

// Stop ID to Map of RouteKey -> Set of unique departure times
interface RouteMeta {
  route: string;
  destination: string;
  via: string;
  company: BusCompany;
  color: string;
}

const stopRoutesMap = new Map<string, Map<string, { meta: RouteMeta; timesSet: Set<string> }>>();

function inferTripMeta(rows: ParsedRow[]): RouteMeta {
  rows.sort((a, b) => a.stopSequence - b.stopSequence);
  const firstStop = rows[0]?.stopId || '';
  const lastStop = rows[rows.length - 1];
  const destName = lastStop?.stopHeadsign || rows[0]?.stopHeadsign || '広島駅';
  const destFormatted = destName.endsWith('行') ? destName : `${destName}行`;

  const allStopIds = rows.map((r) => r.stopId).join(' ');

  let route = '広島市内路線バス';
  let company: BusCompany = '広電バス';
  let color = '#16a34a';
  let via = '主要幹線経由';

  if (destName.includes('戸坂') || allStopIds.includes('73450') || allStopIds.includes('50860')) {
    route = '12号 東浄線';
    company = '広電バス';
    color = '#16a34a';
    via = '八丁堀・広島駅・戸坂経由';
  } else if (
    destName.includes('プリンスホテル') ||
    destName.includes('元宇品') ||
    destName.includes('宇品') ||
    allStopIds.includes('73390') ||
    allStopIds.includes('71460')
  ) {
    route = '21号 宇品線';
    company = '広島バス';
    color = '#dc2626';
    via = '宇品西・市役所前・八丁堀経由';
  } else if (
    destName.includes('吉島') ||
    allStopIds.includes('70010 0') ||
    allStopIds.includes('70020 0')
  ) {
    route = '24号 吉島線';
    company = '広島バス';
    color = '#dc2626';
    via = '平和記念公園・本通り・八丁堀経由';
  } else if (
    destName.includes('草津') ||
    destName.includes('アルパーク') ||
    allStopIds.includes('25121')
  ) {
    route = '25号 草津線';
    company = '広島バス';
    color = '#dc2626';
    via = '平和大通り・庚午経由';
  } else if (
    destName.includes('マリーナホップ') ||
    destName.includes('観音') ||
    allStopIds.includes('70010 2')
  ) {
    route = '3号線';
    company = '広電バス';
    color = '#16a34a';
    via = '紙屋町・市役所前・舟入経由';
  } else if (destName.includes('循環') || destName.includes('エキまち')) {
    route = '101号 エキまちループ';
    company = '広電バス';
    color = '#0284c7';
    via = '八丁堀・本通・白神社前経由';
  } else if (destName.includes('西広島') || destName.includes('廿日市') || destName.includes('井口')) {
    route = '53号 西広島バイパス線';
    company = '広電バス';
    color = '#16a34a';
    via = '古江・舟入・八丁堀経由';
  } else if (destName.includes('広島駅') || destName.includes('バスセンター')) {
    // Determine route from origin
    if (firstStop.startsWith('73') || firstStop.startsWith('71')) {
      route = '21号 宇品線';
      company = '広島バス';
      color = '#dc2626';
      via = '御幸橋・八丁堀経由';
    } else if (firstStop.startsWith('70')) {
      route = '24号 吉島線';
      company = '広島バス';
      color = '#dc2626';
      via = '加古町・本通経由';
    } else {
      route = '市内幹線バス';
      company = '広電バス';
      color = '#16a34a';
      via = '八丁堀経由';
    }
  }

  return {
    route,
    destination: destFormatted,
    via,
    company,
    color,
  };
}

// Process each trip
tripRowsMap.forEach((rows) => {
  const meta = inferTripMeta(rows);
  const routeKey = `${meta.route}__${meta.destination}__${meta.company}`;

  rows.forEach((row) => {
    const rawStopId = row.stopId;
    if (!rawStopId || !row.departureTime) return;

    // Keys to register this stop under
    const stopKeys = [
      rawStopId,
      rawStopId.replace(/\s+/g, '-'),
      `stop-hb-${rawStopId.replace(/\s+/g, '-')}`,
      `stop-hd-${rawStopId.replace(/\s+/g, '-')}`,
      `stop-${rawStopId.replace(/\s+/g, '-')}`,
    ];

    stopKeys.forEach((k) => {
      if (!stopRoutesMap.has(k)) {
        stopRoutesMap.set(k, new Map());
      }
      const routesForStop = stopRoutesMap.get(k)!;
      if (!routesForStop.has(routeKey)) {
        routesForStop.set(routeKey, { meta, timesSet: new Set() });
      }
      routesForStop.get(routeKey)!.timesSet.add(row.departureTime);
    });
  });
});

console.log(`Aggregated timetable groups for ${stopRoutesMap.size} stop keys.`);

// Build compact JSON dictionary for all and per company
const compactBusStopTimes: CompactBusStopTimes = {};
const companyBusStopTimes: Record<BusCompany, CompactBusStopTimes> = {
  '広電バス': {},
  '広島バス': {},
  '広島交通': {},
  'JRバス中国': {},
};

stopRoutesMap.forEach((routesGroup, stopKey) => {
  const schedules: CompactRouteSchedule[] = [];

  routesGroup.forEach(({ meta, timesSet }) => {
    const sortedTimes = Array.from(timesSet).sort((a, b) => a.localeCompare(b));
    const sched: CompactRouteSchedule = {
      route: meta.route,
      destination: meta.destination,
      via: meta.via,
      company: meta.company,
      color: meta.color,
      times: sortedTimes,
    };
    schedules.push(sched);

    // Group by company
    const comp = meta.company;
    if (!companyBusStopTimes[comp][stopKey]) {
      companyBusStopTimes[comp][stopKey] = [];
    }
    companyBusStopTimes[comp][stopKey].push(sched);
  });

  // Sort schedules by route name
  schedules.sort((a, b) => a.route.localeCompare(b.route, 'ja'));
  compactBusStopTimes[stopKey] = schedules;
});

// Save company-specific JSON files
const companies: BusCompany[] = ['広電バス', '広島バス', '広島交通', 'JRバス中国'];
const companyFileKeyMap: Record<BusCompany, string[]> = {
  '広電バス': ['busStopTimes_hiroshimadentetsu.json'],
  '広島バス': ['busStopTimes_hiroshimabus.json'],
  '広島交通': ['busStopTimes_hiroko.json'],
  'JRバス中国': ['busStopTimes_jrbus.json'],
};

companies.forEach((comp) => {
  const data = companyBusStopTimes[comp];
  const fileNames = companyFileKeyMap[comp];
  const jsonStr = JSON.stringify(data, null, 2);
  const stopCount = Object.keys(data).length;

  fileNames.forEach((fname) => {
    fs.writeFileSync(path.join(srcDataDir, fname), jsonStr, 'utf-8');
    fs.writeFileSync(path.join(publicDataDir, fname), jsonStr, 'utf-8');
  });

  console.log(`Saved company timetable [${comp}]: ${fileNames[0]} (${stopCount} stops)`);
});

// Save combined busStopTimes.json (both src and public)
const compactJsonString = JSON.stringify(compactBusStopTimes, null, 2);
fs.writeFileSync(path.join(srcDataDir, 'busStopTimes.json'), compactJsonString, 'utf-8');
fs.writeFileSync(path.join(publicDataDir, 'busStopTimes.json'), compactJsonString, 'utf-8');

const srcSizeMb = (Buffer.byteLength(compactJsonString, 'utf-8') / (1024 * 1024)).toFixed(2);
console.log(`Saved full busStopTimes.json: ${srcSizeMb} MB (${Object.keys(compactBusStopTimes).length} stop keys)`);

// Update busStops.json with route lists and total departure counts
if (fs.existsSync(busStopsPath)) {
  const stops: BusStop[] = JSON.parse(fs.readFileSync(busStopsPath, 'utf-8'));
  let matchedStops = 0;
  let totalDeparturesAcrossStops = 0;

  stops.forEach((s) => {
    const scheds = compactBusStopTimes[s.id] || compactBusStopTimes[s.id.replace(/^stop-(hb|hd)-/, '')] || [];
    const routeSet = new Set<string>(s.routes || []);
    let count = 0;

    scheds.forEach((sc) => {
      if (sc.route) routeSet.add(sc.route);
      count += sc.times.length;
    });

    s.routes = Array.from(routeSet);
    s.timetableCount = count;
    if (count > 0) {
      matchedStops++;
      totalDeparturesAcrossStops += count;
    }
  });

  fs.writeFileSync(busStopsPath, JSON.stringify(stops, null, 2), 'utf-8');
  console.log(`Updated busStops.json: ${matchedStops} stops have active schedules (${totalDeparturesAcrossStops} departures total).`);
}

console.log('Successfully generated company-specific and unified busStopTimes files!');
