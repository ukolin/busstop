import fs from 'fs';
import path from 'path';

// 1. Read existing kana dictionary from previous busStops.json if available
let knownKanas: Record<string, string> = {};
try {
  const existingStops = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/busStops.json'), 'utf-8'));
  for (const s of existingStops) {
    if (s.name && s.nameKana) {
      knownKanas[s.name] = s.nameKana;
    }
  }
} catch (e) {
  console.warn('Could not read existing busStops.json for kana map');
}

// Additional manual kana dictionary for prominent Hiroshima stops
const extraKanas: Record<string, string> = {
  '鈴が台': 'すずがだい',
  '鈴が峰住宅前': 'すずがみねじゅうたくまえ',
  '鈴が峰市営住宅前': 'すずがみねしえいじゅうたくまえ',
  '鈴が峰第三歩道橋': 'すずがみねだいさんほどうきょう',
  '鈴が峰第二歩道橋': 'すずがみねだいにほどうきょう',
  '鈴が峰小学校下': 'すずがみねしょうがっこうした',
  '鈴が峰住宅西': 'すずがみねじゅうたくにし',
  '鈴が峰住宅中': 'すずがみねじゅうたくなか',
  '鈴が峰住宅東': 'すずがみねじゅうたくひがし',
  '鈴が峰住宅': 'すずがみねじゅうたく',
  '鈴が台下': 'すずがだいした',
  '井口台一丁目': 'いのくちだいいっちょうめ',
  '井口台中央': 'いのくちだいちゅうおう',
  '井口台パークタウン': 'いのくちだいぱーくたうん',
  '井口台東': 'いのくちだいひがし',
  '井口台': 'いのくちだい',
  '新井口駅': 'しんいのくちえき',
  'アルパーク': 'あるぱーく',
  '草津病院前': 'くさつびょういんまえ',
  '草津病院入口': 'くさつびょういんいりぐち',
  '草津東町': 'くさつひがしまち',
  '草津町': 'くさつちょう',
  '草津南町': 'くさつみなみまち',
  '草津梅が台': 'くさつうめがだい',
  '草津東': 'くさつひがし',
  '草津新町一丁目': 'くさつしんまちいっちょうめ',
  '草津': 'くさつ',
  '庚午住宅': 'こうごじゅうたく',
  '庚午住宅入口': 'こうごじゅうたくいりぐち',
  '庚午中一丁目': 'こうごなかいっちょうめ',
  '庚午中三丁目': 'こうごなかさんちょうめ',
  '庚午中四丁目': 'こうごなかよんちょうめ',
  '庚午中': 'こうごなか',
  '庚午北二丁目': 'こうごきたいっちょうめ',
  '庚午北四丁目': 'こうごきたよんちょうめ',
  '庚午北': 'こうごきた',
  '古江東町': 'ふるえひがしまち',
  '古江': 'ふるえ',
  '高須': 'たかす',
  '田方': 'たがた',
  '田方が丘団地': 'たがたがおかだんち',
  '田方東陽台前': 'たがたとうようだいまえ',
  '山田団地': 'やまだだんち',
  '山田入口': 'やまだいりぐち',
  '美鈴が丘': 'みすずがおか',
  '美鈴モール前': 'みすずもーるまえ',
  '美鈴が丘高校': 'みすずがおかこうこう',
  'コイン通り': 'こいんどおり',
  '五日市駅北口': 'いつかいちえききたぐち',
  '五日市駅南口': 'いつかいちえきみなみぐち',
  '波出石': 'はでいし',
  '西広島駅・己斐': 'にしひろしまえき・こい',
  '西広島駅前': 'にしひろしまえきまえ',
  '己斐「宮島街道」': 'こい（みやじまかいどう）',
  '己斐「西広島駅」': 'こい（にしひろしまえき）',
  '己斐本町二丁目': 'こいほんまちにちょうめ',
  '己斐本町三丁目': 'こいほんまちさんちょうめ',
  '己斐橋': 'こいばし',
  '己斐': 'こい',
  '紙屋町': 'かみやちょう',
  '八丁堀': 'はっちょうぼり',
  '広島駅': 'ひろしまえき',
  '広島駅新幹線口': 'ひろしまえきしんかんせんぐち',
  '広島バスセンター': 'ひろしまばすせんたー',
  '横川駅前': 'よこがわえきまえ',
  '横川駅': 'よこがわえき',
  '横川1丁目': 'よこがわいっちょうめ',
  '横川3丁目': 'よこがわさんちょうめ',
  '立町': 'たてまち',
  '本通り': 'ほんどおり',
  '県庁前': 'けんちょうまえ',
  '袋町': 'ふくろまち',
  '中電前': 'ちゅうでんまえ',
  '市役所前': 'しやくしょまえ',
  '段原中央': 'だんばらちゅうおう',
  '段原一丁目': 'だんばらいっちょうめ',
  '段原南': 'だんばらみなみ',
  '大学病院前': 'だいがくびょういんまえ',
  '大学病院入口': 'だいがくびょういんいりぐち',
  'エディオンピースウイング広島': 'えでぃおんぴーすういんぐひろしま',
  'マツダスタジアム前': 'まつだすたじあむまえ',
  '広島港桟橋': 'ひろしまこうさんばし',
  'グランドプリンスホテル広島': 'ぐらんどぷりんすほてるひろしま',
  'ＬＥＣＴ': 'れくと',
  'ジ アウトレット 広島': 'じあうとれっとひろしま',
  'ジアウトレット広島': 'じあうとれっとひろしま',
};
Object.assign(knownKanas, extraKanas);

