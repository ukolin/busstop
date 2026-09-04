import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Plus, Minus, Navigation, Eye, EyeOff, Layers, FileJson, Copy, Check, X, Move, RotateCcw } from 'lucide-react';
import { UserLocation, BusStop, ActiveBus } from '../types';
import { formatPlatformText, getCompanyColor, getShortPlatformBadge } from '../data/timetableService';
import { extractPlatformNumber } from '../data/hiroshimaData';

// Defensive safeguard for Leaflet DomUtil position methods to prevent
// "Cannot read properties of undefined (reading '_leaflet_pos')" when layers/elements
// are detached during active transitions or map destruction.
if (typeof window !== 'undefined' && L && L.DomUtil) {
  const originalGetPosition = L.DomUtil.getPosition;
  if (originalGetPosition) {
    L.DomUtil.getPosition = function (el: any) {
      if (!el) {
        return new L.Point(0, 0);
      }
      try {
        return originalGetPosition.call(L.DomUtil, el);
      } catch {
        return (el && el._leaflet_pos) || new L.Point(0, 0);
      }
    };
  }

  const originalSetPosition = L.DomUtil.setPosition;
  if (originalSetPosition) {
    L.DomUtil.setPosition = function (el: any, point: any) {
      if (!el) return;
      try {
        originalSetPosition.call(L.DomUtil, el, point);
      } catch {
        if (el) {
          el._leaflet_pos = point;
        }
      }
    };
  }
}

interface MapComponentProps {
  userLocation: UserLocation;
  busStops: BusStop[];
  selectedStop: BusStop | null;
  nearbyStopIds?: Set<string>;
  onSelectStop: (stop: BusStop) => void;
  activeBuses: ActiveBus[];
  selectedBus: ActiveBus | null;
  onSelectBus: (bus: ActiveBus) => void;
  showRadiusCircle: boolean;
  onToggleRadiusCircle: () => void;
  onRecenterUser: () => void;
  showAllStops?: boolean;
  onToggleShowAllStops?: () => void;
  onMapClickCoords?: (coords: { lat: number; lng: number }) => void;
  onOpenDataModal?: () => void;
  onUpdateStopPosition?: (stopId: string, lat: number, lng: number) => void;
  onResetStopsToDefault?: () => void;
  isDarkMode?: boolean;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  userLocation,
  busStops,
  selectedStop,
  nearbyStopIds = new Set(),
  onSelectStop,
  activeBuses,
  selectedBus,
  onSelectBus,
  showRadiusCircle,
  onToggleRadiusCircle,
  onRecenterUser,
  showAllStops = true,
  onToggleShowAllStops,
  onMapClickCoords,
  onOpenDataModal,
  onUpdateStopPosition,
  onResetStopsToDefault,
  isDarkMode = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const stopsLayerRef = useRef<L.LayerGroup | null>(null);
  const prevLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(16);
  const [mapViewportKey, setMapViewportKey] = useState<number>(0);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [lastMovedNotice, setLastMovedNotice] = useState<string | null>(null);

  // 1. Initialize Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    // Clean, crisp CARTO tiles: dark_all for dark mode, voyager for light mode
    const initialTileUrl = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=cb1_2v0v_1_dd66705afc0ca6f75d40cb3e'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_2v0v_1_dd66705afc0ca6f75d40cb3e';

