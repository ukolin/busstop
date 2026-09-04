import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HIROSHIMA_CENTER,
  HIROSHIMA_BUS_STOPS,
  INITIAL_ACTIVE_BUSES,
  calculateDistanceMeters,
  calculateWalkingMinutes,
  consolidateOverlappingStops,
} from './data/hiroshimaData';
import { UserLocation, BusStop, ActiveBus, PresetLocation, BusCompanyFilter } from './types';
import { MapComponent } from './components/MapComponent';
import { Header } from './components/Header';
import { NextDeparturesCard } from './components/NextDeparturesCard';
import { BusDetailModal } from './components/BusDetailModal';
import { LocationPresetModal } from './components/LocationPresetModal';
import { StopSelectorModal } from './components/StopSelectorModal';
import { BusStopsDataModal } from './components/BusStopsDataModal';
import { loadAllBusStopTimes } from './data/timetableService';

export default function App() {
  // Preload full busStopTimes.json on application startup
  useEffect(() => {
    loadAllBusStopTimes();
  }, []);

  // 1. User Location State
  const [userLocation, setUserLocation] = useState<UserLocation>({
    lat: HIROSHIMA_CENTER.lat,
    lng: HIROSHIMA_CENTER.lng,
    accuracy: 15,
    isGps: false,
    label: '広島駅南口周辺',
  });
  const [isLoadingGps, setIsLoadingGps] = useState(false);

  // Bus company filter state ('all' | '広電バス' | '広島バス' | '広島交通' | 'JRバス中国')
  const [selectedCompany, setSelectedCompany] = useState<BusCompanyFilter>('all');

  // Bus stops state (supports custom JSON edits & position adjustments)
  const [busStops, setBusStops] = useState<BusStop[]>(() => {
    try {
      localStorage.removeItem('hiroshima_bus_stops_v5_csv');
      localStorage.removeItem('hiroshima_bus_stops_v4');
      localStorage.removeItem('hiroshima_bus_stops_v3');
      const saved = localStorage.getItem('hiroshima_bus_stops_v6_combined');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= HIROSHIMA_BUS_STOPS.length) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load custom bus stops from localStorage:', e);
    }
    return HIROSHIMA_BUS_STOPS;
  });

  // 2. Active Running Buses State
  const [activeBuses, setActiveBuses] = useState<ActiveBus[]>(INITIAL_ACTIVE_BUSES);
  const [selectedBus, setSelectedBus] = useState<ActiveBus | null>(null);

  // 3. Radius & UI States
  const [showRadiusCircle, setShowRadiusCircle] = useState(true);
  const [showAllStopsOnMap, setShowAllStopsOnMap] = useState(true);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isStopSelectorOpen, setIsStopSelectorOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [lastClickedCoords, setLastClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [isAutoSelected, setIsAutoSelected] = useState(true);

  // Dark Mode State with localStorage & media query preference sync
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('hiroshima_bus_theme');
      if (saved) return saved === 'dark';
      return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      try {
        localStorage.setItem('hiroshima_bus_theme', 'dark');
      } catch (e) {}
    } else {
      root.classList.remove('dark');
      try {
        localStorage.setItem('hiroshima_bus_theme', 'light');
      } catch (e) {}
    }
  }, [isDarkMode]);

  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // Company count calculation
  const companyCounts = useMemo(() => {
    const counts = {
      all: busStops.length,
      '広電バス': 0,
      '広島バス': 0,
      '広島交通': 0,
      'JRバス中国': 0,
    };
    busStops.forEach((s) => {
      const comp = s.company || s.operator;
      if (comp === '広島バス') {
        counts['広島バス']++;
      } else if (comp === '広島交通') {
        counts['広島交通']++;
      } else if (comp === 'JRバス中国') {
        counts['JRバス中国']++;
      } else {
        counts['広電バス']++;
      }
    });
    return counts;
  }, [busStops]);

  // 4. Calculate Distances for all stops
  const allStopsWithDistance = useMemo(() => {
    return busStops.map((stop) => {
      const distance = calculateDistanceMeters(
        userLocation.lat,
        userLocation.lng,
        stop.lat,
        stop.lng
      );
      const walkingMin = calculateWalkingMinutes(distance);
      return {
        ...stop,
        distanceMeters: distance,
        walkingMinutes: walkingMin,
      };
    });
  }, [busStops, userLocation.lat, userLocation.lng]);

  // Filter stops and buses by selected bus company
  const companyFilteredStops = useMemo(() => {
    if (selectedCompany === 'all') {
      return consolidateOverlappingStops(allStopsWithDistance);
    }
    const filtered = allStopsWithDistance.filter((s) => {
      if (s.company === selectedCompany || s.operator === selectedCompany) return true;
      if (s.companies?.includes(selectedCompany as any)) return true;
      return false;
    });
    return consolidateOverlappingStops(filtered);
  }, [allStopsWithDistance, selectedCompany]);

  const companyFilteredBuses = useMemo(() => {
    if (selectedCompany === 'all') return activeBuses;
    return activeBuses.filter((b) => b.company === selectedCompany);
  }, [activeBuses, selectedCompany]);

  // Nearby Stops (within 500m) of filtered stops
  const nearbyStops = useMemo(() => {
    return companyFilteredStops
      .filter((stop) => (stop.distanceMeters ?? 0) <= 500)
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  }, [companyFilteredStops]);

  const nearbyStopIds = useMemo(() => {
    const ids = new Set<string>();
    nearbyStops.forEach((s) => {
      ids.add(s.id);
      if (s.subStops) {
        s.subStops.forEach((sub) => ids.add(sub.id));
      }
    });
    return ids;
  }, [nearbyStops]);

  // If no stops within 500m, fall back to nearest stop across filtered stops
  const nearestAnyStop = useMemo(() => {
    const sorted = [...companyFilteredStops].sort(
      (a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0)
    );
    return sorted[0] || null;
  }, [companyFilteredStops]);

  // Determine active selected bus stop
  const selectedStop = useMemo(() => {
    if (selectedStopId) {
      const found = companyFilteredStops.find(
        (s) => s.id === selectedStopId || s.subStops?.some((sub) => sub.id === selectedStopId)
      );
      if (found) return found;
      const foundInAll = allStopsWithDistance.find(
        (s) => s.id === selectedStopId || s.subStops?.some((sub) => sub.id === selectedStopId)
      );
      if (foundInAll) return foundInAll;
    }
    // Auto select closest within 500m, or nearest overall
    return nearbyStops[0] || nearestAnyStop;
  }, [selectedStopId, companyFilteredStops, allStopsWithDistance, nearbyStops, nearestAnyStop]);

  // Auto-select nearest stop whenever user location or company filter updates
  useEffect(() => {
    if (nearbyStops.length > 0) {
      setSelectedStopId(nearbyStops[0].id);
      setIsAutoSelected(true);
    } else if (nearestAnyStop) {
      setSelectedStopId(nearestAnyStop.id);
      setIsAutoSelected(true);
    }
  }, [userLocation.lat, userLocation.lng, selectedCompany]);

  // 5. GPS Geolocation Request Handler
  const requestGeolocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator || !('geolocation' in navigator)) {
      setUserLocation((prev) => ({
        ...prev,
        lat: HIROSHIMA_CENTER.lat,
        lng: HIROSHIMA_CENTER.lng,
        isGps: false,
        label: '広島駅南口周辺',
      }));
      return;
    }

    setIsLoadingGps(true);

    const handleSuccess = (position: GeolocationPosition) => {
      try {
        const { latitude, longitude, accuracy } = position.coords;
        const distFromHiroshima = calculateDistanceMeters(
          latitude,
          longitude,
          HIROSHIMA_CENTER.lat,
          HIROSHIMA_CENTER.lng
        );

        if (distFromHiroshima > 45000) {
          setUserLocation({
            lat: HIROSHIMA_CENTER.lat,
            lng: HIROSHIMA_CENTER.lng,
            accuracy: 20,
            isGps: false,
            label: '広島駅南口（デモ地点）',
          });
        } else {
          setUserLocation({
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy || 20),
            isGps: true,
            label: `現在地 (精度 ±${Math.round(accuracy || 20)}m)`,
          });
        }
      } catch {
        setUserLocation((prev) => ({
          ...prev,
          lat: HIROSHIMA_CENTER.lat,
          lng: HIROSHIMA_CENTER.lng,
          isGps: false,
          label: '広島駅南口周辺',
        }));
      } finally {
        setIsLoadingGps(false);
      }
    };

    const handleError = (_error?: GeolocationPositionError) => {
      setIsLoadingGps(false);
      setUserLocation((prev) => ({
        ...prev,
        lat: HIROSHIMA_CENTER.lat,
        lng: HIROSHIMA_CENTER.lng,
        isGps: false,
        label: '広島駅南口周辺',
      }));
    };

    try {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000,
        }
      );
    } catch {
      handleError();
    }
  }, []);


  // 7. Select a preset location
  const handleSelectPreset = (preset: PresetLocation) => {
    setUserLocation({
      lat: preset.lat,
      lng: preset.lng,
      accuracy: 10,
      isGps: false,
      label: preset.name,
    });
  };

  // 8. Focus / Center on a stop or bus
  const handleSelectStop = (stop: BusStop) => {
    setSelectedStopId(stop.id);
    setIsAutoSelected(false);
  };

  const handleSelectBus = (bus: ActiveBus) => {
    setSelectedBus(bus);
  };

  const handleSelectBusById = (busId: string) => {
    const bus = activeBuses.find((b) => b.id === busId);
    if (bus) {
      setSelectedBus(bus);
    }
  };

  const handleFocusStop = (stop: BusStop) => {
    setUserLocation((prev) => ({
      ...prev,
      lat: stop.lat,
      lng: stop.lng,
      label: `${stop.name} 周辺`,
    }));
  };

  const handleTrackBus = (bus: ActiveBus) => {
    setUserLocation((prev) => ({
      ...prev,
      lat: bus.currentLat,
      lng: bus.currentLng,
      label: `${bus.routeNumber} 付近`,
    }));
  };

  const handleUpdateStopPosition = (stopId: string, lat: number, lng: number) => {
    setBusStops((prev) => {
      const next = prev.map((s) => (s.id === stopId ? { ...s, lat, lng } : s));
      try {
        localStorage.setItem('hiroshima_bus_stops_v6_combined', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save updated stop position:', e);
      }
      return next;
    });
  };

  const handleSaveBusStops = (newStops: BusStop[]) => {
    setBusStops(newStops);
    try {
      localStorage.setItem('hiroshima_bus_stops_v6_combined', JSON.stringify(newStops));
    } catch (e) {
      console.error('Failed to save bus stops to localStorage:', e);
    }
  };

  const handleResetToDefaultBusStops = () => {
    try {
      localStorage.removeItem('hiroshima_bus_stops_v6_combined');
      localStorage.removeItem('hiroshima_bus_stops_v5_csv');
      localStorage.removeItem('hiroshima_bus_stops_v4');
      localStorage.removeItem('hiroshima_bus_stops_v3');
      localStorage.removeItem('hiroshima_bus_stops_custom_v2');
      localStorage.removeItem('hiroshima_bus_stops_custom');
    } catch (e) {
      console.error('Failed to remove custom bus stops:', e);
    }
    setBusStops(HIROSHIMA_BUS_STOPS);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#F9F7F2] dark:bg-[#111317] font-sans text-[#434338] dark:text-[#E2E8F0] antialiased">
      {/* 1. Mobile Header with company switcher tabs & live pulse */}
      <Header
        userLocation={userLocation}
        isLoadingGps={isLoadingGps}
        nearbyStopCount={nearbyStops.length}
        activeBusCount={companyFilteredBuses.length}
        selectedCompany={selectedCompany}
        onSelectCompany={setSelectedCompany}
        companyCounts={companyCounts}
        onRefreshGps={requestGeolocation}
        onOpenPresetModal={() => setIsPresetModalOpen(true)}
        onOpenStopSelector={() => setIsStopSelectorOpen(true)}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {/* 2. Fullscreen Leaflet Map Component */}
      <MapComponent
        userLocation={userLocation}
        busStops={showAllStopsOnMap ? companyFilteredStops : (nearbyStops.length > 0 ? nearbyStops : companyFilteredStops.slice(0, 6))}
        selectedStop={selectedStop}
        nearbyStopIds={nearbyStopIds}
        onSelectStop={handleSelectStop}
        activeBuses={companyFilteredBuses}
        selectedBus={selectedBus}
        onSelectBus={handleSelectBus}
        showRadiusCircle={showRadiusCircle}
        onToggleRadiusCircle={() => setShowRadiusCircle(!showRadiusCircle)}
        showAllStops={showAllStopsOnMap}
        onToggleShowAllStops={() => setShowAllStopsOnMap(!showAllStopsOnMap)}
        onMapClickCoords={(coords) => setLastClickedCoords(coords)}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        onUpdateStopPosition={handleUpdateStopPosition}
        onResetStopsToDefault={handleResetToDefaultBusStops}
        isDarkMode={isDarkMode}
        onRecenterUser={() => {
          setUserLocation((prev) => ({ ...prev }));
        }}
      />

      {/* 3. Bottom Card: 『次の発車時刻一覧』 with Direction (上り/下り) & Sister Stops Switching */}
      <NextDeparturesCard
        selectedStop={selectedStop}
        isAutoSelected={isAutoSelected}
        allStops={allStopsWithDistance}
        onFocusStop={handleFocusStop}
        onSelectBusById={handleSelectBusById}
        activeBuses={companyFilteredBuses}
        allNearbyStops={nearbyStops}
        onSelectAnotherStop={handleSelectStop}
        onOpenAllStopsModal={() => setIsStopSelectorOpen(true)}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        isNearby={selectedStop ? nearbyStopIds.has(selectedStop.id) : false}
        totalStopsCount={companyFilteredStops.length}
        selectedCompany={selectedCompany}
        onSelectCompany={setSelectedCompany}
      />

      {/* 4. Tapped Bus Detail Modal: 『行先・遅延情報』 */}
      <BusDetailModal
        bus={selectedBus}
        onClose={() => setSelectedBus(null)}
        onTrackBus={handleTrackBus}
      />

      {/* 5. Hiroshima Location Preset Modal */}
      <LocationPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onSelectPreset={handleSelectPreset}
        onRequestGps={requestGeolocation}
        currentLocation={userLocation}
        isLoadingGps={isLoadingGps}
      />

      {/* 6. All Hiroshima Bus Stops Modal (その他のバス停一覧) */}
      <StopSelectorModal
        isOpen={isStopSelectorOpen}
        onClose={() => setIsStopSelectorOpen(false)}
        allStops={allStopsWithDistance}
        selectedStop={selectedStop}
        nearbyStopIds={nearbyStopIds}
        initialCompanyFilter={selectedCompany}
        onSelectStop={(stop) => {
          handleSelectStop(stop);
        }}
        onFocusStop={(stop) => {
          handleFocusStop(stop);
        }}
        onOpenDataModal={() => setIsDataModalOpen(true)}
      />

      {/* 7. Bus Stops & Timetables JSON Data & Position Editor Modal */}
      <BusStopsDataModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        busStops={busStops}
        onSaveBusStops={handleSaveBusStops}
        onResetToDefault={handleResetToDefaultBusStops}
        lastClickedCoords={lastClickedCoords}
        onFocusCoordinates={(lat, lng) => {
          setUserLocation((prev) => ({
            ...prev,
            lat,
            lng,
            label: '選択したバス停地点',
          }));
        }}
      />
    </div>
  );
}