// Simple Kanji to Hiragana phonetic fallback helper
function guessKana(name: string): string {
  if (knownKanas[name]) return knownKanas[name];
  let res = name
    .replace(/駅前/g, 'えきまえ')
    .replace(/駅/g, 'えき')
    .replace(/口/g, 'ぐち')
    .replace(/前/g, 'まえ')
    .replace(/町/g, 'ちょう')
    .replace(/中央/g, 'ちゅうおう')
    .replace(/通り/g, 'どおり')
    .replace(/通/g, 'どおり')
    .replace(/橋/g, 'ばし')
    .replace(/台/g, 'だい')
    .replace(/東/g, 'ひがし')
    .replace(/西/g, 'にし')
    .replace(/南/g, 'みなみ')
    .replace(/北/g, 'きた')
    .replace(/上/g, 'かみ')
    .replace(/下/g, 'しも')
    .replace(/中/g, 'なか')
    .replace(/公園/g, 'こうえん')
    .replace(/学校/g, 'がっこう')
    .replace(/高校/g, 'こうこう')
    .replace(/病院/g, 'びょういん')
    .replace(/支所/g, 'ししょ')
    .replace(/市役所/g, 'しやくしょ')
    .replace(/団地/g, 'だんち')
    .replace(/一丁目/g, 'いっちょうめ')
    .replace(/二丁目/g, 'にちょうめ')
    .replace(/三丁目/g, 'さんちょうめ')
    .replace(/四丁目/g, 'よんちょうめ')
    .replace(/五丁目/g, 'ごちょうめ')
    .replace(/六丁目/g, 'ろくちょうめ')
    .replace(/七丁目/g, 'ななちょうめ');
  return res;
}

