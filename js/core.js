/* core.js — 가게 정보 · 무통장입금 계좌 · 공용 저장소(Supabase) · 공용 도우미
   소매몰(huns-fruit.github.io)과 같은 Supabase 프로젝트를 쓰되, 테이블은 식자재 전용(bulk_*)만 씁니다.
   소매몰 테이블(retail_orders 등)은 읽지도 쓰지도 않습니다.
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

/* ── 공용 저장소 (소매몰과 같은 Supabase 프로젝트 · 식자재 전용 테이블) ── */
var SB_URL = "https://hiulxicbowkffoxjtvye.supabase.co";
var SB_KEY = "sb_publishable_89p69vS6pSVQBJfImjKMrw__mvxKVg3";
var SB_ORDERS = "bulk_orders";        /* 식자재 전용 주문 테이블 (소매몰 retail_orders 와 별개) */
var SB_BLOCKED = "bulk_blocked_biz";  /* 사장님이 등록한 이용 제한 사업자 */
var ORDER_PREFIX = "HB";            /* 소매몰은 HN — 식자재 주문은 HB 로 구분합니다 */
var CHANNEL = "bulk";

/* 새 주문을 사장님 폰으로 푸시 — 소매몰(hoonie-dangu-order-914288)과 다른, 식자재 전용 주제 */
var NTFY_URL = "https://ntfy.sh/hoonie-dangu-bulk-914288";
var NTFY_TOPIC = "hoonie-dangu-bulk-914288";

/* ── 이용 제한 사업자 (이 파일에 적어 두는 기본 명단) ──
   사업자등록번호 10자리를 하이픈 없이 적습니다. 예) "1234567890"
   여기에 적힌 번호는 입장 게이트와 주문이 모두 막힙니다. 비어 있으면 제한 없음.
   사장님이 사장님 페이지에서 등록한 번호는 DB(bulk_blocked_biz)에 쌓이고
   checkBizBlocked() 가 이 명단과 함께 확인합니다. */
var BLOCKED_BIZ = [];

function isoAt(ts){ return new Date(ts || Date.now()).toISOString(); }

function sbOn(){
  return !!(window.fetch && window.JSON && /^https?:$/.test(location.protocol));
}

/* 로그인한 사장님의 access_token — 없으면 anon 키(손님 화면)로 동작합니다 */
var sbToken = null;
var sbAuthFail = null;          /* 401·403 이 났을 때 부를 함수 (admin.js 가 연결) */
function sbSetToken(t){ sbToken = t || null; }

function sbHead(extra){
  var h = { "apikey": SB_KEY, "Authorization": "Bearer " + (sbToken || SB_KEY), "Content-Type": "application/json" };
  if (extra) for (var k in extra) h[k] = extra[k];
  return h;
}
function sbCall(path, opt){
  opt = opt || {};
  /* headersExtra 는 예전 이름 — 둘 다 받아 준다 */
  opt.headers = sbHead(opt.headersExtra || opt.headers);
  return fetch(SB_URL + "/rest/v1/" + path, opt).then(function(r){
    if (!r.ok){
      if ((r.status === 401 || r.status === 403) && sbAuthFail){ try { sbAuthFail(r.status); } catch(e){} }
      var err = new Error("supabase " + r.status);
      err.status = r.status;
      throw err;
    }
    if (r.status === 204) return null;
    var ct = r.headers.get("content-type") || "";
    return ct.indexOf("json") > -1 ? r.json() : null;
  });
}

/* DB 함수(RPC) 호출 — 손님 화면은 로그인 없이 이것만 씁니다 */
function sbRpc(fn, args){
  return sbCall("rpc/" + fn, { method: "POST", body: JSON.stringify(args || {}) });
}

/* ── 이용 제한 확인 ──
   이 파일의 BLOCKED_BIZ(즉시 판정)와 DB(bulk_blocked_biz, RPC is_bulk_biz_blocked)를 함께 봅니다.
   DB 확인은 통신이 안 되면 '차단 아님'으로 두어 손님 주문을 막지 않습니다. */
