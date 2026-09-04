import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

interface Departure {
  id: string;
  route: string;
  destination: string;
  via?: string;
  departureTime: string;
  minutesAway: number;
  status: 'on-time' | 'slight-delay' | 'delayed';
  congestion: 'low' | 'medium' | 'high';
  occupancyPercent: number;
  barrierFree: boolean;
  company: '広電バス' | '広島バス';
  companyColor: string;
}

interface RouteGroup {
  route: string;
  destination: string;
  via: string;
  company: '広電バス' | '広島バス';
  color: string;
  times: string[];
}

interface BusStopRaw {
  id: string;
  name: string;
  nameKana?: string;
  lat: number;
  lng: number;
  platform?: string;
  platformCode?: string;
  company: '広電バス' | '広島バス';
  operator: 'hiroden' | 'hiroshimabus';
  direction?: 'inbound' | 'outbound' | 'terminal' | 'dropoff';
  routes: string[];
  timetable?: Departure[];
}

// -------------------------------------------------------------
// 1. 広島バスの路線分類ロジック
// -------------------------------------------------------------
function getHiroshimaBusRouteInfo(headsign: string, stopName: string) {
  const h = headsign || '';
  let route = '広島市内路線バス';
  let via = '八丁堀・中心部経由';
  let color = '#dc2626';

  if (h.includes('吉島') || h.includes('光南') || h.includes('吉島営業所') || h.includes('吉島病院')) {
    route = '24号 吉島線';
    via = '平和記念公園・加古町・舟入経由';
  } else if (
    h.includes('草津') ||
    h.includes('アルパーク') ||
    h.includes('井口車庫') ||
    h.includes('新井口駅') ||
    h.includes('井口一丁目') ||
    h.includes('鈴が峰') ||
    h.includes('庚午') ||
    h.includes('ＬＥＣＴ') ||
    h.includes('LECT')
  ) {
    route = '25号 草津線';
    via = '平和大通り・己斐・庚午経由';
  } else if (
    h.includes('宇品') ||
    h.includes('広島港') ||
    h.includes('グランドプリンス') ||
    h.includes('プリンスホテル') ||
    h.includes('特別支援学校') ||
    h.includes('港湾') ||
    h.includes('洋光台') ||
    h.includes('ベイシティ')
  ) {
    route = '21号 宇品線';
    via = '八丁堀・紙屋町・御幸橋経由';
  } else if (h.includes('向洋') || h.includes('青崎') || h.includes('大原')) {
    route = '21号 宇品線 (向洋方面)';
    via = '広島駅・マツダ本社前経由';
  } else if (h.includes('横川') || h.includes('三滝') || h.includes('寺町') || h.includes('楠木町')) {
    route = '22/23号 横川線';
    via = '紙屋町・十日市・横川駅経由';
  } else if (
    h.includes('旭町') ||
    h.includes('西旭町') ||
    h.includes('出汐') ||
    h.includes('段原') ||
    h.includes('昭和町') ||
    h.includes('比治山橋')
  ) {
    route = '26号 旭町線';
    via = '八丁堀・段原・出汐経由';
  } else if (
    h.includes('大学病院') ||
    h.includes('翠町') ||
    h.includes('県病院') ||
    h.includes('県立広島大学') ||
    h.includes('皆実町')
  ) {
    route = '23/31号 大学病院・翠町線';
    via = '大学病院・出汐・皆実町経由';
  } else if (h.includes('東浄') || h.includes('戸坂') || h.includes('中山') || h.includes('矢賀')) {
    route = '27号 中山線';
    via = '広島駅・矢賀・温品経由';
  } else if (
    h.includes('小河原') ||
    h.includes('深川') ||
    h.includes('地区センター') ||
    h.includes('高陽') ||
    h.includes('寺分') ||
    h.includes('福田') ||
    h.includes('上温品')
  ) {
    route = '29号 深川線';
    via = '広島駅・温品・高陽経由';
  } else if (h.includes('エキまち') || h.includes('循環') || h.includes('稲荷町')) {
    route = '101/102号 エキまちループ';
    via = '八丁堀・本通・白神社前経由';
    color = '#0284c7';
  } else if (h.includes('エディオンピースウイング') || h.includes('ピースウイング') || h.includes('市民病院')) {
    route = 'エディオンピースウイング線';
    via = '紙屋町・ゲートパーク経由';
  } else if (h.includes('広島バスセンター') || h.includes('県庁前') || h.includes('紙屋町') || h.includes('立町')) {
    route = '中心部方面 (広島バス)';
    via = '八丁堀・紙屋町・バスセンター行';
  } else if (h.includes('広島駅') || h.includes('広島駅新幹線口')) {
    route = '広島駅方面 (広島バス)';
    via = '八丁堀・広島駅行';
  }

  const destination = h ? (h.endsWith('行') ? h : `${h}行`) : '中心部方面行';
  return { route, destination, via, color, company: '広島バス' as const };
}

