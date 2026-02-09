/**
 * PayFast Direct Checkout — Edge Function
 *
 * Accepts a POST with payment details, generates a signed PayFast form,
 * and returns auto-submitting HTML that redirects the user to PayFast.
 *
 * No wallet / no stored funds — money goes directly to the merchant
 * (recipient) minus the CashMe platform fee.
 *
 * Sandbox: https://sandbox.payfast.co.za/eng/process
 * Live:    https://www.payfast.co.za/eng/process
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ──────────────────────────────────────────────
// CORS headers (required for browser calls)
// ──────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, " +
    "x-supabase-client-platform, x-supabase-client-platform-version, " +
    "x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────

// Toggle between sandbox and production
const PAYFAST_URL = "https://www.payfast.co.za/eng/process";
// const PAYFAST_URL = "https://sandbox.payfast.co.za/eng/process"; // ← uncomment for sandbox

// CashMe platform fee (3.5%)
const PLATFORM_FEE_RATE = 0.035;

const APP_URL = "https://cashmeza.lovable.app";

// ──────────────────────────────────────────────
// Input validation
// ──────────────────────────────────────────────
interface CheckoutInput {
  amount: number;
  item_name: string;
  name_first: string;
  name_last: string;
  email_address: string;
  custom_str1?: string;
  custom_str2?: string;
}

function validateInput(
  body: unknown
): { valid: true; data: CheckoutInput } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const b = body as Record<string, unknown>;

  // Required fields
  if (typeof b.amount !== "number" || !isFinite(b.amount) || b.amount <= 0 || b.amount > 1_000_000) {
    return { valid: false, error: "amount must be a positive number up to 1,000,000" };
  }
  if (typeof b.item_name !== "string" || b.item_name.trim().length === 0) {
    return { valid: false, error: "item_name is required" };
  }
  if (typeof b.name_first !== "string" || b.name_first.trim().length === 0) {
    return { valid: false, error: "name_first is required" };
  }
  if (typeof b.name_last !== "string" || b.name_last.trim().length === 0) {
    return { valid: false, error: "name_last is required" };
  }
  if (typeof b.email_address !== "string" || !b.email_address.includes("@")) {
    return { valid: false, error: "A valid email_address is required" };
  }

  return {
    valid: true,
    data: {
      amount: Math.round((b.amount as number) * 100) / 100,
      item_name: (b.item_name as string).trim().substring(0, 100),
      name_first: (b.name_first as string).trim().substring(0, 100),
      name_last: (b.name_last as string).trim().substring(0, 100),
      email_address: (b.email_address as string).trim().substring(0, 255),
      custom_str1: typeof b.custom_str1 === "string" ? b.custom_str1.substring(0, 255) : undefined,
      custom_str2: typeof b.custom_str2 === "string" ? b.custom_str2.substring(0, 255) : undefined,
    },
  };
}

// ──────────────────────────────────────────────
// MD5 signature generation (pure JS — no deps)
// ──────────────────────────────────────────────

/**
 * Build the PayFast signature string:
 * 1. Sort keys alphabetically
 * 2. Filter out empty values
 * 3. URL-encode values (spaces → +)
 * 4. Append passphrase
 * 5. MD5 hash
 */
