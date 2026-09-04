import React, { useState, useEffect } from 'react';
import {
  X,
  FileJson,
  Copy,
  Check,
  Download,
  Upload,
  RotateCcw,
  Search,
  MapPin,
  HelpCircle,
  Code,
  Save,
  AlertTriangle,
  Plus,
  Trash2,
  Navigation,
  Clock,
  ArrowRight,
  List,
} from 'lucide-react';
import { BusStop, DepartureItem } from '../types';
import { getCachedTimetable, fetchTimetableForStop } from '../data/timetableService';
import {
  SAMPLE_GTFS_STOP_TIMES,
  parseGtfsStopTimesCsv,
  applyGtfsStopTimesToStops,
  inferRouteInfo,
  formatGtfsTime,
  convertRawStopTimesToBusStopTimesJson,
} from '../data/gtfsTimetableParser';

interface BusStopsDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  busStops: BusStop[];
  onSaveBusStops: (newStops: BusStop[]) => void;
  onResetToDefault: () => void;
  lastClickedCoords?: { lat: number; lng: number } | null;
  onFocusCoordinates?: (lat: number, lng: number) => void;
}

export const BusStopsDataModal: React.FC<BusStopsDataModalProps> = ({
  isOpen,
  onClose,
  busStops,
  onSaveBusStops,
  onResetToDefault,
  lastClickedCoords,
  onFocusCoordinates,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'gtfs_timetable' | 'json' | 'help'>('gtfs_timetable');
  const [searchQuery, setSearchQuery] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // GTFS Stop Times Editor State
  const [gtfsCsvText, setGtfsCsvText] = useState<string>(SAMPLE_GTFS_STOP_TIMES);
  const [gtfsError, setGtfsError] = useState<string | null>(null);

  // Selected file dataset for JSON view
  const [selectedJsonFile, setSelectedJsonFile] = useState<'all' | 'hiroshimadentetsu' | 'hiroshimabus'>('all');

  // Local editable copy for visual editor
  const [localStops, setLocalStops] = useState<BusStop[]>(busStops);
  const [expandedStopId, setExpandedStopId] = useState<string | null>(null);

  // Filter stops by selected JSON file
  const getFilteredStopsForJson = (stops: BusStop[], fileType: 'all' | 'hiroshimadentetsu' | 'hiroshimabus') => {
    if (fileType === 'hiroshimadentetsu') {
      return stops.filter(s => s.company === '広電バス' || (s.companies && s.companies.includes('広電バス')) || s.operator === 'hiroden');
    }
    if (fileType === 'hiroshimabus') {
      return stops.filter(s => s.company === '広島バス' || (s.companies && s.companies.includes('広島バス')) || s.operator === 'hiroshimabus');
    }
    return stops;
  };

  // Synchronize when modal opens or external data changes
  useEffect(() => {
    if (isOpen) {
      setLocalStops(busStops);
      const filtered = getFilteredStopsForJson(busStops, selectedJsonFile);
      setJsonText(JSON.stringify(filtered, null, 2));
      setJsonError(null);
      setSaveFeedback(null);
    }
  }, [isOpen, busStops, selectedJsonFile]);

  if (!isOpen) return null;

  // Visual Editor Handlers
  const handleStopFieldChange = (
    stopId: string,
    field: 'name' | 'platform' | 'nameKana' | 'lat' | 'lng',
    value: string | number
  ) => {
    setLocalStops((prev) =>
      prev.map((s) => {
        if (s.id !== stopId) return s;
        return {
          ...s,
          [field]:
            field === 'lat' || field === 'lng'
              ? typeof value === 'number'
                ? value
                : parseFloat(value) || 0
              : value,
        };
      })
    );
  };

  const handleApplyClickedCoordsToStop = (stopId: string) => {
    if (!lastClickedCoords) return;
    handleStopFieldChange(stopId, 'lat', Number(lastClickedCoords.lat.toFixed(6)));
    handleStopFieldChange(stopId, 'lng', Number(lastClickedCoords.lng.toFixed(6)));
    setSaveFeedback(`地図のクリック座標 (${lastClickedCoords.lat.toFixed(5)}, ${lastClickedCoords.lng.toFixed(5)}) を代入しました`);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleSaveVisual = () => {
    onSaveBusStops(localStops);
    setJsonText(JSON.stringify(localStops, null, 2));
    setSaveFeedback('バス停データを保存し、アプリに即時反映しました！');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  // JSON Editor Handlers
  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('JSONのルートはバス停オブジェクトの配列 [...] である必要があります。');
      }
      // Check required properties for first item if present
      if (parsed.length > 0) {
        const sample = parsed[0];
        if (!sample.id || typeof sample.lat !== 'number' || typeof sample.lng !== 'number') {
          throw new Error('各バス停には id, lat(数値), lng(数値), name が必要です。');
        }
      }

      let updatedStops: BusStop[] = [];
      if (selectedJsonFile === 'all') {
        updatedStops = parsed as BusStop[];
      } else {
        const otherStops = busStops.filter((s) => {
          if (selectedJsonFile === 'hiroshimadentetsu') {
            return !(s.company === '広電バス' || (s.companies && s.companies.includes('広電バス')) || s.operator === 'hiroden');
          }
          if (selectedJsonFile === 'hiroshimabus') {
            return !(s.company === '広島バス' || (s.companies && s.companies.includes('広島バス')) || s.operator === 'hiroshimabus');
          }
          return false;
        });
        updatedStops = [...otherStops, ...(parsed as BusStop[])];
      }

      onSaveBusStops(updatedStops);
      setLocalStops(updatedStops);
      setJsonError(null);
      setSaveFeedback(`${getDownloadFileName()} の内容を保存し、アプリに即時反映しました！`);
      setTimeout(() => setSaveFeedback(null), 3000);
    } catch (e: any) {
      setJsonError(e.message || '無効なJSONフォーマットです。');
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (e: any) {
      setJsonError('フォーマット整形できません: ' + e.message);
    }
  };

  // GTFS Timetable Import Handler
  const handleApplyGtfsTimetable = () => {
    try {
      setGtfsError(null);
      const parsedRows = parseGtfsStopTimesCsv(gtfsCsvText);
      if (parsedRows.length === 0) {
        throw new Error('GTFS stop_times のデータ行（カンマ区切り）が見つかりません。');
      }

      const updated = applyGtfsStopTimesToStops(localStops, gtfsCsvText);
      setLocalStops(updated);
      onSaveBusStops(updated);
      setJsonText(JSON.stringify(updated, null, 2));
      setSaveFeedback(`raw_stop_times.csv から時刻表（${parsedRows.length}行）を busStopTimes.json 形式で反映しました！`);
      setTimeout(() => setSaveFeedback(null), 4000);
    } catch (err: any) {
      setGtfsError(err.message || 'GTFSパースエラーが発生しました。');
    }
  };

  const handleLoadServerRawStopTimesCsv = async (fileName: string = 'raw_busStopTime_hiroshimadentetsu.csv') => {
    try {
      setGtfsError(null);
      const res = await fetch(`/data/${fileName}`);
      if (!res.ok) throw new Error(`サーバーから ${fileName} を取得できませんでした。`);
      const text = await res.text();
      setGtfsCsvText(text);
      setSaveFeedback(`${fileName} を読み込みました！`);
      setTimeout(() => setSaveFeedback(null), 3000);
    } catch (err: any) {
      setGtfsError(err.message || '読み込みに失敗しました。');
    }
  };

  const handleDownloadRawStopTimesCsv = () => {
    const blob = new Blob([gtfsCsvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raw_stop_times.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadBusStopTimesJson = (targetCompany: 'all' | 'hiroshimadentetsu' | 'hiroshimabus' = 'all') => {
    try {
      const timetableMap = convertRawStopTimesToBusStopTimesJson(gtfsCsvText);
      let outputMap: Record<string, any> = timetableMap;

      let filename = 'busStopTimes.json';
      if (targetCompany === 'hiroshimadentetsu') {
        filename = 'busStopTimes_hiroshimadentetsu.json';
        outputMap = {};
        for (const [stopId, routes] of Object.entries(timetableMap)) {
          const filtered = (routes as any[]).filter(r => r.company === '広電バス' || r.company === '広島電鉄');
          if (filtered.length > 0) outputMap[stopId] = filtered;
        }
      } else if (targetCompany === 'hiroshimabus') {
        filename = 'busStopTimes_hiroshimabus.json';
        outputMap = {};
        for (const [stopId, routes] of Object.entries(timetableMap)) {
          const filtered = (routes as any[]).filter(r => r.company === '広島バス');
          if (filtered.length > 0) outputMap[stopId] = filtered;
        }
      }

      const blob = new Blob([JSON.stringify(outputMap, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setGtfsError('busStopTimes.json の生成に失敗しました: ' + err.message);
    }
  };

  const parsedGtfsRows = parseGtfsStopTimesCsv(gtfsCsvText);
  const inferredInfo = inferRouteInfo(parsedGtfsRows);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDownloadFileName = () => {
    if (selectedJsonFile === 'hiroshimadentetsu') return 'busStop_hiroshimadentetsu.json';
    if (selectedJsonFile === 'hiroshimabus') return 'busStop_hiroshimabus.json';
    return 'busStops.json';
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getDownloadFileName();
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (file.name.endsWith('.csv') || content.startsWith('stop_id,')) {
          // Parse GTFS stops CSV
          const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
          const parsedStops: BusStop[] = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            const stopId = cols[0]?.trim();
            const stopName = cols[2]?.trim();
            const stopDesc = cols[3]?.trim() || '';
            const lat = parseFloat(cols[4]);
            const lng = parseFloat(cols[5]);
            const locationType = cols[8]?.trim() || '0';
            const platformCode = cols[12]?.trim() || '';

            if (locationType === '1' || isNaN(lat) || isNaN(lng) || !stopName) continue;

            const idParts = stopId.split(' ');
            const suffix = idParts.length > 1 ? idParts[1] : '';
            let platformLabel = platformCode
              ? `${platformCode}番のりば`
              : suffix === '1'
              ? '1番のりば'
              : suffix === '2'
              ? '2番のりば'
              : suffix
              ? `${suffix}番のりば`
              : 'のりば';

            if (stopDesc) {
              platformLabel = `${stopDesc}（${platformLabel}）`;
            }

            parsedStops.push({
              id: `stop-${stopId.replace(/\s+/g, '-')}`,
              name: stopName,
              nameKana: stopName,
              lat: Number(lat.toFixed(6)),
              lng: Number(lng.toFixed(6)),
              platform: platformLabel,
              area: '広島エリア',
              timetable: [
                {
                  id: `t-${stopId}-1`,
                  routeNumber: '路線バス',
                  company: '広電バス',
                  companyColor: '#16a34a',
                  destination: '市内中心部・主要駅方面行',
                  via: '主要幹線経由',
                  scheduledTime: '07:30',
                  minutesAway: 3,
                  delayMinutes: 0,
                  status: 'approaching',
                  congestion: 'low',
                  barrierFree: true,
                  busId: 'bus-101',
                },
              ],
            });
          }
          if (parsedStops.length === 0) {
            throw new Error('CSVファイル内に有効なバス停データが見つかりませんでした。');
          }
          setJsonText(JSON.stringify(parsedStops, null, 2));
          setLocalStops(parsedStops);
          setJsonError(null);
          setSaveFeedback(`CSVから${parsedStops.length}件のバス停を読み込みました。「保存」を押すと反映されます。`);
          return;
        }

        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) {
          throw new Error('アップロードしたファイルはバス停配列形式である必要があります。');
        }
        setJsonText(JSON.stringify(parsed, null, 2));
        setLocalStops(parsed);
        setJsonError(null);
        setSaveFeedback('ファイルを読み込みました。「保存」を押すと反映されます。');
      } catch (err: any) {
        setJsonError('ファイル読み込みエラー: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const filteredStops = localStops.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.platform.toLowerCase().includes(q) ||
      s.nameKana.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    );
  });

  return (
    <div
      id="bus-stops-data-modal"
      onClick={onClose}
      className="fixed inset-0 z-[1200] bg-black/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FDFBF7] dark:bg-[#1B1E23] rounded-2xl shadow-2xl border border-[#E8E4D9] dark:border-[#2A2F37] w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-4 py-3 sm:py-3.5 border-b border-[#E8E4D9] dark:border-[#2A2F37] bg-[#F7F5EE] dark:bg-[#16181D] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#4A6741] dark:bg-[#3B6B34] text-white flex items-center justify-center shadow-xs">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#2D3436] dark:text-[#F1F5F9] flex items-center gap-1.5">
                バス停・時刻表データ (JSON)
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E5EADF] dark:bg-[#242930] text-[#4A6741] dark:text-[#6B8E61] font-semibold">
                  {localStops.length}件
                </span>
              </h2>
              <p className="text-[11px] text-[#7A7969] dark:text-[#94A3B8]">
                バス停の位置（緯度・経度）やのりば・時刻表を簡単に調整・更新できます
              </p>
            </div>
          </div>
          <button
            id="close-data-modal-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#7A7969] dark:text-[#94A3B8] hover:text-[#2D3436] dark:hover:text-[#F1F5F9] hover:bg-[#E8E4D9] dark:hover:bg-[#242930] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert if saved */}
        {saveFeedback && (
          <div className="bg-[#EBF3E8] border-b border-[#D4E4CF] px-4 py-2 text-xs font-semibold text-[#3B5D34] flex items-center gap-2">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{saveFeedback}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 pt-2 border-b border-[#E8E4D9] bg-[#FDFBF7] shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('gtfs_timetable')}
            className={`px-3 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
              activeTab === 'gtfs_timetable'
                ? 'border-[#4A6741] text-[#4A6741]'
                : 'border-transparent text-[#7A7969] hover:text-[#2D3436]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>時刻表 (raw_stop_times.csv)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            className={`px-3 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
              activeTab === 'visual'
                ? 'border-[#4A6741] text-[#4A6741]'
                : 'border-transparent text-[#7A7969] hover:text-[#2D3436]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>バス停位置・一覧</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('json');
              setJsonText(JSON.stringify(localStops, null, 2));
            }}
            className={`px-3 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
              activeTab === 'json'
                ? 'border-[#4A6741] text-[#4A6741]'
                : 'border-transparent text-[#7A7969] hover:text-[#2D3436]'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>JSON直接編集</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('help')}
            className={`px-3 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
              activeTab === 'help'
                ? 'border-[#4A6741] text-[#4A6741]'
                : 'border-transparent text-[#7A7969] hover:text-[#2D3436]'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>ガイド</span>
          </button>
        </div>

        {/* Tab: GTFS Timetable Import & Management */}
        {activeTab === 'gtfs_timetable' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Top Toolbar */}
            <div className="p-3 border-b border-[#E8E4D9] bg-[#FAF8F3] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <label className="px-2.5 py-1 text-xs font-semibold text-[#434338] bg-white hover:bg-[#F3F4ED] border border-[#DCD6C9] rounded-lg flex items-center gap-1 cursor-pointer transition-colors">
                  <Upload className="w-3 h-3" />
                  <span>CSV/TXT 読込</span>
                  <input
                    type="file"
                    accept=".txt,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        setGtfsCsvText(content);
                        setGtfsError(null);
                      };
                      reader.readAsText(file);
                    }}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleDownloadRawStopTimesCsv}
                  className="px-2.5 py-1 text-xs font-semibold text-[#434338] bg-white hover:bg-[#F3F4ED] border border-[#DCD6C9] rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV 保存</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDownloadBusStopTimesJson('hiroshimadentetsu')}
                    className="px-2 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition-colors"
                    title="広電バス時刻表 (busStopTimes_hiroshimadentetsu.json) を出力"
                  >
                    <FileJson className="w-3 h-3 text-emerald-600" />
                    <span>広電時刻表DL</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadBusStopTimesJson('hiroshimabus')}
                    className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center gap-1 transition-colors"
                    title="広島バス時刻表 (busStopTimes_hiroshimabus.json) を出力"
                  >
                    <FileJson className="w-3 h-3 text-red-600" />
                    <span>広島バス時刻表DL</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleApplyGtfsTimetable}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#4A6741] hover:bg-[#3B5433] rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>時刻表を全バス停に反映</span>
                </button>
              </div>
            </div>

            {/* Error Notification */}
            {gtfsError && (
              <div className="bg-[#FDF2E9] border-b border-[#F5CBA7] px-4 py-2 text-xs font-semibold text-[#BA4A00] flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{gtfsError}</span>
              </div>
            )}

            {/* Split Content: Editor on Top, Real-Time Parsed Table on Bottom */}
            <div className="flex-1 min-h-0 flex flex-col p-3 space-y-3 overflow-y-auto">
              {/* Summary Stats Banner */}
              <div className="bg-[#F3F6F1] border border-[#D5DBD0] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#4A6741] text-white flex items-center justify-center font-bold text-xs">
                    {parsedGtfsRows.length}
                  </div>
                  <div>
                    <div className="font-bold text-[#2D3436] flex items-center gap-2">
                      <span>{inferredInfo.routeNumber} ({inferredInfo.company})</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#4A6741] border border-[#CAD4C6]">
                        {inferredInfo.destination}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#7A7969]">
                      経由: {inferredInfo.via} | 運行停留所数: {parsedGtfsRows.length}箇所
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-mono text-[#5B594B] bg-white px-2 py-1 rounded-lg border border-[#E8E4D9]">
                  始発 {parsedGtfsRows[0]?.departureTime?.substring(0, 5) || '--:--'} 発 〜 終着 {parsedGtfsRows[parsedGtfsRows.length - 1]?.arrivalTime?.substring(0, 5) || '--:--'} 着
                </span>
              </div>

              {/* Textarea for GTFS CSV / stop_times.txt */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#5B594B] mb-1">
                  <span>GTFS stop_times.txt 形式テキスト入力 (trip_id, arrival, departure, stop_id, sequence, headsign, ...)</span>
                  <span className="text-[10px] text-[#7A7969] font-normal">カンマ区切り (CSV)</span>
                </div>
                <textarea
                  value={gtfsCsvText}
                  onChange={(e) => {
                    setGtfsCsvText(e.target.value);
                    setGtfsError(null);
                  }}
                  rows={6}
                  spellCheck={false}
                  placeholder="333ae5bf-...,07:54:00,07:54:00,73390 0,1,広島駅,0,1,,"
                  className="w-full font-mono text-xs p-2.5 bg-white border border-[#DCD6C9] rounded-xl focus:outline-none focus:border-[#4A6741] text-[#2D3436] leading-relaxed resize-y"
                />
              </div>

              {/* Parsed Stops Real-Time Preview Table */}
              <div className="flex-1 min-h-[160px] flex flex-col border border-[#E8E4D9] rounded-xl bg-white overflow-hidden">
                <div className="px-3 py-2 bg-[#F8F6F0] border-b border-[#E8E4D9] flex items-center justify-between text-xs font-bold text-[#2D3436]">
                  <div className="flex items-center gap-1.5">
                    <List className="w-3.5 h-3.5 text-[#4A6741]" />
                    <span>パース結果プレビュー（通過時刻表）</span>
                  </div>
                  <span className="text-[10px] font-normal text-[#7A7969]">
                    全{parsedGtfsRows.length}件
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-[#F0EBE0] text-xs">
                  {parsedGtfsRows.length === 0 ? (
                    <div className="py-6 text-center text-[#7A7969]">
                      有効なGTFS行データがありません。
                    </div>
                  ) : (
                    parsedGtfsRows.map((row, idx) => {
                      const matchedStop = localStops.find(
                        (s) =>
                          s.id === row.stopId ||
                          s.id === `stop-hb-${row.stopId.replace(/\s+/g, '-')}` ||
                          s.id === `stop-hd-${row.stopId.replace(/\s+/g, '-')}` ||
                          s.id.includes(row.stopId.replace(/\s+/g, '-'))
                      );

                      return (
                        <div
                          key={`${row.tripId}-${row.stopSequence}-${idx}`}
                          className="px-3 py-1.5 hover:bg-[#FAF8F3] flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-[#EAEFE8] text-[#4A6741] text-[10px] font-bold flex items-center justify-center shrink-0">
                              {row.stopSequence}
                            </span>
                            <span className="font-mono font-bold text-[#2D3436] text-xs shrink-0">
                              {formatGtfsTime(row.departureTime)}
                            </span>
                            <span className="font-mono text-[10px] text-[#7A7969] shrink-0">
                              [{row.stopId}]
                            </span>
                            <span className="font-bold text-[#2D3436] truncate">
                              {matchedStop ? matchedStop.name : row.stopHeadsign || '停留所'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {matchedStop ? (
                              <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[#EBF3E8] text-[#3B5D34] font-semibold border border-[#D4E4CF]">
                                照合OK ({matchedStop.platform})
                              </span>
                            ) : (
                              <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-medium border border-[#FDE68A]">
                                stopId一致確認中
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Visual Stop Editor */}
        {activeTab === 'visual' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Last Clicked Coords Quick Banner */}
            {lastClickedCoords && (
              <div className="bg-[#F3F6F1] border-b border-[#D5DBD0] px-4 py-2 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-[#3D5A34]">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>
                    地図の最新クリック地点: <strong>{lastClickedCoords.lat.toFixed(6)}, {lastClickedCoords.lng.toFixed(6)}</strong>
                  </span>
                </div>
                <span className="text-[10px] text-[#7A7969]">
                  （各バス停の「クリック座標を適用」ボタンで代入できます）
                </span>
              </div>
            )}

            {/* Search & Actions Bar */}
            <div className="p-3 border-b border-[#E8E4D9] bg-[#FAF8F3] flex items-center justify-between gap-2 shrink-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-[#7A7969] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="バス停名、のりば、IDで絞り込み..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white border border-[#DCD6C9] focus:outline-none focus:border-[#4A6741] text-[#2D3436]"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSaveVisual}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#4A6741] hover:bg-[#3B5433] rounded-xl flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>変更を保存</span>
                </button>
              </div>
            </div>

            {/* List of Bus Stops */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {filteredStops.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#7A7969]">
                  該当するバス停が見つかりません。
                </div>
              ) : (
                filteredStops.map((stop) => {
                  const isExpanded = expandedStopId === stop.id;
                  return (
                    <div
                      key={stop.id}
                      className="bg-white rounded-xl border border-[#E8E4D9] p-3 shadow-xs hover:border-[#CAD4C6] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-[#2D3436] truncate">
                              {stop.name}
                            </h4>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F3F4ED] text-[#5B594B] font-medium border border-[#E2DDD2]">
                              {stop.platform}
                            </span>
                            <span className="text-[9px] font-mono text-[#9B998C]">
                              ID: {stop.id}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#7A7969] mt-0.5">
                            時刻表: {stop.timetable?.length || stop.timetableCount || getCachedTimetable(stop.id)?.length || 0}便 登録中
                          </p>
                        </div>

                        {onFocusCoordinates && (
                          <button
                            type="button"
                            onClick={() => {
                              onFocusCoordinates(stop.lat, stop.lng);
                              onClose();
                            }}
                            className="px-2 py-1 text-[11px] font-medium text-[#4A6741] hover:bg-[#F3F4ED] rounded-lg border border-[#D5DBD0] flex items-center gap-1 transition-colors shrink-0"
                            title="地図でこのバス停の位置を表示"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>地図で見る</span>
                          </button>
                        )}
                      </div>

                      {/* Coordinates and Name Inputs */}
                      <div className="mt-2.5 pt-2.5 border-t border-[#F0EBE0] grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-[#7A7969] block mb-0.5">
                            バス停名
                          </label>
                          <input
                            type="text"
                            value={stop.name}
                            onChange={(e) => handleStopFieldChange(stop.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 text-xs rounded-lg border border-[#DCD6C9] focus:outline-none focus:border-[#4A6741] text-[#2D3436]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[#7A7969] block mb-0.5">
                            のりば名称・方向
                          </label>
                          <input
                            type="text"
                            value={stop.platform}
                            onChange={(e) => handleStopFieldChange(stop.id, 'platform', e.target.value)}
                            className="w-full px-2 py-1 text-xs rounded-lg border border-[#DCD6C9] focus:outline-none focus:border-[#4A6741] text-[#2D3436]"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[10px] font-bold text-[#7A7969]">
                              緯度 (lat)
                            </label>
                            {lastClickedCoords && (
                              <button
                                type="button"
                                onClick={() => handleApplyClickedCoordsToStop(stop.id)}
                                className="text-[9px] text-[#4A6741] hover:underline font-bold"
                              >
                                クリック座標を適用
                              </button>
                            )}
                          </div>
                          <input
                            type="number"
                            step="0.000001"
                            value={stop.lat}
                            onChange={(e) => handleStopFieldChange(stop.id, 'lat', e.target.value)}
                            className="w-full px-2 py-1 text-xs font-mono rounded-lg border border-[#DCD6C9] focus:outline-none focus:border-[#4A6741] text-[#2D3436]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-[#7A7969] block mb-0.5">
                            経度 (lng)
                          </label>
                          <input
                            type="number"
                            step="0.000001"
                            value={stop.lng}
                            onChange={(e) => handleStopFieldChange(stop.id, 'lng', e.target.value)}
                            className="w-full px-2 py-1 text-xs font-mono rounded-lg border border-[#DCD6C9] focus:outline-none focus:border-[#4A6741] text-[#2D3436]"
                          />
                        </div>
                      </div>

                      {/* Timetable preview toggle */}
                      {(() => {
                        const ttList = stop.timetable || getCachedTimetable(stop.id) || [];
                        const count = ttList.length || stop.timetableCount || 0;
                        return (
                          <>
                            <div className="mt-2 flex items-center justify-between text-[10px] text-[#7A7969]">
                              <button
                                type="button"
                                onClick={() => setExpandedStopId(isExpanded ? null : stop.id)}
                                className="text-[#4A6741] hover:underline font-medium"
                              >
                                {isExpanded ? '▲ 時刻表を閉じる' : `▼ 時刻表 (${count}便) を確認`}
                              </button>
                              <span className="font-mono text-[9px]">
                                {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}
                              </span>
                            </div>

                            {isExpanded && (
                              <div className="mt-2 p-2 rounded-lg bg-[#FAF8F3] border border-[#E8E4D9] space-y-1 max-h-48 overflow-y-auto">
                                {ttList.length === 0 ? (
                                  <div className="py-2 text-center text-[10px] text-[#7A7969]">
                                    時刻表データは別ファイルから動的ロードされます
                                  </div>
                                ) : (
                                  ttList.map((t, tIdx) => (
                                    <div
                                      key={`${t.id || 't'}-${t.scheduledTime}-${tIdx}`}
                                      className="flex items-center justify-between text-[10px] py-0.5 border-b border-[#ECE7DA] last:border-0"
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        <span className="font-bold text-[#2D3436]">{t.scheduledTime}</span>
                                        <span className="text-[#4A6741] font-semibold">{t.routeNumber}</span>
                                        <span className="text-[#5B594B] truncate">{t.destination}</span>
                                      </div>
                                      <span className="text-[9px] text-[#7A7969] shrink-0 font-mono">
                                        約{t.minutesAway}分後
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Raw JSON Editor */}
        {activeTab === 'json' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* JSON Actions Toolbar */}
            <div className="p-2.5 border-b border-[#E8E4D9] bg-[#FAF8F3] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Company File Switcher */}
                <div className="flex items-center bg-[#ECE7DC] p-0.5 rounded-lg border border-[#DCD6C9] mr-1">
                  <button
                    type="button"
                    onClick={() => setSelectedJsonFile('all')}
                    className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all ${
                      selectedJsonFile === 'all'
                        ? 'bg-[#2D3436] text-white shadow-xs'
                        : 'text-[#5B594B] hover:text-[#2D3436]'
                    }`}
                  >
                    全社統合 (3,042)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedJsonFile('hiroshimadentetsu')}
                    className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                      selectedJsonFile === 'hiroshimadentetsu'
                        ? 'bg-[#16a34a] text-white shadow-xs'
                        : 'text-[#5B594B] hover:text-[#2D3436]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] inline-block" />
                    広電バス (2,420)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedJsonFile('hiroshimabus')}
                    className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                      selectedJsonFile === 'hiroshimabus'
                        ? 'bg-[#dc2626] text-white shadow-xs'
                        : 'text-[#5B594B] hover:text-[#2D3436]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] inline-block" />
                    広島バス (622)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleFormatJson}
                  className="px-2.5 py-1 text-xs font-semibold text-[#434338] bg-white hover:bg-[#F3F4ED] border border-[#DCD6C9] rounded-lg transition-colors"
                >
                  自動整形
                </button>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 text-xs font-semibold text-[#434338] bg-white hover:bg-[#F3F4ED] border border-[#DCD6C9] rounded-lg flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'コピー完了' : 'JSONコピー'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="px-2.5 py-1 text-xs font-semibold text-[#434338] bg-white hover:bg-[#F3F4ED] border border-[#DCD6C9] rounded-lg flex items-center gap-1 transition-colors"
                  title={`${getDownloadFileName()} として保存`}
                >
                  <Download className="w-3 h-3" />
                  <span>DL ({getDownloadFileName()})</span>
                </button>
                <label className="px-2.5 py-1 text-xs font-semibold text-[#434338] bg-white hover:bg-[#F3F4ED] border border-[#DCD6C9] rounded-lg flex items-center gap-1 cursor-pointer transition-colors">
                  <Upload className="w-3 h-3" />
                  <span>ファイル読込</span>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('初期設定のバス停データに戻しますか？')) {
                      onResetToDefault();
                      setSaveFeedback('初期データに戻しました');
                      setTimeout(() => setSaveFeedback(null), 3000);
                    }
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-[#C0392B] hover:bg-[#FBEBEA] border border-[#E9C3C0] rounded-lg flex items-center gap-1 transition-colors"
                  title="初期のデータに戻す"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>初期値に戻す</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveJson}
                  className="px-3 py-1 text-xs font-bold text-white bg-[#4A6741] hover:bg-[#3B5433] rounded-lg flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>保存して反映</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {jsonError && (
              <div className="bg-[#FDF2E9] border-b border-[#F5CBA7] px-4 py-2 text-xs font-semibold text-[#BA4A00] flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}

            {/* Monospace Code Editor */}
            <div className="flex-1 p-3 min-h-0 bg-[#2D3436]">
              <textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setJsonError(null);
                }}
                spellCheck={false}
                className="w-full h-full bg-transparent text-[#F9F7F2] font-mono text-xs leading-relaxed resize-none focus:outline-none selection:bg-[#4A6741]"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Instructions & Coordinate Guide */}
        {activeTab === 'help' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-[#434338] leading-relaxed">
            <div className="bg-white p-3.5 rounded-xl border border-[#E8E4D9]">
              <h3 className="font-bold text-sm text-[#2D3436] mb-2 flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-[#4A6741]" />
                1. バス停 & 時刻表データファイル構成（会社別ファイル）
              </h3>
              <p className="mb-2">
                本アプリのバス停および発車時刻表データは、バス会社別に独立したJSONファイルとして配置・管理されています：
              </p>
              <div className="space-y-1.5 mb-2">
                <div className="bg-[#F7F5EE] p-2 rounded-lg font-mono text-xs text-[#2D3436] border border-[#E8E4D9] flex items-center justify-between">
                  <span>/src/data/busStop_hiroshimadentetsu.json</span>
                  <span className="text-[10px] font-bold text-emerald-700 font-sans">広電バス停留所 (2,420件)</span>
                </div>
                <div className="bg-[#F7F5EE] p-2 rounded-lg font-mono text-xs text-[#2D3436] border border-[#E8E4D9] flex items-center justify-between">
                  <span>/src/data/busStop_hiroshimabus.json</span>
                  <span className="text-[10px] font-bold text-red-700 font-sans">広島バス停留所 (622件)</span>
                </div>
                <div className="bg-[#F7F5EE] p-2 rounded-lg font-mono text-xs text-[#2D3436] border border-[#E8E4D9] flex items-center justify-between">
                  <span>/public/data/busStopTimes_hiroshimadentetsu.json</span>
                  <span className="text-[10px] font-bold text-emerald-700 font-sans">広電バス時刻表 (2,420停 / 4,655系統便)</span>
                </div>
                <div className="bg-[#F7F5EE] p-2 rounded-lg font-mono text-xs text-[#2D3436] border border-[#E8E4D9] flex items-center justify-between">
                  <span>/public/data/busStopTimes_hiroshimabus.json</span>
                  <span className="text-[10px] font-bold text-red-700 font-sans">広島バス時刻表 (1,340停 / 2,175系統便)</span>
                </div>
              </div>
              <p className="text-[11px] text-[#7A7969]">
                エディタから上記ファイルを直接開くか、この画面の各タブから会社別のデータを閲覧・編集・ダウンロードできます。
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#E8E4D9]">
              <h3 className="font-bold text-sm text-[#2D3436] mb-2 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-[#4A6741]" />
                2. 地図から緯度・経度を調べる方法
              </h3>
              <ol className="list-decimal pl-4 space-y-1.5 text-[11px]">
                <li>
                  地図上の好きな地点をクリックすると、画面右下に<strong>「📍 クリック座標」</strong>が表示されます。
                </li>
                <li>
                  「座標をコピー」ボタンを押すか、この画面の<strong>「バス停一覧・位置編集」</strong>タブを開くと、ワンタップでバス停の緯度経度に代入できます。
                </li>
                <li>
                  「変更を保存」を押せば、ブラウザ上で即座に新しい位置にピンが移動します。
                </li>
              </ol>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#E8E4D9]">
              <h3 className="font-bold text-sm text-[#2D3436] mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#4A6741]" />
                3. 広島市内の主要バス停 座標の目安
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-[#FAF8F3] border border-[#E8E4D9]">
                  <div className="font-bold text-[#2D3436]">広島駅（南口バスターミナル）</div>
                  <div className="font-mono text-[10px] text-[#7A7969]">lat: 34.39750, lng: 132.47510</div>
                </div>
                <div className="p-2 rounded-lg bg-[#FAF8F3] border border-[#E8E4D9]">
                  <div className="font-bold text-[#2D3436]">八丁堀（福屋前・相生通り）</div>
                  <div className="font-mono text-[10px] text-[#7A7969]">lat: 34.39290, lng: 132.46460</div>
                </div>
                <div className="p-2 rounded-lg bg-[#FAF8F3] border border-[#E8E4D9]">
                  <div className="font-bold text-[#2D3436]">紙屋町東（そごう前）</div>
                  <div className="font-mono text-[10px] text-[#7A7969]">lat: 34.39570, lng: 132.45900</div>
                </div>
                <div className="p-2 rounded-lg bg-[#FAF8F3] border border-[#E8E4D9]">
                  <div className="font-bold text-[#2D3436]">紙屋町西（エディオン前）</div>
                  <div className="font-mono text-[10px] text-[#7A7969]">lat: 34.39560, lng: 132.45650</div>
                </div>
                <div className="p-2 rounded-lg bg-[#FAF8F3] border border-[#E8E4D9]">
                  <div className="font-bold text-[#2D3436]">本通（鯉城通り）</div>
                  <div className="font-mono text-[10px] text-[#7A7969]">lat: 34.39230, lng: 132.45740</div>
                </div>
                <div className="p-2 rounded-lg bg-[#FAF8F3] border border-[#E8E4D9]">
                  <div className="font-bold text-[#2D3436]">原爆ドーム前</div>
                  <div className="font-mono text-[10px] text-[#7A7969]">lat: 34.39580, lng: 132.45380</div>
                </div>
                <div className="p-2 rounded-lg bg-[#FAF8F3] border border-[#E8E4D9]">
                  <div className="font-bold text-[#2D3436]">平和記念公園（資料館南側）</div>
                  <div className="font-mono text-[10px] text-[#7A7969]">lat: 34.39250, lng: 132.45180</div>
                </div>
                <div className="p-2 rounded-lg bg-[#FAF8F3] border border-[#E8E4D9]">
                  <div className="font-bold text-[#2D3436]">市役所前（中区役所前）</div>
                  <div className="font-mono text-[10px] text-[#7A7969]">lat: 34.38540, lng: 132.45420</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#E8E4D9] bg-[#F7F5EE] flex items-center justify-between text-xs text-[#7A7969] shrink-0">
          <span>
            {localStops.length}箇所のバス停を管理中
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-white border border-[#D5DBD0] text-[#2D3436] font-semibold hover:bg-[#FAF8F3] transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