function checkBizBlocked(bizNo){
  var d = String(bizNo == null ? "" : bizNo).replace(/[^0-9]/g, "");
  if (d.length !== 10) return Promise.resolve(false);
  var local = false;
  for (var i = 0; i < BLOCKED_BIZ.length; i++){
    if (String(BLOCKED_BIZ[i]).replace(/[^0-9]/g, "") === d) local = true;
  }
  if (local) return Promise.resolve(true);
  if (!sbOn()) return Promise.resolve(false);
  return sbRpc("is_bulk_biz_blocked", { p_biz_no: d }).then(function(v){
    return v === true;
  }).catch(function(){ return false; });
}

/* ── 사장님 로그인 (Supabase Auth) ─────────────────────────
   아이디·비밀번호는 코드에 넣지 않는다. 화면에서 입력받아 Supabase 에 확인하고
   받은 access_token 으로만 DB를 읽고 쓴다. 만료되면 refresh_token 으로 조용히 갱신한다. */
var AUTH_KEY = "hoonie_bulk_admin_auth_v1";     /* 로그인 유지(localStorage) · 아니면 sessionStorage */
var AUTH_MSG_KEY = "hoonie_bulk_admin_msg_v1";

function authPack(d){
  var now = Math.floor(Date.now() / 1000);
  return {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_at: d.expires_at || (now + Number(d.expires_in || 3600)),
    email: (d.user && d.user.email) || ""
  };
}
function authReadSession(){
  var raw = null;
  try { raw = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY); } catch(e){}
  if (!raw) return null;
  try {
    var s = JSON.parse(raw);
    return (s && s.access_token && s.refresh_token) ? s : null;
  } catch(e){ return null; }
}
function authSaveSession(s, keep){
  authClearSession();
  try { (keep ? localStorage : sessionStorage).setItem(AUTH_KEY, JSON.stringify(s)); } catch(e){}
}
function authClearSession(){
  try { localStorage.removeItem(AUTH_KEY); } catch(e){}
  try { sessionStorage.removeItem(AUTH_KEY); } catch(e){}
}
function authIsKept(){
  try { return !!localStorage.getItem(AUTH_KEY); } catch(e){ return false; }
}
/* 만료 1분 전부터는 먼저 갱신한다 */
function authExpired(s){ return !s || !s.expires_at || (Number(s.expires_at) * 1000) - 60000 < Date.now(); }

function authErrMsg(d, status){
  var c = (d && (d.error_code || d.code)) || "";
  var m = (d && (d.msg || d.message || d.error_description)) || "";
  if (c === "invalid_credentials" || /invalid login credentials/i.test(m)) return "아이디(이메일) 또는 비밀번호가 맞지 않아요";
  if (c === "email_not_confirmed") return "이메일 확인이 아직 안 된 계정이에요";
  if (c === "signup_disabled") return "이 프로젝트는 새 가입이 막혀 있어요";
  if (status === 429 || c === "over_request_rate_limit") return "시도가 너무 잦아요. 잠시 뒤 다시 로그인해 주세요";
  if (!m && status === 400) return "아이디(이메일) 또는 비밀번호가 맞지 않아요";
  return "로그인하지 못했어요" + (m ? " (" + m + ")" : "");
}

function authLogin(email, password){
  return fetch(SB_URL + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { "apikey": SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, password: password })
  }).then(function(r){
    return r.json().catch(function(){ return {}; }).then(function(d){
      if (!r.ok) throw new Error(authErrMsg(d, r.status));
      return d;
    });
  });
}
function authRefresh(refreshToken){
  return fetch(SB_URL + "/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    headers: { "apikey": SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken })
  }).then(function(r){
    return r.json().catch(function(){ return {}; }).then(function(d){
      if (!r.ok || !d.access_token) throw new Error("세션을 갱신하지 못했어요");
      return d;
    });
  });
}
function authLogoutCall(token){
  return fetch(SB_URL + "/auth/v1/logout", {
    method: "POST",
    headers: { "apikey": SB_KEY, "Authorization": "Bearer " + token }
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
