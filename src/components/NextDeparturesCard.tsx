import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Bus,
  Clock,
  ChevronUp,
  ChevronDown,
  MapPin,
  AlertCircle,
  Compass,
  Users,
  Sparkles,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Calendar,
  Sun,
  Sunset,
  Moon,
  RotateCcw
} from 'lucide-react';
import { BusStop, DepartureItem, ActiveBus, BusCompany, BusCompanyFilter, RealtimeDelayMap } from '../types';
import { lookupTripDelay, useRealtimeDelays } from '../data/realtimeDelayService';
import {
  fetchTimetableForStop,
  getCachedTimetable,
  getJapanCurrentTime,
  parseTimeToMinutes,
  normalizeDepartureItem,
  getStopPlatformLabel,
  getShortPlatformBadge,
  formatPlatformText,
  getCompanyColor,
  JapanTimeInfo,
} from '../data/timetableService';
import { SwipeableContainer } from './SwipeableContainer';

interface NextDeparturesCardProps {
  selectedStop: BusStop | null;
  isAutoSelected: boolean;
  allStops?: BusStop[];
  onFocusStop: (stop: BusStop) => void;
  onSelectBusById?: (busId: string) => void;
  activeBuses: ActiveBus[];
  allNearbyStops: BusStop[];
  onSelectAnotherStop: (stop: BusStop) => void;
  onOpenAllStopsModal?: () => void;
  onOpenDataModal?: () => void;
  isNearby?: boolean;
  totalStopsCount?: number;
  selectedCompany?: BusCompanyFilter;
  onSelectCompany?: (company: BusCompanyFilter) => void;
  realtimeDelays?: RealtimeDelayMap;
}

