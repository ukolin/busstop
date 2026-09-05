import React from 'react';
import { Bus, Navigation, MapPin, Filter, Sun, Moon } from 'lucide-react';
import { UserLocation, BusCompanyFilter } from '../types';
import { SwipeableContainer } from './SwipeableContainer';

interface HeaderProps {
  userLocation: UserLocation;
  isLoadingGps: boolean;
  nearbyStopCount: number;
  activeBusCount: number;
  selectedCompany: BusCompanyFilter;
  onSelectCompany: (company: BusCompanyFilter) => void;
  companyCounts: {
    all: number;
    '広電バス': number;
    '広島バス': number;
    '広島交通': number;
    'JRバス中国': number;
  };
  onRefreshGps: () => void;
  onOpenPresetModal: () => void;
  onOpenStopSelector?: () => void;
  onOpenDataModal?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userLocation,
  isLoadingGps,
  nearbyStopCount,
  activeBusCount,
  selectedCompany,
  onSelectCompany,
  companyCounts,
  onRefreshGps,
  onOpenPresetModal,
  onOpenStopSelector,
  onOpenDataModal,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const companies: Array<{
    id: BusCompanyFilter;
    label: string;
    shortLabel: string;
    color: string;
    activeBg: string;
    activeBorder: string;
    badge: string;
  }> = [
    {
      id: 'all',
      label: '全会社',
      shortLabel: '全社',
      color: isDarkMode ? '#CBD5E1' : '#434338',
      activeBg: isDarkMode ? '#3B6B34' : '#4A6741',
      activeBorder: isDarkMode ? '#2D5227' : '#3F5938',
      badge: `${companyCounts.all}`,
    },
    {
      id: '広電バス',
      label: '広電バス',
      shortLabel: '広電',
      color: '#16a34a',
      activeBg: '#15803d',
      activeBorder: '#166534',
      badge: `${companyCounts['広電バス']}`,
    },
    {
      id: '広島バス',
      label: '広島バス(赤バス)',
      shortLabel: '広島バス',
      color: '#dc2626',
      activeBg: '#b91c1c',
      activeBorder: '#991b1b',
      badge: `${companyCounts['広島バス']}`,
    },
    {
      id: '広島交通',
      label: '広島交通',
      shortLabel: '広交',
      color: '#ea580c',
      activeBg: '#c2410c',
      activeBorder: '#9a3412',
      badge: `${companyCounts['広島交通'] || 0}`,
    },
    {
      id: 'JRバス中国',
      label: 'JRバス中国',
      shortLabel: 'JRバス',
      color: '#0284c7',
      activeBg: '#0369a1',
      activeBorder: '#075985',
      badge: `${companyCounts['JRバス中国'] || 0}`,
    },
  ];

