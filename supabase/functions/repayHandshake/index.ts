import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYFAST_URL = "https://www.payfast.co.za/eng/process";
const PLATFORM_FEE_RATE = 0.035;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_METHODS = ["card", "eft", "cash"];

// --------------- Input validation ---------------
interface RepayInput {
  handshake_id: string;
  amount: number;
  payment_method: string;
}

function validateInput(
  body: unknown
): { valid: true; data: RepayInput } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body" };
  }
  const { handshake_id, amount, payment_method } = body as Record<string, unknown>;

  if (typeof handshake_id !== "string" || !UUID_REGEX.test(handshake_id)) {
    return { valid: false, error: "Invalid handshake_id" };
  }
  if (typeof amount !== "number" || !isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return { valid: false, error: "Invalid amount" };
  }
  if (typeof payment_method !== "string" || !VALID_METHODS.includes(payment_method.toLowerCase())) {
    return { valid: false, error: "payment_method must be card, eft, or cash" };
  }

  return {
    valid: true,
    data: {
      handshake_id,
      amount: Math.round(amount * 100) / 100,
      payment_method: payment_method.toLowerCase(),
    },
  };
}

// --------------- MD5 / signature (same as createPayFastPayment) ---------------
function generateSignature(data: Record<string, string>, passphrase: string): string {
  const paramString = Object.keys(data)
    .sort()
    .filter((key) => data[key] !== "" && data[key] !== undefined)
    .map((key) => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, "+")}`)
    .join("&");
  const signatureString = paramString + `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`;
  return md5(signatureString);
}

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
    a=ii(a,b,c,d,k[8],6,1873313359);d=ii(d,a,b,c,k[15],10,-30611744);c=ii(c,d,a,b,c,k[6],15,-1560198380);b=ii(b,c,d,a,k[13],21,1309151649);
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
  function md5blk(s:string){
    const md5blks=[];for(let i=0;i<64;i+=4){md5blks[i>>2]=s.charCodeAt(i)+(s.charCodeAt(i+1)<<8)+(s.charCodeAt(i+2)<<16)+(s.charCodeAt(i+3)<<24);}
    return md5blks;
  }
  const hex_chr="0123456789abcdef".split("");
  function rhex(n:number):string{let s="";for(let j=0;j<4;j++){s+=hex_chr[(n>>(j*8+4))&0x0f]+hex_chr[(n>>(j*8))&0x0f];}return s;}
  function hex(x:number[]):string{return x.map(rhex).join("");}
  function add32(a:number,b:number):number{return(a+b)&0xffffffff;}
  return hex(md51(string));
}

// --------------- Main handler ---------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- Auth ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerUserId = userData.user.id;

    // ---- Validate input ----
    const rawBody = await req.json();
    const validation = validateInput(rawBody);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { handshake_id, amount, payment_method } = validation.data;

    // ---- Fetch handshake ----
    const { data: handshake, error: hsError } = await supabase
      .from("handshakes")
      .select("id, requester_id, supporter_id, amount, transaction_fee, late_fee, amount_paid, status, payment_status, payback_day, net_amount_received")
      .eq("id", handshake_id)
      .single();

    if (hsError || !handshake) {
      return new Response(JSON.stringify({ error: "Handshake not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Verify caller is the requester (only requester repays) ----
    if (handshake.requester_id !== callerUserId) {
      return new Response(JSON.stringify({ error: "Only the requester can repay" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Validate handshake status ----
    if (!["active", "approved"].includes(handshake.status || "")) {
      return new Response(
        JSON.stringify({ error: `Handshake status is '${handshake.status}' — must be active or approved` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Calculate outstanding balance ----
    const totalDue = handshake.amount + (handshake.transaction_fee || 0) + (handshake.late_fee || 0);
    const amountPaid = handshake.amount_paid || 0;
    const outstandingBalance = Math.round((totalDue - amountPaid) * 100) / 100;

    if (outstandingBalance <= 0) {
      return new Response(JSON.stringify({ error: "No outstanding balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap at outstanding balance
    const chargeAmount = Math.min(amount, outstandingBalance);

    if (chargeAmount < 0.01) {
      return new Response(JSON.stringify({ error: "Amount too small" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // ---- Fetch profile names for notifications ----
    const { data: profiles } = await adminClient.rpc("get_safe_profiles_batch", {
      profile_ids: [handshake.requester_id, handshake.supporter_id],
    });
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const requesterName = profileMap.get(handshake.requester_id)?.full_name || "Requester";
    const supporterName = profileMap.get(handshake.supporter_id)?.full_name || "Supporter";

    // =============== CARD / EFT → PayFast redirect ===============
    if (payment_method === "card" || payment_method === "eft") {
      const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID");
      const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY");
      const passphrase = Deno.env.get("PAYFAST_PASSPHRASE");

      if (!merchantId || !merchantKey || !passphrase) {
        return new Response(JSON.stringify({ error: "Payment configuration error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const notifyUrl = `${supabaseUrl}/functions/v1/payfastITN`;
      const appUrl = "https://cashmeza.lovable.app";
      const returnUrl = `${appUrl}/payment-success`;
      const cancelUrl = `${appUrl}/payment-cancel?handshake_id=${handshake_id}`;

      const paymentId = crypto.randomUUID();

      // Create pending payment record
      const { error: insertError } = await adminClient.from("payments").insert({
        id: paymentId,
        handshake_id,
        amount: chargeAmount,
        payment_method: payment_method === "card" ? "payfast_card" : "payfast_eft",
        payment_status: "pending",
        transaction_reference: null,
      });

      if (insertError) {
        console.error("Payment insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to create payment record" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const itemName = `CashMe Repayment #${handshake_id}`.substring(0, 100);

      const payfastData: Record<string, string> = {
        merchant_id: merchantId,
        merchant_key: merchantKey,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,
        m_payment_id: paymentId,
        amount: chargeAmount.toFixed(2),
        item_name: itemName,
        custom_str1: handshake_id,
        custom_str2: callerUserId,
      };

      const signature = generateSignature(payfastData, passphrase);

      const params = new URLSearchParams();
      Object.entries(payfastData).forEach(([key, value]) => params.append(key, value));
      params.append("signature", signature);

      const redirectUrl = `${PAYFAST_URL}?${params.toString()}`;

      // Notify both parties that repayment was initiated
      const now = new Date().toISOString();
      await adminClient.from("notifications").insert([
        {
          user_id: handshake.requester_id,
          handshake_id,
          type: "repayment_initiated",
          title: "Repayment Initiated",
          message: `You initiated a R${chargeAmount.toFixed(2)} repayment to ${supporterName} via ${payment_method.toUpperCase()}.`,
          action_url: `/handshake/${handshake_id}`,
          data: { amount: chargeAmount, method: payment_method },
        },
        {
          user_id: handshake.supporter_id,
          handshake_id,
          type: "repayment_initiated",
          title: "Repayment Incoming",
          message: `${requesterName} initiated a R${chargeAmount.toFixed(2)} repayment via ${payment_method.toUpperCase()}.`,
          action_url: `/handshake/${handshake_id}`,
          data: { amount: chargeAmount, method: payment_method },
        },
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          type: "redirect",
          paymentId,
          redirectUrl,
          chargeAmount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============== CASH → pending supporter confirmation ===============
    if (payment_method === "cash") {
      const platformFee = Math.round(chargeAmount * PLATFORM_FEE_RATE * 100) / 100;
      const netAmount = Math.round((chargeAmount - platformFee) * 100) / 100;

      const paymentId = crypto.randomUUID();

      // Create payment record — awaiting_confirmation (supporter must confirm)
      const { error: insertError } = await adminClient.from("payments").insert({
        id: paymentId,
        handshake_id,
        amount: chargeAmount,
        payment_method: "cash",
        payment_status: "awaiting_confirmation",
        fee: platformFee,
        net_amount: netAmount,
        transaction_reference: null,
      });

      if (insertError) {
        console.error("Cash payment insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to create payment record" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Notify supporter to confirm cash receipt
      await adminClient.from("notifications").insert([
        {
          user_id: handshake.supporter_id,
          handshake_id,
          type: "cash_confirmation_required",
          title: "Cash Payment — Confirm Receipt",
          message: `${requesterName} reports paying R${chargeAmount.toFixed(2)} in cash. Please confirm you received the funds.`,
          action_url: `/handshake/${handshake_id}`,
          data: { amount: chargeAmount, payment_id: paymentId, method: "cash" },
        },
        {
          user_id: handshake.requester_id,
          handshake_id,
          type: "cash_payment_pending",
          title: "Cash Payment Submitted",
          message: `Your R${chargeAmount.toFixed(2)} cash payment to ${supporterName} is pending their confirmation.`,
          action_url: `/handshake/${handshake_id}`,
          data: { amount: chargeAmount, payment_id: paymentId, method: "cash" },
        },
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          type: "cash_pending",
          paymentId,
          message: "Cash payment recorded. Awaiting supporter confirmation.",
          chargeAmount,
          platformFee,
          netAmount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unsupported payment method" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("repayHandshake error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
