import React, { useState, useMemo } from 'react';
import { Bus, MapPin, Search, X, Check, Navigation, ArrowRight, FileJson, Filter } from 'lucide-react';
import { BusStop, BusCompanyFilter } from '../types';
import { getStopPlatformLabel, formatPlatformText, getCompanyColor } from '../data/timetableService';

interface StopSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  allStops: BusStop[];
  selectedStop: BusStop | null;
  nearbyStopIds: Set<string>;
  onSelectStop: (stop: BusStop) => void;
  onFocusStop?: (stop: BusStop) => void;
  onOpenDataModal?: () => void;
  initialCompanyFilter?: BusCompanyFilter;
}

export const StopSelectorModal: React.FC<StopSelectorModalProps> = ({
  isOpen,
  onClose,
  allStops,
  selectedStop,
  nearbyStopIds,
  onSelectStop,
  onFocusStop,
  onOpenDataModal,
  initialCompanyFilter = 'all',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'nearby' | 'others'>('all');
  const [companyFilter, setCompanyFilter] = useState<BusCompanyFilter>(initialCompanyFilter);

  const nearbyCount = useMemo(() => {
    return allStops.filter((s) => nearbyStopIds.has(s.id)).length;
  }, [allStops, nearbyStopIds]);

  const filteredStops = useMemo(() => {
    let list = allStops;

    if (filterTab === 'nearby') {
      list = list.filter((s) => nearbyStopIds.has(s.id));
    } else if (filterTab === 'others') {
      list = list.filter((s) => !nearbyStopIds.has(s.id));
    }

    if (companyFilter !== 'all') {
      list = list.filter((s) => {
        if (s.company === companyFilter || s.operator === companyFilter) return true;
        if (s.companies?.includes(companyFilter as any)) return true;
        return false;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.nameKana.toLowerCase().includes(q) ||
          s.platform.toLowerCase().includes(q) ||
          (s.platformCode && s.platformCode.toLowerCase().includes(q)) ||
          (s.directionLabel && s.directionLabel.toLowerCase().includes(q)) ||
          (s.company && s.company.toLowerCase().includes(q)) ||
          (s.routes && s.routes.some((r) => r.toLowerCase().includes(q))) ||
          (s.timetable &&
            s.timetable.some(
              (t) =>
                t.routeNumber.toLowerCase().includes(q) ||
                t.destination.toLowerCase().includes(q) ||
                (t.via && t.via.toLowerCase().includes(q))
            ))
      );
    }

    // Sort: Nearby first, then by distance
    return [...list].sort((a, b) => (a.distanceMeters ?? 99999) - (b.distanceMeters ?? 99999));
  }, [allStops, filterTab, companyFilter, searchQuery, nearbyStopIds]);

  if (!isOpen) return null;

  return (
    <div
      id="stop-selector-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-[1200] flex items-end justify-center p-2 sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-black/40 backdrop-blur-xs transition-opacity"
    >
      <div
        id="stop-selector-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#FDFBF7] dark:bg-[#1B1E23] rounded-2xl shadow-2xl border border-[#E8E4D9] dark:border-[#2A2F37] overflow-hidden flex flex-col max-h-[min(60dvh,520px)] animate-in fade-in slide-in-from-bottom-3 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Compact Top Bar: Title & Search */}
        <div className="px-3 py-1.5 border-b border-[#E8E4D9] dark:border-[#2A2F37] flex items-center justify-between gap-2 shrink-0 bg-[#FDFBF7] dark:bg-[#1B1E23]">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-6 h-6 rounded-lg bg-[#4A6741] dark:bg-[#3B6B34] text-white flex items-center justify-center shadow-xs">
              <Bus className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-bold text-[#2D3436] dark:text-[#F1F5F9] leading-none">
              バス停一覧・選択
            </h2>
          </div>

          {/* Quick Search Input */}
          <div className="relative flex-1 max-w-[200px] sm:max-w-xs">
            <Search className="w-3 h-3 text-[#7A7969] dark:text-[#94A3B8] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="stop-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="バス停名・路線・会社・行先..."
              className="w-full bg-[#F3F4ED] dark:bg-[#242930] border border-[#E8E4D9] dark:border-[#2A2F37] rounded-lg pl-6 pr-6 py-0.5 text-[11px] text-[#2D3436] dark:text-[#F1F5F9] placeholder-[#7A7969] dark:placeholder-[#94A3B8] focus:outline-hidden focus:border-[#6B8E61]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#7A7969] dark:text-[#94A3B8] hover:text-[#2D3436] dark:hover:text-[#F1F5F9] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            id="stop-selector-close-btn"
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-md hover:bg-[#F3F4ED] dark:hover:bg-[#242930] flex items-center justify-center text-[#7A7969] dark:text-[#94A3B8] hover:text-[#2D3436] dark:hover:text-[#F1F5F9] transition-colors shrink-0 cursor-pointer"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Company Filter Tabs */}
        <div className="px-3 py-1 bg-[#FAF8F3] dark:bg-[#16181D] border-b border-[#E8E4D9] dark:border-[#2A2F37] flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[9.5px] font-bold text-[#7A7969] dark:text-[#94A3B8] shrink-0 mr-0.5">会社:</span>
          {(['all', '広電バス', '広島バス'] as BusCompanyFilter[]).map((comp) => {
            const isSel = companyFilter === comp;
            return (
              <button
                key={comp}
                type="button"
                onClick={() => setCompanyFilter(comp)}
                className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all shrink-0 cursor-pointer ${
                  isSel
                    ? comp === '広島バス'
                      ? 'bg-[#dc2626] text-white shadow-xs'
                      : 'bg-[#4A6741] dark:bg-[#3B6B34] text-white shadow-xs'
                    : 'bg-[#F3F4ED] dark:bg-[#242930] text-[#5B594B] dark:text-[#CBD5E1] hover:bg-[#E8EBE4] dark:hover:bg-[#2C323B] border border-[#E2DDD2] dark:border-[#2A2F37]'
                }`}
              >
                {comp === 'all' ? '全会社' : comp}
              </button>
            );
          })}
        </div>

        {/* Filter Pills (All / Nearby / Other Stops) */}
        <div className="px-3 py-1 bg-[#F9F7F2] dark:bg-[#16181D] border-b border-[#E8E4D9] dark:border-[#2A2F37] flex items-center justify-between gap-1.5 shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-[#4A6741] dark:bg-[#3B6B34] text-white shadow-xs'
                  : 'text-[#5B594B] dark:text-[#94A3B8] hover:text-[#2D3436] dark:hover:text-[#F1F5F9] hover:bg-[#E8EBE4] dark:hover:bg-[#242930]'
              }`}
            >
              すべて ({allStops.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('nearby')}
              className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                filterTab === 'nearby'
                  ? 'bg-[#4A6741] dark:bg-[#3B6B34] text-white shadow-xs'
                  : 'text-[#5B594B] dark:text-[#94A3B8] hover:text-[#2D3436] dark:hover:text-[#F1F5F9] hover:bg-[#E8EBE4] dark:hover:bg-[#242930]'
              }`}
            >
              周辺500m ({nearbyCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('others')}
              className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                filterTab === 'others'
                  ? 'bg-[#4A6741] dark:bg-[#3B6B34] text-white shadow-xs'
                  : 'text-[#5B594B] dark:text-[#94A3B8] hover:text-[#2D3436] dark:hover:text-[#F1F5F9] hover:bg-[#E8EBE4] dark:hover:bg-[#242930]'
              }`}
            >
              その他 ({allStops.length - nearbyCount})
            </button>
          </div>
          <span className="text-[9px] text-[#7A7969] dark:text-[#94A3B8] font-medium hidden sm:inline">
            表示中: {filteredStops.length}件
          </span>
        </div>

        {/* Scrollable Bus Stop List */}
        <div className="flex-1 min-h-0 divide-y divide-[#E8E4D9] dark:divide-[#2A2F37] overflow-y-auto natural-scrollbar">
          {filteredStops.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#7A7969] dark:text-[#94A3B8]">
              該当するバス停が見つかりませんでした
            </div>
          ) : (
            filteredStops.map((stop) => {
              const isSelected = selectedStop?.id === stop.id;
              const isNearby = nearbyStopIds.has(stop.id);
              const nextDept = stop.timetable?.[0];

              return (
                <div
                  key={stop.id}
                  onClick={() => {
                    onSelectStop(stop);
                    onClose();
                  }}
                  className={`px-3 py-1.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#EAEFE8] dark:bg-[#242930] hover:bg-[#E2E8DF] dark:hover:bg-[#2C323B]'
                      : 'hover:bg-[#F9F7F2] dark:hover:bg-[#242930]/60'
                  }`}
                >
                  {/* Left info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap leading-tight">
                      <span className="text-xs font-bold text-[#2D3436] dark:text-[#F1F5F9] truncate">
                        {stop.name}
                      </span>

                      {/* Company Color Indicator */}
                      {stop.companies && stop.companies.length > 1 ? (
                        <div className="flex items-center gap-1 px-1 py-0.5 rounded-full bg-black/5 dark:bg-white/10 shrink-0" title={stop.companies.join('・')}>
                          {stop.companies.map((c) => (
                            <span
                              key={c}
                              className="w-2 h-2 rounded-full inline-block shadow-2xs border border-white/80"
                              style={{ backgroundColor: getCompanyColor(c) }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center shrink-0 px-1 py-0.5 rounded-full bg-black/5 dark:bg-white/10" title={stop.company || (stop.operator === 'hiroshimabus' ? '広島バス' : '広電バス')}>
                          <span
                            className="w-2 h-2 rounded-full inline-block shadow-2xs border border-white/80"
                            style={{
                              backgroundColor: getCompanyColor(stop.company || (stop.operator === 'hiroshimabus' ? '広島バス' : '広電バス')),
                            }}
                          />
                        </div>
                      )}

                      {/* Platform / Dropoff Badge */}
                      {stop.direction === 'dropoff' ? (
                        <span className="text-[8.5px] px-1.5 py-0.2 rounded font-bold text-white bg-[#64748b]">
                          降車専用
                        </span>
                      ) : (
                        <span
                          className="text-[8.5px] px-1.5 py-0.2 rounded font-bold text-white shrink-0"
                          style={{
                            backgroundColor:
                              stop.companies && stop.companies.length > 1
                                ? '#334155'
                                : getCompanyColor(stop.company || (stop.operator === 'hiroshimabus' ? '広島バス' : '広電バス')),
                          }}
                        >
                          {getStopPlatformLabel(stop)}
                        </span>
                      )}

                      {isNearby ? (
                        <span className="text-[9px] font-bold text-[#4A6741] dark:text-[#6B8E61] bg-[#F3F4ED] dark:bg-[#242930] border border-[#D5DBD0] dark:border-[#2A2F37] px-1 py-0.2 rounded">
                          周辺 {stop.distanceMeters ? `約${stop.distanceMeters}m` : '500m以内'}
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium text-[#7A7969] dark:text-[#94A3B8] bg-[#F3F4ED] dark:bg-[#242930] border border-[#E8E4D9] dark:border-[#2A2F37] px-1 py-0.2 rounded">
                          {stop.distanceMeters && stop.distanceMeters >= 1000
                            ? `約${(stop.distanceMeters / 1000).toFixed(1)}km`
                            : `約${stop.distanceMeters || 0}m`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-[#7A7969] dark:text-[#94A3B8] mt-0.5 truncate">
                      <span className="truncate">{formatPlatformText(stop.platform)}</span>
                      {nextDept && (
                        <span className="text-[#5B594B] dark:text-[#CBD5E1] shrink-0 font-medium">
                          次便: {nextDept.routeNumber} ({nextDept.scheduledTime}発 {nextDept.destination}行)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {onFocusStop && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStop(stop);
                          onFocusStop(stop);
                          onClose();
                        }}
                        title="地図でこのバス停を表示"
                        className="p-1 rounded-md text-[#7A7969] dark:text-[#94A3B8] hover:text-[#4A6741] dark:hover:text-[#6B8E61] hover:bg-[#F3F4ED] dark:hover:bg-[#242930] transition-colors cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-[#4A6741] dark:bg-[#3B6B34] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full text-[#7A7969] dark:text-[#94A3B8] flex items-center justify-center hover:bg-[#F3F4ED] dark:hover:bg-[#242930]">
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Link to Data / JSON Editor */}
        {onOpenDataModal && (
          <div className="px-3 py-2 bg-[#F9F7F2] dark:bg-[#1B1E23] border-t border-[#E8E4D9] dark:border-[#2A2F37] flex items-center justify-between gap-2 shrink-0">
            <span className="text-[10px] text-[#7A7969] dark:text-[#94A3B8]">
              バス停の位置や時刻表を修正したい場合
            </span>
            <button
              id="open-json-editor-from-selector-btn"
              type="button"
              onClick={() => {
                onClose();
                onOpenDataModal();
              }}
              className="px-2 py-1 text-[11px] font-bold text-[#4A6741] dark:text-[#6B8E61] hover:text-[#3B5433] hover:bg-[#EAEFE8] dark:hover:bg-[#242930] rounded-lg border border-[#D5DBD0] dark:border-[#2A2F37] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <FileJson className="w-3 h-3" />
              <span>バス停位置・JSONを編集</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