  return (
    <header className="absolute top-0 left-0 right-0 z-[1000] pt-[max(0.375rem,env(safe-area-inset-top))] px-1.5 sm:px-2 pb-1.5 sm:pb-2 pointer-events-none transition-all">
      <div className="w-full max-w-xl mx-auto bg-[#FDFBF7]/95 dark:bg-[#1B1E23]/95 backdrop-blur-md rounded-2xl shadow-md border border-[#E8E4D9] dark:border-[#2A2F37] p-1.5 sm:p-2 pointer-events-auto transition-all flex flex-col gap-1 sm:gap-1.5">
        {/* Top Row: App Title, Location, Stats & Quick Actions */}
        <div className="flex items-center justify-between gap-1 sm:gap-1.5">
          {/* Left: App Title */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <div className="w-6 h-6 rounded-lg bg-[#4A6741] dark:bg-[#3B6B34] text-white flex items-center justify-center shadow-xs">
              <Bus className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1">
              <h1 className="text-xs sm:text-sm font-black tracking-tight text-[#2D3436] dark:text-[#F1F5F9] leading-none">
                広島バスロケ
              </h1>
            </div>
          </div>

          {/* Center: Current Location Info (Tablet/Desktop) */}
          <div className="hidden md:flex items-center gap-1 text-[11px] text-[#7A7969] dark:text-[#94A3B8] truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4A90E2] shrink-0" />
            <span className="truncate font-semibold text-[#434338] dark:text-[#E2E8F0]">{userLocation.label}</span>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {/* Dark Mode Toggle */}
            {onToggleDarkMode && (
              <button
                id="header-toggle-theme-btn"
                type="button"
                onClick={onToggleDarkMode}
                title={isDarkMode ? 'ライトモードに切替' : 'ダークモードに切替'}
                aria-label={isDarkMode ? 'ライトモードに切替' : 'ダークモードに切替'}
                className="p-1.5 text-[#5B594B] dark:text-[#94A3B8] hover:text-[#4A6741] dark:hover:text-[#6B8E61] hover:bg-[#F3F4ED] dark:hover:bg-[#242930] active:bg-[#EAEFE8] dark:active:bg-[#2C323B] rounded-lg transition-colors flex items-center justify-center cursor-pointer"
              >
                {isDarkMode ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-[#5B594B]" />
                )}
              </button>
            )}

            <button
              id="header-refresh-gps-btn"
              type="button"
              onClick={onRefreshGps}
              disabled={isLoadingGps}
              title="GPS現在地を再取得"
              aria-label="GPS現在地を再取得"
              className="p-1.5 text-[#5B594B] dark:text-[#94A3B8] hover:text-[#4A6741] dark:hover:text-[#6B8E61] hover:bg-[#F3F4ED] dark:hover:bg-[#242930] active:bg-[#EAEFE8] dark:active:bg-[#2C323B] rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLoadingGps ? 'animate-spin text-[#4A6741] dark:text-[#6B8E61]' : ''}`} />
            </button>

            {onOpenStopSelector && (
              <button
                id="header-select-stop-btn"
                type="button"
                onClick={onOpenStopSelector}
                title="バス停一覧から探す"
                className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-[#2D3436] dark:text-[#F1F5F9] bg-[#F3F4ED] dark:bg-[#242930] hover:bg-[#E8EBE4] dark:hover:bg-[#2C323B] active:bg-[#DCE1D8] rounded-lg border border-[#D5DBD0] dark:border-[#2A2F37] transition-colors whitespace-nowrap cursor-pointer"
              >
                <Bus className="w-3 h-3 text-[#4A6741] dark:text-[#6B8E61]" />
                <span>バス停</span>
              </button>
            )}

            <button
              id="header-select-location-btn"
              type="button"
              onClick={onOpenPresetModal}
              title="地点を変更"
              className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-[#4A6741] dark:text-[#6B8E61] bg-[#F3F4ED] dark:bg-[#242930] hover:bg-[#E8EBE4] dark:hover:bg-[#2C323B] active:bg-[#DCE1D8] rounded-lg border border-[#D5DBD0] dark:border-[#2A2F37] transition-colors min-w-0 max-w-[85px] sm:max-w-[130px] cursor-pointer"
            >
              <MapPin className="w-3 h-3 text-[#6B8E61] shrink-0" />
              <span className="truncate">{userLocation.label ? userLocation.label.replace(/（.*）/, '') : '地点'}</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Company Filter Tabs (Smooth Horizontal Swipeable) */}
        <div className="pt-1 border-t border-[#E8E4D9]/70 dark:border-[#2A2F37] flex items-center min-w-0">
          <div className="flex items-center gap-0.5 text-[9.5px] sm:text-[10px] font-bold text-[#7A7969] dark:text-[#94A3B8] shrink-0 mr-1.5 pl-0.5">
            <Filter className="w-2.5 h-2.5 text-[#7A7969] dark:text-[#94A3B8]" />
            <span className="hidden sm:inline">バス会社:</span>
            <span className="sm:hidden">会社:</span>
          </div>
          <SwipeableContainer id="header-company-tabs-container" className="gap-1 py-0.5" showFadeIndicators={true}>
            {companies.map((c) => {
              const isSelected = selectedCompany === c.id;
              return (
                <button
                  key={c.id}
                  id={`header-filter-company-${c.id}-btn`}
                  type="button"
                  onClick={() => onSelectCompany(c.id)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-[10.5px] font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'text-white shadow-xs'
                      : 'bg-[#F3F4ED] dark:bg-[#242930] text-[#5B594B] dark:text-[#CBD5E1] hover:bg-[#E8EBE4] dark:hover:bg-[#2C323B] border border-[#E2DDD2] dark:border-[#2A2F37]'
                  }`}
                  style={
                    isSelected
                      ? { backgroundColor: c.activeBg, borderColor: c.activeBorder }
                      : {}
                  }
                >
                  {c.id !== 'all' && (
                    <span
                      className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? '#FFFFFF' : c.color }}
                    />
                  )}
                  <span>
                    <span className="sm:hidden">{c.shortLabel}</span>
                    <span className="hidden sm:inline">{c.label}</span>
                  </span>
                  <span
                    className={`text-[8.5px] sm:text-[9px] px-1 py-0.2 rounded-full leading-none ${
                      isSelected
                        ? 'bg-black/25 text-white'
                        : 'bg-[#E5E0D5] dark:bg-[#2D333B] text-[#7A7969] dark:text-[#94A3B8]'
                    }`}
                  >
                    {c.badge}
                  </span>
                </button>
              );
            })}
          </SwipeableContainer>
        </div>
      </div>
    </header>
  );
};
