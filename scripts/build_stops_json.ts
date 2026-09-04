import fs from 'fs';
import path from 'path';

function getTimetableForStop(name: string, platform: string) {
  const routes: Array<{ route: string; company: string; color: string; dest: string; via: string }> = [];

  if (name.includes('広島駅') || name.includes('バスセンター') || name.includes('八丁堀') || name.includes('紙屋町') || name.includes('本通り') || name.includes('県庁前')) {
    routes.push(
      { route: '21号 宇品線', company: '広島バス', color: '#dc2626', dest: '広島港（宇品）行', via: '八丁堀・御幸橋経由' },
      { route: '3号線', company: '広電バス', color: '#16a34a', dest: 'マリーナホップ行', via: '紙屋町・市役所経由' },
      { route: '101号 エキまちループ', company: '広電バス', color: '#0284c7', dest: '市街地循環（左回り）', via: '八丁堀・本通・市民病院前経由' },
      { route: '24号 吉島線', company: '広島バス', color: '#dc2626', dest: '吉島営業所行', via: '平和記念公園・加古町経由' },
      { route: '2号線', company: '広電バス', color: '#16a34a', dest: '府中永田・温品車庫行', via: '広島駅・八丁堀経由' }
    );
  } else if (name.includes('西広島') || name.includes('アルパーク') || name.includes('五日市') || name.includes('新井口')) {
    routes.push(
      { route: '25号 草津線', company: '広島バス', color: '#dc2626', dest: '広島駅行', via: '平和大通り・八丁堀経由' },
      { route: '50号 東西線', company: '広島バス', color: '#dc2626', dest: '広島駅行', via: '舟入南・御幸橋経由' },
      { route: '井口台線', company: '広電バス', color: '#16a34a', dest: '井口台パークタウン行', via: '新井口駅経由' },
      { route: '商工センター線', company: '広電バス', color: '#16a34a', dest: 'アルパーク行', via: 'サンプラザ前経由' }
    );
  } else if (name.includes('横川') || name.includes('十日市') || name.includes('本川町')) {
    routes.push(
      { route: '7号線', company: '広電バス', color: '#16a34a', dest: '紙屋町・市役所前行', via: '十日市・本川町経由' },
      { route: '8号線', company: '広電バス', color: '#16a34a', dest: '西観音町・マリーナホップ行', via: '中広町経由' },
      { route: '23号 横川線', company: '広島バス', color: '#dc2626', dest: '大学病院前行', via: '八丁堀・富士見町経由' }
    );
  } else if (name.includes('呉') || name.includes('阿賀') || name.includes('広') || name.includes('四道路')) {
    routes.push(
      { route: '呉倉橋島線', company: '広電バス', color: '#16a34a', dest: '桂浜温泉館行', via: '音戸渡船口・波多見経由' },
      { route: '中央循環線', company: '広電バス', color: '#0284c7', dest: '呉駅前行（循環）', via: '四道路・本通経由' },
      { route: '東畑・広線', company: '広電バス', color: '#16a34a', dest: '広駅前・東のりば行', via: '阿賀駅前・新広駅経由' }
    );
  } else {
    routes.push(
      { route: '幹線バス', company: '広電バス', color: '#16a34a', dest: '広島バスセンター行', via: '主要幹線経由' },
      { route: '地域路線バス', company: '広島バス', color: '#dc2626', dest: '広島駅（南口）行', via: '中心市街地経由' },
      { route: '急行便', company: 'JRバス中国', color: '#0284c7', dest: '広島駅新幹線口行', via: '直行・高速経由' }
    );
  }

  const baseMinutes = [3, 9, 16, 25];
  return routes.slice(0, 4).map((r, idx) => {
    const minAway = baseMinutes[idx];
    const now = new Date();
    const depTime = new Date(now.getTime() + minAway * 60000);
    const timeStr = `${String(depTime.getHours()).padStart(2, '0')}:${String(depTime.getMinutes()).padStart(2, '0')}`;
    return {
      id: `t-${Math.random().toString(36).substring(2, 8)}`,
      routeNumber: r.route,
      company: r.company,
      companyColor: r.color,
      destination: r.dest,
      via: r.via,
      scheduledTime: timeStr,
      minutesAway: minAway,
      delayMinutes: idx === 0 ? 1 : 0,
      status: idx === 0 ? 'approaching' : 'on_time',
      congestion: idx % 2 === 0 ? 'medium' : 'low',
      barrierFree: true,
      busId: `bus-run-${idx + 1}`
    };
  });
}

const csvPath = path.join(process.cwd(), 'src/data/raw_stops.csv');
const outPath = path.join(process.cwd(), 'src/data/busStops.json');

const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.trim().split('\n');

const stopsList: any[] = [];
const seen = new Set<string>();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const parts = line.split(',');
  const stopId = parts[0]?.trim();
  const stopName = parts[2]?.trim();
  const stopDesc = parts[3]?.trim() || '';
  const stopLat = parseFloat(parts[4]?.trim() || '0');
  const stopLon = parseFloat(parts[5]?.trim() || '0');
  const platformCode = parts[12]?.trim() || '';

  if (!stopName || isNaN(stopLat) || isNaN(stopLon) || stopLat === 0) continue;

  const key = `${stopName}_${platformCode || stopDesc || stopId}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const platformDisplay = [
    stopDesc,
    platformCode ? `${platformCode}番のりば` : ''
  ].filter(Boolean).join(' ') || 'バスのりば';

  stopsList.push({
    id: `stop-${stopId.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
    name: stopName,
    nameKana: stopName,
    lat: Number(stopLat.toFixed(6)),
    lng: Number(stopLon.toFixed(6)),
    platform: platformDisplay,
    timetable: getTimetableForStop(stopName, platformDisplay)
  });
}

fs.writeFileSync(outPath, JSON.stringify(stopsList, null, 2), 'utf-8');
console.log(`Successfully generated ${stopsList.length} bus stops with exact GTFS coordinates!`);
