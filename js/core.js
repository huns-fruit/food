/* core.js — 가게 정보 · 무통장입금 계좌 · 공용 저장소(Supabase) · 공용 도우미
   소매몰(huns-fruit.github.io)의 js/core.js · js/shop.js 와 같은 가게 정보·같은 Supabase 프로젝트를 씁니다.
   로그인 정보나 관리자 키는 넣지 않습니다. 손님 화면은 주문을 '넣기'만 합니다. */

var STORE = {
  name: "훈이네과일야채",
  branch: "단구점",
  addr: "강원특별자치도 원주시 단구로 398, 단관청솔3차아파트 상가동2동 1층 101호 (단구동)",
  tel: "033-765-1531",
  cs: "010-9142-1531",
  email: "hhh3350@naver.com",
  owner: "황관훈",
  biz: "421-28-01608",
  mailorder: "제 2026-강원원주-02474 호"
};

/* 무통장입금 계좌 — 소매몰과 같은 계좌(사장님 확인) */
var BANK = { bank: "NH농협은행", no: "302-1803-5017-81", holder: "황관훈" };

/* ── 공용 저장소 (소매몰과 같은 Supabase 프로젝트 · 같은 테이블) ── */
var SB_URL = "https://hiulxicbowkffoxjtvye.supabase.co";
var SB_KEY = "sb_publishable_89p69vS6pSVQBJfImjKMrw__mvxKVg3";
var SB_ORDERS = "retail_orders";
var ORDER_PREFIX = "HB";            /* 소매몰은 HN — 식자재 주문은 HB 로 구분합니다 */
var CHANNEL = "bulk";

/* 새 주문을 사장님 폰으로 푸시 (소매몰과 같은 ntfy 주제) */
var NTFY_URL = "https://ntfy.sh/hoonie-dangu-order-914288";

function isoAt(ts){ return new Date(ts || Date.now()).toISOString(); }

function sbOn(){
  return !!(window.fetch && window.JSON && /^https?:$/.test(location.protocol));
}
function sbCall(path, opt){
  opt = opt || {};
  opt.headers = {
    "apikey": SB_KEY,
    "Authorization": "Bearer " + SB_KEY,
    "Content-Type": "application/json"
  };
  if (opt.headersExtra) { for (var k in opt.headersExtra) opt.headers[k] = opt.headersExtra[k]; }
  return fetch(SB_URL + "/rest/v1/" + path, opt).then(function(r){
    if (!r.ok) throw new Error("supabase " + r.status);
    if (r.status === 204) return null;
    var ct = r.headers.get("content-type") || "";
    return ct.indexOf("json") > -1 ? r.json() : null;
  });
}

/* ── 화면 도우미 ── */
function $(sel, root){ return (root || document).querySelector(sel); }
function $$(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function money(n){ return Number(n || 0).toLocaleString("ko-KR"); }
function esc(s){
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function byId(id){
  for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
  return null;
}

var toastTimer = null;
function toast(msg){
  var t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove("on"); }, 2200);
}

/* ── 주문 상태 ──
   소매몰 사장님 페이지(admin.html)가 읽는 규칙과 같습니다. status 가 없으면 'received'(새 주문). */
function oStatus(o){
  var st = o && o.status;
  if (st === "preparing") return (o.mode === "pickup") ? "ready" : "delivering";
  return st || "received";
}

/* ── 주문을 공용 DB에 올리기 ──
   소매몰 pushOrder 와 같은 방식입니다: retail_orders 테이블에 넣기만 합니다(조회는 하지 않습니다).
   통신이 안 되면 false 를 돌려주고, 주문 흐름은 그대로 이어집니다. */
function pushOrder(o){
  if (!sbOn()) return Promise.resolve(false);
  return sbCall(SB_ORDERS, {
    method: "POST",
    headersExtra: { "Prefer": "return=minimal" },
    body: JSON.stringify([{
      id: o.no, data: o, status: oStatus(o),
      created_at: isoAt(o.at),
      updated_at: isoAt()
    }])
  }).then(function(){ return true; }).catch(function(){ return false; });
}

/* ── 새 주문 알림 (ntfy) ──
   소매몰 사장님이 구독하는 같은 주제로 보내되, 제목에 Bulk 를 넣어 소매 주문과 구분합니다.
   실패해도 주문 접수는 그대로입니다. */
function pushNewOrderAlert(ord){
  try {
    if (!ord || !window.fetch) return;
    var body = "식자재 주문 · " + ord.no + " · " + (ord.shopName || ord.name || "")
      + " · " + money(ord.total) + "원 · 받는 날 " + (ord.slotLabel || "");
    fetch(NTFY_URL, {
      method: "POST",
      headers: {
        "Title": "Hoonie Dangu BULK Order",   /* ntfy 제목 헤더는 ASCII 만 됩니다 */
        "Priority": "high",
        "Tags": "bell,package"
      },
      body: body
    }).catch(function(){});
  } catch (e) {}     /* 알림 실패가 주문을 막지 않습니다 */
}

/* ── 계좌번호 복사 ── */
function copyText(text, okMsg){
  function done(){ toast(okMsg || "복사했어요"); }
  function fallback(){
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    } catch (e) { toast(text); }
  }
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(fallback);
  } else fallback();
}

/* ── 무통장입금 계좌 박스 ── */
function bankBoxHtml(total){
  return '<div class="bankbox">'
    + '<div class="bbt"><span class="bbi">🏦</span>무통장입금 계좌</div>'
    + '<div class="bbno"><b>' + esc(BANK.bank) + '</b>' + esc(BANK.no) + '</div>'
    + '<div class="bbh">예금주: ' + esc(BANK.holder) + '</div>'
    + '<div class="bbwarn">입금이 확인된 후 상품을 준비해 배달을 출발합니다.</div>'
    + '<button type="button" class="bbcopy" data-copy-account>📋 계좌번호 복사</button>'
    + (total
        ? '<p class="bbnote">입금하실 금액: <b>' + money(total) + '원</b> · 입금자명을 상호(가게 이름)와 같게 적어 주세요.</p>'
        : '<p class="bbnote">입금자명을 상호(가게 이름)와 같게 적어 주세요.</p>')
    + '</div>';
}