// -------------------------------------------------------------
// 2. 広電バスの路線分類ロジック
// -------------------------------------------------------------
function getHirodenRouteInfo(headsign: string, stopName: string) {
  const h = headsign || '';
  let route = '広電路線バス';
  let via = '広島市内中心部経由';
  let color = '#16a34a';

  if (h.includes('マリーナホップ') || h.includes('観音新町') || h.includes('観音マリーナ')) {
    route = '3号線';
    via = '舟入本町・総合グランド・舟入南経由';
  } else if (h.includes('府中') || h.includes('温品') || h.includes('山田') || h.includes('府中永田')) {
    route = '2号線 (府中・温品線)';
    via = '八丁堀・矢賀・府中町役場経由';
  } else if (h.includes('仁保') || h.includes('向洋新町')) {
    route = '4号線 (仁保・向洋線)';
    via = '八丁堀・段原・仁保経由';
  } else if (h.includes('早稲田') || h.includes('牛田')) {
    route = '5号線 (牛田早稲田線)';
    via = '八丁堀・牛田本町・牛田旭経由';
  } else if (h.includes('江波')) {
    route = '6号線 (江波線)';
    via = '八丁堀・本川町・舟入経由';
  } else if (h.includes('東浄') || h.includes('千田')) {
    route = '12号 東浄線';
    via = '八丁堀・牛田・戸坂経由';
  } else if (h.includes('バイパス') || h.includes('井口台') || h.includes('山田団地') || h.includes('美鈴が丘')) {
    route = '52/53号 西広島バイパス線';
    via = '古江・庚午・己斐バイパス経由';
  } else if (h.includes('くすの木台') || h.includes('沼田') || h.includes('市立大学') || h.includes('花の季台')) {
    route = '60/62号 沼田・くすの木台線';
    via = '中広・高速4号線・大塚経由';
  } else if (h.includes('熊野') || h.includes('焼山') || h.includes('萩原車庫')) {
    route = '70/72号 熊野・焼山線';
    via = '比治山・東雲・海田経由';
  } else if (h.includes('呉') || h.includes('音戸') || h.includes('倉橋')) {
    route = '呉倉橋島線・呉市内線';
    via = 'クレアライン高速経由';
  } else if (h.includes('廿日市') || h.includes('宮島') || h.includes('阿品') || h.includes('原国内')) {
    route = '西広島・廿日市線';
    via = '宮島街道・廿日市市役所前経由';
  } else if (h.includes('三次') || h.includes('庄原') || h.includes('吉田') || h.includes('三段峡')) {
    route = '県北・西中国幹線バス';
    via = '国道54号・千代田経由';
  } else if (h.includes('広島駅') || h.includes('新幹線口')) {
    route = '広島駅方面幹線';
    via = '八丁堀・広島駅方面';
  } else if (h.includes('県庁') || h.includes('バスセンター') || h.includes('八丁堀') || h.includes('紙屋町')) {
    route = '中心部方面幹線';
    via = '八丁堀・紙屋町・バスセンター方面';
  } else if (h.includes('市役所') || h.includes('大学病院') || h.includes('吉島') || h.includes('宇品')) {
    route = '市内幹線';
    via = '市役所・平和大通り方面';
  }

  const destination = h ? (h.endsWith('行') ? h : `${h}行`) : '中心部方面行';
  return { route, destination, via, color, company: '広電バス' as const };
}

