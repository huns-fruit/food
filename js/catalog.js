/* catalog.js — 식자재(대용량) 상품 목록 · 사진 경로
   상품 이름·규격·가격은 소매몰 js/catalog.js 의 BULK_VEGETABLES · BULK_FRUITS 를 그대로 옮겼습니다.
   사진은 소매몰 assets/img/*.webp 중 같은 품목 사진을 복사해 상대 경로로 씁니다. */

var IMG = {
  onion: "assets/img/onion.webp",
  daepa: "assets/img/daepa.webp",
  lettuce: "assets/img/lettuce.webp",
  sangchu: "assets/img/sangchu.webp",
  cabbage: "assets/img/cabbage.webp",
  cheongyang: "assets/img/cheongyang.webp",
  potato: "assets/img/potato.webp",
  aehobak: "assets/img/aehobak.webp",
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
  { id: "veg-onion",          name: "양파",             unit: "15kg · 국내산 A급",        price: 23800, img: "onion" },
  { id: "veg-cabbage-green",  name: "양배추",           unit: "1망",                      price: 7900,  emoji: "🥬" },
  { id: "veg-garlic",         name: "깐마늘",           unit: "1kg",                      price: 9900,  emoji: "🧄" },
  { id: "veg-carrot",         name: "세척당근",         unit: "10kg 1박스 · 중국산",      price: 7900,  emoji: "🥕" },
  { id: "veg-scallion",       name: "대파",             unit: "1관",                      price: 7900,  img: "daepa" },
  { id: "veg-lettuce",        name: "양상추",           unit: "12수 1박스",               price: 15000, img: "lettuce" },
  { id: "veg-leaf-lettuce",   name: "상추",             unit: "4kg",                      price: 19800, img: "sangchu" },
  { id: "veg-cabbage",        name: "배추",             unit: "1망 · 55사이즈 중품",      price: 5000,  img: "cabbage" },
  { id: "veg-bell-pepper",    name: "피망",             unit: "1kg",                      price: 9900,  emoji: "🫑" },
  { id: "veg-hot-pepper",     name: "청양고추",         unit: "1kg",                      price: 7500,  img: "cheongyang" },
  { id: "veg-crunch-pepper",  name: "아삭이고추",       unit: "1kg",                      price: 8000,  emoji: "🌶️" },
  { id: "veg-enoki",          name: "팽이버섯",         unit: "1박스",                    price: 9900,  emoji: "🍄" },
  { id: "veg-potato-l",       name: "감자",             unit: "20kg · 대",                price: 20000, img: "potato" },
  { id: "veg-potato-xl",      name: "감자",             unit: "20kg · 왕특",              price: 36000, img: "potato" },
  { id: "veg-potato-xxl",     name: "감자",             unit: "20kg · 왕왕",              price: 38000, img: "potato" },
  { id: "veg-cucumber",       name: "백오이",           unit: "100개입 1박스",            price: 90000, emoji: "🥒" },
  { id: "veg-chapchapi",      name: "찹찹이",           unit: "1kg",                      price: 13000, emoji: "🥬" },
  { id: "veg-sweet-potato",   name: "고구마",           unit: "10kg · 튀김용",            price: 25000, emoji: "🍠" },
  { id: "veg-eggplant",       name: "가지",             unit: "1박스",                    price: 20000, emoji: "🍆" },
  { id: "veg-squash",         name: "애호박",           unit: "20개입 1박스 · 특",        price: 20000, img: "aehobak" },
  { id: "veg-oyster-mushroom",name: "느타리버섯",       unit: "2kg",                      price: 9900,  emoji: "🍄" },
  { id: "veg-baby-cabbage",   name: "알배기",           unit: "1박스 · 상",               price: 15000, emoji: "🥬" },
  { id: "veg-chicory",        name: "치커리",           unit: "1박스",                    price: 9900,  emoji: "🥬" },
  { id: "veg-garlic-stem",    name: "수입마늘쫑",       unit: "1단 · 중국산",             price: 3000,  emoji: "🌱" },
  { id: "veg-ground-garlic",  name: "간마늘",           unit: "1kg",                      price: 8500,  emoji: "🧄" },
  { id: "veg-ground-ginger",  name: "간생강",           unit: "1kg",                      price: 11000, emoji: "🫚" },
  { id: "veg-curly-sprouts",  name: "곱슬이",           unit: "1박스",                    price: 3500,  emoji: "🌱" },
  { id: "veg-soy-sprouts",    name: "일자콩나물",       unit: "1박스",                    price: 3500,  emoji: "🌱" },
  { id: "veg-mung-sprouts",   name: "숙주",             unit: "1박스",                    price: 5500,  emoji: "🌱" },
  { id: "veg-tofu",           name: "강릉심해순두부",   unit: "1kg 식자재용 · 1박스",     price: 18000, emoji: "🍲" }
];

/* 식자재 과일 (BULK_FRUITS 14품목) */
var BULK_FRUITS = [
  { id: "fruit-lemon",        name: "레몬",             unit: "50개입",                          price: 25000, emoji: "🍋" },
  { id: "fruit-grapefruit",   name: "자몽",             unit: "25개입",                          price: 37500, emoji: "🍊" },
  { id: "fruit-banana",       name: "바나나",           unit: "12/14발 1박스 · 필리핀/베트남산", price: 14000, img: "banana" },
  { id: "fruit-pineapple",    name: "골드파인애플",     unit: "6수 1박스",                       price: 43000, img: "pineapple" },
  { id: "fruit-pineapple-b",  name: "골드파인애플",     unit: "7~9수 · B급",                     price: 18000, img: "pineapple" },
  { id: "fruit-apple-3",      name: "안동 사과",        unit: "20kg · 상 3번",                   price: 40000, img: "apple" },
  { id: "fruit-apple-56",     name: "안동 사과",        unit: "20kg · 특 5~6번",                 price: 70000, img: "apple" },
  { id: "fruit-persimmon-6",  name: "단감",             unit: "10kg · 6다이",                    price: 20000, img: "persimmon" },
  { id: "fruit-persimmon-5",  name: "단감",             unit: "10kg · 5다이",                    price: 25000, img: "persimmon" },
  { id: "fruit-tomato-23",    name: "완숙 토마토",      unit: "5kg · 2~3번",                     price: 6900,  img: "tomato", desc: "시기상 A급이 아닙니다" },
  { id: "fruit-tomato-1",     name: "완숙 토마토",      unit: "5kg · 1번",                       price: 15000, img: "tomato", desc: "시기상 A급이 아닙니다" },
  { id: "fruit-kiwi",         name: "골드키위",         unit: "5kg · 국내산",                    price: 20000, img: "kiwi",   desc: "조금 익은 상품" },
  { id: "fruit-bansee-m",     name: "반시",             unit: "5kg · M",                         price: 8500,  img: "persimmon" },
  { id: "fruit-bansee-s",     name: "반시",             unit: "5kg · S",                         price: 7000,  img: "persimmon" }
];

/* 화면에서 쓰는 한 벌 목록 (cat 키를 붙여 둡니다) */
var PRODUCTS = [];
BULK_VEGETABLES.forEach(function(p){ p.cat = "veg"; PRODUCTS.push(p); });
BULK_FRUITS.forEach(function(p){ p.cat = "fruit"; PRODUCTS.push(p); });
