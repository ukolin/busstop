import { BusStop, ActiveBus, PresetLocation, BusCompany, DepartureItem } from '../types';
import { normalizeDepartureItem, getCompanyColor } from './timetableService';
export { getCompanyColor };

export const HIROSHIMA_CENTER = {
  lat: 34.3977,
  lng: 132.4753, // 広島駅南口
};

export const PRESET_LOCATIONS: PresetLocation[] = [
  {
    id: 'hiroshima-st',
    name: '広島駅南口',
    description: 'バスターミナル・駅ビル前',
    lat: 34.3977,
    lng: 132.4753,
  },
  {
    id: 'hatchobori',
    name: '八丁堀交差点',
    description: '相生通り・福屋八丁堀本店前',
    lat: 34.3928,
    lng: 132.4646,
  },
  {
    id: 'kamiyacho',
    name: '紙屋町そごう前',
    description: '広島バスセンター・エディオンピース前',
    lat: 34.3958,
    lng: 132.4579,
  },
  {
    id: 'hondori',
    name: '本通・袋町',
    description: '本通商店街南側・鯉城通り',
    lat: 34.3920,
    lng: 132.4572,
  },
  {
    id: 'atomic-dome',
    name: '原爆ドーム前',
    description: '平和記念公園北側・相生橋東詰',
    lat: 34.3957,
    lng: 132.4537,
  },
  {
    id: 'city-hall',
    name: '広島市役所前',
    description: '国泰寺町・中区役所周辺',
    lat: 34.3855,
    lng: 132.4542,
  },
  {
    id: 'funairi-kannon',
    name: '舟入・観音エリア',
    description: '舟入本町・新観音橋東・観音新町',
    lat: 34.3865,
    lng: 132.4417,
  },
  {
    id: 'danbara-deshio',
    name: '段原・出汐エリア',
    description: '段原中央・大学病院前・旭町',
    lat: 34.3895,
    lng: 132.4735,
  },
  {
    id: 'suzugadai-inokuchi',
    name: '鈴が台・井口台・鈴が峰',
    description: '鈴が台（バイパス）・鈴が峰住宅・井口台パークタウン',
    lat: 34.3762,
    lng: 132.3800,
  },
  {
    id: 'nishi-hiroshima',
    name: '西広島駅・己斐・草津',
    description: 'JR西広島駅前・アルパーク・庚午',
    lat: 34.3979,
    lng: 132.4283,
  },
  {
    id: 'itsukaichi',
    name: '五日市・佐伯区',
    description: '五日市駅北口・コイン通り・美鈴が丘',
    lat: 34.3668,
    lng: 132.3680,
  },
  {
    id: 'fuchu-town',
    name: '府中町・矢賀',
    description: 'イオンモール広島府中・府中永田',
    lat: 34.3985,
    lng: 132.4965,
  },
  {
    id: 'kokoro-seifushinto',
    name: '西風新都・こころ',
    description: '修道大学・大塚駅・こころ南中央',
    lat: 34.4332,
    lng: 132.4045,
  },
  {
    id: 'kure-st',
    name: '呉駅・中央通り',
    description: 'JR呉駅前バスターミナル・四道路',
    lat: 34.2445,
    lng: 132.5565,
  },
];

import hiroshimadentetsuBusStops from './busStop_hiroshimadentetsu.json';
import hiroshimabusBusStops from './busStop_hiroshimabus.json';

// 各社別バス停データ
export const BUS_STOPS_HIROSHIMADENTETSU: BusStop[] = hiroshimadentetsuBusStops as unknown as BusStop[];
export const BUS_STOPS_HIROSHIMABUS: BusStop[] = hiroshimabusBusStops as unknown as BusStop[];

// バス停データ（全社統合データ）
export const HIROSHIMA_BUS_STOPS: BusStop[] = [
  ...hiroshimadentetsuBusStops,
  ...hiroshimabusBusStops,
] as unknown as BusStop[];