// -------------------------------------------------------------
// メインビルダー処理
// -------------------------------------------------------------
async function main() {
  console.log('=== Rebuilding Bus Timetable & Stop Masters (Hiroden & Hiroshima Bus) ===');

  // 1. Parse Hiroshima Bus raw CSV stops
  const hbStopMasterMap = new Map<string, any>();
  const hbCsv = fs.readFileSync('src/data/raw_busstop_hiroshimabus.csv', 'utf8').split('\n');
  for (const line of hbCsv) {
    if (!line.trim() || line.startsWith('stop_id')) continue;
    const parts = line.split(',');
    const rawId = parts[0].trim();
    const name = parts[2]?.trim();
    const lat = parseFloat(parts[4]);
    const lng = parseFloat(parts[5]);
    const platformCode = parts[12]?.trim();

    if (rawId && name && !isNaN(lat) && !isNaN(lng)) {
      hbStopMasterMap.set(rawId, { rawId, name, lat, lng, platformCode });
    }
  }
  console.log(`Loaded ${hbStopMasterMap.size} Hiroshima Bus raw stops from CSV.`);

  // 2. Parse Hiroden raw CSV stops
  const hdStopMasterMap = new Map<string, any>();
  const hdCsv = fs.readFileSync('src/data/raw_busstop_hiroshimadentetsu.csv', 'utf8').split('\n');
  for (const line of hdCsv) {
    if (!line.trim() || line.startsWith('stop_id')) continue;
    const parts = line.split(',');
    const rawId = parts[0].trim();
    const name = parts[2]?.trim();
    const lat = parseFloat(parts[4]);
    const lng = parseFloat(parts[5]);
    const platformCode = parts[12]?.trim();

    if (rawId && name && !isNaN(lat) && !isNaN(lng)) {
      hdStopMasterMap.set(rawId, { rawId, name, lat, lng, platformCode });
    }
  }
  console.log(`Loaded ${hdStopMasterMap.size} Hiroden raw stops from CSV.`);

  // 3. Process Hiroshima Bus GTFS stop_times (raw_stop_times.csv)
  console.log('Processing Hiroshima Bus GTFS stop_times (raw_stop_times.csv)...');
  const hbStopTimesRawMap = new Map<string, Map<string, { route: string; destination: string; via: string; company: '広島バス'; color: string; times: string[] }>>();

  const hbRl = readline.createInterface({
    input: fs.createReadStream('src/data/raw_stop_times.csv'),
    crlfDelay: Infinity,
  });

  let hbRowCount = 0;
  for await (const line of hbRl) {
    hbRowCount++;
    if (hbRowCount === 1 || !line.trim()) continue;
    const parts = line.split(',');
    const depTime = parts[2]?.trim();
    const stopId = parts[3]?.trim();
    const headsign = parts[5]?.trim();

    if (!stopId || !depTime) continue;
    const timeMatch = depTime.match(/^(\d{1,2}):(\d{2})/);
    if (!timeMatch) continue;
    const hh = parseInt(timeMatch[1], 10);
    const mm = timeMatch[2];
    if (hh >= 24) continue;
    const timeFormatted = `${String(hh).padStart(2, '0')}:${mm}`;

    const stopInfo = hbStopMasterMap.get(stopId);
    const stopName = stopInfo ? stopInfo.name : '';
    const routeMeta = getHiroshimaBusRouteInfo(headsign, stopName);
    const groupKey = `${routeMeta.route}|${routeMeta.destination}`;

    if (!hbStopTimesRawMap.has(stopId)) {
      hbStopTimesRawMap.set(stopId, new Map());
    }
    const stopGroup = hbStopTimesRawMap.get(stopId)!;
    if (!stopGroup.has(groupKey)) {
      stopGroup.set(groupKey, {
        route: routeMeta.route,
        destination: routeMeta.destination,
        via: routeMeta.via,
        company: '広島バス',
        color: routeMeta.color,
        times: [],
      });
    }
    stopGroup.get(groupKey)!.times.push(timeFormatted);
  }
  console.log(`Parsed ${hbRowCount} Hiroshima Bus stop_times rows for ${hbStopTimesRawMap.size} stops.`);

  // Build Hiroshima Bus timetables dictionary
  const hbTimetableDict: Record<string, RouteGroup[]> = {};
  const hbStopRoutesMap = new Map<string, Set<string>>();

  for (const [stopId, groups] of hbStopTimesRawMap.entries()) {
    const list: RouteGroup[] = [];
    const routesSet = new Set<string>();

    for (const group of groups.values()) {
      group.times.sort();
      // Remove duplicates
      group.times = Array.from(new Set(group.times));
      list.push(group);
      routesSet.add(group.route);
    }
    hbStopRoutesMap.set(stopId, routesSet);

    // Save with multiple alias keys
    const dashId = stopId.replace(/\s+/g, '-');
    const customId = `stop-hb-${dashId}`;
    const genericId = `stop-${dashId}`;

    hbTimetableDict[stopId] = list;
    hbTimetableDict[dashId] = list;
    hbTimetableDict[customId] = list;
    hbTimetableDict[genericId] = list;
  }

  // 4. Process Hiroden GTFS stop_times (raw_busStopTime_hiroshimadentetsu.csv)
  console.log('Processing Hiroden GTFS stop_times (raw_busStopTime_hiroshimadentetsu.csv)...');
  const hdStopTimesRawMap = new Map<string, Map<string, { route: string; destination: string; via: string; company: '広電バス'; color: string; times: string[] }>>();

  const hdRl = readline.createInterface({
    input: fs.createReadStream('src/data/raw_busStopTime_hiroshimadentetsu.csv'),
    crlfDelay: Infinity,
  });

  let hdRowCount = 0;
  for await (const line of hdRl) {
    hdRowCount++;
    if (hdRowCount === 1 || !line.trim()) continue;
    const parts = line.split(',');
    const depTime = parts[2]?.trim();
    const stopId = parts[3]?.trim();
    const headsign = parts[5]?.trim();

    if (!stopId || !depTime) continue;
    const timeMatch = depTime.match(/^(\d{1,2}):(\d{2})/);
    if (!timeMatch) continue;
    const hh = parseInt(timeMatch[1], 10);
    const mm = timeMatch[2];
    if (hh >= 24) continue;
    const timeFormatted = `${String(hh).padStart(2, '0')}:${mm}`;

    const stopInfo = hdStopMasterMap.get(stopId);
    const stopName = stopInfo ? stopInfo.name : '';
    const routeMeta = getHirodenRouteInfo(headsign, stopName);
    const groupKey = `${routeMeta.route}|${routeMeta.destination}`;

    if (!hdStopTimesRawMap.has(stopId)) {
      hdStopTimesRawMap.set(stopId, new Map());
    }
    const stopGroup = hdStopTimesRawMap.get(stopId)!;
    if (!stopGroup.has(groupKey)) {
      stopGroup.set(groupKey, {
        route: routeMeta.route,
        destination: routeMeta.destination,
        via: routeMeta.via,
        company: '広電バス',
        color: routeMeta.color,
        times: [],
      });
    }
    stopGroup.get(groupKey)!.times.push(timeFormatted);
  }
  console.log(`Parsed ${hdRowCount} Hiroden stop_times rows for ${hdStopTimesRawMap.size} stops.`);

  // Build Hiroden timetables dictionary
  const hdTimetableDict: Record<string, RouteGroup[]> = {};
  const hdStopRoutesMap = new Map<string, Set<string>>();

  for (const [stopId, groups] of hdStopTimesRawMap.entries()) {
    const list: RouteGroup[] = [];
    const routesSet = new Set<string>();

    for (const group of groups.values()) {
      group.times.sort();
      group.times = Array.from(new Set(group.times));
      list.push(group);
      routesSet.add(group.route);
    }
    hdStopRoutesMap.set(stopId, routesSet);

    const dashId = stopId.replace(/\s+/g, '-');
    const customId = `stop-hd-${dashId}`;
    const genericId = `stop-${dashId}`;

    hdTimetableDict[stopId] = list;
    hdTimetableDict[dashId] = list;
    hdTimetableDict[customId] = list;
    hdTimetableDict[genericId] = list;
  }

  // Combined master timetable dictionary
  const combinedTimetableDict: Record<string, RouteGroup[]> = { ...hdTimetableDict };
  for (const [key, groups] of Object.entries(hbTimetableDict)) {
    if (!combinedTimetableDict[key]) {
      combinedTimetableDict[key] = groups;
    } else {
      // Merge unique
      const existing = combinedTimetableDict[key];
      const merged = [...existing];
      groups.forEach((g) => {
        if (!existing.some((e) => e.route === g.route && e.destination === g.destination)) {
          merged.push(g);
        }
      });
      combinedTimetableDict[key] = merged;
    }
  }

  // Helper to generate immediate departures
  function generateDeparturesFromGroups(groups: RouteGroup[], stopId: string): Departure[] {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const departures: Departure[] = [];
    let count = 0;

    for (const g of groups) {
      for (const timeStr of g.times) {
        const [hh, mm] = timeStr.split(':').map(Number);
        const depMins = hh * 60 + mm;
        let diff = depMins - currentMins;
        if (diff < -60) diff += 24 * 60; // next day wrap
        if (diff >= -5 && diff <= 120) {
          departures.push({
            id: `dep-${stopId}-${count++}`,
            route: g.route,
            destination: g.destination,
            via: g.via,
            departureTime: timeStr,
            minutesAway: Math.max(0, diff),
            status: diff < 2 ? 'slight-delay' : 'on-time',
            congestion: diff % 2 === 0 ? 'medium' : 'low',
            occupancyPercent: 30 + (diff % 40),
            barrierFree: true,
            company: g.company,
            companyColor: g.color,
          });
        }
      }
    }

    departures.sort((a, b) => a.minutesAway - b.minutesAway);
    return departures.slice(0, 10);
  }

  // 5. Generate clean Hiroshima Bus Stops master
  console.log('Building clean Hiroshima Bus Stops master (routes from GTFS only)...');
  const hbBusStops: BusStopRaw[] = [];
  function detectStopDirection(
    name: string,
    rawId: string,
    platformCode: string | undefined,
    timetable: Departure[],
    companyName: string
  ): { direction: 'inbound' | 'outbound' | 'terminal' | 'dropoff'; platform: string } {
    if (name === '広島駅' || name === '広島駅新幹線口' || name.includes('バスセンター')) {
      return {
        direction: 'terminal',
        platform: platformCode ? `${platformCode}番のりば（${companyName}）` : `のりば（${companyName}）`,
      };
    }

    if (rawId.endsWith(' 999') || (timetable.length === 0 && rawId.endsWith(' 9'))) {
      return {
        direction: 'dropoff',
        platform: `降車専用（${companyName}）`,
      };
    }

    const inboundKeywords = ['広島駅', 'バスセンター', '紙屋町', '八丁堀', '市役所', '県庁', '本通', 'アルパーク', '横川駅', '大学病院', '広島港'];
    let inboundScore = 0;
    let outboundScore = 0;

    for (const dep of timetable) {
      const dest = dep.destination || '';
      if (inboundKeywords.some((k) => dest.includes(k))) {
        inboundScore++;
      } else {
        outboundScore++;
      }
    }

    let direction: 'inbound' | 'outbound' = 'outbound';
    if (inboundScore > outboundScore) {
      direction = 'inbound';
    } else if (outboundScore > inboundScore) {
      direction = 'outbound';
    } else {
      // Tie breaker based on pole
      if (rawId.endsWith(' 1')) {
        direction = 'inbound';
      } else {
        direction = 'outbound';
      }
    }

    const dirLabel = direction === 'inbound' ? '上り' : '下り';
    const platform = platformCode
      ? `${platformCode}番のりば（${companyName}・${dirLabel}）`
      : `${dirLabel}のりば（${companyName}）`;

    return { direction, platform };
  }

  for (const [rawId, info] of hbStopMasterMap.entries()) {
    const dashId = rawId.replace(/\s+/g, '-');
    const id = `stop-hb-${dashId}`;
    const routesSet = hbStopRoutesMap.get(rawId) || new Set<string>();
    let routes = Array.from(routesSet);
    if (routes.length === 0) {
      routes = ['広島市内路線バス'];
    }

    const timetableGroups = hbTimetableDict[rawId] || [];
    const timetable = generateDeparturesFromGroups(timetableGroups, id);

    const { direction, platform } = detectStopDirection(
      info.name,
      rawId,
      info.platformCode,
      timetable,
      '広島バス'
    );

    hbBusStops.push({
      id,
      name: info.name,
      lat: info.lat,
      lng: info.lng,
      platform,
      platformCode: info.platformCode || undefined,
      company: '広島バス',
      operator: 'hiroshimabus',
      direction,
      routes,
      timetable,
    });
  }

  // 6. Generate clean Hiroden Bus Stops master
  console.log('Building clean Hiroden Bus Stops master (routes from GTFS only)...');
  const hdBusStops: BusStopRaw[] = [];
  for (const [rawId, info] of hdStopMasterMap.entries()) {
    const dashId = rawId.replace(/\s+/g, '-');
    const id = `stop-hd-${dashId}`;
    const routesSet = hdStopRoutesMap.get(rawId) || new Set<string>();
    let routes = Array.from(routesSet);
    if (routes.length === 0) {
      routes = ['広電路線バス'];
    }

    const timetableGroups = hdTimetableDict[rawId] || [];
    const timetable = generateDeparturesFromGroups(timetableGroups, id);

    const { direction, platform } = detectStopDirection(
      info.name,
      rawId,
      info.platformCode,
      timetable,
      '広電バス'
    );

    hdBusStops.push({
      id,
      name: info.name,
      lat: info.lat,
      lng: info.lng,
      platform,
      platformCode: info.platformCode || undefined,
      company: '広電バス',
      operator: 'hiroden',
      direction,
      routes,
      timetable,
    });
  }

  // 7. Combined allStops
  const allBusStops = [...hdBusStops, ...hbBusStops];

  // 8. Write all JSON files (ONLY English filenames)
  console.log('Writing files to src/data and public/data...');

  // Timetables
  fs.writeFileSync('src/data/busStopTimes_hiroshimabus.json', JSON.stringify(hbTimetableDict, null, 2));
  fs.writeFileSync('public/data/busStopTimes_hiroshimabus.json', JSON.stringify(hbTimetableDict, null, 2));

  fs.writeFileSync('src/data/busStopTimes_hiroshimadentetsu.json', JSON.stringify(hdTimetableDict, null, 2));
  fs.writeFileSync('public/data/busStopTimes_hiroshimadentetsu.json', JSON.stringify(hdTimetableDict, null, 2));

  fs.writeFileSync('src/data/busStopTimes.json', JSON.stringify(combinedTimetableDict, null, 2));
  fs.writeFileSync('public/data/busStopTimes.json', JSON.stringify(combinedTimetableDict, null, 2));

  // Bus stops
  fs.writeFileSync('src/data/busStop_hiroshimabus.json', JSON.stringify(hbBusStops, null, 2));
  fs.writeFileSync('public/data/busStop_hiroshimabus.json', JSON.stringify(hbBusStops, null, 2));

  fs.writeFileSync('src/data/busStop_hiroshimadentetsu.json', JSON.stringify(hdBusStops, null, 2));
  fs.writeFileSync('public/data/busStop_hiroshimadentetsu.json', JSON.stringify(hdBusStops, null, 2));

  fs.writeFileSync('src/data/busStops.json', JSON.stringify(allBusStops, null, 2));
  fs.writeFileSync('public/data/busStops.json', JSON.stringify(allBusStops, null, 2));

  console.log('✅ ALL Bus data successfully rebuilt and strictly separated!');
}

main().catch(console.error);
