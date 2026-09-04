import fs from 'fs';
import path from 'path';
import { BusStop, DepartureItem } from '../src/types';

const busStopsPath = path.join(process.cwd(), 'src/data/busStops.json');
const publicDir = path.join(process.cwd(), 'public/data');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const publicTimetablesPath = path.join(publicDir, 'timetables.json');
const srcTimetablesPath = path.join(process.cwd(), 'src/data/timetables.json');

console.log('Reading full busStops.json...');
const stops: BusStop[] = JSON.parse(fs.readFileSync(busStopsPath, 'utf-8'));
console.log(`Loaded ${stops.length} stops.`);

const timetablesMap: Record<string, DepartureItem[]> = {};
const cleanStops: any[] = [];

for (const stop of stops) {
  // Extract unique routes serving this stop for fast filtering without timetable
  const routeSet = new Set<string>();
  if (stop.timetable && Array.isArray(stop.timetable)) {
    for (const t of stop.timetable) {
      if (t.routeNumber) routeSet.add(t.routeNumber);
    }
    if (stop.timetable.length > 0) {
      timetablesMap[stop.id] = stop.timetable;
      // Also register clean id
      const cleanId = stop.id.replace(/^stop-(hb|hd)-/, '');
      timetablesMap[cleanId] = stop.timetable;
    }
  }

  // Create lightweight stop object
  const cleanStop: any = {
    id: stop.id,
    name: stop.name,
    nameKana: stop.nameKana || '',
    lat: stop.lat,
    lng: stop.lng,
    platform: stop.platform || '',
    platformCode: stop.platformCode,
    company: stop.company,
    companies: stop.companies,
    operator: stop.operator,
    direction: stop.direction,
    directionLabel: stop.directionLabel,
    area: stop.area,
    routes: Array.from(routeSet),
    timetableCount: stop.timetable?.length || 0,
    // Keep timetable as empty array initially for backwards-compatibility with types
    timetable: [],
  };

  cleanStops.push(cleanStop);
}

console.log(`Writing separate timetables JSON (${Object.keys(timetablesMap).length} entries)...`);
fs.writeFileSync(publicTimetablesPath, JSON.stringify(timetablesMap), 'utf-8');
fs.writeFileSync(srcTimetablesPath, JSON.stringify(timetablesMap), 'utf-8');

console.log(`Writing lightweight busStops.json (${cleanStops.length} stops)...`);
fs.writeFileSync(busStopsPath, JSON.stringify(cleanStops, null, 2), 'utf-8');

const stopsSize = (fs.statSync(busStopsPath).size / 1024).toFixed(1);
const timeSize = (fs.statSync(publicTimetablesPath).size / 1024).toFixed(1);
console.log(`Done! busStops.json: ${stopsSize} KB, timetables.json: ${timeSize} KB`);