// 運行中バス（ウェイポイントに沿ってリアルタイムに少しずつ移動）
export const INITIAL_ACTIVE_BUSES: ActiveBus[] = [
  {
    id: 'bus-3-1',
    vehicleNumber: '広電 1428号車',
    routeNumber: '3号線',
    routeName: '観音・マリーナホップ線',
    company: '広電バス',
    companyColor: '#16a34a',
    destination: 'マリーナホップ行',
    origin: '広島駅',
    currentLat: 34.3942,
    currentLng: 132.4635,
    heading: 260,
    speedKmh: 24,
    delayMinutes: 1,
    statusText: '運行中 (ほぼ定時)',
    nextStop: '八丁堀（福屋前）',
    previousStop: '胡町',
    congestion: 'medium',
    occupancyPercent: 55,
    barrierFree: true,
    currentWaypointIndex: 0,
    progress: 0.1,
    waypoints: [
      [34.3975, 132.4751], // 広島駅
      [34.3962, 132.4735], // 猿猴橋町
      [34.3946, 132.4682], // 稲荷町
      [34.3934, 132.4665], // 銀山町
      [34.3929, 132.4646], // 八丁堀
      [34.3936, 132.4610], // 立町
      [34.3957, 132.4590], // 紙屋町
      [34.3923, 132.4574], // 本通
      [34.3905, 132.4568], // 袋町
      [34.3881, 132.4557], // 中電前
      [34.3854, 132.4542], // 市役所前
      [34.3780, 132.4490], // 舟入南
      [34.3650, 132.4380], // 観音新町
    ],
  },
  {
    id: 'bus-21-1',
    vehicleNumber: '広島バス 385号車',
    routeNumber: '21号線',
    routeName: '宇品線 (急行便)',
    company: '広島バス',
    companyColor: '#dc2626',
    destination: '広島港（宇品）行',
    origin: '広島駅',
    currentLat: 34.3955,
    currentLng: 132.4705,
    heading: 245,
    speedKmh: 18,
    delayMinutes: 3,
    statusText: '運行中 (+3分遅れ)',
    nextStop: '稲荷町',
    previousStop: '猿猴橋町',
    congestion: 'high',
    occupancyPercent: 82,
    barrierFree: true,
    currentWaypointIndex: 1,
    progress: 0.4,
    waypoints: [
      [34.3975, 132.4751], // 広島駅
      [34.3962, 132.4735], // 猿猴橋町
      [34.3946, 132.4682], // 稲荷町
      [34.3929, 132.4646], // 八丁堀
      [34.3923, 132.4574], // 本通
      [34.3854, 132.4542], // 市役所前
      [34.3750, 132.4600], // 御幸橋
      [34.3550, 132.4610], // 広島港
    ],
  },
  {
    id: 'bus-101-1',
    vehicleNumber: '広電 1502号車 (エキまち専用車)',
    routeNumber: '101号線',
    routeName: 'エキまちループ (左回り循環)',
    company: '広電バス',
    companyColor: '#0284c7',
    destination: '市街地循環（本通・広島駅行）',
    origin: '広島駅',
    currentLat: 34.3931,
    currentLng: 132.4648,
    heading: 270,
    speedKmh: 15,
    delayMinutes: 2,
    statusText: '運行中 (+2分遅れ)',
    nextStop: '八丁堀（福屋前）',
    previousStop: '銀山町',
    congestion: 'high',
    occupancyPercent: 78,
    barrierFree: true,
    currentWaypointIndex: 2,
    progress: 0.7,
    waypoints: [
      [34.3975, 132.4751], // 広島駅
      [34.3942, 132.4720], // 的場町
      [34.3934, 132.4665], // 銀山町
      [34.3929, 132.4646], // 八丁堀
      [34.3936, 132.4610], // 立町
      [34.3957, 132.4590], // 紙屋町
      [34.3980, 132.4580], // 市民病院前
      [34.3995, 132.4640], // 白島町
      [34.3982, 132.4760], // 広島駅
    ],
  },
  {
    id: 'bus-24-1',
    vehicleNumber: '広島バス 218号車',
    routeNumber: '24号線',
    routeName: '吉島線',
    company: '広島バス',
    companyColor: '#dc2626',
    destination: '吉島営業所行',
    origin: '広島駅',
    currentLat: 34.3927,
    currentLng: 132.4550,
    heading: 190,
    speedKmh: 20,
    delayMinutes: 3,
    statusText: '運行中 (+3分遅れ)',
    nextStop: '平和記念公園',
    previousStop: '本通',
    congestion: 'medium',
    occupancyPercent: 62,
    barrierFree: true,
    currentWaypointIndex: 2,
    progress: 0.3,
    waypoints: [
      [34.3975, 132.4751], // 広島駅
      [34.3929, 132.4646], // 八丁堀
      [34.3923, 132.4574], // 本通
      [34.3925, 132.4518], // 平和記念公園
      [34.3850, 132.4490], // 加古町
      [34.3720, 132.4450], // 吉島西
      [34.3600, 132.4420], // 吉島営業所
    ],
  },
  {
    id: 'bus-71-1',
    vehicleNumber: '広交 842号車',
    routeNumber: '71号線',
    routeName: '可部・桐陽台線',
    company: '広島交通',
    companyColor: '#ca8a04',
    destination: '可部駅前行',
    origin: '広島駅',
    currentLat: 34.3948,
    currentLng: 132.4602,
    heading: 300,
    speedKmh: 28,
    delayMinutes: 0,
    statusText: '運行中 (定時運行)',
    nextStop: '紙屋町（東）',
    previousStop: '立町',
    congestion: 'medium',
    occupancyPercent: 48,
    barrierFree: true,
    currentWaypointIndex: 1,
    progress: 0.5,
    waypoints: [
      [34.3975, 132.4751], // 広島駅
      [34.3929, 132.4646], // 八丁堀
      [34.3957, 132.4590], // 紙屋町
      [34.4050, 132.4610], // 新白島駅前
      [34.4250, 132.4650], // 祇園大橋
      [34.4600, 132.4850], // 可部駅前
    ],
  },
  {
    id: 'bus-53-1',
    vehicleNumber: '広電 1610号車',
    routeNumber: '53号線',
    routeName: '横川・寺町線',
    company: '広電バス',
    companyColor: '#16a34a',
    destination: '横川駅行',
    origin: '広島駅',
    currentLat: 34.3968,
    currentLng: 132.4560,
    heading: 335,
    speedKmh: 22,
    delayMinutes: 0,
    statusText: '運行中 (定時運行)',
    nextStop: '寺町',
    previousStop: '紙屋町（西）',
    congestion: 'low',
    occupancyPercent: 32,
    barrierFree: true,
    currentWaypointIndex: 2,
    progress: 0.2,
    waypoints: [
      [34.3975, 132.4751], // 広島駅
      [34.3929, 132.4646], // 八丁堀
      [34.3956, 132.4565], // 紙屋町（西）
      [34.4020, 132.4530], // 寺町
      [34.4107, 132.4503], // 横川駅前
    ],
  },
];