function determineArea(lat: number, lng: number, name: string): string {
  if (name.includes('呉') || name.includes('音戸') || name.includes('阿賀') || name.includes('警固屋') || name.includes('広') || lat < 34.30) {
    return '呉市';
  }
  if (name.includes('廿日市') || name.includes('阿品') || name.includes('宮島') || name.includes('大野') || lng < 132.33) {
    return '廿日市市';
  }
  if (name.includes('五日市') || name.includes('美鈴が丘') || name.includes('八幡') || name.includes('湯来') || (lng >= 132.33 && lng < 132.378)) {
    return '佐伯区';
  }
  if (name.includes('鈴が台') || name.includes('井口') || name.includes('鈴が峰') || name.includes('草津') || name.includes('己斐') || name.includes('庚午') || name.includes('古江') || name.includes('高須') || name.includes('西広島') || (lng >= 132.378 && lng < 132.435 && lat < 34.42)) {
    return '西区';
  }
  if (lat > 34.50) {
    return '安佐北区';
  }
  if (lat > 34.43 && lng < 132.48) {
    return '安佐南区';
  }
  if (name.includes('広島駅') || name.includes('若草') || name.includes('曙') || name.includes('温品') || name.includes('戸坂') || name.includes('矢賀') || name.includes('中山') || (lat > 34.398 && lng > 132.47)) {
    return '東区';
  }
  if (name.includes('宇品') || name.includes('比治山') || name.includes('皆実') || name.includes('段原') || name.includes('出島') || name.includes('吉島') || (lat < 34.395 && lng > 132.465)) {
    return '南区';
  }
  if (name.includes('府中') || name.includes('向洋') || name.includes('青崎')) {
    return '安芸郡府中町・南区';
  }
  return '中区';
}