    const tileLayer = L.tileLayer(initialTileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 20,
      subdomains: 'abcd',
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Attribution in compact corner
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

    // Layer groups for dynamic markers
    const stopsLayer = L.layerGroup().addTo(map);

    stopsLayerRef.current = stopsLayer;
    mapInstanceRef.current = map;
    prevLocationRef.current = { lat: userLocation.lat, lng: userLocation.lng };

    // Listen to map clicks to capture exact coordinates for user editing
    map.on('click', (e: L.LeafletMouseEvent) => {
      const coords = {
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      };
      setClickedCoords(coords);
      if (onMapClickCoords) {
        onMapClickCoords(coords);
      }
    });

    map.on('zoomend', () => {
      if (mapInstanceRef.current) {
        setCurrentZoom(mapInstanceRef.current.getZoom());
        setMapViewportKey((k) => k + 1);
      }
    });

    map.on('moveend', () => {
      setMapViewportKey((k) => k + 1);
    });

    // Fix leaflet container sizing after mount
    const resizeTimer = setTimeout(() => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.invalidateSize();
        } catch {
          // ignore if destroyed
        }
      }
    }, 150);

    return () => {
      clearTimeout(resizeTimer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn('Leaflet cleanup notice:', e);
        }
        mapInstanceRef.current = null;
      }
      userMarkerRef.current = null;
      radiusCircleRef.current = null;
      stopsLayerRef.current = null;
      prevLocationRef.current = null;
    };
  }, []);

  // Dynamically switch map tiles when isDarkMode changes
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const tileUrl = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=cb1_2v0v_1_dd66705afc0ca6f75d40cb3e'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_2v0v_1_dd66705afc0ca6f75d40cb3e';
    tileLayerRef.current.setUrl(tileUrl);
  }, [isDarkMode]);

  // 2. Update User Marker and 500m Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const userLatLng: L.LatLngExpression = [userLocation.lat, userLocation.lng];

    // Create or update User Pin
    const userIconHtml = `
      <div class="relative flex items-center justify-center">
        <span class="absolute w-10 h-10 rounded-full bg-[#4A90E2]/25 animate-ping"></span>
        <span class="absolute w-8 h-8 rounded-full bg-[#4A90E2]/20"></span>
        <div class="w-5 h-5 rounded-full bg-[#4A90E2] border-2 border-white shadow-md flex items-center justify-center">
          <div class="w-2 h-2 rounded-full bg-white"></div>
        </div>
        <div class="absolute -top-6 whitespace-nowrap px-1.5 py-0.5 rounded bg-[#2D3436]/90 text-[10px] font-bold text-white shadow-sm pointer-events-none">
          現在地
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: userIconHtml,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const isCurrentMarkerValid =
      userMarkerRef.current && (userMarkerRef.current as any)._map === map;

    if (!isCurrentMarkerValid) {
      if (userMarkerRef.current) {
        try {
          userMarkerRef.current.remove();
        } catch {
          // ignore
        }
      }
      userMarkerRef.current = L.marker(userLatLng, {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);
    } else if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLatLng);
      userMarkerRef.current.setIcon(userIcon);
    }

    // 500m Radius Circle
    const isCurrentCircleValid =
      radiusCircleRef.current && (radiusCircleRef.current as any)._map === map;

    if (!isCurrentCircleValid) {
      if (radiusCircleRef.current) {
        try {
          radiusCircleRef.current.remove();
        } catch {
          // ignore
        }
      }
      radiusCircleRef.current = L.circle(userLatLng, {
        radius: 500,
        color: '#4A90E2',
        weight: 1.5,
        dashArray: '4, 6',
        fillColor: '#4A90E2',
        fillOpacity: showRadiusCircle ? 0.08 : 0,
        opacity: showRadiusCircle ? 0.5 : 0,
      }).addTo(map);
    } else if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng(userLatLng);
      radiusCircleRef.current.setStyle({
        fillOpacity: showRadiusCircle ? 0.08 : 0,
        opacity: showRadiusCircle ? 0.5 : 0,
      });
    }

    // Only pan or fly if the coordinates actually shifted
    const prev = prevLocationRef.current;
    const hasMoved = !prev || prev.lat !== userLocation.lat || prev.lng !== userLocation.lng;

    if (hasMoved) {
      prevLocationRef.current = { lat: userLocation.lat, lng: userLocation.lng };
      try {
        map.flyTo(userLatLng, map.getZoom() || 16, {
          duration: 0.8,
        });
      } catch {
        try {
          map.setView(userLatLng, map.getZoom() || 16);
        } catch {
          // ignore
        }
      }
    }
  }, [userLocation.lat, userLocation.lng, showRadiusCircle]);

  // 3. Render Bus Stop Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const stopsLayer = stopsLayerRef.current;
    if (!map || !stopsLayer) return;

    try {
      stopsLayer.clearLayers();
    } catch {
      // ignore
    }

    // 広島駅などのまとまったピンの集約解除はズームレベル19から解除にする
    const isHubUnclustered = currentZoom >= 19;
    const isZoomedIn = currentZoom >= 16;
    const bounds = map.getBounds().pad(0.35);

    // Terminal hubs for aggregation (zoom < 19)
    // 広島駅、バスセンター、大学病院、アルパークなどの主要拠点はズーム19未満でひとまとまりの集約ピンにし、
    // 最も密集している位置にピンを設置する
    const TERMINAL_HUBS = [
      {
        key: 'hiroshima-sta',
        name: '広島駅（全のりば）',
        match: (s: BusStop) =>
          (s.name.startsWith('広島駅') || s.name === '広島駅前' || s.name.includes('広島駅')) &&
          Math.hypot(s.lat - 34.3975, s.lng - 132.4751) < 0.015,
      },
      {
        key: 'bus-center',
        name: '広島バスセンター',
        match: (s: BusStop) =>
          s.name === '広島バスセンター' ||
          (s.name.includes('バスセンター') && Math.hypot(s.lat - 34.3965, s.lng - 132.4568) < 0.01),
      },
      {
        key: 'univ-hospital',
        name: '大学病院前（全のりば）',
        match: (s: BusStop) =>
          s.name.includes('大学病院') && Math.hypot(s.lat - 34.38, s.lng - 132.478) < 0.01,
      },
      {
        key: 'alpark',
        name: 'アルパーク（全のりば）',
        match: (s: BusStop) =>
          s.name.includes('アルパーク') && Math.hypot(s.lat - 34.3739, s.lng - 132.3941) < 0.01,
      },
      {
        key: 'yokogawa-sta',
        name: '横川駅（全のりば）',
        match: (s: BusStop) =>
          s.name.includes('横川駅') && Math.hypot(s.lat - 34.41, s.lng - 132.45) < 0.01,
      },
      {
        key: 'kure-sta',
        name: '呉駅前（全のりば）',
        match: (s: BusStop) =>
          s.name.includes('呉駅') && Math.hypot(s.lat - 34.245, s.lng - 132.558) < 0.01,
      },
    ];

    // バス停群の中で「平均的に最も密集している中心点（密度加重中心）」を算出する関数
    const getDensestClusterCenter = (stops: BusStop[]): { lat: number; lng: number } => {
      if (stops.length === 0) return { lat: 0, lng: 0 };
      if (stops.length === 1) return { lat: stops[0].lat, lng: stops[0].lng };

      // ガウスカーネル重み付けによる局所密度の計算 (σ 約80m)
      const sigma = 0.0008;
      const twoSigmaSq = 2 * sigma * sigma;

      const densities = stops.map((s1) => {
        let density = 0;
        for (const s2 of stops) {
          const dLat = s1.lat - s2.lat;
          const dLng = (s1.lng - s2.lng) * Math.cos((s1.lat * Math.PI) / 180);
          const distSq = dLat * dLat + dLng * dLng;
          density += Math.exp(-distSq / twoSigmaSq);
        }
        return density;
      });

      // 密度が高い密集コアを重点的に反映した加重重心を求める
      let totalWeight = 0;
      let weightedLat = 0;
      let weightedLng = 0;

      densities.forEach((d, idx) => {
        const weight = Math.pow(d, 3);
        totalWeight += weight;
        weightedLat += stops[idx].lat * weight;
        weightedLng += stops[idx].lng * weight;
      });

      if (totalWeight > 0) {
        return {
          lat: weightedLat / totalWeight,
          lng: weightedLng / totalWeight,
        };
      }
      return { lat: stops[0].lat, lng: stops[0].lng };
    };

    // 集約モード時 (!isHubUnclustered && !isEditMode)、各ターミナルに属するバス停を収集
    const hubStopsMap = new Map<string, BusStop[]>();
    const stopsBelongingToHub = new Set<string>();

    if (!isHubUnclustered && !isEditMode) {
      TERMINAL_HUBS.forEach((hub) => {
        hubStopsMap.set(hub.key, []);
      });

      busStops.forEach((stop) => {
        for (const hub of TERMINAL_HUBS) {
          if (hub.match(stop)) {
            hubStopsMap.get(hub.key)!.push(stop);
            stopsBelongingToHub.add(stop.id);
            break;
          }
        }
      });

      // ズーム19未満のときに集約ピンを表示
      TERMINAL_HUBS.forEach((hub) => {
        const hubStops = hubStopsMap.get(hub.key) || [];
        if (hubStops.length === 0) return;

        const isSelectedInHub = selectedStop && hubStops.some((s) => s.id === selectedStop.id);
        // 最も密集している位置にピンを配置
        const { lat: repLat, lng: repLng } = getDensestClusterCenter(hubStops);

        const hubPinHtml = `
          <div class="relative group cursor-pointer -translate-x-1/2 -translate-y-full flex flex-col items-center">
            ${
              isSelectedInHub
                ? `<span class="absolute -inset-2 rounded-full animate-pulse pointer-events-none bg-emerald-500/40"></span>`
                : ''
            }
            <div class="flex flex-col items-center">
              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl shadow-lg border transition-transform whitespace-nowrap ${
                isSelectedInHub
                  ? 'bg-[#1E293B] text-white border-emerald-400 ring-2 ring-emerald-400/50 scale-110'
                  : 'bg-[#1E293B] text-white border-[#334155] hover:scale-105'
              }">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shrink-0 shadow-2xs"></span>
                <span class="text-[11.5px] font-black tracking-tight whitespace-nowrap">
                  ${hub.name}
                </span>
                <span class="text-[9.5px] px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold leading-none shrink-0 shadow-2xs">
                  ${hubStops.length}のりば
                </span>
              </div>
              <div class="w-0.5 h-2.5 bg-[#1E293B] shadow-xs"></div>
              <div class="w-2 h-1 rounded-full bg-[#1E293B]/60"></div>
            </div>
          </div>
        `;

        const hubIcon = L.divIcon({
          className: 'terminal-cluster-icon',
          html: hubPinHtml,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const hubMarker = L.marker([repLat, repLng], {
          icon: hubIcon,
          zIndexOffset: isSelectedInHub ? 900 : 700,
        });

        hubMarker.bindTooltip(
          `<div class="font-bold text-xs text-[#2D3436]">${hub.name}</div><div class="text-[10px] text-gray-500">${hubStops.length}箇所ののりばを集約中（クリックでズーム19に拡大して展開）</div>`,
          { direction: 'top', offset: [0, -6], opacity: 0.95 }
        );

        hubMarker.on('click', () => {
          map.flyTo([repLat, repLng], 19, { duration: 0.8 });
          if (hubStops.length > 0) {
            onSelectStop(hubStops[0]);
          }
        });

        stopsLayer.addLayer(hubMarker);
      });
    }

    busStops.forEach((stop) => {
      // ズーム19未満のときは集約されたバス停の個別ピンはスキップ
      if (!isHubUnclustered && !isEditMode && stopsBelongingToHub.has(stop.id)) {
        return;
      }

      const isSelected = selectedStop?.id === stop.id;
      const isNearby = nearbyStopIds.size === 0 || nearbyStopIds.has(stop.id);

      // If user chose to show only nearby, skip non-nearby stops unless selected
      if (!showAllStops && !isNearby && !isSelected) {
        return;
      }

      // Viewport culling for silky smooth performance with 2,400+ stops:
      // Always keep selected & nearby stops in DOM; for others, only render if within viewport bounds
      if (!isSelected && !isNearby && !bounds.contains([stop.lat, stop.lng])) {
        return;
      }

      // 広域時は選択中以外はすべて丸（ドット）にする
      const showFullPill = isSelected || isZoomedIn;
      let marker: L.Marker;

      // Check companies
      const isMultiCompany = stop.companies && stop.companies.length > 1;
      const primaryCompany =
        stop.company ||
        (stop.companies && stop.companies.length === 1 ? stop.companies[0] : undefined) ||
        (stop.operator === 'hiroshimabus' ? '広島バス' : '広電バス');
      const stopColor = isMultiCompany ? '#ca8a04' : getCompanyColor(primaryCompany);

      // Extract platform number and badge
      const platformNum = extractPlatformNumber(stop);
      const platformBadge = getShortPlatformBadge(stop);
      const isTerminalOrNumbered =
        Boolean(platformNum) ||
        stop.name.includes('広島駅') ||
        stop.name.includes('バスセンター') ||
        stop.name.includes('大学病院');

      const platformBadgeBg = isEditMode
        ? '#d97706'
        : isMultiCompany
        ? '#334155'
        : stopColor;

      // Company color indicator HTML (compact representative color dots instead of long company names)
      let companyBadgesHtml = '';
      if (isMultiCompany && stop.companies && stop.companies.length > 0) {
        companyBadgesHtml = `
          <div class="flex items-center gap-1 shrink-0 px-1 py-0.5 rounded-full bg-black/5" title="${stop.companies.join('・')}">
            ${stop.companies
              .map((c) => {
                const bg = getCompanyColor(c);
                return `<span class="w-2 h-2 rounded-full inline-block shadow-2xs border border-white/80" style="background-color: ${bg}"></span>`;
              })
              .join('')}
          </div>
        `;
      } else {
        companyBadgesHtml = `
          <div class="flex items-center shrink-0" title="${primaryCompany}">
            <span class="w-2 h-2 rounded-full inline-block shadow-2xs border border-white/80" style="background-color: ${stopColor}"></span>
          </div>
        `;
      }

      if (showFullPill) {
        // Full interactive pill pin with precise platform number
        let iconContent = '';
        if (isEditMode) {
          iconContent = `<svg viewBox="0 0 24 24" class="w-2.5 h-2.5 fill-none stroke-current stroke-2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>`;
        } else if (platformNum) {
          // Precise platform number badge inside pin circle
          iconContent = `<span class="font-black text-[9.5px] leading-none text-white">${platformNum}</span>`;
        } else {
          iconContent = `<svg viewBox="0 0 24 24" class="w-2.5 h-2.5 fill-current text-white"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>`;
        }

        const stopIconHtml = `
          <div class="relative group ${isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} -translate-x-1/2 -translate-y-full flex flex-col items-center">
            ${
              isSelected
                ? `<span class="absolute -inset-2 rounded-full animate-pulse pointer-events-none" style="background-color: ${stopColor}40"></span>`
                : ''
            }
            <div class="flex flex-col items-center">
              <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl shadow-md border transition-transform max-w-none whitespace-nowrap ${
                isEditMode
                  ? 'bg-amber-50 text-amber-950 border-amber-400 ring-2 ring-amber-400/60 scale-105'
                  : isSelected
                  ? 'bg-[#2D3436] text-[#F9F7F2] scale-110'
                  : isNearby
                  ? 'bg-[#FDFBF7] text-[#434338] border-[#D5DBD0] hover:scale-105'
                  : 'bg-[#FAF8F3] text-[#5B594B] border-[#E4DFD3] hover:scale-105 opacity-95'
              }" style="${isSelected ? `border-color: ${stopColor}; box-shadow: 0 0 0 2px ${stopColor}60;` : ''}">
                <div class="w-4 h-4 rounded-full flex items-center justify-center shrink-0 shadow-2xs" style="background-color: ${isEditMode ? '#d97706' : stopColor}; color: #ffffff;">
                  ${iconContent}
                </div>
                <span class="text-[11px] font-bold tracking-tight whitespace-nowrap">
                  ${stop.name}
                </span>
                ${companyBadgesHtml}
                ${
                  platformBadge
                    ? `<span class="text-[9.5px] px-1.5 py-0.5 rounded font-bold leading-none shrink-0 text-white shadow-2xs" style="background-color: ${platformBadgeBg}">${platformBadge}</span>`
                    : ''
                }
                ${
                  isEditMode
                    ? `<span class="text-[9px] px-1 py-0.2 rounded bg-amber-200 text-amber-900 font-bold leading-none">ドラッグ可</span>`
                    : ''
                }
              </div>
              <div class="w-0.5 h-2.5 shadow-xs" style="background-color: ${isEditMode ? '#d97706' : isSelected ? stopColor : isNearby ? stopColor : '#9CA3AF'}"></div>
              <div class="w-2 h-1 rounded-full" style="background-color: ${isEditMode ? '#d9770660' : `${stopColor}60`}"></div>
            </div>
          </div>
        `;

        const stopIcon = L.divIcon({
          className: 'bus-stop-icon',
          html: stopIconHtml,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        marker = L.marker([stop.lat, stop.lng], {
          icon: stopIcon,
          draggable: isEditMode,
          zIndexOffset: isSelected ? 800 : isNearby ? 500 : 300,
        });
      } else {
        // Zoomed-out mode:
        // For numbered terminals/hubs (Hiroshima Sta, Bus Center, Univ Hospital, etc.) at zoom >= 14,
        // render a high-precision numbered circular badge showing the platform number!
        const showNumberedDot = isTerminalOrNumbered && platformNum && currentZoom >= 14;
        const dotBg = isEditMode ? '#d97706' : isMultiCompany ? '#ca8a04' : stopColor;

        let dotIconHtml = '';
        let iconSize: [number, number] = [16, 16];
        let iconAnchor: [number, number] = [8, 8];

        if (showNumberedDot) {
          iconSize = [22, 22];
          iconAnchor = [11, 11];
          dotIconHtml = `
            <div class="relative group ${isEditMode ? 'cursor-grab' : 'cursor-pointer'} flex items-center justify-center">
              <div class="w-5.5 h-5.5 rounded-full border-2 border-white shadow-md group-hover:scale-125 transition-transform flex items-center justify-center font-black text-[10px] text-white leading-none" style="background-color: ${dotBg}" title="${stop.name} ${platformNum}番のりば">
                ${platformNum}
              </div>
            </div>
          `;
        } else {
          dotIconHtml = `
            <div class="relative group ${isEditMode ? 'cursor-grab' : 'cursor-pointer'} flex items-center justify-center">
              <div class="w-3.5 h-3.5 rounded-full border-[1.5px] border-white shadow-xs group-hover:scale-130 transition-transform flex items-center justify-center" style="background-color: ${dotBg}">
                <div class="w-1 h-1 rounded-full bg-white"></div>
              </div>
            </div>
          `;
        }

        const dotIcon = L.divIcon({
          className: 'bus-stop-dot-icon',
          html: dotIconHtml,
          iconSize,
          iconAnchor,
        });

        marker = L.marker([stop.lat, stop.lng], {
          icon: dotIcon,
          draggable: isEditMode,
          zIndexOffset: isTerminalOrNumbered ? 350 : 250,
        });

        const tooltipCompText = isMultiCompany
          ? `<span style="color: #16a34a">[広電]</span><span style="color: #dc2626">[広バス]</span> (共同)`
          : `<span style="color: ${stopColor}">[${primaryCompany}]</span>`;

        marker.bindTooltip(
          `<div class="font-bold text-xs text-[#2D3436]">${stop.name}${platformBadge ? ` (${platformBadge}のりば)` : ''} ${tooltipCompText}</div><div class="text-[10px] text-gray-500">${formatPlatformText(stop.platform)}</div>`,
          { direction: 'top', offset: [0, -6], opacity: 0.95 }
        );
      }

      if (isEditMode) {
        marker.on('dragend', (e: any) => {
          const latlng = e.target.getLatLng();
          const newLat = Number(latlng.lat.toFixed(6));
          const newLng = Number(latlng.lng.toFixed(6));
          if (onUpdateStopPosition) {
            onUpdateStopPosition(stop.id, newLat, newLng);
          }
          setLastMovedNotice(`「${stop.name}」を移動しました（${newLat}, ${newLng}）`);
          setTimeout(() => setLastMovedNotice(null), 4000);
        });
      }

      marker.on('click', () => {
        onSelectStop(stop);
      });

      stopsLayer.addLayer(marker);
    });
  }, [busStops, selectedStop, nearbyStopIds, showAllStops, onSelectStop, currentZoom, mapViewportKey, isEditMode, onUpdateStopPosition]);

  // 4. Center map when a bus or stop is selected or re-centered
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 16, {
        duration: 0.8,
      });
    }
    onRecenterUser();
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Fullscreen Map Canvas */}
      <div
        id="bus-leaflet-map"
        ref={mapContainerRef}
        className="w-full h-full z-0 select-none cursor-grab active:cursor-grabbing"
      />

      {/* Bus Stop Edit Mode Active Banner */}
      {isEditMode && (
        <div
          id="map-edit-mode-banner"
          className="absolute top-24 left-2.5 sm:top-20 sm:left-4 z-[1000] max-w-md pointer-events-auto bg-amber-500 text-white px-3.5 py-2 rounded-xl shadow-lg flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 shrink-0 animate-bounce" />
            <div className="font-medium leading-tight">
              <span className="font-bold">バス停ドラッグ移動モード中</span>
              <p className="text-[11px] text-amber-100 mt-0.5">
                地図上のバス停マーカーをつかんでドラッグすると、位置を自由に微調整できます。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditMode(false)}
            className="px-2.5 py-1 text-[11px] font-bold bg-white text-amber-900 hover:bg-amber-100 rounded-lg shrink-0 transition-colors shadow-xs"
          >
            完了
          </button>
        </div>
      )}

      {/* Moved Stop Notice Notification */}
      {lastMovedNotice && (
        <div
          id="map-moved-stop-notice"
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1000] max-w-sm pointer-events-none bg-[#2D3436]/95 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 text-xs backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{lastMovedNotice}</span>
        </div>
      )}

      {/* Floating Clicked Coordinates Notification */}
      {clickedCoords && (
        <div
          id="map-clicked-coords-pill"
          className="absolute top-[calc(max(0.375rem,env(safe-area-inset-top))+6rem)] left-2.5 sm:top-20 sm:left-4 z-[1000] max-w-sm pointer-events-auto bg-[#FDFBF7]/95 dark:bg-[#1B1E23]/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-[#CAD4C6] dark:border-[#2A2F37] flex items-center justify-between gap-2.5 text-xs animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#4A6741] dark:bg-[#6B8E61] shrink-0 animate-pulse"></span>
            <div className="truncate text-[11px]">
              <span className="text-[#5B594B] dark:text-[#94A3B8] font-bold">クリック地点: </span>
              <span className="font-mono font-bold text-[#2D3436] dark:text-[#F1F5F9]">
                {clickedCoords.lat}, {clickedCoords.lng}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`${clickedCoords.lat}, ${clickedCoords.lng}`);
                setCopiedCoords(true);
                setTimeout(() => setCopiedCoords(false), 2000);
              }}
              className="px-2 py-0.5 text-[10px] font-bold bg-[#F3F4ED] dark:bg-[#242930] hover:bg-[#E8EBE4] dark:hover:bg-[#2C323B] border border-[#CAD4C6] dark:border-[#2A2F37] rounded-md text-[#2D3436] dark:text-[#F1F5F9] flex items-center gap-1 transition-colors"
            >
              {copiedCoords ? <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
              <span>{copiedCoords ? 'コピー済' : 'コピー'}</span>
            </button>
            {onOpenDataModal && (
              <button
                type="button"
                onClick={onOpenDataModal}
                className="px-2 py-0.5 text-[10px] font-bold bg-[#4A6741] dark:bg-[#3B6B34] hover:bg-[#3B5433] dark:hover:bg-[#2D5227] text-white rounded-md flex items-center gap-0.5 transition-colors shadow-xs"
              >
                <span>JSON設定</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setClickedCoords(null)}
              className="p-1 text-[#7A7969] dark:text-[#94A3B8] hover:text-[#2D3436] dark:hover:text-[#F1F5F9] transition-colors rounded-md"
              title="閉じる"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Map Controls on Right */}
      <div className="absolute top-[calc(max(0.375rem,env(safe-area-inset-top))+6.25rem)] right-2.5 sm:top-20 sm:right-3 z-[1000] flex flex-col gap-1.5">
        {/* Recenter on GPS / Current Location */}
        <button
          id="map-recenter-user-btn"
          type="button"
          onClick={handleRecenter}
          title="現在地に移動"
          className="w-9 h-9 sm:w-10 sm:h-10 bg-[#FDFBF7]/95 dark:bg-[#1B1E23]/95 backdrop-blur-md rounded-xl shadow-md border border-[#E8E4D9] dark:border-[#2A2F37] flex items-center justify-center text-[#434338] dark:text-[#CBD5E1] hover:text-[#4A6741] dark:hover:text-[#6B8E61] hover:bg-[#F3F4ED] dark:hover:bg-[#242930] active:bg-[#EAEFE8] dark:active:bg-[#2C323B] transition-colors cursor-pointer"
        >
          <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Toggle Bus Stop Drag Adjustment Mode */}
        {onUpdateStopPosition && (
          <button
            id="map-toggle-edit-mode-btn"
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            title={isEditMode ? '位置調整を完了' : 'バス停の位置をドラッグして微調整'}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-md border flex items-center justify-center transition-colors cursor-pointer ${
              isEditMode
                ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400/50 animate-pulse'
                : 'bg-[#FDFBF7]/95 dark:bg-[#1B1E23]/95 text-[#434338] dark:text-[#CBD5E1] border-[#E8E4D9] dark:border-[#2A2F37] hover:bg-[#F3F4ED] dark:hover:bg-[#242930]'
            }`}
          >
            <Move className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Toggle 500m Radius Circle */}
        <button
          id="map-toggle-radius-btn"
          type="button"
          onClick={onToggleRadiusCircle}
          title={showRadiusCircle ? '500m円を非表示' : '500m円を表示'}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-md border flex items-center justify-center transition-colors cursor-pointer ${
            showRadiusCircle
              ? 'bg-[#F3F4ED] dark:bg-[#242930] text-[#4A6741] dark:text-[#6B8E61] border-[#D5DBD0] dark:border-[#2A2F37]'
              : 'bg-[#FDFBF7]/95 dark:bg-[#1B1E23]/95 text-[#7A7969] dark:text-[#94A3B8] border-[#E8E4D9] dark:border-[#2A2F37] hover:bg-[#F3F4ED] dark:hover:bg-[#242930]'
          }`}
        >
          {showRadiusCircle ? <Eye className="w-4 h-4 sm:w-5 sm:h-5" /> : <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* JSON / Coordinates Data Editor Modal Button */}
        {onOpenDataModal && (
          <button
            id="map-open-json-modal-btn"
            type="button"
            onClick={onOpenDataModal}
            title="バス停・時刻表JSONデータを編集・位置調整"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-md border bg-[#FDFBF7]/95 dark:bg-[#1B1E23]/95 text-[#4A6741] dark:text-[#6B8E61] border-[#E8E4D9] dark:border-[#2A2F37] hover:bg-[#F3F4ED] dark:hover:bg-[#242930] flex items-center justify-center transition-colors cursor-pointer"
          >
            <FileJson className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Reset to Default Stop Positions */}
        {onResetStopsToDefault && (
          <button
            id="map-reset-stops-btn"
            type="button"
            onClick={onResetStopsToDefault}
            title="バス停の位置を最新マスターデータにリセット"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-md border bg-[#FDFBF7]/95 dark:bg-[#1B1E23]/95 text-[#7A7969] dark:text-[#94A3B8] border-[#E8E4D9] dark:border-[#2A2F37] hover:text-[#4A6741] dark:hover:text-[#6B8E61] hover:bg-[#F3F4ED] dark:hover:bg-[#242930] flex items-center justify-center transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Toggle All Bus Stops vs Nearby Only */}
        {onToggleShowAllStops && (
          <button
            id="map-toggle-all-stops-btn"
            type="button"
            onClick={onToggleShowAllStops}
            title={showAllStops ? '全バス停表示中（タップで周辺のみ）' : '周辺バス停のみ表示中（タップで全バス停表示）'}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-md border flex items-center justify-center transition-colors cursor-pointer ${
              showAllStops
                ? 'bg-[#F3F4ED] dark:bg-[#242930] text-[#4A6741] dark:text-[#6B8E61] border-[#D5DBD0] dark:border-[#2A2F37]'
                : 'bg-[#FDFBF7]/95 dark:bg-[#1B1E23]/95 text-[#7A7969] dark:text-[#94A3B8] border-[#E8E4D9] dark:border-[#2A2F37] hover:bg-[#F3F4ED] dark:hover:bg-[#242930]'
            }`}
          >
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Zoom In / Out */}
        <div className="bg-[#FDFBF7]/95 dark:bg-[#1B1E23]/95 backdrop-blur-md rounded-xl shadow-md border border-[#E8E4D9] dark:border-[#2A2F37] overflow-hidden flex flex-col">
          <button
            id="map-zoom-in-btn"
            type="button"
            onClick={handleZoomIn}
            title="拡大"
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-[#434338] dark:text-[#CBD5E1] hover:bg-[#F3F4ED] dark:hover:bg-[#242930] hover:text-[#4A6741] dark:hover:text-[#6B8E61] active:bg-[#EAEFE8] dark:active:bg-[#2C323B] transition-colors border-b border-[#E8E4D9] dark:border-[#2A2F37] cursor-pointer"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            id="map-zoom-out-btn"
            type="button"
            onClick={handleZoomOut}
            title="縮小"
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-[#434338] dark:text-[#CBD5E1] hover:bg-[#F3F4ED] dark:hover:bg-[#242930] hover:text-[#4A6741] dark:hover:text-[#6B8E61] active:bg-[#EAEFE8] dark:active:bg-[#2C323B] transition-colors cursor-pointer"
          >
            <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
