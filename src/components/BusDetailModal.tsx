import React from 'react';
import { X, Bus, Clock, MapPin, Gauge, Users, CheckCircle2, AlertTriangle, ArrowRight, Crosshair } from 'lucide-react';
import { ActiveBus } from '../types';

interface BusDetailModalProps {
  bus: ActiveBus | null;
  onClose: () => void;
  onTrackBus: (bus: ActiveBus) => void;
}

export const BusDetailModal: React.FC<BusDetailModalProps> = ({
  bus,
  onClose,
  onTrackBus,
}) => {
  if (!bus) return null;

  const isDelayed = bus.delayMinutes > 0;

  return (
    <div
      id="bus-detail-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-[1200] flex items-end justify-center p-2 sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-black/40 backdrop-blur-xs transition-opacity"
    >
      <div
        id="bus-detail-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#FDFBF7] dark:bg-[#1B1E23] rounded-2xl shadow-2xl border border-[#E8E4D9] dark:border-[#2A2F37] overflow-hidden flex flex-col max-h-[42vh] sm:max-h-[36vh] animate-in fade-in slide-in-from-bottom-3 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Compact Header with Route Color Banner */}
        <div
          className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-white relative flex items-center justify-between shrink-0"
          style={{ backgroundColor: bus.companyColor }}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 rounded bg-white/25 shrink-0">
              {bus.routeNumber}
            </span>
            <div className="min-w-0 flex-1 truncate">
              <div className="flex items-center gap-1 leading-tight">
                <span className="text-xs sm:text-sm font-black truncate">{bus.destination}</span>
                <span className="text-[9.5px] sm:text-[10px] opacity-90 shrink-0">({bus.company})</span>
              </div>
            </div>
            <div className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
              isDelayed ? 'bg-[#D97706] text-white' : 'bg-[#4A6741] text-white'
            }`}>
              {isDelayed ? `+${bus.delayMinutes}分` : '定時'}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-1.5">
            <button
              id="track-bus-btn"
              type="button"
              onClick={() => {
                onTrackBus(bus);
                onClose();
              }}
              title="地図でこのバスを追尾"
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-[9.5px] sm:text-[10px] font-bold bg-white/25 hover:bg-white/35 active:bg-white/45 text-white transition-colors cursor-pointer"
            >
              <Crosshair className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xs:inline">追尾</span>
            </button>
            <button
              id="bus-detail-close-btn"
              type="button"
              onClick={onClose}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-black/20 hover:bg-black/30 active:bg-black/40 flex items-center justify-center text-white transition-colors cursor-pointer"
              aria-label="閉じる"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Content Body strictly inside modal */}
        <div className="flex-1 min-h-0 p-2 sm:p-2.5 space-y-1.5 sm:space-y-2 overflow-y-auto natural-scrollbar">
          {/* Next & Previous Stop */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <div className="bg-[#F9F7F2] dark:bg-[#242930] rounded-xl p-1.5 sm:p-2 border border-[#E8E4D9] dark:border-[#2A2F37]">
              <div className="flex items-center gap-1 text-[9.5px] sm:text-[10px] font-bold text-[#7A7969] dark:text-[#94A3B8]">
                <MapPin className="w-3 h-3 text-[#6B8E61]" />
                <span>次停留所</span>
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-[#2D3436] dark:text-[#F1F5F9] truncate mt-0.5">
                {bus.nextStop}
              </div>
            </div>

            <div className="bg-[#F9F7F2] dark:bg-[#242930] rounded-xl p-1.5 sm:p-2 border border-[#E8E4D9] dark:border-[#2A2F37]">
              <div className="flex items-center gap-1 text-[9.5px] sm:text-[10px] font-bold text-[#7A7969] dark:text-[#94A3B8]">
                <Clock className="w-3 h-3 text-[#7A7969] dark:text-[#94A3B8]" />
                <span>前停留所</span>
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-[#2D3436] dark:text-[#F1F5F9] truncate mt-0.5">
                {bus.previousStop}
              </div>
            </div>
          </div>

          {/* Real-time status message */}
          <div className={`rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 border text-[11px] sm:text-xs flex items-center justify-between gap-1 ${
            isDelayed
              ? 'bg-[#FFFBEB] dark:bg-[#78350F]/30 border-[#FDE68A] dark:border-[#B45309] text-[#92400E] dark:text-[#FDE68A]'
              : 'bg-[#F3F4ED] dark:bg-[#242930] border-[#D5DBD0] dark:border-[#2A2F37] text-[#4A6741] dark:text-[#6B8E61]'
          }`}>
            <div className="flex items-center gap-1.5 truncate">
              {isDelayed ? <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> : <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />}
              <span className="font-semibold truncate">{bus.statusText}</span>
            </div>
            <span className="text-[9.5px] sm:text-[10px] shrink-0 font-bold whitespace-nowrap">
              {isDelayed ? `+${bus.delayMinutes}分` : '定刻'}
            </span>
          </div>

          {/* Vehicle Metrics (Speed, Congestion, specs) */}
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5 text-center">
            <div className="bg-[#F9F7F2] dark:bg-[#242930] rounded-xl py-1 sm:py-1.5 px-1 sm:px-2 border border-[#E8E4D9] dark:border-[#2A2F37]">
              <div className="text-[8.5px] sm:text-[9px] text-[#7A7969] dark:text-[#94A3B8]">速度</div>
              <div className="text-[11px] sm:text-xs font-bold text-[#2D3436] dark:text-[#F1F5F9]">{bus.speedKmh} km/h</div>
            </div>
            <div className="bg-[#F9F7F2] dark:bg-[#242930] rounded-xl py-1 sm:py-1.5 px-1 sm:px-2 border border-[#E8E4D9] dark:border-[#2A2F37]">
              <div className="text-[8.5px] sm:text-[9px] text-[#7A7969] dark:text-[#94A3B8]">混雑度</div>
              <div className="text-[11px] sm:text-xs font-bold text-[#2D3436] dark:text-[#F1F5F9]">{bus.occupancyPercent}%</div>
            </div>
            <div className="bg-[#F9F7F2] dark:bg-[#242930] rounded-xl py-1 sm:py-1.5 px-1 sm:px-2 border border-[#E8E4D9] dark:border-[#2A2F37]">
              <div className="text-[8.5px] sm:text-[9px] text-[#7A7969] dark:text-[#94A3B8]">車番</div>
              <div className="text-[11px] sm:text-xs font-bold text-[#2D3436] dark:text-[#F1F5F9] truncate">{bus.vehicleNumber}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