// 緯度経度から2点間の距離を計算（Haversine式・メートル単位）
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // 地球半径（メートル）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// 徒歩所要時間（80m/分として計算）
export function calculateWalkingMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 80));
}

// 2点間の進行方向方位角（0〜360度）
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

// Normalize stop name for intelligent clustering and consolidation
export function normalizeStopNameForGrouping(rawName: string): string {
  if (!rawName) return '';
  return rawName
    .replace(/[（\(「【\[].*?[）\)」】\]]/g, '') // strip parenthetical annotations like （福屋前）, （上り）, 「西広島駅」
    .replace(/\s+/g, '') // strip whitespace
    .replace(/^[（\(]?(広電|広島バス|JR)/, '') // strip company prefixes (e.g. 広電温品四丁目 -> 温品四丁目)
    .replace(/([0-9０-９]+)丁目/g, (_, num) => {
      const n = num.replace(/[０-９]/g, (ch: string) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
      return `${n}丁目`;
    })
    .replace(/一丁目/g, '1丁目')
    .replace(/二丁目/g, '2丁目')
    .replace(/三丁目/g, '3丁目')
    .replace(/四丁目/g, '4丁目')
    .replace(/五丁目/g, '5丁目')
    .replace(/六丁目/g, '6丁目')
    .replace(/七丁目/g, '7丁目')
    .replace(/八丁目/g, '8丁目')
    .replace(/九丁目/g, '9丁目')
    .replace(/十丁目/g, '10丁目')
    .replace(/前$/g, ''); // strip trailing '前' when comparing (e.g. 田方東陽台 vs 田方東陽台前)
}

// Extract platform number (e.g. "1", "2", "10") from bus stop
export function extractPlatformNumber(stop: BusStop): string | null {
  if (stop.platformCode) {
    const num = stop.platformCode.replace(/[^0-9]/g, '');
    if (num) return num;
  }
  const m = (stop.platform || '').match(/(\d+)番/);
  if (m) return m[1];
  return null;
}

// Get standardized direction category for a stop
export function getStopDirectionCategory(stop: BusStop): 'inbound' | 'outbound' | 'terminal' | 'dropoff' | 'unknown' {
  if (stop.direction === 'dropoff' || (stop.platform || '').includes('降車')) return 'dropoff';
  if (stop.direction === 'inbound' || (stop.platform || '').includes('上り')) return 'inbound';
  if (stop.direction === 'outbound' || (stop.platform || '').includes('下り')) return 'outbound';
  if (stop.direction === 'terminal') return 'terminal';
  return 'unknown';
}

// Determine if two poles belong to the exact same physical pole / shared pole
// Strict rules complying with user instructions:
// 1. 銀山町や新天地など至近距離（14m以内）の同一側バス停は統合する
// 2. 道路反対側のバス停（通常20m〜45m超離れている）は統合しない
// 3. 広島駅やバスセンター、大学病院などの集約ターミナルでは各のりば番号（1番、2番等）が異なる場合は統合しない
// 4. 上り下りの判定は難しいため方向判定での排除は行わず、幾何距離（<=14m）で確実に判定する
function canMergeStops(a: BusStop, b: BusStop, distMeters: number): boolean {
  // 1. 距離制限: 14m超は同一側の同一ポールではないため統合しない（道路反対側のバス停は20m以上離れているため確実に分離）
  if (distMeters > 14) {
    return false;
  }

  // 2. のりば番号が異なる場合は絶対に統合しない（例: 広島駅の1番と2番、バスセンターの2番と3番、大学病院の1番と3番）
  const numA = extractPlatformNumber(a);
  const numB = extractPlatformNumber(b);
  if (numA && numB && numA !== numB) {
    return false;
  }

  // 3. 同名または表記揺れ判定（同一標柱を複数社が共用しているケース）
  const normA = normalizeStopNameForGrouping(a.name);
  const normB = normalizeStopNameForGrouping(b.name);
  if (normA && normB && (normA === normB || normA.includes(normB) || normB.includes(normA))) {
    return true;
  }

  const cleanA = (a.name || '').replace(/\s+/g, '');
  const cleanB = (b.name || '').replace(/\s+/g, '');
  if (cleanA && cleanB && (cleanA.includes(cleanB) || cleanB.includes(cleanA))) {
    return true;
  }

  return false;
}

// ユーザー要望に完全準拠したバス停の処理:
// 1. 道路の反対側にあるバス停は上り下りなので統合しない（独立した正確な位置に表示）
// 2. 同じ名前の停留所でも大きく離れている場合は統合しない
// 3. 広島駅やバスセンター、大学病院などのバス停が集約されるところでは各のりばを正確な位置に保ち番号をふる
// 4. 同一標柱（15m以内の至近距離）を広電バスと広島バス等が共同利用している場合のみ統合して両社アイコンを表示
export function consolidateOverlappingStops(stops: BusStop[]): BusStop[] {
  if (!stops || stops.length === 0) return [];

  // 空間グリッドで高速化（セルサイズ約100m）
  const cellSize = 0.001;
  const grid = new Map<string, BusStop[]>();

  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    const gx = Math.floor(s.lat / cellSize);
    const gy = Math.floor(s.lng / cellSize);
    const key = `${gx}_${gy}`;
    let cell = grid.get(key);
    if (!cell) {
      cell = [];
      grid.set(key, cell);
    }
    cell.push(s);
  }

  const visited = new Set<string>();
  const consolidated: BusStop[] = [];

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    if (visited.has(stop.id)) continue;

    const cluster: BusStop[] = [stop];
    visited.add(stop.id);

    const gx = Math.floor(stop.lat / cellSize);
    const gy = Math.floor(stop.lng / cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighbors = grid.get(`${gx + dx}_${gy + dy}`);
        if (!neighbors) continue;

        for (const cand of neighbors) {
          if (visited.has(cand.id)) continue;

          const dist = calculateDistanceMeters(stop.lat, stop.lng, cand.lat, cand.lng);
          if (canMergeStops(stop, cand, dist)) {
            cluster.push(cand);
            visited.add(cand.id);
          }
        }
      }
    }

    if (cluster.length === 1) {
      // 単独バス停
      const singleStop = cluster[0];
      const normalizedTimetable = (singleStop.timetable || []).map((t, idx) =>
        normalizeDepartureItem(t, singleStop.id, idx)
      );

      const pNum = extractPlatformNumber(singleStop);
      const cleanPlatform = pNum
        ? `${pNum}番のりば`
        : singleStop.platform
        ? singleStop.platform.replace(/[（\(]?[・\s]*(上り|下り)[・\s]*[）\)]?/g, '').trim() || 'のりば'
        : 'のりば';

      consolidated.push({
        ...singleStop,
        platform: cleanPlatform,
        platformCode: pNum || singleStop.platformCode,
        companies: singleStop.companies || (singleStop.company ? [singleStop.company] : ['広電バス']),
        routes: singleStop.routes || [],
        subStops: [singleStop],
        timetable: normalizedTimetable,
      });
    } else {
      // 同一標柱（同一地点で複数社が共用しているポール）の統合
      const companiesSet = new Set<BusCompany>();
      cluster.forEach((s) => {
        if (s.companies && s.companies.length > 0) {
          s.companies.forEach((c) => companiesSet.add(c));
        } else if (s.company) {
          companiesSet.add(s.company);
        } else if (s.operator === 'hiroshimabus') {
          companiesSet.add('広島バス');
        } else {
          companiesSet.add('広電バス');
        }
      });
      const companies = Array.from(companiesSet) as BusCompany[];

      // 全サブポールの発車時刻を結合して時間順にソート
      const combinedTimetable: DepartureItem[] = [];
      const seenDeptKeys = new Set<string>();

      cluster.forEach((s) => {
        (s.timetable || []).forEach((dept, dIdx) => {
          const norm = normalizeDepartureItem(dept, s.id, dIdx);
          const key = `${norm.scheduledTime}-${norm.routeNumber}-${norm.destination}-${norm.company}`;
          if (!seenDeptKeys.has(key)) {
            seenDeptKeys.add(key);
            combinedTimetable.push(norm);
          }
        });
      });

      combinedTimetable.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

      // 代表位置（同一点ポールの平均位置）
      const avgLat = cluster.reduce((sum, s) => sum + s.lat, 0) / cluster.length;
      const avgLng = cluster.reduce((sum, s) => sum + s.lng, 0) / cluster.length;

      // 最も一般的・簡潔な停留所名称を選択
      const canonicalName = cluster.reduce((best, cur) => {
        const cleanCur = cur.name.replace(/^[（\(]?(広電|広島バス)/, '').trim();
        const cleanBest = best.replace(/^[（\(]?(広電|広島バス)/, '').trim();
        if (cur.name === cleanCur && best !== cleanBest) return cur.name;
        return cleanCur.length < cleanBest.length ? cur.name : best;
      }, cluster[0].name);

      // プラットフォーム番号の抽出
      const platformNumbers = Array.from(
        new Set(
          cluster
            .map((s) => extractPlatformNumber(s))
            .filter(Boolean)
        )
      ) as string[];

      let combinedPlatform = '';
      if (platformNumbers.length > 0) {
        combinedPlatform = `${platformNumbers.join('・')}番のりば`;
      } else if (cluster[0].platform) {
        combinedPlatform = cluster[0].platform.replace(/[（\(]?[・\s]*(上り|下り)[・\s]*[）\)]?/g, '').trim() || 'のりば';
      } else {
        combinedPlatform = 'のりば';
      }

      const pCode = platformNumbers.length > 0 ? platformNumbers.join('/') : cluster[0].platformCode;
      const combinedRoutes = Array.from(new Set(cluster.flatMap((s) => s.routes || [])));

      consolidated.push({
        id: cluster[0].id,
        name: canonicalName,
        nameKana: cluster[0].nameKana,
        lat: avgLat,
        lng: avgLng,
        platform: combinedPlatform,
        platformCode: pCode || undefined,
        company: companies.length === 1 ? companies[0] : undefined,
        companies,
        routes: combinedRoutes,
        subStops: cluster,
        direction: cluster[0].direction,
        directionLabel: cluster[0].directionLabel,
        distanceMeters: cluster[0].distanceMeters,
        walkingMinutes: cluster[0].walkingMinutes,
        timetable: combinedTimetable,
      });
    }
  }

  return consolidated;
}


