/* catalog.js — 식자재(대용량) 상품 목록 · 사진 경로
   상품 이름·규격·가격은 소매몰 js/catalog.js 의 BULK_VEGETABLES · BULK_FRUITS 를 그대로 옮겼습니다.
   사진은 assets/img/*.webp (360x360, 5~14KB) 를 상대 경로로 씁니다. 44품목 모두 사진이 있습니다.
   badge 는 목록 사진 위에 붙는 꼬리표입니다 (인기 · 업소추천). */

var IMG = {
  /* 채소 */
  onion: "assets/img/onion.webp",
  cabbage_green: "assets/img/cabbage_green.webp",
  garlic_peeled: "assets/img/garlic_peeled.webp",
  carrot: "assets/img/carrot.webp",
  daepa: "assets/img/daepa.webp",
  lettuce: "assets/img/lettuce.webp",
  sangchu: "assets/img/sangchu.webp",
  cabbage: "assets/img/cabbage.webp",
  bell_pepper: "assets/img/bell_pepper.webp",
  cheongyang: "assets/img/cheongyang.webp",
  crunch_pepper: "assets/img/crunch_pepper.webp",
  enoki: "assets/img/enoki.webp",
  potato: "assets/img/potato.webp",
  cucumber: "assets/img/cucumber.webp",
  chapchapi: "assets/img/chapchapi.webp",
  sweet_potato: "assets/img/sweet_potato.webp",
  eggplant: "assets/img/eggplant.webp",
  aehobak: "assets/img/aehobak.webp",
  oyster_mushroom: "assets/img/oyster_mushroom.webp",
  baby_cabbage: "assets/img/baby_cabbage.webp",
  chicory: "assets/img/chicory.webp",
  garlic_stem: "assets/img/garlic_stem.webp",
  ground_garlic: "assets/img/ground_garlic.webp",
  ground_ginger: "assets/img/ground_ginger.webp",
  curly_sprouts: "assets/img/curly_sprouts.webp",
  soy_sprouts: "assets/img/soy_sprouts.webp",
  mung_sprouts: "assets/img/mung_sprouts.webp",
  tofu: "assets/img/tofu.webp",
  /* 과일 */
  lemon: "assets/img/lemon.webp",
  grapefruit: "assets/img/grapefruit.webp",
  banana: "assets/img/banana.webp",
  pineapple: "assets/img/pineapple.webp",
  apple: "assets/img/apple.webp",
  persimmon: "assets/img/persimmon.webp",
  tomato: "assets/img/tomato.webp",
  kiwi: "assets/img/kiwi.webp"
};

/* 카테고리 — 최소주문금액은 소매몰 WHOLESALE_MIN 과 같습니다 */
var CATS = {
  veg:   { key: "veg",   label: "식자재 채소", emoji: "🥬", min: 50000,  minText: "50,000원" },
  fruit: { key: "fruit", label: "식자재 과일", emoji: "🍎", min: 100000, minText: "100,000원" }
};

