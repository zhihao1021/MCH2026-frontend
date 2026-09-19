import { normalizeRegion } from '../lib/region'
import type { Season } from './seasons'

/**
 * API 完全沒有「季節」欄位，也沒有「地區→適合作物」的對應資料，所以這份表
 * 純粹是前端靜態維護的精選清單（之後可交給營運人員維護或換成 CMS）。
 * 值是 GET /v1/products 的 slug，作物本身的名稱/圖片/分類仍即時向後端拉取，
 * 這份表只決定「清單裡放哪些 slug」。
 *
 * slug 必須存在於後端 GET /v1/products（目前 133 個品項），不存在的會在
 * CropPickerPage 被略過。地區鍵值對齊 GET /v1/markets/regions 回傳的 13 個 region 字串；
 * 每季 5 項，剛好是列表一頁的量。依各地知名產地與產季挑選。
 */
const SEASONAL_CROPS: Record<string, string[]> = {
  '台北市:spring': ['cabbage', 'spinach', 'tomato', 'strawberry', 'bok-choy'],
  '台北市:summer': ['bamboo-shoot', 'watermelon', 'cucumber', 'tomato', 'guava'],
  '台北市:autumn': ['napa-cabbage', 'white-radish', 'carrot', 'spinach', 'pomelo'],
  '台北市:winter': ['cabbage', 'white-radish', 'carrot', 'green-onion', 'mandarin'],

  '新北市:spring': ['pea', 'lettuce', 'cabbage', 'bok-choy', 'mustard-green'],
  '新北市:summer': ['bamboo-shoot', 'watermelon', 'cucumber', 'luffa', 'sweet-corn'],
  '新北市:autumn': ['pomelo', 'sweet-potato', 'water-spinach', 'taro', 'chayote'],
  '新北市:winter': ['sweet-potato', 'white-radish', 'cabbage', 'cauliflower', 'mandarin'],

  '桃園市:spring': ['chinese-chive', 'bamboo-shoot', 'rice', 'lettuce', 'pea'],
  '桃園市:summer': ['peach', 'lotus-root', 'chinese-chive', 'watermelon', 'sweet-corn'],
  '桃園市:autumn': ['persimmon', 'rice', 'sweet-potato', 'chinese-chive', 'pumpkin'],
  '桃園市:winter': ['chinese-chive', 'cabbage', 'white-radish', 'cauliflower', 'mandarin'],

  '宜蘭縣:spring': ['green-onion', 'water-spinach', 'tomato', 'pumpkin', 'cabbage'],
  '宜蘭縣:summer': ['muskmelon', 'green-onion', 'pumpkin', 'water-spinach', 'watermelon'],
  '宜蘭縣:autumn': ['green-onion', 'rice', 'taro', 'cauliflower', 'tomato'],
  '宜蘭縣:winter': ['green-onion', 'tomato', 'cabbage', 'cauliflower', 'mandarin'],

  '台中市:spring': ['rice', 'onion', 'cabbage', 'carrot', 'bok-choy'],
  '台中市:summer': ['watermelon', 'pineapple', 'mango', 'banana', 'pear'],
  '台中市:autumn': ['rice', 'potato', 'napa-cabbage', 'apple', 'taro'],
  '台中市:winter': ['cabbage', 'onion', 'papaya', 'wax-apple', 'mandarin'],

  '彰化縣:spring': ['cauliflower', 'chinese-chive', 'cabbage', 'rose', 'lily'],
  '彰化縣:summer': ['grape', 'guava', 'chinese-chive', 'sweet-corn', 'chrysanthemum'],
  '彰化縣:autumn': ['rice', 'guava', 'cauliflower', 'chrysanthemum', 'gerbera'],
  '彰化縣:winter': ['cauliflower', 'cabbage', 'grape', 'rose', 'carnation'],

  '南投縣:spring': ['water-bamboo', 'bamboo-shoot', 'plum', 'cabbage', 'pea'],
  '南投縣:summer': ['grape', 'peach', 'passion-fruit', 'cabbage', 'bell-pepper'],
  '南投縣:autumn': ['water-bamboo', 'passion-fruit', 'banana', 'persimmon', 'cabbage'],
  '南投縣:winter': ['bamboo-shoot', 'cabbage', 'banana', 'mandarin', 'broccoli'],

  '雲林縣:spring': ['garlic', 'cabbage', 'potato', 'carrot', 'muskmelon'],
  '雲林縣:summer': ['watermelon', 'muskmelon', 'pumpkin', 'sweet-corn', 'bok-choy'],
  '雲林縣:autumn': ['peanut', 'pomelo', 'sweet-potato', 'cabbage', 'rice'],
  '雲林縣:winter': ['cabbage', 'carrot', 'orange', 'potato', 'bok-choy'],

  '嘉義市:spring': ['tomato', 'pineapple', 'cabbage', 'sweet-corn', 'bell-pepper'],
  '嘉義市:summer': ['pineapple', 'mango', 'watermelon', 'sweet-corn', 'bitter-gourd'],
  '嘉義市:autumn': ['tomato', 'sweet-potato', 'pumpkin', 'cauliflower', 'pomelo'],
  '嘉義市:winter': ['tomato', 'cabbage', 'cauliflower', 'bell-pepper', 'white-radish'],

  '台南市:spring': ['burdock', 'pineapple', 'carrot', 'muskmelon', 'sweet-potato'],
  '台南市:summer': ['mango', 'lotus-root', 'longan', 'pineapple', 'watermelon'],
  '台南市:autumn': ['pomelo', 'water-chestnut', 'sweet-potato', 'edamame', 'rice'],
  '台南市:winter': ['carrot', 'cabbage', 'edamame', 'sweet-potato', 'cauliflower'],

  '高雄市:spring': ['guava', 'papaya', 'muskmelon', 'white-radish', 'banana'],
  '高雄市:summer': ['mango', 'pineapple', 'banana', 'papaya', 'sweet-corn'],
  '高雄市:autumn': ['guava', 'banana', 'papaya', 'dragon-fruit', 'sweet-potato'],
  '高雄市:winter': ['white-radish', 'guava', 'wax-apple', 'papaya', 'cauliflower'],

  '花蓮縣:spring': ['bamboo-shoot', 'fern-vegetable', 'chinese-chive', 'rice', 'cabbage'],
  '花蓮縣:summer': ['watermelon', 'rice', 'fern-vegetable', 'pineapple', 'taro'],
  '花蓮縣:autumn': ['pomelo', 'rice', 'taro', 'chinese-chive', 'sweet-potato'],
  '花蓮縣:winter': ['chinese-chive', 'cabbage', 'fern-vegetable', 'white-radish', 'mandarin'],

  '台東縣:spring': ['sugar-apple', 'pineapple', 'papaya', 'cabbage', 'watermelon'],
  '台東縣:summer': ['rice', 'mango', 'sugar-apple', 'pineapple', 'papaya'],
  '台東縣:autumn': ['rice', 'sugar-apple', 'dragon-fruit', 'papaya', 'sweet-potato'],
  '台東縣:winter': ['sugar-apple', 'papaya', 'cabbage', 'white-radish', 'mandarin'],
}

const FALLBACK_LIMIT = 10

/**
 * 地區以後端回傳的字串為準，這裡只是查表；找不到（例如後端新增了這裡還沒維護的地區）
 * 回傳 null，呼叫端退回 listProducts。比對前先正規化「臺／台」。
 */
export function getSeasonalCropSlugs(region: string, season: Season): string[] | null {
  return SEASONAL_CROPS[`${normalizeRegion(region)}:${season}`] ?? null
}

export const SEASONAL_CROPS_FALLBACK_LIMIT = FALLBACK_LIMIT
