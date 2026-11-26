/* catalog.js — 식자재(대용량) 상품 목록 · 사진 경로
   기존 44품목(채소 30 · 과일 14)은 이름·규격 중량·가격을 그대로 두고,
   2026-11-26 에 업소용 식자재 도매몰(강서시장·급식 납품) 기준으로 품목을 크게 늘렸습니다.
   사진은 assets/img/*.webp (360x360, 5~14KB) 를 상대 경로로 씁니다.
   사진이 있는 36종은 사진을, 나머지는 품목별 색 타일 + 이모지 썸네일로 보여 줍니다 (404 없음).
   모든 unit 은 실제 거래 중량(kg) 또는 개수·수(개입)를 함께 적었습니다.
   가격은 2026-11 말 도매 참고 시세로 채운 임시 가격입니다. */

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

/* 식자재 채소 — 기존 30품목 + 신규 44품목 = 74품목 */
var BULK_VEGETABLES = [
  /* ── 기존 품목 (중량·개입만 보기 쉽게 덧붙임) ── */
  { id: "veg-onion",          name: "양파",             unit: "15kg · 국내산 A급",        price: 23800, img: "onion", badge: "인기" },
  { id: "veg-cabbage-green",  name: "양배추",           unit: "1망 · 3입 약 7kg",         price: 7900,  img: "cabbage_green" },
  { id: "veg-garlic",         name: "깐마늘",           unit: "1kg",                      price: 9900,  img: "garlic_peeled", badge: "업소추천" },
  { id: "veg-carrot",         name: "세척당근",         unit: "10kg 1박스 · 중국산",      price: 7900,  img: "carrot" },
  { id: "veg-scallion",       name: "대파",             unit: "1관 · 약 4kg",             price: 7900,  img: "daepa", badge: "인기" },
  { id: "veg-lettuce",        name: "양상추",           unit: "12수 1박스 · 약 6kg",      price: 15000, img: "lettuce", badge: "업소추천" },
  { id: "veg-leaf-lettuce",   name: "상추",             unit: "4kg (1박스)",              price: 19800, img: "sangchu" },
  { id: "veg-leaf-lettuce-2", name: "상추",             unit: "2kg (1박스)",              price: 10500, img: "sangchu", badge: "인기" },
  { id: "veg-cabbage",        name: "배추",             unit: "1망 · 3입 약 6kg (55사이즈 중품)", price: 5000, img: "cabbage" },
  { id: "veg-bell-pepper",    name: "피망",             unit: "1kg",                      price: 9900,  img: "bell_pepper" },
  { id: "veg-hot-pepper",     name: "청양고추",         unit: "1kg",                      price: 7500,  img: "cheongyang" },
  { id: "veg-crunch-pepper",  name: "아삭이고추",       unit: "1kg",                      price: 8000,  img: "crunch_pepper" },
  { id: "veg-enoki",          name: "팽이버섯",         unit: "1박스 · 30봉 약 4.5kg",    price: 9900,  img: "enoki" },
  { id: "veg-potato-l",       name: "감자",             unit: "20kg · 대",                price: 20000, img: "potato", badge: "인기" },
  { id: "veg-potato-xl",      name: "감자",             unit: "20kg · 왕특",              price: 36000, img: "potato" },
  { id: "veg-potato-xxl",     name: "감자",             unit: "20kg · 왕왕",              price: 38000, img: "potato" },
  { id: "veg-cucumber",       name: "백오이",           unit: "100개입 1박스",            price: 90000, img: "cucumber", badge: "업소추천" },
  { id: "veg-chapchapi",      name: "찹찹이",           unit: "1kg",                      price: 13000, img: "chapchapi" },
  { id: "veg-sweet-potato",   name: "고구마",           unit: "10kg · 튀김용",            price: 25000, img: "sweet_potato" },
  { id: "veg-eggplant",       name: "가지",             unit: "1박스 · 10kg",             price: 20000, img: "eggplant" },
  { id: "veg-squash",         name: "애호박",           unit: "20개입 1박스 · 약 6kg · 특", price: 20000, img: "aehobak" },
  { id: "veg-oyster-mushroom",name: "느타리버섯",       unit: "2kg",                      price: 9900,  img: "oyster_mushroom" },
  { id: "veg-baby-cabbage",   name: "알배기",           unit: "1박스 · 8kg · 상",         price: 15000, img: "baby_cabbage" },
  { id: "veg-chicory",        name: "치커리",           unit: "1박스 · 2kg",              price: 9900,  img: "chicory" },
  { id: "veg-garlic-stem",    name: "수입마늘쫑",       unit: "1단 · 약 1kg · 중국산",    price: 3000,  img: "garlic_stem" },
  { id: "veg-ground-garlic",  name: "간마늘",           unit: "1kg",                      price: 8500,  img: "ground_garlic" },
  { id: "veg-ground-ginger",  name: "간생강",           unit: "1kg",                      price: 11000, img: "ground_ginger" },
  { id: "veg-curly-sprouts",  name: "곱슬이",           unit: "1박스 · 약 4kg",           price: 3500,  img: "curly_sprouts" },
  { id: "veg-soy-sprouts",    name: "일자콩나물",       unit: "1박스 · 약 4.5kg",         price: 3500,  img: "soy_sprouts" },
  { id: "veg-mung-sprouts",   name: "숙주",             unit: "1박스 · 약 4kg",           price: 5500,  img: "mung_sprouts" },
  { id: "veg-tofu",           name: "강릉심해순두부",   unit: "1kg 식자재용 · 1박스",     price: 18000, img: "tofu" },

  /* ── 신규: 잎 · 쌈 · 샐러드 ── */
  { id: "veg-perilla",        name: "깻잎",             unit: "1kg",                      price: 12000, emoji: "🍃", badge: "인기" },
  { id: "veg-chive-500",      name: "부추",             unit: "1단 · 500g",               price: 2500,  emoji: "🌿" },
  { id: "veg-chive-box",      name: "부추",             unit: "1박스 · 4kg",              price: 18000, emoji: "🌿" },
  { id: "veg-spinach-bunch",  name: "시금치",           unit: "1단 · 400g",               price: 2800,  emoji: "🥬" },
  { id: "veg-spinach-box",    name: "시금치",           unit: "1박스 · 4kg",              price: 24000, emoji: "🥬" },
  { id: "veg-garland",        name: "쑥갓",             unit: "1단 · 300g",               price: 2200,  emoji: "🌿" },
  { id: "veg-water-dropwort", name: "미나리",           unit: "1단 · 500g",               price: 3000,  emoji: "🌿" },
  { id: "veg-eolgari",        name: "얼갈이배추",       unit: "1단 · 800g",               price: 2500,  emoji: "🥬" },
  { id: "veg-yeolmu",         name: "열무",             unit: "1단 · 1kg",                price: 3000,  emoji: "🥬" },
  { id: "veg-bokchoy",        name: "청경채",           unit: "1박스 · 2kg",              price: 8000,  emoji: "🥬" },
  { id: "veg-romaine",        name: "로메인",           unit: "1박스 · 2kg",              price: 11000, emoji: "🥬" },
  { id: "veg-kale",           name: "케일",             unit: "1kg",                      price: 6500,  emoji: "🥬" },
  { id: "veg-vitamin",        name: "비타민",           unit: "1kg",                      price: 5500,  emoji: "🌱" },
  { id: "veg-red-cabbage",    name: "적양배추",         unit: "1박스 · 10kg",             price: 13000, emoji: "🥬" },
  { id: "veg-musun",          name: "무순",             unit: "1박스 · 약 1kg",           price: 9000,  emoji: "🌱" },
  { id: "veg-parsley",        name: "파슬리",           unit: "500g",                     price: 4500,  emoji: "🌿" },
  { id: "veg-broccoli",       name: "브로콜리",         unit: "1박스 · 8kg",              price: 21000, emoji: "🥦", badge: "업소추천" },
  { id: "veg-cauliflower",    name: "콜리플라워",       unit: "1박스 · 8kg",              price: 20000, emoji: "🥦" },
  { id: "veg-celery",         name: "셀러리",           unit: "1박스 · 10kg",             price: 13000, emoji: "🌿" },

  /* ── 신규: 뿌리 · 파 · 고추 · 향신 ── */
  { id: "veg-radish",         name: "무",               unit: "1박스 · 20kg",             price: 16000, emoji: "🥕", badge: "인기" },
  { id: "veg-garlic-whole-1", name: "통마늘",           unit: "1망 · 1kg",                price: 12000, emoji: "🧄" },
  { id: "veg-garlic-whole-5", name: "통마늘",           unit: "1망 · 5kg",                price: 56000, emoji: "🧄" },
  { id: "veg-chives",         name: "쪽파",             unit: "1단 · 약 1kg",             price: 3000,  emoji: "🌿" },
  { id: "veg-red-pepper",     name: "홍고추",           unit: "1kg",                      price: 9000,  emoji: "🌶️" },
  { id: "veg-ggari-pepper",   name: "꽈리고추",         unit: "1kg",                      price: 8500,  emoji: "🌶️" },
  { id: "veg-paprika-red",    name: "파프리카 (적)",    unit: "1박스 · 5kg",              price: 32000, emoji: "🫑" },
  { id: "veg-paprika-yellow", name: "파프리카 (황)",    unit: "1박스 · 5kg",              price: 33000, emoji: "🫑" },
  { id: "veg-red-onion",      name: "적양파",           unit: "1망 · 15kg",               price: 19000, emoji: "🧅" },
  { id: "veg-onion-peeled",   name: "깐양파",           unit: "1박스 · 10kg",             price: 17000, emoji: "🧅" },
  { id: "veg-lotus-root",     name: "연근",             unit: "1박스 · 2kg",              price: 9000,  emoji: "🪷" },
  { id: "veg-burdock",        name: "우엉",             unit: "1박스 · 2kg",              price: 8000,  emoji: "🥕" },
  { id: "veg-beet",           name: "비트",             unit: "1박스 · 5kg",              price: 9000,  emoji: "🍠" },

  /* ── 신규: 버섯 · 열매 · 두부 · 나물 ── */
  { id: "veg-king-oyster",    name: "새송이버섯",       unit: "1박스 · 2kg",              price: 8500,  emoji: "🍄", badge: "업소추천" },
  { id: "veg-shiitake",       name: "표고버섯",         unit: "1kg",                      price: 12000, emoji: "🍄" },
  { id: "veg-button-mushroom",name: "양송이버섯",       unit: "1kg",                      price: 9500,  emoji: "🍄" },
  { id: "veg-wood-ear",       name: "목이버섯 (건)",    unit: "1kg",                      price: 16000, emoji: "🍄" },
  { id: "veg-buna-shimeji",   name: "만가닥버섯",       unit: "1박스 · 2kg",              price: 7000,  emoji: "🍄" },
  { id: "veg-sweet-pumpkin",  name: "단호박",           unit: "1박스 · 10kg",             price: 22000, emoji: "🎃" },
  { id: "veg-zucchini",       name: "쥬키니호박",       unit: "1박스 · 10kg",             price: 12000, emoji: "🥒" },
  { id: "veg-cucumber-chwi",  name: "취청오이",         unit: "50개입 1박스",             price: 32000, emoji: "🥒", badge: "업소추천" },
  { id: "veg-cherry-tomato",  name: "대추방울토마토",   unit: "1박스 · 2kg",              price: 12000, emoji: "🍅" },
  { id: "veg-tofu-pan",       name: "판두부",           unit: "1판 · 3kg",                price: 6500,  emoji: "⬜" },
  { id: "veg-gosari",         name: "고사리 (삶은)",    unit: "1kg",                      price: 11000, emoji: "🌿" }
];

