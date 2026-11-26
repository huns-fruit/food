# 훈이네과일야채 단구점 · 식자재 주문 (식당·카페 대용량)

소매몰(huns-fruit.github.io)과 같은 가게 정보·같은 Supabase 프로젝트를 쓰는 **식자재 전용 주문 화면**입니다.
정적 파일만으로 동작하며, **`huns-fruit/food` 저장소 → `https://huns-fruit.github.io/food/`** 로 배포합니다.

- 배포 주소: **https://huns-fruit.github.io/food/**
- 배포 저장소: **`huns-fruit/food`** (GitHub Pages, `main` 브랜치 / 루트)

## 색 · 화면 톤

소매몰의 민트(`#2AC1BC`)와 한눈에 구분되도록 식자재몰은 **딥 네이비 · 슬레이트**를 씁니다.

| 쓰는 곳 | 색 |
| --- | --- |
| 기본 강조색 (버튼·담기·활성 탭 밑줄·배지·진행 막대·체크 표시) | `#1E293B` |
| 진한 글자·눌린 상태·맨 위 안내 띠 배경 | `#0F172A` |
| 연한 배경 (지점 배지·안내 박스·선택 표시) | `#E7EDF5` |
| 아주 연한 배경 (상단 소개 그라데이션) | `#F4F7FA` |
| 테두리 (강조 박스) | `#C9D5E3` |
| 브라우저 주소창 색 (`theme-color`) | `#1E293B` |

색은 `css/base.css` 의 `:root` 에 `--brand` · `--brand-d` · `--brand-l` · `--brand-l2` 로 모아 두었습니다. 색을 바꾸려면 이 네 값만 고치면 됩니다.

## 맨 위 안내 띠

`index.html` 의 상품 화면 맨 위(헤더 위)에 식자재 전용몰임을 알리는 띠가 있습니다.

> **식당·카페 대용량 식자재 전용 주문몰** · 가정용 소매는 일반몰을 이용해 주세요

‘일반몰’은 소매몰(https://huns-fruit.github.io/)로 연결됩니다. 띠는 390px 폭에서 한 줄로 들어가고, 그보다 좁은 화면에서는 두 줄로 자연스럽게 줄바꿈되며 가로로 넘치지 않습니다.

## 폴더 구조

```
index.html            손님 화면 (상품 · 장바구니 · 주문서 · 주문 완료 · 약관)
README.md             이 안내문
css/base.css          색·글꼴·리셋 (Pretendard, 식자재몰 색: 딥 네이비 #1E293B)
css/bulk.css          이 화면의 스타일 (모바일 우선 · 맨 위 안내 띠 포함)
js/core.js            가게 정보 · 무통장입금 계좌 · Supabase 호출 · 새 주문 알림(ntfy)
js/catalog.js         식자재 채소 30품목 · 식자재 과일 14품목 (이름·규격·가격)
js/app.js             화면 로직 (탭 · 검색 · 장바구니 · 최소주문금액 · 주문서 · 완료)
assets/img/*.webp     상품 사진 14장 (소매몰 assets/img 에서 같은 품목 사진을 복사)
```

## 배포 (GitHub Pages · `huns-fruit/food`)

1. 저장소 **`huns-fruit/food`** 를 엽니다. (없으면 새로 만듭니다)
2. 이 폴더의 **안쪽 내용 전체**를 저장소 최상위에 올립니다. `index.html`이 저장소 최상위에 있어야 합니다.
   - 웹에서 올릴 때: Add file → Upload files → 이 폴더 안의 파일·폴더를 모두 선택
   - git으로 올릴 때: `git init && git add . && git commit -m "식자재 주문" && git remote add origin <주소> && git push -u origin main`
3. 저장소 → Settings → Pages → Source: **Deploy from a branch** → Branch: `main` / `/ (root)` → Save
4. 1~2분 뒤 **https://huns-fruit.github.io/food/** 로 열립니다.

사진·스크립트·스타일은 모두 **상대 경로**(`css/…`, `js/…`, `assets/img/…`)라서 `huns-fruit.github.io/food/` 처럼 하위 폴더에 올려도 그대로 동작합니다. 절대 경로(`/css/…`)나 도메인이 박힌 주소는 쓰지 않았습니다.

파일을 고쳐 다시 올릴 때는 `index.html` 끝의 `?v=…` 값을 한 번 올려 주세요(예: `20261126-bulk3`). 손님 브라우저가 예전 파일을 계속 쓰는 것을 막습니다.

## 주문이 저장되는 곳

- 소매몰과 **같은 Supabase 프로젝트**의 `retail_orders` 테이블에 INSERT 합니다. (테이블 구조·보안 규칙·DB 함수는 건드리지 않습니다)
- `data` 안에 `channel: "bulk"`, `channelLabel: "식자재(대용량)"` 이 들어갑니다.
- 주문번호는 **`HB` + 날짜 8자리 + `-` + 6자리** (예: `HB20261126-481203`). 소매몰은 `HN`입니다.
- 사장님 화면(`admin.html`)의 ‘오늘 주문’에 그대로 들어오고, 주문번호가 HB로 시작해 소매 주문과 구분됩니다.
- 새 주문 알림은 소매몰과 같은 ntfy 주제로 가되 **제목이 `Hoonie Dangu BULK Order`** 입니다.

## 자주 고치는 곳

| 바꾸고 싶은 것 | 파일 |
| --- | --- |
| 색 (버튼·탭·배지·진행 막대) | `css/base.css` 의 `:root` (`--brand` 계열) |
| 맨 위 안내 띠 문구 | `index.html` 의 `.topbar` |
| 상품 이름·규격·가격·사진 | `js/catalog.js` |
| 최소주문금액 (채소 50,000 / 과일 100,000) | `js/catalog.js` 의 `CATS` |
| 무통장입금 계좌·가게 정보 | `js/core.js` 의 `BANK` · `STORE` |
| 낮 12시 마감 기준·받는 시간 선택지 | `js/app.js` 의 `cutoffPassed()` · `TIMES` |
| 약관·개인정보·배송/환불 문구 | `js/app.js` 의 `POLICIES` |

## 안전

- 비밀번호·관리자 키는 코드에 없습니다. Supabase에는 소매몰과 같은 공개(publishable) 키만 씁니다.
- 손님 화면은 주문을 **넣기만** 하고, 주문 목록을 읽지 않습니다.
- 실제 주문 시험은 하지 않았습니다(사장님 알림이 가지 않도록). 처음 주문을 받을 때 사장님 화면에서 한 번 확인해 주세요.
