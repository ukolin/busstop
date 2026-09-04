import React from 'react';
import { X, Navigation, MapPin, Check } from 'lucide-react';
import { PRESET_LOCATIONS } from '../data/hiroshimaData';
import { PresetLocation, UserLocation } from '../types';

interface LocationPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: PresetLocation) => void;
  onRequestGps: () => void;
  currentLocation: UserLocation;
  isLoadingGps: boolean;
}

export const LocationPresetModal: React.FC<LocationPresetModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  onRequestGps,
  currentLocation,
  isLoadingGps,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="location-preset-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-[1200] flex items-end justify-center p-2 sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-black/40 backdrop-blur-xs transition-opacity"
    >
      <div
        id="location-preset-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#FDFBF7] dark:bg-[#1B1E23] rounded-2xl shadow-2xl border border-[#E8E4D9] dark:border-[#2A2F37] overflow-hidden flex flex-col max-h-[min(50dvh,380px)] animate-in fade-in slide-in-from-bottom-3 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="px-3.5 py-2 border-b border-[#E8E4D9] dark:border-[#2A2F37] flex items-center justify-between shrink-0 bg-[#FDFBF7] dark:bg-[#1B1E23]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#F3F4ED] dark:bg-[#242930] text-[#4A6741] dark:text-[#6B8E61] border border-[#D5DBD0] dark:border-[#2A2F37] flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#2D3436] dark:text-[#F1F5F9]">
                地点の選択・GPS
              </h2>
            </div>
          </div>
          <button
            id="location-preset-close-btn"
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-md hover:bg-[#F3F4ED] dark:hover:bg-[#242930] flex items-center justify-center text-[#7A7969] dark:text-[#94A3B8] hover:text-[#2D3436] dark:hover:text-[#F1F5F9] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 p-2.5 space-y-1.5 overflow-y-auto natural-scrollbar">
          {/* GPS Current Location Button */}
          <button
            id="preset-gps-btn"
            type="button"
            onClick={() => {
              onRequestGps();
              onClose();
            }}
            disabled={isLoadingGps}
            className="w-full px-2.5 py-1.5 rounded-xl border border-[#6B8E61]/40 bg-[#F3F4ED]/60 dark:bg-[#242930]/60 hover:bg-[#F3F4ED] dark:hover:bg-[#242930] active:bg-[#EAEFE8] dark:active:bg-[#2C323B] flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#4A6741] dark:bg-[#3B6B34] text-white flex items-center justify-center shadow-xs shrink-0">
                <Navigation className={`w-3.5 h-3.5 ${isLoadingGps ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <div className="text-xs font-bold text-[#2D3436] dark:text-[#F1F5F9] flex items-center gap-1.5">
                  <span>GPS現在地を取得</span>
                  <span className="text-[9px] bg-[#F3F4ED] dark:bg-[#242930] text-[#4A6741] dark:text-[#6B8E61] border border-[#D5DBD0] dark:border-[#2A2F37] px-1 py-0.2 rounded font-bold">
                    端末位置
                  </span>
                </div>
                <div className="text-[10px] text-[#7A7969] dark:text-[#94A3B8]">
                  GPS位置情報をもとに周辺を自動探索
                </div>
              </div>
            </div>
            {currentLocation.isGps && (
              <Check className="w-4 h-4 text-[#4A6741] dark:text-[#6B8E61] shrink-0" />
            )}
          </button>

          <div className="pt-1">
            <div className="text-[10px] font-bold text-[#7A7969] dark:text-[#94A3B8] px-1 mb-1">
              広島市内の主要エリアから選ぶ
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {PRESET_LOCATIONS.map((preset) => {
                const isSelected =
                  !currentLocation.isGps &&
                  Math.abs(currentLocation.lat - preset.lat) < 0.0001 &&
                  Math.abs(currentLocation.lng - preset.lng) < 0.0001;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onSelectPreset(preset);
                      onClose();
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#4A6741] dark:border-[#3B6B34] bg-[#4A6741] dark:bg-[#3B6B34] text-white shadow-xs'
                        : 'border-[#E8E4D9] dark:border-[#2A2F37] bg-[#F9F7F2] dark:bg-[#242930] hover:border-[#D5DBD0] dark:hover:border-[#3A424E] hover:bg-[#F3F4ED] dark:hover:bg-[#2A313C] text-[#2D3436] dark:text-[#F1F5F9]'
                    }`}
                  >
                    <div className="min-w-0 flex-1 mr-1">
                      <div className="text-xs font-bold truncate">
                        {preset.name}
                      </div>
                      <div className={`text-[10px] truncate ${isSelected ? 'text-[#EAEFE8]' : 'text-[#7A7969] dark:text-[#94A3B8]'}`}>
                        {preset.description}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#EAEFE8] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
