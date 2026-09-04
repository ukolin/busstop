export type BusCompany = '広電バス' | '広島バス' | '広島交通' | 'JRバス中国';
export type BusCompanyFilter = 'all' | BusCompany;

export interface BusStop {
  id: string;
  name: string;
  nameKana: string;
  lat: number;
  lng: number;
  platform: string;
  platformCode?: string;
  company?: BusCompany;
  companies?: BusCompany[];
  subStops?: BusStop[];
  operator?: 'hiroden' | 'hiroshimabus';
  direction?: 'inbound' | 'outbound' | 'terminal' | 'dropoff' | 'both';
  directionLabel?: string;
  area?: string;
  routes?: string[];
  timetableCount?: number;
  distanceMeters?: number;
  walkingMinutes?: number;
  timetable?: DepartureItem[];
}

export interface CompactRouteSchedule {
  route: string;
  destination: string;
  via?: string;
  company: BusCompany;
  color: string;
  times: string[];
}

export type CompactBusStopTimes = Record<string, CompactRouteSchedule[]>;

export interface DepartureItem {
  id: string;
  routeNumber: string;
  company: '広電バス' | '広島バス' | '広島交通' | 'JRバス中国';
  companyColor: string;
  destination: string;
  via?: string;
  scheduledTime: string;
  minutesAway: number;
  delayMinutes: number;
  status: 'on_time' | 'delayed' | 'approaching' | 'departed';
  congestion: 'low' | 'medium' | 'high';
  barrierFree: boolean;
  busId?: string;
}

export interface ActiveBus {
  id: string;
  vehicleNumber: string;
  routeNumber: string;
  routeName: string;
  company: '広電バス' | '広島バス' | '広島交通' | 'JRバス中国';
  companyColor: string;
  destination: string;
  origin: string;
  currentLat: number;
  currentLng: number;
  heading: number;
  speedKmh: number;
  delayMinutes: number;
  statusText: string;
  nextStop: string;
  previousStop: string;
  congestion: 'low' | 'medium' | 'high';
  occupancyPercent: number;
  barrierFree: boolean;
  waypoints: [number, number][];
  currentWaypointIndex: number;
  progress: number;
}

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
  isGps: boolean;
  label: string;
}

export interface PresetLocation {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
}
