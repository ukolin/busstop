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
  operator: 'hiroden' | 'hiroshimabus' = 'hiroden',
  suffix: string = '',
  platformCode: string = '',
  direction: 'inbound' | 'outbound' | 'terminal' | 'dropoff' | 'both' = 'both'
) {
  const routes: Array<{ route: string; company: '広電バス' | '広島バス' | '広島交通' | 'JRバス中国'; color: string; dest: string; via: string }> = [];
  const compName: '広電バス' | '広島バス' = operator === 'hiroshimabus' ? '広島バス' : '広電バス';
  const compColor = operator === 'hiroshimabus' ? '#dc2626' : '#16a34a';

  if (direction === 'dropoff') {
    return [
      {
        id: `t-${stopId}-drop`,
        routeNumber: '降車専用',
        company: compName,
        companyColor: '#7A7969',
        destination: '当停留所は降車専用です（回送）',
        via: 'ご乗車はできません',
        scheduledTime: '--:--',
        minutesAway: 0,
        delayMinutes: 0,
        status: 'on_time' as const,
        congestion: 'low' as const,
        barrierFree: true,
      },
    ];
  }

  // Multi-bay Terminal platform specific routes
  if (name.includes('広島駅')) {
    if (platformCode === '1' || platformCode === '1番') {
      routes.push(
        { route: '3号線', company: '広電バス', color: '#16a34a', dest: 'マリーナホップ行', via: '八丁堀・市役所前・観音新町経由' },
        { route: '3号線 急行', company: '広電バス', color: '#16a34a', dest: '広島ヘリポート行', via: '紙屋町・舟入経由' }
      );
    } else if (platformCode === '2' || platformCode === '2番') {
      routes.push(
        { route: '2号線', company: '広電バス', color: '#16a34a', dest: '府中永田・温品車庫行', via: '天神川駅北・府中山田経由' },
        { route: '2-1号線', company: '広電バス', color: '#16a34a', dest: 'イオンモール広島府中行', via: '矢賀駅経由' }
      );
    } else if (platformCode === '3' || platformCode === '3番') {
      routes.push(
        { route: '21号 宇品線', company: '広島バス', color: '#dc2626', dest: '広島港（宇品）行', via: '八丁堀・紙屋町・御幸橋経由' },
        { route: '21-2号線', company: '広島バス', color: '#dc2626', dest: 'グランドプリンスホテル広島行', via: 'ベイシティ宇品経由' }
      );
    } else if (platformCode === '4' || platformCode === '4番') {
      routes.push(
        { route: '24号 吉島線', company: '広島バス', color: '#dc2626', dest: '吉島営業所・吉島病院行', via: '平和記念公園・舟入・光南町経由' }
      );
    } else if (platformCode === '5' || platformCode === '5番') {
      routes.push(
        { route: '25号 草津線', company: '広島バス', color: '#dc2626', dest: '井口車庫・アルパーク行', via: '平和大通り・己斐・庚午経由' }
      );
    } else if (platformCode === '6' || platformCode === '6番') {
      routes.push(
        { route: '50号 東西線', company: '広島バス', color: '#dc2626', dest: 'アルパーク行', via: '平塚町・御幸橋・舟入南・観音新町経由' }
      );
    } else if (platformCode === '8' || platformCode === '8番') {
      routes.push(
        { route: '55号線', company: '広電バス', color: '#16a34a', dest: '薬師が丘・植物公園行', via: '西広島バイパス・波出石経由' }
      );
    } else {
      routes.push(
        { route: '101号 エキまちループ', company: '広電バス', color: '#0284c7', dest: '市街地循環（左回り）', via: '八丁堀・本通・白神社前経由' },
        { route: '51号 エキまちループ', company: '広島バス', color: '#dc2626', dest: '市街地循環（右回り）', via: '市役所前・白神社前・八丁堀経由' },
        { route: '3号線', company: '広電バス', color: '#16a34a', dest: '観音新町・マリーナホップ行', via: '相生通り・市役所経由' }
      );
    }
  } else if (name.includes('アルパーク')) {
    if (direction === 'inbound' || platformCode === '1' || platformCode === '2') {
      routes.push(
        { route: '25号 草津線', company: '広島バス', color: '#dc2626', dest: '広島駅行', via: '庚午・平和大通り・八丁堀経由' },
        { route: '50号 東西線', company: '広島バス', color: '#dc2626', dest: '広島駅（南口）行', via: '舟入南・御幸橋・平塚町経由' },
        { route: '53号 西広島バイパス線', company: '広電バス', color: '#16a34a', dest: '広島バスセンター行', via: 'バイパス本線・市役所前経由' }
      );
    } else {
      routes.push(
        { route: '井口台パークタウン線', company: '広電バス', color: '#16a34a', dest: '井口台パークタウン行', via: '新井口駅・井口台中央経由' },
        { route: '商工センター循環', company: '広電バス', color: '#0284c7', dest: '商工センター循環・LECT行', via: 'サンプラザ前・中央卸売市場経由' },
        { route: '50号 東西線', company: '広島バス', color: '#dc2626', dest: '商工センター車庫行', via: '草津南経由' }
      );
    }
  } else if (operator === 'hiroshimabus') {
    // Hiroshima Bus (赤バス)
    if (direction === 'inbound') {
      // 上り（市内中心部・広島駅・広島バスセンター方面）
      if (name.includes('吉島') || name.includes('加古町') || name.includes('光南') || name.includes('中島')) {
        routes.push(
          { route: '24号 吉島線（上り）', company: '広島バス', color: '#dc2626', dest: '広島駅行', via: '平和記念公園・本通り・八丁堀経由' },
          { route: '50号 東西線（上り）', company: '広島バス', color: '#dc2626', dest: '広島駅（南口）行', via: '御幸橋・平塚町経由' }
        );
      } else if (name.includes('宇品') || name.includes('元宇品') || name.includes('御幸') || name.includes('県病院')) {
        routes.push(
          { route: '21号 宇品線（上り）', company: '広島バス', color: '#dc2626', dest: '広島駅・洋光台団地行', via: '御幸橋・紙屋町・八丁堀経由' },
          { route: '51号 エキまちループ（上り）', company: '広島バス', color: '#dc2626', dest: '広島駅行（市街地循環）', via: '白神社前・八丁堀経由' }
        );
      } else if (name.includes('草津') || name.includes('庚午') || name.includes('商工センター') || name.includes('井口')) {
        routes.push(
          { route: '25号 草津線（上り）', company: '広島バス', color: '#dc2626', dest: '広島駅行', via: '平和大通り・八丁堀経由' },
          { route: '50号 東西線（上り）', company: '広島バス', color: '#dc2626', dest: '広島駅（南口）行', via: '舟入南・御幸橋・平塚町経由' }
        );
      } else if (name.includes('中山') || name.includes('温品') || name.includes('小河原') || name.includes('戸坂') || name.includes('矢賀')) {
        routes.push(
          { route: '29号 深川線（上り）', company: '広島バス', color: '#dc2626', dest: '広島バスセンター・広島駅行', via: '中山踏切・矢賀新町経由' },
          { route: '29号 急行（上り）', company: '広島バス', color: '#dc2626', dest: '広島駅新幹線口行', via: '温品バイパス経由' }
        );
      } else if (name.includes('横川') || name.includes('三篠') || name.includes('大芝') || name.includes('三滝')) {
        routes.push(
          { route: '22号 横川・三篠線（上り）', company: '広島バス', color: '#dc2626', dest: '広島駅行', via: '十日市・八丁堀経由' },
          { route: '23号 横川線（上り）', company: '広島バス', color: '#dc2626', dest: '大学病院前行', via: '八丁堀・段原経由' }
        );
      } else {
        routes.push(
          { route: '広島バス 市内線（上り）', company: '広島バス', color: '#dc2626', dest: '広島駅・八丁堀方面行', via: '中心部幹線経由' },
          { route: '21号/25号 連絡便（上り）', company: '広島バス', color: '#dc2626', dest: '広島駅行', via: '紙屋町経由' }
        );
      }
    } else {
      // 下り（郊外・各終点・車庫方面）
      if (name.includes('吉島') || name.includes('加古町') || name.includes('光南') || name.includes('中島')) {
        routes.push(
          { route: '24号 吉島線（下り）', company: '広島バス', color: '#dc2626', dest: '吉島営業所・吉島病院行', via: '舟入・光南町経由' },
          { route: '50号 東西線（下り）', company: '広島バス', color: '#dc2626', dest: 'アルパーク行', via: '観音新町・舟入南経由' }
        );
      } else if (name.includes('宇品') || name.includes('元宇品') || name.includes('御幸') || name.includes('県病院')) {
        routes.push(
          { route: '21号 宇品線（下り）', company: '広島バス', color: '#dc2626', dest: '広島港・グランドプリンスホテル広島行', via: 'ベイシティ宇品経由' },
          { route: '21-2号線（下り）', company: '広島バス', color: '#dc2626', dest: 'プリンスホテル行', via: '元宇品口経由' }
        );
      } else if (name.includes('草津') || name.includes('庚午') || name.includes('商工センター') || name.includes('井口')) {
        routes.push(
          { route: '25号 草津線（下り）', company: '広島バス', color: '#dc2626', dest: '井口車庫・アルパーク行', via: '庚午・草津南町経由' },
          { route: '50号 東西線（下り）', company: '広島バス', color: '#dc2626', dest: '商工センター車庫行', via: 'アルパーク経由' }
        );
      } else if (name.includes('中山') || name.includes('温品') || name.includes('小河原') || name.includes('戸坂') || name.includes('矢賀')) {
        routes.push(
          { route: '29号 深川線（下り）', company: '広島バス', color: '#dc2626', dest: '小河原車庫行', via: '上温品・地区センター経由' },
          { route: '29号 登り便（下り）', company: '広島バス', color: '#dc2626', dest: '大日原・小河原車庫行', via: '温品バイパス経由' }
        );
      } else if (name.includes('横川') || name.includes('三篠') || name.includes('大芝') || name.includes('三滝')) {
        routes.push(
          { route: '22号 横川・三篠線（下り）', company: '広島バス', color: '#dc2626', dest: '横川駅前・三滝観音行', via: '三篠町経由' },
          { route: '23号 横川線（下り）', company: '広島バス', color: '#dc2626', dest: '横川駅前行', via: '十日市経由' }
        );
      } else {
        routes.push(
          { route: '広島バス 郊外線（下り）', company: '広島バス', color: '#dc2626', dest: '各営業所・車庫行', via: '郊外幹線経由' },
          { route: '循環路線（下り）', company: '広島バス', color: '#dc2626', dest: '終点方面行', via: '地区連絡経由' }
        );
      }
    }
  } else {
    // Hiroden Bus (広電バス)
    if (direction === 'inbound') {
      // 上り（市内中心部・広島バスセンター・広島駅方面）
      if (name.includes('鈴が台') || name.includes('鈴が峰') || name.includes('井口台') || name.includes('井口') || name.includes('草津') || name.includes('庚午') || name.includes('古江') || name.includes('高須') || name.includes('田方') || name.includes('己斐')) {
        routes.push(
          { route: '53号 西広島バイパス線（上り）', company: '広電バス', color: '#16a34a', dest: '広島バスセンター行', via: '古江・舟入・市役所・八丁堀経由' },
          { route: '55号線（上り）', company: '広電バス', color: '#16a34a', dest: '広島駅行', via: '西広島バイパス・市役所前・本通り経由' },
          { route: '井口台パークタウン線（上り）', company: '広電バス', color: '#16a34a', dest: '新井口駅・アルパーク行', via: '井口台中央・鈴が台下経由' },
          { route: '52号線（上り）', company: '広電バス', color: '#16a34a', dest: '広島バスセンター行', via: '己斐・十日市経由' }
        );
      } else if (name.includes('五日市') || name.includes('美鈴が丘') || name.includes('山田団地') || name.includes('藤の木') || name.includes('彩が丘') || name.includes('薬師が丘')) {
        routes.push(
          { route: '美鈴が丘線（上り）', company: '広電バス', color: '#16a34a', dest: '広島バスセンター行', via: '美鈴モール・バイパス・八丁堀経由' },
          { route: '東観音台・五日市線（上り）', company: '広電バス', color: '#16a34a', dest: '五日市駅北口行', via: '波出石・コイン通り経由' },
          { route: '山田団地線（上り）', company: '広電バス', color: '#16a34a', dest: '五日市駅南口行', via: '八幡学校・佐伯区役所経由' }
        );
      } else if (name.includes('八丁堀') || name.includes('紙屋町') || name.includes('バスセンター') || name.includes('本通') || name.includes('県庁前')) {
        routes.push(
          { route: '3号線（上り）', company: '広電バス', color: '#16a34a', dest: '広島駅行', via: '八丁堀・相生通り経由' },
          { route: '2号線（上り）', company: '広電バス', color: '#16a34a', dest: '府中永田・温品車庫行', via: '広島駅・天神川駅北経由' },
          { route: '101号 エキまちループ', company: '広電バス', color: '#0284c7', dest: '市街地循環（左回り）', via: '白神社前・本通経由' }
        );
      } else if (name.includes('呉') || name.includes('広') || name.includes('阿賀') || name.includes('警固屋') || name.includes('音戸') || lat < 34.30) {
        routes.push(
          { route: '呉倉橋島線（上り）', company: '広電バス', color: '#16a34a', dest: '呉駅前行', via: '波多見・音戸渡船口・四道路経由' },
          { route: 'クレアライン（上り）', company: '広電バス', color: '#16a34a', dest: '広島バスセンター行', via: '呉中央・広島呉道路経由' },
          { route: '広・阿賀線（上り）', company: '広電バス', color: '#16a34a', dest: '呉駅前行', via: '新広駅・阿賀海岸通経由' }
        );
      } else if (name.includes('廿日市') || name.includes('阿品') || name.includes('宮島') || lng < 132.33) {
        routes.push(
          { route: '廿日市さくらバス（上り）', company: '広電バス', color: '#16a34a', dest: '廿日市市役所前駅行', via: '宮内串戸・ゆめタウン廿日市経由' },
          { route: '阿品台線（上り）', company: '広電バス', color: '#16a34a', dest: 'ＪＲ阿品駅行', via: '阿品台中央経由' }
        );
      } else if (lat > 34.45) {
        routes.push(
          { route: '72号 可部線（上り）', company: '広島交通', color: '#ea580c', dest: '広島バスセンター行', via: '国道54号・中広町経由' },
          { route: '73号 勝木線（上り）', company: '広島交通', color: '#ea580c', dest: '広島駅行', via: '横川駅前・十日市経由' },
          { route: '70号 高陽線（上り）', company: '広島交通', color: '#ea580c', dest: '広島バスセンター行', via: '基町・紙屋町経由' }
        );
      } else {
        routes.push(
          { route: '広電路線バス（上り）', company: '広電バス', color: '#16a34a', dest: '広島バスセンター行', via: '八丁堀・中心街経由' },
          { route: '市内連絡便（上り）', company: '広電バス', color: '#0284c7', dest: '広島駅南口行', via: '幹線道路経由' }
        );
      }
    } else {
      // 下り（郊外・各団地・車庫・終点方面）
      if (name.includes('鈴が台') || name.includes('鈴が峰') || name.includes('井口台') || name.includes('井口') || name.includes('草津') || name.includes('庚午') || name.includes('古江') || name.includes('高須') || name.includes('田方') || name.includes('己斐')) {
        routes.push(
          { route: '53号 下り便', company: '広電バス', color: '#16a34a', dest: '山田団地・美鈴が丘行', via: '波出石・美鈴モール経由' },
          { route: '55号 下り便', company: '広電バス', color: '#16a34a', dest: '薬師が丘・植物公園行', via: 'バイパス本線・波出石経由' },
          { route: '井口台パークタウン線（下り）', company: '広電バス', color: '#16a34a', dest: '井口台パークタウン行', via: '井口台中央・井口台公園経由' },
          { route: '54号 下り便', company: '広電バス', color: '#16a34a', dest: '彩が丘・藤の木団地行', via: 'バイパス経由' }
        );
      } else if (name.includes('五日市') || name.includes('美鈴が丘') || name.includes('山田団地') || name.includes('藤の木') || name.includes('彩が丘') || name.includes('薬師が丘')) {
        routes.push(
          { route: '美鈴が丘線（下り）', company: '広電バス', color: '#16a34a', dest: '美鈴が丘高校・美鈴モール行', via: '美鈴が丘中央経由' },
          { route: '東観音台線（下り）', company: '広電バス', color: '#16a34a', dest: '東観音台団地行', via: '観音台中央経由' },
          { route: '山田団地線（下り）', company: '広電バス', color: '#16a34a', dest: '山田団地車庫行', via: '山田団地中央経由' },
          { route: 'ジ アウトレット直行便', company: '広電バス', color: '#0284c7', dest: 'ジ アウトレット 広島行', via: 'そらの北経由' }
        );
      } else if (name.includes('八丁堀') || name.includes('紙屋町') || name.includes('バスセンター') || name.includes('本通') || name.includes('県庁前')) {
        routes.push(
          { route: 'こころ・西風新都線（下り）', company: '広電バス', color: '#16a34a', dest: 'こころ産業団地・こころ南行', via: '高速４号線・大塚駅経由' },
          { route: '西広島バイパス線（下り）', company: '広電バス', color: '#16a34a', dest: '五日市・廿日市・山田団地方面行', via: '舟入・古江・波出石経由' },
          { route: '3号線（下り）', company: '広電バス', color: '#16a34a', dest: 'マリーナホップ行', via: '舟入・観音新町経由' }
        );
      } else if (name.includes('呉') || name.includes('広') || name.includes('阿賀') || name.includes('警固屋') || name.includes('音戸') || lat < 34.30) {
        routes.push(
          { route: '呉倉橋島線（下り）', company: '広電バス', color: '#16a34a', dest: '桂浜温泉館・波多見行', via: '警固屋・音戸渡船口経由' },
          { route: '広・阿賀線（下り）', company: '広電バス', color: '#16a34a', dest: '広駅前・東のりば行', via: '阿賀海岸通・新広駅経由' },
          { route: '中央循環線（下り）', company: '広電バス', color: '#0284c7', dest: '呉駅前行（左回り）', via: '四道路・本通・呉市役所経由' }
        );
      } else if (name.includes('廿日市') || name.includes('阿品') || name.includes('宮島') || lng < 132.33) {
        routes.push(
          { route: '廿日市さくらバス（下り）', company: '広電バス', color: '#16a34a', dest: '原・川末・佐伯支所行', via: '宮内・津田経由' },
          { route: '阿品台線（下り）', company: '広電バス', color: '#16a34a', dest: '阿品台車庫・阿品台北行', via: '阿品台中央経由' }
        );
      } else if (lat > 34.45) {
        routes.push(
          { route: '72号 可部線（下り）', company: '広島交通', color: '#ea580c', dest: '桐陽台・安佐営業所行', via: '可部駅前経由' },
          { route: '73号 勝木線（下り）', company: '広島交通', color: '#ea580c', dest: '勝木台上行', via: '可部中央経由' },
          { route: '70号 高陽線（下り）', company: '広島交通', color: '#ea580c', dest: '高陽車庫・高陽C団地行', via: '高陽B団地・深川経由' }
        );
      } else {
        routes.push(
          { route: '広電路線バス（下り）', company: '広電バス', color: '#16a34a', dest: '各住宅団地・車庫行', via: '郊外幹線道路経由' },
          { route: '生活循環バス（下り）', company: '広電バス', color: '#0284c7', dest: '終点連絡行', via: '住宅街経由' }
        );
      }
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
  company: '広電バス' | '広島バス' | '広島交通' | 'JRバス中国';
  operator: 'hiroden' | 'hiroshimabus';
  direction: 'inbound' | 'outbound' | 'terminal' | 'dropoff' | 'both';
  directionLabel: string;
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
  const compName = operator === 'hiroshimabus' ? '広島バス' : '広電バス';

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

    // Determine direction
    let dir: 'inbound' | 'outbound' | 'terminal' | 'dropoff' | 'both' = 'both';
    let dirLabel = 'のりば';

    if (pCode === '降車' || suffix === '999') {
      dir = 'dropoff';
      dirLabel = '降車専用';
    } else if (stopName.includes('広島駅') || stopName.includes('バスセンター') || stopName.includes('アルパーク')) {
      if (pCode) {
        dir = 'terminal';
        dirLabel = `${pCode.endsWith('番') ? pCode : `${pCode}番`}のりば`;
      } else {
        dir = suffix === '1' ? 'inbound' : suffix === '2' ? 'outbound' : 'terminal';
        dirLabel = suffix === '1' ? '上り（市内・広島駅方面）' : suffix === '2' ? '下り（郊外方面）' : 'のりば';
      }
    } else if (suffix === '1') {
      dir = 'inbound';
      dirLabel = '上り（市内・広島駅・バスセンター方面）';
    } else if (suffix === '2') {
      dir = 'outbound';
      dirLabel = '下り（郊外・車庫・各団地方面）';
    } else if (pCode) {
      dir = 'both';
      dirLabel = `${pCode.endsWith('番') ? pCode : `${pCode}番`}のりば`;
    }

    let platformLabel = '';
    if (pCode && pCode !== '降車') {
      const pCodeStr = pCode.endsWith('番') || pCode.endsWith('のりば') ? pCode : `${pCode}番のりば`;
      platformLabel = `${pCodeStr}（${compName}${dir === 'inbound' ? '・上り' : dir === 'outbound' ? '・下り' : ''}）`;
    } else if (pCode === '降車') {
      platformLabel = `降車専用（${compName}）`;
    } else if (suffix === '1') {
      platformLabel = `1番のりば（${compName}・上り/市内方面）`;
    } else if (suffix === '2') {
      platformLabel = `2番のりば（${compName}・下り/郊外方面）`;
    } else {
      platformLabel = `のりば（${compName}）`;
    }

    if (stopDesc) {
      platformLabel = `${stopDesc}（${platformLabel}）`;
    }

    const cleanId = `stop-${prefix}-${stopId.replace(/\s+/g, '-')}`;
    const area = determineArea(stopLat, stopLon, stopName);
    const nameKana = guessKana(stopName);
    const timetable = generateTimetableForStop(stopName, stopLat, stopLon, cleanId, operator, suffix, pCode, dir);

    results.push({
      id: cleanId,
      name: stopName,
      nameKana,
      lat: Number(stopLat.toFixed(6)),
      lng: Number(stopLon.toFixed(6)),
      platform: platformLabel,
      platformCode: pCode || undefined,
      company: compName,
      operator,
      direction: dir,
      directionLabel: dirLabel,
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
