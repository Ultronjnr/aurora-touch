import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PayFast production URL
const PAYFAST_URL = "https://www.payfast.co.za/eng/process";

// Platform fee rate (4.5%)
const PLATFORM_FEE_RATE = 0.045;

interface PaymentRequest {
  handshakeId: string;
  paymentAmount: number; // The repayment amount the user wants to pay (for partial payments)
  returnUrl: string;
  cancelUrl: string;
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Input validation
function validatePaymentRequest(body: unknown): { valid: true; data: PaymentRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: "Invalid request body" };
  }
  
  const { handshakeId, paymentAmount, returnUrl, cancelUrl } = body as Record<string, unknown>;
  
  // Validate handshakeId is a valid UUID
  if (typeof handshakeId !== 'string' || !UUID_REGEX.test(handshakeId)) {
    return { valid: false, error: "Invalid handshake ID format" };
  }
  
  // Validate paymentAmount (optional for supporter initial payment, required for borrower repayment)
  if (paymentAmount !== undefined && paymentAmount !== null) {
    if (typeof paymentAmount !== 'number' || !isFinite(paymentAmount) || paymentAmount <= 0 || paymentAmount > 1000000) {
      return { valid: false, error: "Invalid payment amount: must be a positive number up to 1,000,000" };
    }
  }
  
  // Validate URLs
  const urlPattern = /^https?:\/\/.+/;
  if (typeof returnUrl !== 'string' || !urlPattern.test(returnUrl)) {
    return { valid: false, error: "Invalid return URL" };
  }
  if (typeof cancelUrl !== 'string' || !urlPattern.test(cancelUrl)) {
    return { valid: false, error: "Invalid cancel URL" };
  }
  
  return {
    valid: true,
    data: {
      handshakeId,
      paymentAmount: paymentAmount ? Math.round((paymentAmount as number) * 100) / 100 : 0,
      returnUrl,
      cancelUrl,
    }
  };
}

function generateSignature(data: Record<string, string>, passphrase: string): string {
  const paramString = Object.keys(data)
    .sort()
    .filter((key) => data[key] !== "" && data[key] !== undefined)
    .map((key) => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, "+")}`)
    .join("&");

  const signatureString = paramString + `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`;
  return md5(signatureString);
}

// Simple MD5 implementation for Deno
function md5(string: string): string {
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]); x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | ~d), a, b, x, s, t); }

  function md51(s: string) {
    const n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= n; i += 64) { md5cycle(state, md5blk(s.substring(i - 64, i))); }
    s = s.substring(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++) { tail[i >> 2] |= s.charCodeAt(i) << (i % 4 << 3); }
    tail[i >> 2] |= 0x80 << (i % 4 << 3);
    if (i > 55) { md5cycle(state, tail); for (i = 0; i < 16; i++) tail[i] = 0; }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function md5blk(s: string) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  const hex_chr = "0123456789abcdef".split("");
  function rhex(n: number): string {
    let s = "";
    for (let j = 0; j < 4; j++) { s += hex_chr[(n >> (j * 8 + 4)) & 0x0f] + hex_chr[(n >> (j * 8)) & 0x0f]; }
    return s;
  }
  function hex(x: number[]): string { return x.map(rhex).join(""); }
  function add32(a: number, b: number): number { return (a + b) & 0xffffffff; }

  return hex(md51(string));
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
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

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.user.id;

    // Parse and validate request body
    const rawBody = await req.json();
    const validation = validatePaymentRequest(rawBody);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { handshakeId, paymentAmount, returnUrl, cancelUrl } = validation.data;

    // Fetch handshake from database - SERVER-SIDE fee calculation
    const { data: handshake, error: handshakeError } = await supabase
      .from("handshakes")
      .select("id, requester_id, supporter_id, amount, transaction_fee, late_fee, amount_paid, status, payment_status")
      .eq("id", handshakeId)
      .single();

    if (handshakeError || !handshake) {
      return new Response(
        JSON.stringify({ error: "Handshake not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is part of the handshake
    if (handshake.requester_id !== userId && handshake.supporter_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized to make payment for this handshake" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent payment on completed/rejected handshakes
    if (handshake.status === "completed" || handshake.status === "rejected") {
      return new Response(
        JSON.stringify({ error: "This handshake is already " + handshake.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SERVER-SIDE fee and amount calculation
    const handshakeAmount = handshake.amount;
    const transactionFee = handshake.transaction_fee || 0;
    const lateFee = handshake.late_fee || 0;
    const totalDue = handshakeAmount + transactionFee + lateFee;
    const amountPaid = handshake.amount_paid || 0;
    const outstandingBalance = Math.round((totalDue - amountPaid) * 100) / 100;

    if (outstandingBalance <= 0) {
      return new Response(
        JSON.stringify({ error: "No outstanding balance" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine PayFast charge amount
    // For supporter initial payment: full amount + fee
    // For borrower repayment: use requested paymentAmount, capped at outstanding balance
    let chargeAmount: number;
    let itemName: string;

    if (userId === handshake.supporter_id) {
      // Supporter paying: charge the full handshake amount + platform fee
      chargeAmount = Math.round((handshakeAmount + transactionFee) * 100) / 100;
      itemName = "CashMe Handshake Support";
    } else {
      // Borrower repaying: charge the requested amount, capped at outstanding balance
      chargeAmount = paymentAmount > 0 
        ? Math.min(Math.round(paymentAmount * 100) / 100, outstandingBalance) 
        : outstandingBalance;
      itemName = "CashMe Handshake Repayment";
    }

    // Final validation
    if (chargeAmount < 0.01) {
      return new Response(
        JSON.stringify({ error: "Payment amount too small" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get PayFast credentials from environment
    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID");
    const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY");
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE");

    if (!merchantId || !merchantKey || !passphrase) {
      return new Response(
        JSON.stringify({ error: "Payment configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the notify URL server-side (never trust client)
    const notifyUrl = `${supabaseUrl}/functions/v1/handle-payfast-itn`;

    // Generate unique payment ID
    const paymentId = crypto.randomUUID();

    // Create payment record with server-calculated amount
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { error: paymentError } = await adminClient.from("payments").insert({
      id: paymentId,
      handshake_id: handshakeId,
      amount: chargeAmount,
      payment_method: "payfast",
      payment_status: "pending",
      transaction_reference: null,
    });

    if (paymentError) {
      return new Response(
        JSON.stringify({ error: "Failed to initiate payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build PayFast data object
    const payfastData: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      m_payment_id: paymentId,
      amount: chargeAmount.toFixed(2),
      item_name: itemName.substring(0, 100),
      custom_str1: handshakeId,
      custom_str2: userId,
    };

    // Generate signature
    const signature = generateSignature(payfastData, passphrase);

    // Build redirect URL
    const params = new URLSearchParams();
    Object.entries(payfastData).forEach(([key, value]) => {
      params.append(key, value);
    });
    params.append("signature", signature);

    const redirectUrl = `${PAYFAST_URL}?${params.toString()}`;

    return new Response(
      JSON.stringify({
        success: true,
        paymentId,
        redirectUrl,
        // Return server-calculated fee breakdown for frontend display
        breakdown: {
          handshakeAmount,
          platformFee: transactionFee,
          lateFee,
          totalDue,
          amountPaid,
          outstandingBalance,
          chargeAmount,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