/* 식자재 과일 — 기존 14품목 + 신규 11품목 = 25품목 */
var BULK_FRUITS = [
  /* ── 기존 품목 ── */
  { id: "fruit-lemon",        name: "레몬",             unit: "50개입",                          price: 25000, img: "lemon" },
  { id: "fruit-grapefruit",   name: "자몽",             unit: "25개입",                          price: 37500, img: "grapefruit" },
  { id: "fruit-banana",       name: "바나나",           unit: "12/14발 1박스 · 약 13kg · 필리핀/베트남산", price: 28000, img: "banana", badge: "인기" },
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
  { id: "fruit-bansee-s",     name: "반시",             unit: "5kg · S",                         price: 7000,  img: "persimmon" },

  /* ── 신규 ── */
  { id: "fruit-orange",       name: "오렌지",           unit: "1박스 · 18kg",             price: 69000, emoji: "🍊" },
  { id: "fruit-lime",         name: "라임",             unit: "36개입",                   price: 18000, emoji: "🍋" },
  { id: "fruit-green-grape",  name: "청포도",           unit: "1박스 · 2kg",              price: 16000, emoji: "🍇" },
  { id: "fruit-shine-muscat", name: "샤인머스캣",       unit: "1박스 · 2kg",              price: 28000, emoji: "🍇", badge: "업소추천" },
  { id: "fruit-blueberry",    name: "블루베리 (냉동)",  unit: "1kg",                      price: 9500,  emoji: "🫐", desc: "스무디·디저트용" },
  { id: "fruit-avocado",      name: "아보카도",         unit: "5.5kg · 25과 1박스",       price: 47000, emoji: "🥑" },
  { id: "fruit-strawberry",   name: "딸기 (업소용)",    unit: "1박스 · 2kg",              price: 39000, emoji: "🍓", desc: "겨울 시즌 · 디저트용" },
  { id: "fruit-mandarin",     name: "감귤 (조생)",      unit: "1박스 · 10kg",             price: 18000, emoji: "🍊" },
  { id: "fruit-pear",         name: "신고배",           unit: "15kg 1박스",               price: 45000, emoji: "🍐" },
  { id: "fruit-melon",        name: "메론",             unit: "4수 1박스",                price: 28000, emoji: "🍈" },
  { id: "fruit-watermelon",   name: "수박",             unit: "1통 · 약 8kg",             price: 19000, emoji: "🍉" }
];

/* 화면에서 쓰는 한 벌 목록 (cat 키를 붙여 둡니다) */
var PRODUCTS = [];
BULK_VEGETABLES.forEach(function(p){ p.cat = "veg"; PRODUCTS.push(p); });
BULK_FRUITS.forEach(function(p){ p.cat = "fruit"; PRODUCTS.push(p); });