/* 식자재 채소 (BULK_VEGETABLES 30품목) */
var BULK_VEGETABLES = [
  { id: "veg-onion",          name: "양파",             unit: "15kg · 국내산 A급",        price: 23800, img: "onion", badge: "인기" },
  { id: "veg-cabbage-green",  name: "양배추",           unit: "1망",                      price: 7900,  img: "cabbage_green" },
  { id: "veg-garlic",         name: "깐마늘",           unit: "1kg",                      price: 9900,  img: "garlic_peeled", badge: "업소추천" },
  { id: "veg-carrot",         name: "세척당근",         unit: "10kg 1박스 · 중국산",      price: 7900,  img: "carrot" },
  { id: "veg-scallion",       name: "대파",             unit: "1관",                      price: 7900,  img: "daepa", badge: "인기" },
  { id: "veg-lettuce",        name: "양상추",           unit: "12수 1박스",               price: 15000, img: "lettuce", badge: "업소추천" },
  { id: "veg-leaf-lettuce",   name: "상추",             unit: "4kg",                      price: 19800, img: "sangchu" },
  { id: "veg-cabbage",        name: "배추",             unit: "1망 · 55사이즈 중품",      price: 5000,  img: "cabbage" },
  { id: "veg-bell-pepper",    name: "피망",             unit: "1kg",                      price: 9900,  img: "bell_pepper" },
  { id: "veg-hot-pepper",     name: "청양고추",         unit: "1kg",                      price: 7500,  img: "cheongyang" },
  { id: "veg-crunch-pepper",  name: "아삭이고추",       unit: "1kg",                      price: 8000,  img: "crunch_pepper" },
  { id: "veg-enoki",          name: "팽이버섯",         unit: "1박스",                    price: 9900,  img: "enoki" },
  { id: "veg-potato-l",       name: "감자",             unit: "20kg · 대",                price: 20000, img: "potato", badge: "인기" },
  { id: "veg-potato-xl",      name: "감자",             unit: "20kg · 왕특",              price: 36000, img: "potato" },
  { id: "veg-potato-xxl",     name: "감자",             unit: "20kg · 왕왕",              price: 38000, img: "potato" },
  { id: "veg-cucumber",       name: "백오이",           unit: "100개입 1박스",            price: 90000, img: "cucumber", badge: "업소추천" },
  { id: "veg-chapchapi",      name: "찹찹이",           unit: "1kg",                      price: 13000, img: "chapchapi" },
  { id: "veg-sweet-potato",   name: "고구마",           unit: "10kg · 튀김용",            price: 25000, img: "sweet_potato" },
  { id: "veg-eggplant",       name: "가지",             unit: "1박스",                    price: 20000, img: "eggplant" },
  { id: "veg-squash",         name: "애호박",           unit: "20개입 1박스 · 특",        price: 20000, img: "aehobak" },
  { id: "veg-oyster-mushroom",name: "느타리버섯",       unit: "2kg",                      price: 9900,  img: "oyster_mushroom" },
  { id: "veg-baby-cabbage",   name: "알배기",           unit: "1박스 · 상",               price: 15000, img: "baby_cabbage" },
  { id: "veg-chicory",        name: "치커리",           unit: "1박스",                    price: 9900,  img: "chicory" },
  { id: "veg-garlic-stem",    name: "수입마늘쫑",       unit: "1단 · 중국산",             price: 3000,  img: "garlic_stem" },
  { id: "veg-ground-garlic",  name: "간마늘",           unit: "1kg",                      price: 8500,  img: "ground_garlic" },
  { id: "veg-ground-ginger",  name: "간생강",           unit: "1kg",                      price: 11000, img: "ground_ginger" },
  { id: "veg-curly-sprouts",  name: "곱슬이",           unit: "1박스",                    price: 3500,  img: "curly_sprouts" },
  { id: "veg-soy-sprouts",    name: "일자콩나물",       unit: "1박스",                    price: 3500,  img: "soy_sprouts" },
  { id: "veg-mung-sprouts",   name: "숙주",             unit: "1박스",                    price: 5500,  img: "mung_sprouts" },
  { id: "veg-tofu",           name: "강릉심해순두부",   unit: "1kg 식자재용 · 1박스",     price: 18000, img: "tofu" }
];

/* 식자재 과일 (BULK_FRUITS 14품목) */
var BULK_FRUITS = [
  { id: "fruit-lemon",        name: "레몬",             unit: "50개입",                          price: 25000, img: "lemon" },
  { id: "fruit-grapefruit",   name: "자몽",             unit: "25개입",                          price: 37500, img: "grapefruit" },
  { id: "fruit-banana",       name: "바나나",           unit: "12/14발 1박스 · 필리핀/베트남산", price: 14000, img: "banana", badge: "인기" },
  { id: "fruit-pineapple",    name: "골드파인애플",     unit: "6수 1박스",                       price: 43000, img: "pineapple", badge: "업소추천" },
  { id: "fruit-pineapple-b",  name: "골드파인애플",     unit: "7~9수 · B급",                     price: 18000, img: "pineapple" },
  { id: "fruit-apple-3",      name: "안동 사과",        unit: "20kg · 상 3번",                   price: 40000, img: "apple" },
  { id: "fruit-apple-56",     name: "안동 사과",        unit: "20kg · 특 5~6번",                 price: 70000, img: "apple", badge: "업소추천" },
  { id: "fruit-persimmon-6",  name: "단감",             unit: "10kg · 6다이",                    price: 20000, img: "persimmon" },
  { id: "fruit-persimmon-5",  name: "단감",             unit: "10kg · 5다이",                    price: 25000, img: "persimmon" },
  { id: "fruit-tomato-23",    name: "완숙 토마토",      unit: "5kg · 2~3번",                     price: 6900,  img: "tomato", desc: "시기상 A급이 아닙니다" },
  { id: "fruit-tomato-1",     name: "완숙 토마토",      unit: "5kg · 1번",                       price: 15000, img: "tomato", desc: "시기상 A급이 아닙니다", badge: "인기" },
  { id: "fruit-kiwi",         name: "골드키위",         unit: "5kg · 국내산",                    price: 20000, img: "kiwi",   desc: "조금 익은 상품" },
  { id: "fruit-bansee-m",     name: "반시",             unit: "5kg · M",                         price: 8500,  img: "persimmon" },
  { id: "fruit-bansee-s",     name: "반시",             unit: "5kg · S",                         price: 7000,  img: "persimmon" }
];

/* 화면에서 쓰는 한 벌 목록 (cat 키를 붙여 둡니다) */
var PRODUCTS = [];
BULK_VEGETABLES.forEach(function(p){ p.cat = "veg"; PRODUCTS.push(p); });
BULK_FRUITS.forEach(function(p){ p.cat = "fruit"; PRODUCTS.push(p); });