function generateTimetableForStop(
  name: string,
  lat: number,
  lng: number,
  stopId: string,
  operator: 'hiroden' | 'hiroshimabus' = 'hiroden'
) {
  const routes: Array<{ route: string; company: '広電バス' | '広島バス' | '広島交通' | 'JRバス中国'; color: string; dest: string; via: string }> = [];

  if (operator === 'hiroshimabus') {
    // Hiroshima Bus (赤バス) specific routes
    if (name.includes('吉島') || name.includes('加古町') || name.includes('平和記念公園') || name.includes('中島小学校')) {
      routes.push(
        { route: '24号 吉島線', company: '広島バス', color: '#dc2626', dest: '広島駅行', via: '平和記念公園・本通り・八丁堀経由' },
        { route: '24号 吉島線', company: '広島バス', color: '#dc2626', dest: '吉島営業所・吉島病院行', via: '舟入・光南町経由' },
        { route: '50号 東西線', company: '広島バス', color: '#dc2626', dest: 'アルパーク行', via: '舟入南・観音新町経由' }
      );
    } else if (name.includes('宇品') || name.includes('元宇品') || name.includes('グランドプリンス') || name.includes('御幸')) {
      routes.push(
        { route: '21号 宇品線', company: '広島バス', color: '#dc2626', dest: '広島駅・洋光台団地行', via: '御幸橋・紙屋町・八丁堀経由' },
        { route: '21号 宇品線', company: '広島バス', color: '#dc2626', dest: '広島港・グランドプリンスホテル広島行', via: 'ベイシティ宇品経由' },
        { route: '51号 エキまちループ', company: '広島バス', color: '#dc2626', dest: '市街地循環（右回り）', via: '八丁堀・白神社前・市役所経由' }
      );
    } else if (name.includes('草津') || name.includes('庚午') || name.includes('商工センター') || name.includes('アルパーク') || name.includes('ＬＥＣＴ')) {
      routes.push(
        { route: '25号 草津線', company: '広島バス', color: '#dc2626', dest: '広島駅行', via: '平和大通り・八丁堀経由' },
        { route: '25号 草津線', company: '広島バス', color: '#dc2626', dest: '井口車庫・アルパーク行', via: '庚午・草津南町経由' },
        { route: '50号 東西線', company: '広島バス', color: '#dc2626', dest: '広島駅（南口）行', via: '舟入南・御幸橋・平塚町経由' }
      );
    } else if (name.includes('中山') || name.includes('温品') || name.includes('小河原') || name.includes('戸坂') || name.includes('矢賀')) {
      routes.push(
        { route: '29号 深川線', company: '広島バス', color: '#dc2626', dest: '広島バスセンター・広島駅行', via: '中山踏切・矢賀新町経由' },
        { route: '29号 深川線', company: '広島バス', color: '#dc2626', dest: '小河原車庫行', via: '上温品・地区センター経由' }
      );
    } else if (name.includes('横川') || name.includes('三篠') || name.includes('大芝') || name.includes('三滝')) {
      routes.push(
        { route: '22号 横川・三篠線', company: '広島バス', color: '#dc2626', dest: '広島駅行', via: '十日市・八丁堀経由' },
        { route: '23号 横川線', company: '広島バス', color: '#dc2626', dest: '大学病院前行', via: '八丁堀・段原経由' }
      );
    } else {
      routes.push(
        { route: '広島バス 市内線', company: '広島バス', color: '#dc2626', dest: '広島駅・八丁堀方面行', via: '中心部幹線経由' },
        { route: '21号/25号 連絡便', company: '広島バス', color: '#dc2626', dest: '市内各方面行', via: '主要停留所連絡' }
      );
    }
  } else {
    // Hiroden Bus (広電バス) specific routes
    if (name.includes('鈴が台') || name.includes('鈴が峰') || name.includes('井口台') || name.includes('井口')) {
      routes.push(
        { route: '53号 西広島バイパス線', company: '広電バス', color: '#16a34a', dest: '広島バスセンター行', via: '古江・舟入・八丁堀経由' },
        { route: '55号線', company: '広電バス', color: '#16a34a', dest: '広島駅行', via: '西広島バイパス・市役所前経由' },
        { route: '井口台パークタウン線', company: '広電バス', color: '#16a34a', dest: '新井口駅・アルパーク行', via: '井口台中央・鈴が台下経由' },
        { route: '53号 下り便', company: '広電バス', color: '#16a34a', dest: '山田団地・美鈴が丘行', via: '波出石経由' }
      );
    } else if (name.includes('五日市') || name.includes('美鈴が丘') || name.includes('山田団地') || name.includes('藤の木') || name.includes('彩が丘') || name.includes('薬師が丘')) {
      routes.push(
        { route: '東観音台・五日市線', company: '広電バス', color: '#16a34a', dest: '五日市駅北口行', via: '波出石・コイン通り経由' },
        { route: '美鈴が丘線', company: '広電バス', color: '#16a34a', dest: '広島バスセンター行', via: '美鈴モール・バイパス・八丁堀経由' },
        { route: '山田団地線', company: '広電バス', color: '#16a34a', dest: '五日市駅南口行', via: '八幡学校・佐伯区役所経由' },
        { route: 'ジ アウトレット直行便', company: '広電バス', color: '#0284c7', dest: 'ジ アウトレット 広島行', via: 'そらの北経由' }
      );
    } else if (name.includes('広島駅') || name.includes('新幹線口')) {
      routes.push(
        { route: '3号線', company: '広電バス', color: '#16a34a', dest: 'マリーナホップ行', via: '八丁堀・市役所前・観音新町経由' },
        { route: '101号 エキまちループ', company: '広電バス', color: '#0284c7', dest: '市街地循環（左回り）', via: '八丁堀・本通・白神社前経由' },
        { route: '2号線', company: '広電バス', color: '#16a34a', dest: '府中永田・温品車庫行', via: '天神川駅北・府中山田経由' }
      );
    } else if (name.includes('八丁堀') || name.includes('紙屋町') || name.includes('バスセンター') || name.includes('本通') || name.includes('県庁前')) {
      routes.push(
        { route: '3号線', company: '広電バス', color: '#16a34a', dest: '広島駅行', via: '八丁堀・相生通り経由' },
        { route: 'こころ・西風新都線', company: '広電バス', color: '#16a34a', dest: 'こころ産業団地行', via: '中広町・高速４号線経由' },
        { route: '西広島バイパス線', company: '広電バス', color: '#16a34a', dest: '五日市・廿日市方面行', via: '舟入・古江経由' }
      );
    } else if (name.includes('西広島') || name.includes('己斐') || name.includes('アルパーク') || name.includes('草津') || name.includes('田方') || name.includes('古江') || name.includes('庚午') || name.includes('高須')) {
      routes.push(
        { route: '西広島バイパス線', company: '広電バス', color: '#16a34a', dest: '広島バスセンター行', via: 'バイパス本線・八丁堀経由' },
        { route: '商工センター循環', company: '広電バス', color: '#0284c7', dest: 'アルパーク行（循環）', via: 'サンプラザ前・中央卸売市場経由' }
      );
    } else if (name.includes('呉') || name.includes('広') || name.includes('阿賀') || name.includes('警固屋') || name.includes('音戸') || lat < 34.30) {
      routes.push(
        { route: '呉倉橋島線', company: '広電バス', color: '#16a34a', dest: '桂浜温泉館行', via: '警固屋・音戸渡船口・波多見経由' },
        { route: '中央循環線', company: '広電バス', color: '#0284c7', dest: '呉駅前行（左回り）', via: '四道路・本通・呉市役所経由' },
        { route: '広・阿賀線', company: '広電バス', color: '#16a34a', dest: '広駅前・東のりば行', via: '阿賀海岸通・新広駅経由' }
      );
    } else if (name.includes('廿日市') || name.includes('阿品') || name.includes('宮島') || lng < 132.33) {
      routes.push(
        { route: '廿日市さくらバス', company: '広電バス', color: '#16a34a', dest: '廿日市市役所前駅行', via: 'ゆめタウン廿日市・宮内串戸経由' },
        { route: '阿品台線', company: '広電バス', color: '#16a34a', dest: 'ＪＲ阿品駅行', via: '阿品台中央・阿品台北経由' }
      );
    } else if (lat > 34.45) {
      routes.push(
        { route: '72号 可部線', company: '広島交通', color: '#ea580c', dest: '広島バスセンター行', via: '国道54号・祇園経由' },
        { route: '73号 勝木線', company: '広島交通', color: '#ea580c', dest: '広島駅行', via: '可部駅前・横川駅前経由' },
        { route: '70号 高陽線', company: '広島交通', color: '#ea580c', dest: '高陽車庫行', via: '高陽B団地・深川経由' }
      );
    } else {
      routes.push(
        { route: '広電路線バス', company: '広電バス', color: '#16a34a', dest: '広島バスセンター行', via: '幹線道路経由' },
        { route: '生活循環バス', company: '広電バス', color: '#0284c7', dest: '最寄ターミナル連絡行', via: '住宅街経由' }
      );
    }
  }

  const baseMinutes = [2, 8, 16, 27];
  return routes.slice(0, 4).map((r, idx) => {
    const minAway = baseMinutes[idx] || (idx * 8 + 3);
    const now = new Date();
    const depTime = new Date(now.getTime() + minAway * 60000);
    const timeStr = `${String(depTime.getHours()).padStart(2, '0')}:${String(depTime.getMinutes()).padStart(2, '0')}`;
    return {
      id: `t-${stopId}-${idx + 1}`,
      routeNumber: r.route,
      company: r.company,
      companyColor: r.color,
      destination: r.dest,
      via: r.via,
      scheduledTime: timeStr,
      minutesAway: minAway,
      delayMinutes: idx === 0 ? 1 : 0,
      status: idx === 0 ? ('approaching' as const) : ('on_time' as const),
      congestion: idx % 2 === 0 ? ('medium' as const) : ('low' as const),
      barrierFree: true,
      busId: `bus-v-${(idx * 7 + 101) % 900}`
    };
  });
}