export const NextDeparturesCard: React.FC<NextDeparturesCardProps> = ({
  selectedStop,
  isAutoSelected,
  allStops = [],
  onFocusStop,
  onSelectBusById,
  activeBuses,
  allNearbyStops,
  onSelectAnotherStop,
  onOpenAllStopsModal,
  onOpenDataModal,
  isNearby = true,
  totalStopsCount,
  selectedCompany = 'all',
  onSelectCompany,
  realtimeDelays,
}) => {
  // Real-time delay dictionary: use prop if provided, or fallback to internal polling hook
  const fallbackDelays = useRealtimeDelays(60000);
  const activeDelays = realtimeDelays || fallbackDelays.delays;

  // Start expanded by default within 35vh, but allow collapsing to a compact 52px bar
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'upcoming' | 'approaching' | 'all_day'>('upcoming');
  const [companyFilter, setCompanyFilter] = useState<'all' | BusCompany>(() =>
    selectedCompany !== 'all' ? selectedCompany : 'all'
  );
  const [selectedSubStopId, setSelectedSubStopId] = useState<string>('all');

  useEffect(() => {
    setSelectedSubStopId('all');
  }, [selectedStop?.id]);

  // Time simulation state: null = Live JST, or specific minute of day (e.g. 480 for 08:00)
  const [simulatedMinutes, setSimulatedMinutes] = useState<number | null>(null);
  const [isTimePresetOpen, setIsTimePresetOpen] = useState(false);

  // Japan Standard Time (Asia/Tokyo) updated every 10s for live mode
  const [liveTime, setLiveTime] = useState<JapanTimeInfo>(() => getJapanCurrentTime(null));

  useEffect(() => {
    const update = () => {
      setLiveTime(getJapanCurrentTime(null));
    };
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  // Compute effective timeInfo synchronously based on simulatedMinutes or liveTime
  const timeInfo = useMemo(() => {
    if (simulatedMinutes !== null) {
      return getJapanCurrentTime(simulatedMinutes);
    }
    return liveTime;
  }, [simulatedMinutes, liveTime]);

  // Effective company filter prioritizes top-level selectedCompany if not 'all'
  const effectiveCompanyFilter: 'all' | BusCompany =
    selectedCompany !== 'all' ? selectedCompany : companyFilter;

  // Sync internal company filter when selectedCompany changes from header
  useEffect(() => {
    if (selectedCompany !== 'all') {
      setCompanyFilter(selectedCompany);
    } else {
      setCompanyFilter('all');
    }
  }, [selectedCompany]);

  // On-demand timetable state
  const [stopTimetable, setStopTimetable] = useState<DepartureItem[]>(() => {
    if (selectedStop?.id) {
      const cached = getCachedTimetable(selectedStop.id);
      if (cached && cached.length > 0) return cached;
    }
    if (selectedStop?.timetable && selectedStop.timetable.length > 0) {
      return selectedStop.timetable.map((t, idx) => normalizeDepartureItem(t, selectedStop.id, idx));
    }
    return [];
  });
  const [isLoadingTimetable, setIsLoadingTimetable] = useState(false);

  useEffect(() => {
    if (!selectedStop) {
      setStopTimetable([]);
      return;
    }

    const compFilter: BusCompanyFilter = selectedCompany as BusCompanyFilter;

    // Check if stop has subStops (e.g. multi-company consolidated stop or multiple poles)
    const stopIdsToFetch =
      selectedStop.subStops && selectedStop.subStops.length > 0
        ? selectedStop.subStops.map((s) => s.id)
        : [selectedStop.id];

    setIsLoadingTimetable(true);
    let isCancelled = false;

    Promise.all(
      stopIdsToFetch.map((id) => {
        const sub = selectedStop.subStops?.find((s) => s.id === id);
        return fetchTimetableForStop(
          id,
          sub?.name || selectedStop.name,
          sub?.operator || selectedStop.operator,
          compFilter
        );
      })
    )
      .then((results) => {
        if (!isCancelled) {
          const merged = results.flat();
          // De-duplicate and sort by scheduledTime
          const seen = new Set<string>();
          const deduped: DepartureItem[] = [];
          merged.forEach((item, idx) => {
            const norm = normalizeDepartureItem(item, selectedStop.id, idx);
            const key = `${norm.scheduledTime}-${norm.routeNumber}-${norm.destination}-${norm.company}`;
            if (!seen.has(key)) {
              seen.add(key);
              deduped.push(norm);
            }
          });
          deduped.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

          if (deduped.length > 0) {
            setStopTimetable(deduped);
          } else if (selectedStop.timetable && selectedStop.timetable.length > 0) {
            setStopTimetable(
              selectedStop.timetable.map((t, idx) => normalizeDepartureItem(t, selectedStop.id, idx))
            );
          }
          setIsLoadingTimetable(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          if (selectedStop.timetable && selectedStop.timetable.length > 0) {
            setStopTimetable(
              selectedStop.timetable.map((t, idx) => normalizeDepartureItem(t, selectedStop.id, idx))
            );
          }
          setIsLoadingTimetable(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedStop?.id, selectedStop?.name, selectedStop?.operator, selectedStop?.subStops, selectedCompany]);

  // Reset company filter when selected stop changes (if top filter is 'all')
  useEffect(() => {
    if (selectedCompany === 'all') {
      setCompanyFilter('all');
    }
  }, [selectedStop?.id, selectedCompany]);

  // Find sister poles with the same stop name (e.g. 上り vs 下り or different platform numbers)
  const sisterPoles = useMemo(() => {
    if (!selectedStop) return [];
    const pool = allStops.length > 0 ? allStops : allNearbyStops;
    return pool.filter((s) => s.name === selectedStop.name);
  }, [selectedStop, allStops, allNearbyStops]);

  // Available bus companies serving this stop (e.g., 広電バス and 広島バス)
  const availableCompanies = useMemo(() => {
    if (!selectedStop) return [];
    if (selectedStop.companies && selectedStop.companies.length > 0) {
      return selectedStop.companies;
    }
    const set = new Set<BusCompany>();
    if (selectedStop.company) set.add(selectedStop.company);
    stopTimetable.forEach((t) => {
      if (t.company) set.add(t.company);
    });
    return Array.from(set);
  }, [selectedStop, stopTimetable]);

  // Timetable counts by company
  const companyCounts = useMemo(() => {
    if (!selectedStop) return { all: 0 };
    const counts: Record<string, number> = { all: stopTimetable.length };
    availableCompanies.forEach((comp) => {
      counts[comp] = stopTimetable.filter((t) => t.company === comp).length;
    });
    return counts;
  }, [selectedStop, stopTimetable, availableCompanies]);

  if (!selectedStop) {
    return (
      <div id="next-departures-card" className="absolute bottom-1 left-1 right-1 sm:bottom-3 sm:left-3 sm:right-3 max-w-lg mx-auto z-[1000] pointer-events-auto">
        <div className="bg-[#FDFBF7]/95 backdrop-blur-md rounded-2xl shadow-lg border border-[#E8E4D9] px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-center justify-between gap-2 text-left">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#D97706] shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-[#2D3436] truncate">500m以内にバス停が見つかりません</h3>
              <p className="text-[9.5px] sm:text-[10px] text-[#7A7969] truncate">
                広島市内のバス停一覧から時刻表を確認できます
              </p>
            </div>
          </div>
          {onOpenAllStopsModal && (
            <button
              id="no-stop-open-all-stops-btn"
              type="button"
              onClick={onOpenAllStopsModal}
              className="shrink-0 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold text-[#4A6741] bg-[#F3F4ED] hover:bg-[#E8EBE4] border border-[#D5DBD0] rounded-lg transition-colors whitespace-nowrap"
            >
              バス停一覧
            </button>
          )}
        </div>
      </div>
    );
  }

  // Current reference minute in Japan Standard Time
  const currentTotalMinutes = timeInfo.totalMinutes;

  // Enhance timetable with live countdowns & future / past statuses & realtime GTFS-RT delays
  const enrichedTimetable = useMemo(() => {
    if (!selectedStop || stopTimetable.length === 0) return [];

    return stopTimetable.map((item, idx) => {
      const norm = normalizeDepartureItem(item, selectedStop.id, idx);

      // Real-time GTFS-RT delay lookup by trip_id / tripId or deterministic mapping
      const delaySec = lookupTripDelay({ ...norm, stopId: selectedStop.id }, activeDelays);
      const scheduledMinutes = parseTimeToMinutes(norm.scheduledTime);
      const diffMinutes = scheduledMinutes - currentTotalMinutes;
      const isPastToday = diffMinutes < -2;
      const nextDayDiffMinutes = isPastToday ? diffMinutes + 1440 : diffMinutes;

      // Real-time tracking applies to upcoming departures today
      const hasRealtime = !isPastToday && delaySec !== undefined;
      const delayMinutes = hasRealtime ? Math.floor((delaySec ?? 0) / 60) : (norm.delayMinutes || 0);

      return {
        ...norm,
        delaySeconds: hasRealtime ? delaySec : undefined,
        delayMinutes,
        hasRealtime,
        status: (delayMinutes > 0 ? 'delayed' : norm.status) as DepartureItem['status'],
        scheduledMinutes,
        liveMinutesAway: diffMinutes,
        nextDayDiffMinutes,
        isPastToday,
        isTomorrow: isPastToday,
      };
    });
  }, [selectedStop, stopTimetable, currentTotalMinutes, activeDelays]);

  // Filter timetable departures based on filter tab, company, and optional sub-stop platform
  const departures = useMemo(() => {
    let baseList = enrichedTimetable;

    // Sub-stop pole filter (if a specific pole/direction is tapped)
    if (selectedSubStopId !== 'all' && selectedStop?.subStops && selectedStop.subStops.length > 1) {
      const targetSub = selectedStop.subStops.find((s) => s.id === selectedSubStopId);
      if (targetSub) {
        const targetRoutes = new Set(targetSub.routes || []);
        const targetComp = targetSub.company || (targetSub.operator === 'hiroshimabus' ? '広島バス' : '広電バス');
        const filtered = baseList.filter((item) => {
          if (item.busId?.includes(targetSub.id)) return true;
          if (targetRoutes.size > 0 && targetRoutes.has(item.routeNumber)) {
            return item.company === targetComp;
          }
          return false;
        });
        if (filtered.length > 0) {
          baseList = filtered;
        }
      }
    }

    const companyFilteredList =
      effectiveCompanyFilter === 'all'
        ? baseList
        : baseList.filter((item) => item.company === effectiveCompanyFilter);

    if (companyFilteredList.length === 0) return [];

    if (selectedFilter === 'approaching') {
      // Departures in next 15 minutes
      return companyFilteredList.filter((item) => item.liveMinutesAway >= -2 && item.liveMinutesAway <= 15);
    }

    if (selectedFilter === 'upcoming') {
      // 1. Departures remaining today (upcoming or imminent)
      const upcomingToday = companyFilteredList.filter((item) => item.liveMinutesAway >= -2);
      if (upcomingToday.length > 0) {
        return upcomingToday;
      }

      // 2. If all buses today have departed (late night or off-peak), show tomorrow's morning departures
      // Sorted by nextDayDiffMinutes so morning first buses (06:00, 06:15...) appear first
      return [...companyFilteredList]
        .sort((a, b) => a.nextDayDiffMinutes - b.nextDayDiffMinutes)
        .slice(0, 15);
    }

    // 'all_day': Full day's schedule from 06:00 to 23:30
    return companyFilteredList;
  }, [enrichedTimetable, effectiveCompanyFilter, selectedFilter, selectedSubStopId, selectedStop]);

  // Nearest upcoming departure item for compact preview bar
  const nextDeparture = useMemo(() => {
    if (enrichedTimetable.length === 0) return null;
    const upcoming = enrichedTimetable.filter((item) => item.liveMinutesAway >= -2);
    if (upcoming.length > 0) return upcoming[0];
    // Fallback to first bus of tomorrow
    return [...enrichedTimetable].sort((a, b) => a.nextDayDiffMinutes - b.nextDayDiffMinutes)[0];
  }, [enrichedTimetable]);

  const isMultiCompany = availableCompanies.length > 1;

  // Companies to display in badges
  const displayedBadges = useMemo(() => {
    if (selectedCompany !== 'all') {
      return [selectedCompany];
    }
    return availableCompanies;
  }, [selectedCompany, availableCompanies]);

  // Formatter for countdown text (directly counts down to the bus departure time if today, or shows tomorrow status)
  const formatCountdown = (minsAway: number, isPastToday: boolean, isTomorrow: boolean, isFirstOfTomorrow: boolean = false) => {
    if (isPastToday) {
      return '発車済';
    }
    if (isTomorrow) {
      return isFirstOfTomorrow ? '翌日始発' : '翌日便';
    }
    if (minsAway >= -2 && minsAway <= 1) {
      return 'まもなく';
    }
    if (minsAway > 1 && minsAway < 60) {
      return `あと${minsAway}分`;
    }
    if (minsAway >= 60) {
      const h = Math.floor(minsAway / 60);
      const m = minsAway % 60;
      return m > 0 ? `あと${h}時間${m}分` : `あと${h}時間`;
    }
    return `あと${minsAway}分`;
  };

  // Check if all departures scheduled for today have finished
  const isTodayEnded = useMemo(() => {
    if (enrichedTimetable.length === 0) return false;
    const upcomingToday = enrichedTimetable.filter((item) => item.liveMinutesAway >= -2);
    return upcomingToday.length === 0;
  }, [enrichedTimetable]);

  return (
    <div
      id="next-departures-card"
      className="absolute bottom-[max(0.375rem,env(safe-area-inset-bottom))] left-1.5 right-1.5 sm:bottom-3 sm:left-3 sm:right-3 max-w-lg mx-auto z-[1000] pointer-events-auto transition-all duration-300"
    >
      <div className={`bg-[#FDFBF7]/95 dark:bg-[#1B1E23]/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#E8E4D9] dark:border-[#2A2F37] overflow-hidden flex flex-col transition-all duration-300 ${
        isExpanded ? 'max-h-[min(48dvh,420px)] h-[min(48dvh,420px)] sm:max-h-[42vh] sm:h-[42vh]' : 'max-h-[100px]'
      }`}>
        {/* Drawer Pull Handle & Compact Header Bar */}
        <div className="px-2.5 sm:px-3 pt-1.5 pb-1.5 border-b border-[#E8E4D9] dark:border-[#2A2F37] bg-[#FDFBF7] dark:bg-[#1B1E23] shrink-0">
          <div className="flex items-start justify-between gap-1.5">
            {/* Left info: Stop Name & Badges */}
            <div
              className="flex items-start gap-1 sm:gap-1.5 min-w-0 flex-1 cursor-pointer pt-0.5"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? '折りたたむ' : '展開する'}
            >
              <button
                id="next-departures-drawer-handle"
                type="button"
                className="w-3 h-4 flex items-center justify-center text-[#7A7969] dark:text-[#94A3B8] hover:text-[#2D3436] dark:hover:text-[#F1F5F9] shrink-0 cursor-pointer mt-0.5"
                aria-label={isExpanded ? '折りたたむ' : '展開する'}
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>

              <div className="min-w-0 flex-1">
                <div className={`flex items-center gap-1 sm:gap-1.5 leading-tight ${isExpanded ? 'flex-wrap' : 'whitespace-nowrap'}`}>
                  <h2 className={`text-xs sm:text-sm font-black text-[#2D3436] dark:text-[#F1F5F9] ${isExpanded ? '' : 'truncate shrink min-w-0'}`}>
                    {selectedStop.name}
                  </h2>

                  {/* Multi-Company or Single Company Color Badges */}
                <div className="flex items-center gap-1 shrink-0 px-1 py-0.5 rounded-full bg-black/5 dark:bg-white/10" title={displayedBadges.join('・')}>
                  {displayedBadges.map((c) => (
                    <span
                      key={c}
                      className="w-2.5 h-2.5 rounded-full inline-block shadow-2xs border border-white/80 dark:border-black/50"
                      style={{ backgroundColor: getCompanyColor(c) }}
                    />
                  ))}
                </div>

                {/* Platform / Dropoff Badge */}
                {selectedStop.direction === 'dropoff' ? (
                  <span className="text-[8.5px] sm:text-[9.5px] px-1.5 sm:px-2 py-0.2 rounded font-bold text-white bg-[#64748b] shrink-0">
                    降車専用
                  </span>
                ) : (
                  <span
                    className="text-[8.5px] sm:text-[9.5px] px-1.5 sm:px-2 py-0.2 rounded font-bold text-white shrink-0 shadow-2xs"
                    style={{
                      backgroundColor:
                        displayedBadges.length > 1
                          ? '#334155'
                          : getCompanyColor(
                              selectedStop.company ||
                                (selectedStop.operator === 'hiroshimabus' ? '広島バス' : '広電バス')
                            ),
                    }}
                  >
                    {getStopPlatformLabel(selectedStop)}
                  </span>
                )}

                {selectedStop.distanceMeters !== undefined && (
                  isNearby ? (
                    <span className="text-[8.5px] sm:text-[9.5px] font-bold text-[#4A6741] dark:text-[#6B8E61] bg-[#F3F4ED] dark:bg-[#242930] border border-[#D5DBD0] dark:border-[#2A2F37] px-1 py-0.2 rounded leading-none shrink-0">
                      徒歩{selectedStop.walkingMinutes || 1}分 ({selectedStop.distanceMeters}m)
                    </span>
                  ) : (
                    <span className="text-[8.5px] sm:text-[9.5px] font-bold text-[#5B594B] dark:text-[#94A3B8] bg-[#F3F4ED] dark:bg-[#242930] border border-[#E8E4D9] dark:border-[#2A2F37] px-1 py-0.2 rounded leading-none shrink-0">
                      {selectedStop.distanceMeters >= 1000
                        ? `約${(selectedStop.distanceMeters / 1000).toFixed(1)}km`
                        : `約${selectedStop.distanceMeters}m`}
                    </span>
                  )
                )}
                </div>
              </div>
            </div>

            {/* Right Controls: Clock/Simulator, Opposite Direction, Data Modal, Focus, Expand */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              {/* Clock & Time Simulator Toggle */}
              <button
                id="toggle-time-preset-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTimePresetOpen(!isTimePresetOpen);
                }}
                title="現在時刻(JST)および時間シミュレーションの変更"
                className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg text-[9.5px] sm:text-[10.5px] font-bold border transition-colors shadow-2xs whitespace-nowrap cursor-pointer ${
                  simulatedMinutes !== null
                    ? 'bg-[#FEF3C7] dark:bg-[#78350F]/40 text-[#92400E] dark:text-[#FDE68A] border-[#FDE68A] dark:border-[#B45309]'
                    : 'bg-[#F3F4ED] dark:bg-[#242930] text-[#4A6741] dark:text-[#6B8E61] hover:bg-[#EAEFE8] dark:hover:bg-[#2C323B] border-[#CAD4C6] dark:border-[#2A2F37]'
                }`}
              >
                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#4A6741] dark:text-[#6B8E61]" />
                <span>{timeInfo.timeString}</span>
                {simulatedMinutes !== null && <span className="text-[8px] bg-[#D97706] text-white px-0.5 rounded">指定</span>}
              </button>

              {/* GTFS-RT Realtime delay indicator */}
              <div
                className="hidden xs:flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-[#F3F4ED] dark:bg-[#242930] text-[#4A6741] dark:text-[#6B8E61] border border-[#CAD4C6] dark:border-[#2A2F37]"
                title="リアルタイム遅延情報(GTFS-RT)を60秒間隔で取得中"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                <span className="leading-none whitespace-nowrap">RT遅延連動</span>
              </div>

              <button
                id="focus-selected-stop-btn"
                type="button"
                onClick={() => onFocusStop(selectedStop)}
                title="地図の中央に表示"
                aria-label="地図の中央に表示"
                className="p-1 text-[#7A7969] dark:text-[#94A3B8] hover:text-[#4A6741] dark:hover:text-[#6B8E61] hover:bg-[#F3F4ED] dark:hover:bg-[#242930] rounded-lg transition-colors flex items-center justify-center cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                id="toggle-expand-timetable-btn"
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'カードを最小化' : '発車時刻を展開'}
                aria-label={isExpanded ? 'カードを最小化' : '発車時刻を展開'}
                className="p-1 text-[#7A7969] dark:text-[#94A3B8] hover:text-[#2D3436] dark:hover:text-[#F1F5F9] hover:bg-[#F3F4ED] dark:hover:bg-[#242930] rounded-lg transition-colors flex items-center justify-center cursor-pointer"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
            </div>
          </div>

          {!isExpanded && nextDeparture && (
            <div 
              className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] text-[#5B594B] dark:text-[#CBD5E1] mt-1 pl-4 sm:pl-5 min-w-0 cursor-pointer"
              onClick={() => setIsExpanded(true)}
            >
              <span className="text-[9px] sm:text-[10px] font-bold px-1 py-0.2 rounded text-white shrink-0" style={{ backgroundColor: nextDeparture.companyColor }}>
                {nextDeparture.routeNumber}
              </span>
              <span className="font-bold text-[#2D3436] dark:text-[#F1F5F9] truncate shrink min-w-0">{nextDeparture.destination}</span>
              <span className="font-bold shrink-0 ml-auto flex items-center gap-1">
                {isTodayEnded ? (
                  <span className="text-[9.5px] font-bold text-[#0369A1] dark:text-[#38BDF8] bg-[#E0F2FE] dark:bg-[#0369A1]/30 border border-[#BAE6FD] dark:border-[#0369A1] px-1.5 py-0.2 rounded-full">
                    翌日始発 {nextDeparture.scheduledTime}発
                  </span>
                ) : (
                  <span className="text-[#D97706] dark:text-[#FBBF24] flex items-center gap-1">
                    <span>{nextDeparture.scheduledTime}発</span>
                    {nextDeparture.hasRealtime ? (
                      (nextDeparture.delaySeconds ?? 0) >= 60 ? (
                        <span className="text-[#DC2626] dark:text-[#EF4444] font-bold">
                          +{Math.floor((nextDeparture.delaySeconds ?? 0) / 60)}分遅れ
                        </span>
                      ) : (
                        <span className="text-[#16A34A] dark:text-[#4ADE80] font-bold">
                          定刻
                        </span>
                      )
                    ) : null}
                    <span>({formatCountdown(nextDeparture.liveMinutesAway, false, false)})</span>
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Time Preset Selector Bar (Quick Switch: Realtime JST / Morning / Midday / Evening & Custom time) */}
          {isTimePresetOpen && isExpanded && (
            <div className="mt-1 pt-1 pb-1 border-t border-[#E8E4D9] dark:border-[#2A2F37] bg-[#FAF8F3] dark:bg-[#16181D] -mx-2.5 sm:-mx-3 px-2.5 sm:px-3 flex flex-col gap-1 text-[9.5px] sm:text-[10px]">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 font-bold text-[#5B594B] dark:text-[#CBD5E1] shrink-0">
                  <Clock className="w-3 h-3 text-[#4A6741] dark:text-[#6B8E61]" />
                  <span>時刻基準:</span>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto natural-scrollbar py-0.5 flex-1 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSimulatedMinutes(null);
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      simulatedMinutes === null
                        ? 'bg-[#4A6741] dark:bg-[#3B6B34] text-white shadow-xs'
                        : 'bg-white dark:bg-[#242930] text-[#434338] dark:text-[#CBD5E1] border border-[#D5DBD0] dark:border-[#2A2F37] hover:bg-[#F3F4ED] dark:hover:bg-[#2C323B]'
                    }`}
                  >
                    🔴 JST現在時刻
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedMinutes(8 * 60 + 0)}
                    className={`px-1.5 py-0.5 rounded font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      simulatedMinutes === 480
                        ? 'bg-[#4A6741] dark:bg-[#3B6B34] text-white shadow-xs'
                        : 'bg-white dark:bg-[#242930] text-[#434338] dark:text-[#CBD5E1] border border-[#D5DBD0] dark:border-[#2A2F37] hover:bg-[#F3F4ED] dark:hover:bg-[#2C323B]'
                    }`}
                  >
                    朝 08:00
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedMinutes(12 * 60 + 30)}
                    className={`px-1.5 py-0.5 rounded font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      simulatedMinutes === 750
                        ? 'bg-[#4A6741] dark:bg-[#3B6B34] text-white shadow-xs'
                        : 'bg-white dark:bg-[#242930] text-[#434338] dark:text-[#CBD5E1] border border-[#D5DBD0] dark:border-[#2A2F37] hover:bg-[#F3F4ED] dark:hover:bg-[#2C323B]'
                    }`}
                  >
                    昼 12:30
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedMinutes(17 * 60 + 30)}
                    className={`px-1.5 py-0.5 rounded font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      simulatedMinutes === 1050
                        ? 'bg-[#4A6741] dark:bg-[#3B6B34] text-white shadow-xs'
                        : 'bg-white dark:bg-[#242930] text-[#434338] dark:text-[#CBD5E1] border border-[#D5DBD0] dark:border-[#2A2F37] hover:bg-[#F3F4ED] dark:hover:bg-[#2C323B]'
                    }`}
                  >
                    夕 17:30
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedMinutes(20 * 60 + 0)}
                    className={`px-1.5 py-0.5 rounded font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      simulatedMinutes === 1200
                        ? 'bg-[#4A6741] dark:bg-[#3B6B34] text-white shadow-xs'
                        : 'bg-white dark:bg-[#242930] text-[#434338] dark:text-[#CBD5E1] border border-[#D5DBD0] dark:border-[#2A2F37] hover:bg-[#F3F4ED] dark:hover:bg-[#2C323B]'
                    }`}
                  >
                    夜 20:00
                  </button>
                </div>
              </div>

              {/* Direct Time Input & Quick Hours */}
              <div className="flex items-center gap-1.5 pt-0.5 border-t border-[#E8E4D9]/60 dark:border-[#2A2F37] justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-[#7A7969] dark:text-[#94A3B8] font-medium">指定時刻:</span>
                  <input
                    type="time"
                    value={timeInfo.timeString}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [h, m] = e.target.value.split(':').map(Number);
                        setSimulatedMinutes(h * 60 + m);
                      }
                    }}
                    className="bg-white dark:bg-[#242930] border border-[#CAD4C6] dark:border-[#2A2F37] rounded px-1.5 py-0.5 text-[10px] font-bold text-[#2D3436] dark:text-[#F1F5F9] focus:outline-none focus:border-[#4A6741] dark:focus:border-[#6B8E61]"
                  />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto natural-scrollbar text-[9px]">
                  {[7, 9, 11, 14, 16, 19, 21].map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => setSimulatedMinutes(hour * 60)}
                      className={`px-1 py-0.2 rounded font-medium transition-colors cursor-pointer ${
                        simulatedMinutes === hour * 60
                          ? 'bg-[#4A6741] dark:bg-[#3B6B34] text-white'
                          : 'bg-white dark:bg-[#242930] text-[#5B594B] dark:text-[#CBD5E1] border border-[#E8E4D9] dark:border-[#2A2F37] hover:bg-[#F3F4ED] dark:hover:bg-[#2C323B]'
                      }`}
                    >
                      {String(hour).padStart(2, '0')}時
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sub-bar inside header: Time Filter Tabs (Smooth Horizontal Swipeable) */}
          {isExpanded && (
            <div className="mt-1 pt-1 border-t border-[#E8E4D9]/70 dark:border-[#2A2F37] min-w-0">
              <SwipeableContainer id="time-filter-swipe-container" className="justify-between gap-1.5 py-0.5" showFadeIndicators={true}>
                <div className="flex items-center bg-[#F3F4ED] dark:bg-[#242930] rounded-lg p-0.5 border border-[#E8E4D9] dark:border-[#2A2F37] shrink-0">
                  <button
                    id="filter-upcoming-departures-btn"
                    type="button"
                    onClick={() => setSelectedFilter('upcoming')}
                    className={`text-[9.5px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                      selectedFilter === 'upcoming'
                        ? 'bg-[#4A6741] dark:bg-[#3B6B34] text-white shadow-xs'
                        : 'text-[#7A7969] dark:text-[#94A3B8] hover:text-[#2D3436] dark:hover:text-[#F1F5F9]'
                    }`}
                  >
                    直近便
                  </button>
                  <button
                    id="filter-approaching-departures-btn"
                    type="button"
                    onClick={() => setSelectedFilter('approaching')}
                    className={`text-[9.5px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                      selectedFilter === 'approaching'
                        ? 'bg-[#4A6741] dark:bg-[#3B6B34] text-white shadow-xs'
                        : 'text-[#7A7969] dark:text-[#94A3B8] hover:text-[#2D3436] dark:hover:text-[#F1F5F9]'
                    }`}
                  >
                    15分以内
                  </button>
                  <button
                    id="filter-all-day-departures-btn"
                    type="button"
                    onClick={() => setSelectedFilter('all_day')}
                    className={`text-[9.5px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                      selectedFilter === 'all_day'
                        ? 'bg-[#4A6741] dark:bg-[#3B6B34] text-white shadow-xs'
                        : 'text-[#7A7969] dark:text-[#94A3B8] hover:text-[#2D3436] dark:hover:text-[#F1F5F9]'
                    }`}
                  >
                    終日全便
                  </button>
                </div>

                {onOpenAllStopsModal && (
                  <button
                    id="open-all-stops-modal-btn"
                    type="button"
                    onClick={onOpenAllStopsModal}
                    className="text-[9.5px] sm:text-[10px] px-2 py-0.5 rounded-lg whitespace-nowrap font-bold text-[#4A6741] dark:text-[#6B8E61] bg-[#EAEFE8] dark:bg-[#242930] hover:bg-[#DEE7DC] dark:hover:bg-[#2C323B] active:bg-[#D2DDD0] border border-[#CAD4C6] dark:border-[#2A2F37] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  >
                    <Bus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>全バス停一覧</span>
                  </button>
                )}
              </SwipeableContainer>
            </div>
          )}

          {/* Quick tabs for sister platforms / consolidated sub-stops (上り/下り/1番/2番/3番...) - Smooth Horizontal Swipeable */}
          {isExpanded && (
            <div className="mt-1 pt-1 border-t border-[#E8E4D9]/60 dark:border-[#2A2F37] flex items-center min-w-0">
              <span className="text-[8.5px] sm:text-[9px] text-[#7A7969] dark:text-[#94A3B8] font-bold shrink-0 mr-1 pl-0.5">
                {selectedStop.subStops && selectedStop.subStops.length > 1
                  ? 'のりば:'
                  : sisterPoles.length > 1
                  ? 'のりば:'
                  : '周辺:'}
              </span>
              <SwipeableContainer id="sister-poles-swipe-container" className="gap-1 py-0.5" showFadeIndicators={true}>
                {selectedStop.subStops && selectedStop.subStops.length > 1 ? (
                  <>
                    <button
                      id="select-all-substops-btn"
                      type="button"
                      onClick={() => setSelectedSubStopId('all')}
                      className={`text-[9.5px] sm:text-[10px] px-2 py-0.5 rounded-lg whitespace-nowrap font-bold transition-all shrink-0 cursor-pointer ${
                        selectedSubStopId === 'all'
                          ? 'bg-[#2D3436] dark:bg-[#334155] text-white shadow-xs'
                          : 'bg-[#F3F4ED] dark:bg-[#242930] text-[#434338] dark:text-[#CBD5E1] hover:bg-[#E8EBE4] dark:hover:bg-[#2C323B] border border-[#E2DDD2] dark:border-[#2A2F37]'
                      }`}
                    >
                      全のりば ({stopTimetable.length}便)
                    </button>
                    {selectedStop.subStops.map((subPole) => {
                      const isCurrent = selectedSubStopId === subPole.id;
                      const poleComp =
                        subPole.company || (subPole.operator === 'hiroshimabus' ? '広島バス' : '広電バス');
                      const poleColor = getCompanyColor(poleComp);
                      const label = formatPlatformText(subPole.platform || subPole.directionLabel) || getStopPlatformLabel(subPole);

                      return (
                        <button
                          key={subPole.id}
                          id={`select-subpole-${subPole.id}-btn`}
                          type="button"
                          onClick={() => setSelectedSubStopId(subPole.id)}
                          className={`text-[9.5px] sm:text-[10px] px-2 py-0.5 rounded-lg whitespace-nowrap font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                            isCurrent
                              ? 'bg-[#2D3436] dark:bg-[#334155] text-white shadow-xs ring-1 ring-white/20'
                              : 'bg-[#F3F4ED] dark:bg-[#242930] text-[#434338] dark:text-[#CBD5E1] hover:bg-[#E8EBE4] dark:hover:bg-[#2C323B] border border-[#E2DDD2] dark:border-[#2A2F37]'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full inline-block shadow-2xs shrink-0"
                            style={{ backgroundColor: poleColor }}
                          />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </>
                ) : sisterPoles.length > 1 ? (
                  sisterPoles.map((stop) => {
                    const isCurrent = stop.id === selectedStop.id;
                    const poleLabel = getStopPlatformLabel(stop);
                    const poleComp = stop.company || (stop.operator === 'hiroshimabus' ? '広島バス' : '広電バス');
                    return (
                      <button
                        key={stop.id}
                        id={`select-sister-pole-${stop.id}-btn`}
                        type="button"
                        onClick={() => onSelectAnotherStop(stop)}
                        className={`text-[9.5px] sm:text-[10px] px-2 py-0.5 rounded-lg whitespace-nowrap font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                          isCurrent
                            ? 'bg-[#2D3436] dark:bg-[#334155] text-white shadow-xs'
                            : 'bg-[#F3F4ED] dark:bg-[#242930] text-[#434338] dark:text-[#CBD5E1] hover:bg-[#E8EBE4] dark:hover:bg-[#2C323B] border border-[#E2DDD2] dark:border-[#2A2F37]'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full inline-block shadow-2xs shrink-0"
                          style={{ backgroundColor: getCompanyColor(poleComp) }}
                        />
                        <span>{poleLabel}</span>
                      </button>
                    );
                  })
                ) : (
                  allNearbyStops.slice(0, 6).map((stop) => {
                    const isCurrent = stop.id === selectedStop.id;
                    return (
                      <button
                        key={stop.id}
                        id={`select-stop-${stop.id}-btn`}
                        type="button"
                        onClick={() => onSelectAnotherStop(stop)}
                        className={`text-[9.5px] sm:text-[10px] px-2 py-0.5 rounded-lg whitespace-nowrap font-medium transition-all shrink-0 cursor-pointer ${
                          isCurrent
                            ? 'bg-[#4A6741] dark:bg-[#3B6B34] text-white font-bold shadow-xs'
                            : 'bg-[#F3F4ED] dark:bg-[#242930] text-[#5B594B] dark:text-[#CBD5E1] hover:bg-[#E8EBE4] dark:hover:bg-[#2C323B] border border-[#E2DDD2] dark:border-[#2A2F37]'
                        }`}
                      >
                        {stop.name} ({stop.distanceMeters}m)
                      </button>
                    );
                  })
                )}
              </SwipeableContainer>
            </div>
          )}

          {/* Bus Company Timetable Switcher Tabs - Smooth Horizontal Swipeable */}
          {isExpanded && isMultiCompany && (
            <div className="mt-1 pt-1 border-t border-[#E8E4D9]/80 dark:border-[#2A2F37] flex items-center min-w-0">
              {selectedCompany !== 'all' ? (
                <div className="flex items-center gap-1 w-full justify-between min-w-0">
                  <div className="flex items-center gap-1 text-[9.5px] sm:text-[10px] text-[#5B594B] dark:text-[#CBD5E1] min-w-0 truncate">
                    <span className="font-bold text-[#7A7969] dark:text-[#94A3B8] shrink-0">会社:</span>
                    <span
                      className="px-1.5 sm:px-2 py-0.5 rounded-md font-bold text-white shadow-xs shrink-0 flex items-center gap-1"
                      style={{ backgroundColor: getCompanyColor(selectedCompany) }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      <span>{selectedCompany} ({departures.length}便)</span>
                    </span>
                  </div>
                  {onSelectCompany && (
                    <button
                      type="button"
                      id="reset-company-filter-btn"
                      onClick={() => onSelectCompany('all')}
                      className="text-[9px] sm:text-[9.5px] px-1.5 py-0.5 rounded font-bold text-[#4A6741] dark:text-[#6B8E61] bg-[#F3F4ED] dark:bg-[#242930] hover:bg-[#E8EBE4] dark:hover:bg-[#2C323B] border border-[#D5DBD0] dark:border-[#2A2F37] shrink-0 transition-colors whitespace-nowrap cursor-pointer"
                      title="上部の会社選択を解除して全社統合表示にします"
                    >
                      全社表示
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center min-w-0 w-full">
                  <span className="text-[9px] sm:text-[9.5px] font-bold text-[#7A7969] dark:text-[#94A3B8] shrink-0 mr-1 pl-0.5">会社:</span>
                  <SwipeableContainer id="timetable-company-tabs-container" className="gap-1 py-0.5" showFadeIndicators={true}>
                    <button
                      type="button"
                      id="tab-company-all"
                      onClick={() => setCompanyFilter('all')}
                      className={`text-[9.5px] sm:text-[10px] px-2 py-0.5 rounded-md font-bold transition-all shrink-0 cursor-pointer ${
                        companyFilter === 'all'
                          ? 'bg-[#2D3436] dark:bg-[#334155] text-white shadow-xs'
                          : 'bg-[#F3F4ED] dark:bg-[#242930] text-[#5B594B] dark:text-[#CBD5E1] hover:bg-[#E8EBE4] dark:hover:bg-[#2C323B] border border-[#E2DDD2] dark:border-[#2A2F37]'
                      }`}
                    >
                      全社統合 ({companyCounts.all || 0}便)
                    </button>
                    {availableCompanies.map((comp) => {
                      const isSel = companyFilter === comp;
                      const color = getCompanyColor(comp);
                      return (
                        <button
                          key={comp}
                          type="button"
                          id={`tab-company-${comp}`}
                          onClick={() => setCompanyFilter(comp)}
                          className={`text-[9.5px] sm:text-[10px] px-2 py-0.5 rounded-md font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                            isSel
                              ? 'text-white shadow-xs'
                              : 'bg-[#F3F4ED] dark:bg-[#242930] text-[#5B594B] dark:text-[#CBD5E1] hover:bg-[#E8EBE4] dark:hover:bg-[#2C323B] border border-[#E2DDD2] dark:border-[#2A2F37]'
                          }`}
                          style={isSel ? { backgroundColor: color } : {}}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: isSel ? '#FFFFFF' : color }}
                          />
                          <span>{comp === '広島バス' ? '広島バス' : comp === '広電バス' ? '広電' : comp}</span>
                          <span className={`text-[8px] sm:text-[8.5px] px-1 rounded-full ${isSel ? 'bg-black/25 text-white' : 'bg-[#E5E0D5] dark:bg-[#2D333B] text-[#5B594B] dark:text-[#94A3B8]'}`}>
                            {companyCounts[comp] || 0}
                          </span>
                        </button>
                      );
                    })}
                  </SwipeableContainer>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Departures Timetable List - Responsive, Never cuts text off */}
        {isExpanded && (
          <div className="flex-1 min-h-0 divide-y divide-[#E8E4D9] dark:divide-[#2A2F37] overflow-y-auto natural-scrollbar">
            {/* When simulated time is active, show banner with quick reset */}
            {simulatedMinutes !== null && (
              <div className="px-2.5 sm:px-3 py-1.5 bg-[#FFFBEB] dark:bg-[#78350F]/30 border-b border-[#FDE68A] dark:border-[#B45309] flex items-center justify-between text-[#92400E] dark:text-[#FDE68A] text-xs shrink-0">
                <div className="flex items-center gap-1.5 font-bold truncate">
                  <Clock className="w-3.5 h-3.5 text-[#D97706] dark:text-[#FBBF24] shrink-0" />
                  <span className="truncate">基準時刻: {timeInfo.timeString}（{simulatedMinutes < 660 ? '朝' : simulatedMinutes < 960 ? '昼' : simulatedMinutes < 1140 ? '夕' : '夜'}）以降の発車</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSimulatedMinutes(null)}
                  className="font-bold bg-white dark:bg-[#1B1E23] px-2 py-0.5 rounded-full border border-[#FDE68A] dark:border-[#B45309] text-[10px] text-[#B45309] dark:text-[#FDE68A] hover:bg-[#FEF3C7] dark:hover:bg-[#78350F]/50 transition-colors cursor-pointer shrink-0"
                >
                  現在時刻に戻す
                </button>
              </div>
            )}

            {/* When all buses today have ended and viewing upcoming */}
            {isTodayEnded && selectedFilter === 'upcoming' && departures.length > 0 && (
              <div className="px-2.5 sm:px-3 py-1.5 bg-[#F0F9FF] dark:bg-[#0C4A6E]/30 border-b border-[#BAE6FD] dark:border-[#0284C7]/40 flex items-center justify-between text-[#0369A1] dark:text-[#38BDF8] text-xs shrink-0">
                <div className="flex items-center gap-1.5 font-bold truncate">
                  <Moon className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#38BDF8] shrink-0" />
                  <span>本日の運行は終了しました</span>
                </div>
                <span className="font-bold bg-white dark:bg-[#1B1E23] px-2 py-0.5 rounded-full border border-[#BAE6FD] dark:border-[#0284C7]/40 text-[10px] sm:text-[10.5px] text-[#0284c7] dark:text-[#38BDF8] shrink-0">
                  翌日始発: {departures[0]?.scheduledTime}発
                </span>
              </div>
            )}

            {isLoadingTimetable && stopTimetable.length === 0 ? (
              <div className="py-6 flex flex-col items-center justify-center text-[#7A7969] dark:text-[#94A3B8] gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#4A6741] dark:text-[#6B8E61]" />
                <span className="text-xs font-medium">時刻表データを読み込み中...</span>
              </div>
            ) : departures.length === 0 ? (
              <div className="py-6 px-4 text-center flex flex-col items-center justify-center gap-2">
                <AlertCircle className="w-6 h-6 text-[#7A7969]/60 dark:text-[#94A3B8]/60" />
                <div className="text-xs font-bold text-[#434338] dark:text-[#CBD5E1]">
                  {selectedFilter === 'approaching'
                    ? '直近15分以内に発車するバスはありません'
                    : effectiveCompanyFilter !== 'all'
                    ? `${effectiveCompanyFilter}の運行予定がありません`
                    : '該当する運行予定がありません'}
                </div>
                {selectedFilter === 'approaching' && nextDeparture && (
                  <button
                    type="button"
                    onClick={() => setSelectedFilter('upcoming')}
                    className="mt-1 px-3 py-1 text-xs font-bold text-[#4A6741] dark:text-[#6B8E61] bg-[#EAEFE8] dark:bg-[#242930] hover:bg-[#DEE7DC] dark:hover:bg-[#2C323B] rounded-lg border border-[#CAD4C6] dark:border-[#2A2F37] transition-colors cursor-pointer"
                  >
                    次の発車便（{nextDeparture.scheduledTime}発）を見る
                  </button>
                )}
              </div>
            ) : (
              departures.map((item: any, idx: number) => {
                const hasActiveBus = item.busId && activeBuses.some((b) => b.id === item.busId);
                const isHiroshimaBus = item.company === '広島バス';
                const minsAway = typeof item.liveMinutesAway === 'number' ? item.liveMinutesAway : item.minutesAway;
                const isTomorrow = Boolean(item.isTomorrow && selectedFilter === 'upcoming');
                const isPastToday = Boolean(item.isPastToday && selectedFilter === 'all_day');
                const isImminent = !isPastToday && !isTomorrow && minsAway >= -2 && minsAway <= 1;
                const isFirstOfTomorrow = isTomorrow && idx === 0;

                return (
                  <div
                    key={`${item.id || 'dep'}-${item.scheduledTime}-${idx}`}
                    className={`px-2.5 sm:px-3 py-1.5 sm:py-2 transition-colors flex items-center justify-between gap-2 ${
                      isPastToday
                        ? 'bg-[#F5F4EF]/60 dark:bg-[#16181D]/60 opacity-60'
                        : 'hover:bg-[#F9F7F2] dark:hover:bg-[#242930]/60'
                    }`}
                  >
                    {/* Left: Departure Time & Countdown, with Real-time Delay placed underneath */}
                    {(() => {
                      const delayMin = Math.floor((item.delaySeconds ?? 0) / 60);

                      return (
                        <div className="flex flex-col min-w-[76px] sm:min-w-[88px] shrink-0 justify-center">
                          {/* Top: Departure Time & Countdown badge */}
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-sm sm:text-base font-black text-[#1E293B] dark:text-[#F1F5F9] tracking-tight leading-none">
                                {item.scheduledTime}
                              </span>
                              <span className="text-[10px] font-black text-[#475569] dark:text-[#94A3B8]">
                                発
                              </span>
                            </div>

                            <span
                              className={`text-[8.5px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap text-center ${
                                isPastToday
                                  ? 'bg-[#E5E0D5] dark:bg-[#2D333B] text-[#7A7969] dark:text-[#94A3B8]'
                                  : isTomorrow
                                  ? isFirstOfTomorrow
                                    ? 'bg-[#E0F2FE] dark:bg-[#0C4A6E]/40 text-[#0369A1] dark:text-[#38BDF8] border border-[#BAE6FD] dark:border-[#0284C7]/40'
                                    : 'bg-[#F0F9FF] dark:bg-[#0C4A6E]/30 text-[#0284c7] dark:text-[#38BDF8] border border-[#BAE6FD] dark:border-[#0284C7]/40'
                                  : isImminent
                                  ? 'bg-[#DC2626] text-white animate-pulse'
                                  : minsAway <= 15
                                  ? 'bg-[#FEF3C7] dark:bg-[#78350F]/40 text-[#92400E] dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#B45309]'
                                  : 'bg-[#F3F4ED] dark:bg-[#242930] text-[#5B594B] dark:text-[#CBD5E1] border border-[#E8E4D9] dark:border-[#2A2F37]'
                              }`}
                            >
                              {formatCountdown(minsAway, isPastToday, isTomorrow, isFirstOfTomorrow)}
                            </span>
                          </div>

                          {/* Delay time located UNDER the scheduled departure time, without parentheses */}
                          {item.hasRealtime ? (
                            (item.delaySeconds ?? 0) >= 60 ? (
                              <span className="text-[10px] sm:text-[10.5px] font-bold text-[#DC2626] dark:text-[#EF4444] whitespace-nowrap leading-tight mt-0.5">
                                +{delayMin}分遅れ
                              </span>
                            ) : (
                              <span className="text-[9.5px] sm:text-[10px] font-bold text-[#16A34A] dark:text-[#4ADE80] whitespace-nowrap leading-tight mt-0.5">
                                定刻
                              </span>
                            )
                          ) : null}
                        </div>
                      );
                    })()}

                    {/* Middle: Route & Destination & Company & Via */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
                        <span
                          className="px-1.5 py-0.2 rounded text-[9.5px] sm:text-[10px] font-black text-white shadow-xs shrink-0"
                          style={{ backgroundColor: item.companyColor }}
                        >
                          {item.routeNumber}
                        </span>
                        <span
                          className="text-[8px] sm:text-[8.5px] px-1 py-0.2 rounded font-bold text-white shrink-0"
                          style={{ backgroundColor: getCompanyColor(item.company) }}
                        >
                          {item.company === '広島バス' ? '広島バス' : item.company === '広電バス' ? '広電' : item.company}
                        </span>
                        <span className="text-xs sm:text-[13px] font-bold text-[#2D3436] dark:text-[#F1F5F9] truncate leading-tight">
                          {item.destination}
                        </span>
                      </div>
                      {item.via && (
                        <div className="text-[9px] sm:text-[10px] text-[#7A7969] dark:text-[#94A3B8] truncate mt-0.5 leading-tight">
                          {item.via}
                        </div>
                      )}
                    </div>

                    {/* Right: Status / Bus Track */}
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="hidden md:flex items-center gap-1 text-[10px] font-medium text-[#7A7969] dark:text-[#94A3B8]">
                        <Users className="w-3 h-3 text-[#7A7969]/70 dark:text-[#94A3B8]/70" />
                        <span>
                          {item.congestion === 'low'
                            ? '空席'
                            : item.congestion === 'medium'
                            ? '着席'
                            : '混雑'}
                        </span>
                      </div>

                      {hasActiveBus && onSelectBusById && (
                        <button
                          type="button"
                          onClick={() => onSelectBusById(item.busId!)}
                          title="バスの現在位置を表示"
                          className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg text-[9.5px] sm:text-[10px] font-bold text-[#4A6741] dark:text-[#6B8E61] bg-[#F3F4ED] dark:bg-[#242930] hover:bg-[#E8EBE4] dark:hover:bg-[#2C323B] active:bg-[#DCE1D8] border border-[#D5DBD0] dark:border-[#2A2F37] transition-colors shadow-xs whitespace-nowrap cursor-pointer"
                        >
                          <Bus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#6B8E61]" />
                          <span>位置</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