function generateSignature(data: Record<string, string>, passphrase: string): string {
  const paramString = Object.keys(data)
    .sort()
    .filter((key) => data[key] !== "" && data[key] !== undefined)
    .map((key) => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, "+")}`)
    .join("&");

  const withPassphrase = paramString + `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`;
  return md5(withPassphrase);
}

// Compact MD5 implementation (RFC 1321)
function md5(string: string): string {
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a=ff(a,b,c,d,k[0],7,-680876936);d=ff(d,a,b,c,k[1],12,-389564586);c=ff(c,d,a,b,k[2],17,606105819);b=ff(b,c,d,a,k[3],22,-1044525330);
    a=ff(a,b,c,d,k[4],7,-176418897);d=ff(d,a,b,c,k[5],12,1200080426);c=ff(c,d,a,b,k[6],17,-1473231341);b=ff(b,c,d,a,k[7],22,-45705983);
    a=ff(a,b,c,d,k[8],7,1770035416);d=ff(d,a,b,c,k[9],12,-1958414417);c=ff(c,d,a,b,k[10],17,-42063);b=ff(b,c,d,a,k[11],22,-1990404162);
    a=ff(a,b,c,d,k[12],7,1804603682);d=ff(d,a,b,c,k[13],12,-40341101);c=ff(c,d,a,b,k[14],17,-1502002290);b=ff(b,c,d,a,k[15],22,1236535329);
    a=gg(a,b,c,d,k[1],5,-165796510);d=gg(d,a,b,c,k[6],9,-1069501632);c=gg(c,d,a,b,k[11],14,643717713);b=gg(b,c,d,a,k[0],20,-373897302);
    a=gg(a,b,c,d,k[5],5,-701558691);d=gg(d,a,b,c,k[10],9,38016083);c=gg(c,d,a,b,k[15],14,-660478335);b=gg(b,c,d,a,k[4],20,-405537848);
    a=gg(a,b,c,d,k[9],5,568446438);d=gg(d,a,b,c,k[14],9,-1019803690);c=gg(c,d,a,b,k[3],14,-187363961);b=gg(b,c,d,a,k[8],20,1163531501);
    a=gg(a,b,c,d,k[13],5,-1444681467);d=gg(d,a,b,c,k[2],9,-51403784);c=gg(c,d,a,b,k[7],14,1735328473);b=gg(b,c,d,a,k[12],20,-1926607734);
    a=hh(a,b,c,d,k[5],4,-378558);d=hh(d,a,b,c,k[8],11,-2022574463);c=hh(c,d,a,b,k[11],16,1839030562);b=hh(b,c,d,a,k[14],23,-35309556);
    a=hh(a,b,c,d,k[1],4,-1530992060);d=hh(d,a,b,c,k[4],11,1272893353);c=hh(c,d,a,b,k[7],16,-155497632);b=hh(b,c,d,a,k[10],23,-1094730640);
    a=hh(a,b,c,d,k[13],4,681279174);d=hh(d,a,b,c,k[0],11,-358537222);c=hh(c,d,a,b,k[3],16,-722521979);b=hh(b,c,d,a,k[6],23,76029189);
    a=hh(a,b,c,d,k[9],4,-640364487);d=hh(d,a,b,c,k[12],11,-421815835);c=hh(c,d,a,b,k[15],16,530742520);b=hh(b,c,d,a,k[2],23,-995338651);
    a=ii(a,b,c,d,k[0],6,-198630844);d=ii(d,a,b,c,k[7],10,1126891415);c=ii(c,d,a,b,k[14],15,-1416354905);b=ii(b,c,d,a,k[5],21,-57434055);
    a=ii(a,b,c,d,k[12],6,1700485571);d=ii(d,a,b,c,k[3],10,-1894986606);c=ii(c,d,a,b,k[10],15,-1051523);b=ii(b,c,d,a,k[1],21,-2054922799);
    a=ii(a,b,c,d,k[8],6,1873313359);d=ii(d,a,b,c,k[15],10,-30611744);c=ii(c,d,a,b,k[6],15,-1560198380);b=ii(b,c,d,a,k[13],21,1309151649);
    a=ii(a,b,c,d,k[4],6,-145523070);d=ii(d,a,b,c,k[11],10,-1120210379);c=ii(c,d,a,b,k[2],15,718787259);b=ii(b,c,d,a,k[9],21,-343485551);
    x[0]=add32(a,x[0]);x[1]=add32(b,x[1]);x[2]=add32(c,x[2]);x[3]=add32(d,x[3]);
  }
  function cmn(q:number,a:number,b:number,x:number,s:number,t:number){a=add32(add32(a,q),add32(x,t));return add32((a<<s)|(a>>>(32-s)),b);}
  function ff(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn((b&c)|(~b&d),a,b,x,s,t);}
  function gg(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn((b&d)|(c&~d),a,b,x,s,t);}
  function hh(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn(b^c^d,a,b,x,s,t);}
  function ii(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn(c^(b|~d),a,b,x,s,t);}
  function md51(s:string){
    const n=s.length;const state=[1732584193,-271733879,-1732584194,271733878];let i;
    for(i=64;i<=n;i+=64){md5cycle(state,md5blk(s.substring(i-64,i)));}
    s=s.substring(i-64);const tail=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    for(i=0;i<s.length;i++){tail[i>>2]|=s.charCodeAt(i)<<(i%4<<3);}
    tail[i>>2]|=0x80<<(i%4<<3);
    if(i>55){md5cycle(state,tail);for(i=0;i<16;i++)tail[i]=0;}
    tail[14]=n*8;md5cycle(state,tail);return state;
  }
  function md5blk(s:string){const md5blks=[];for(let i=0;i<64;i+=4){md5blks[i>>2]=s.charCodeAt(i)+(s.charCodeAt(i+1)<<8)+(s.charCodeAt(i+2)<<16)+(s.charCodeAt(i+3)<<24);}return md5blks;}
  const hex_chr="0123456789abcdef".split("");
  function rhex(n:number):string{let s="";for(let j=0;j<4;j++){s+=hex_chr[(n>>(j*8+4))&0x0f]+hex_chr[(n>>(j*8))&0x0f];}return s;}
  function hex(x:number[]):string{return x.map(rhex).join("");}
  function add32(a:number,b:number):number{return(a+b)&0xffffffff;}
  return hex(md51(string));
}

// ──────────────────────────────────────────────
// Build auto-submitting HTML form
// ──────────────────────────────────────────────
function buildAutoSubmitForm(
  payfastUrl: string,
  fields: Record<string, string>,
  signature: string
): string {
  const hiddenInputs = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${escapeHtml(v)}" />`)
    .join("\n      ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirecting to PayFast…</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0a0a0a;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .container { text-align: center; }
    .spinner {
      width: 40px; height: 40px; margin: 0 auto 16px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: #4ade80;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { font-size: 16px; opacity: 0.8; }
    .fallback-btn {
      display: inline-block; margin-top: 24px; padding: 12px 24px;
      background: #1D4B8F; color: #fff; font-size: 16px;
      border: none; border-radius: 8px; cursor: pointer;
      text-decoration: none;
    }
    .fallback-btn:hover { background: #163d75; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p>Redirecting to PayFast…</p>
    <form id="payfast-form" action="${escapeHtml(payfastUrl)}" method="POST">
      ${hiddenInputs}
      <input type="hidden" name="signature" value="${signature}" />
      <noscript>
        <button type="submit" class="fallback-btn">Pay Now</button>
      </noscript>
    </form>
  </div>
  <script>document.getElementById('payfast-form').submit();</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ──────────────────────────────────────────────
// Main handler
// ──────────────────────────────────────────────
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── 1. Authenticate caller ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Validate input ──
    const rawBody = await req.json();
    const validation = validateInput(rawBody);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { amount, item_name, name_first, name_last, email_address, custom_str1, custom_str2 } =
      validation.data;

    // ── 3. Calculate fees ──
    const platformFee = Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
    const chargeAmount = Math.round(amount * 100) / 100; // user pays full amount
    // Net to recipient = amount - fee (tracked for reporting)

    // ── 4. Load PayFast credentials from secrets ──
    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID");
    const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY");
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE");

    if (!merchantId || !merchantKey || !passphrase) {
      console.error("Missing PayFast credentials in environment");
      return new Response(
        JSON.stringify({ error: "Payment configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. Generate unique payment ID ──
    const mPaymentId = crypto.randomUUID();

    // ── 6. Build PayFast parameter object ──
    const notifyUrl = `${supabaseUrl}/functions/v1/payfastITN`;

    const payfastData: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${APP_URL}/payment-success`,
      cancel_url: `${APP_URL}/payment-cancel`,
      notify_url: notifyUrl,
      name_first,
      name_last,
      email_address,
      m_payment_id: mPaymentId,
      amount: chargeAmount.toFixed(2),
      item_name,
    };

    // Append optional custom fields
    if (custom_str1) payfastData.custom_str1 = custom_str1;
    if (custom_str2) payfastData.custom_str2 = custom_str2;

    // ── 7. Generate MD5 signature ──
    const signature = generateSignature(payfastData, passphrase);

    // ── 8. Return auto-submitting HTML form ──
    const html = buildAutoSubmitForm(PAYFAST_URL, payfastData, signature);

    console.log(`Payment ${mPaymentId} created — amount: R${chargeAmount.toFixed(2)}, fee: R${platformFee.toFixed(2)}`);

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("payfast-checkout error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