interface ParsedStop {
  id: string;
  name: string;
  nameKana: string;
  lat: number;
  lng: number;
  platform: string;
  platformCode?: string;
  area: string;
  timetable: any[];
}

function parseCSVFile(filePath: string, operator: 'hiroden' | 'hiroshimabus'): ParsedStop[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }
  const rawContent = fs.readFileSync(filePath, 'utf-8');
  const lines = rawContent.split('\n').filter((l) => l.trim());
  console.log(`Parsing ${filePath} (${operator}): ${lines.length - 1} rows...`);

  const results: ParsedStop[] = [];
  const prefix = operator === 'hiroden' ? 'hd' : 'hb';

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    const stopId = cols[0]?.trim();
    const stopName = cols[2]?.trim();
    const stopDesc = cols[3] ? cols[3].trim() : '';
    const stopLat = parseFloat(cols[4]);
    const stopLon = parseFloat(cols[5]);
    const locationType = cols[8] ? cols[8].trim() : '0';
    const platformCode = cols[12] ? cols[12].trim() : '';

    // Skip parent stations
    if (locationType === '1') {
      continue;
    }

    if (isNaN(stopLat) || isNaN(stopLon) || !stopName) {
      continue;
    }

    const idParts = stopId.split(' ');
    const suffix = idParts.length > 1 ? idParts[1] : '';

    let pCode = platformCode;
    if (!pCode && suffix && suffix !== '0' && suffix !== '999') {
      pCode = suffix;
    } else if (suffix === '999') {
      pCode = '降車';
    }

    let platformLabel = '';
    const opLabel = operator === 'hiroshimabus' ? '広島バス' : '広電バス';
    if (pCode && pCode !== '降車') {
      const pCodeStr = pCode.endsWith('番') || pCode.endsWith('のりば') ? pCode : `${pCode}番のりば`;
      platformLabel = `${pCodeStr}（${opLabel}）`;
    } else if (pCode === '降車') {
      platformLabel = `降車専用（${opLabel}）`;
    } else if (suffix === '1') {
      platformLabel = `1番のりば（${opLabel}・上り/市内方面）`;
    } else if (suffix === '2') {
      platformLabel = `2番のりば（${opLabel}・下り/郊外方面）`;
    } else {
      platformLabel = `のりば（${opLabel}）`;
    }

    if (stopDesc) {
      platformLabel = `${stopDesc}（${platformLabel}）`;
    }

    const cleanId = `stop-${prefix}-${stopId.replace(/\s+/g, '-')}`;
    const area = determineArea(stopLat, stopLon, stopName);
    const nameKana = guessKana(stopName);
    const timetable = generateTimetableForStop(stopName, stopLat, stopLon, cleanId, operator);

    results.push({
      id: cleanId,
      name: stopName,
      nameKana,
      lat: Number(stopLat.toFixed(6)),
      lng: Number(stopLon.toFixed(6)),
      platform: platformLabel,
      platformCode: pCode || undefined,
      area,
      timetable,
    });
  }

  return results;
}

// 2. Parse both CSV files
const hirodenPath = path.join(process.cwd(), 'src/data/raw_busstop_hiroshimadentetsu.csv');
const hiroshimaBusPath = path.join(process.cwd(), 'src/data/raw_busstop_hiroshimabus.csv');

const hirodenStops = parseCSVFile(hirodenPath, 'hiroden');
const hiroshimaBusStops = parseCSVFile(hiroshimaBusPath, 'hiroshimabus');

console.log(`Loaded ${hirodenStops.length} Hiroden stops and ${hiroshimaBusStops.length} Hiroshima Bus stops.`);

// Combine all stops (total ~3,040 poles across Hiroshima!)
const allStops = [...hirodenStops, ...hiroshimaBusStops];

console.log(`Total combined bus stops: ${allStops.length}`);

const outJsonPath = path.join(process.cwd(), 'src/data/busStops.json');
fs.writeFileSync(outJsonPath, JSON.stringify(allStops, null, 2), 'utf-8');
console.log(`Successfully written combined stops dataset to ${outJsonPath}!`);
