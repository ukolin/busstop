import fs from 'fs';

// Helper to generate realistic timetables for a stop
function generateTimetable(stopName: string, platform: string) {
  const routes: Array<{ route: string; company: string; color: string; dest: string; via: string }> = [];

  if (stopName.includes('広島駅') || stopName.includes('バスセンター') || stopName.includes('八丁堀') || stopName.includes('紙屋町')) {
    routes.push(
      { route: '21号 宇品線', company: '広島バス', color: '#dc2626', dest: '広島港（宇品）行', via: '八丁堀・御幸橋経由' },
      { route: '3号線', company: '広電バス', color: '#16a34a', dest: 'マリーナホップ行', via: '紙屋町・市役所経由' },
      { route: '101号 エキまちループ', company: '広電バス', color: '#0284c7', dest: '市街地循環（左回り）', via: '八丁堀・本通経由' },
      { route: '24号 吉島線', company: '広島バス', color: '#dc2626', dest: '吉島営業所行', via: '平和記念公園経由' },
      { route: '2号線', company: '広電バス', color: '#16a34a', dest: '府中永田・温品車庫行', via: '県庁・広島駅経由' }
    );
  } else if (stopName.includes('西広島') || stopName.includes('己斐') || stopName.includes('アルパーク')) {
    routes.push(
      { route: '25号 草津線', company: '広島バス', color: '#dc2626', dest: '広島駅行', via: '平和大通り・八丁堀経由' },
      { route: '50号 東西線', company: '広島バス', color: '#dc2626', dest: '広島駅行', via: '舟入南・御幸橋経由' },
      { route: '井口台線', company: '広電バス', color: '#16a34a', dest: '井口台パークタウン行', via: '新井口駅経由' }
    );
  } else if (stopName.includes('呉') || stopName.includes('阿賀') || stopName.includes('広')) {
    routes.push(
      { route: '呉倉橋島線', company: '広電バス', color: '#16a34a', dest: '桂浜温泉館行', via: '音戸渡船口・波多見経由' },
      { route: '中央循環線', company: '広電バス', color: '#0284c7', dest: '呉駅前行（循環）', via: '四道路・本通経由' }
    );
  } else {
    routes.push(
      { route: '市内幹線', company: '広電バス', color: '#16a34a', dest: '広島バスセンター行', via: '市街地方面' },
      { route: '地域循環線', company: '広島バス', color: '#dc2626', dest: '広島駅行', via: '主要拠点経由' }
    );
  }

  const baseMinutes = [2, 7, 14, 22, 35];
  return routes.slice(0, 4).map((r, idx) => {
    const minAway = baseMinutes[idx] || (idx * 8 + 3);
    const now = new Date();
    const depTime = new Date(now.getTime() + minAway * 60000);
    const timeStr = `${String(depTime.getHours()).padStart(2, '0')}:${String(depTime.getMinutes()).padStart(2, '0')}`;
    return {
      id: `t-${Math.random().toString(36).substring(2, 7)}`,
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
      busId: `bus-${idx + 1}`
    };
  });
}

// Convert CSV text to Stops
export function convertCsvToStops(csvText: string) {
  const lines = csvText.trim().split('\n');
  const stopsMap = new Map<string, any>();

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

    const platform = [stopDesc, platformCode ? `${platformCode}番のりば` : ''].filter(Boolean).join(' ') || '停留所';
    const key = `${stopName}_${platformCode || stopDesc || stopId}`;

    if (!stopsMap.has(key)) {
      stopsMap.set(key, {
        id: `stop-${stopId.replace(/\s+/g, '-')}`,
        name: stopName,
        nameKana: stopName,
        lat: Number(stopLat.toFixed(6)),
        lng: Number(stopLon.toFixed(6)),
        platform: platform,
        timetable: generateTimetable(stopName, platform)
      });
    }
  }

  return Array.from(stopsMap.values());
}
