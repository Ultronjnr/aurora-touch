import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// PayFast production validation URL
const PAYFAST_VALIDATE_URL = "https://www.payfast.co.za/eng/query/validate";

// Platform fee rate (3.5%)
const PLATFORM_FEE_RATE = 0.035;

// Valid PayFast IP addresses (production)
const PAYFAST_IPS = [
  "197.97.145.144",
  "197.97.145.145",
  "197.97.145.146",
  "197.97.145.147",
  "41.74.179.194",
  "41.74.179.195",
  "41.74.179.196",
  "41.74.179.197",
];

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// --------------- MD5 signature helpers ---------------
function generateSignature(
  data: Record<string, string>,
  passphrase: string
): string {
  const paramString = Object.keys(data)
    .sort()
    .filter(
      (key) =>
        key !== "signature" && data[key] !== "" && data[key] !== undefined
    )
    .map(
      (key) =>
        `${key}=${encodeURIComponent(data[key]).replace(/%20/g, "+")}`
    )
    .join("&");

  const signatureString =
    paramString +
    `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`;
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

// --------------- PayFast server-side validation ---------------
async function validateWithPayFast(data: string): Promise<boolean> {
  try {
    const response = await fetch(PAYFAST_VALIDATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: data,
    });
    const result = await response.text();
    return result === "VALID";
  } catch (error) {
    console.error("PayFast validation request failed:", error);
    return false;
  }
}

// --------------- Main handler ---------------
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // ---- IP validation ----
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const isValidIp = PAYFAST_IPS.includes(clientIp) || clientIp === "unknown";
    if (!isValidIp) {
      console.warn(`ITN received from non-PayFast IP: ${clientIp}`);
    }

    // ---- Parse form data ----
    const formData = await req.formData();
    const data: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value.toString();
    }

    // ---- Credentials ----
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE");
    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID");

    if (!passphrase || !merchantId) {
      console.error("Missing PayFast credentials");
      return new Response("Configuration error", { status: 500 });
    }

    // ---- Verify merchant ID ----
    if (data.merchant_id !== merchantId) {
      console.error("Merchant ID mismatch");
      return new Response("Invalid merchant", { status: 400 });
    }

    // ---- Verify signature ----
    const receivedSignature = data.signature;
    const calculatedSignature = generateSignature(data, passphrase);

    if (receivedSignature !== calculatedSignature) {
      console.error("Signature mismatch");
      return new Response("Invalid signature", { status: 400 });
    }

    // ---- Validate with PayFast server ----
    const paramString = Object.keys(data)
      .filter((key) => key !== "signature")
      .map((key) => `${key}=${encodeURIComponent(data[key])}`)
      .join("&");

    const isValid = await validateWithPayFast(paramString);
    if (!isValid) {
      console.error("PayFast server validation failed");
      return new Response("Validation failed", { status: 400 });
    }

    // ---- Extract fields ----
    const paymentId = data.m_payment_id;
    const handshakeId = data.custom_str1;
    const paymentStatus = data.payment_status;
    const pfPaymentId = data.pf_payment_id;
    const amountGross = parseFloat(data.amount_gross);

    // Validate UUIDs
    if (!UUID_REGEX.test(paymentId) || !UUID_REGEX.test(handshakeId)) {
      console.error("Invalid UUID in ITN data");
      return new Response("Invalid payment or handshake ID", { status: 400 });
    }

    // Validate amount
    if (isNaN(amountGross) || amountGross <= 0) {
      console.error("Invalid amount in ITN data");
      return new Response("Invalid amount", { status: 400 });
    }

    // ---- Database client (service role) ----
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ---- Idempotency check ----
    const { data: existingPayment, error: checkError } = await supabase
      .from("payments")
      .select("payment_status, transaction_reference")
      .eq("id", paymentId)
      .single();

    if (checkError) {
      console.error("Payment not found:", paymentId);
      return new Response("Payment not found", { status: 404 });
    }

    // Already completed with same reference → idempotent success
    if (
      existingPayment.payment_status === "completed" &&
      existingPayment.transaction_reference === pfPaymentId
    ) {
      return new Response("OK", { status: 200 });
    }

    // Already completed with different reference → reject duplicate
    if (existingPayment.payment_status === "completed") {
      console.error("Payment already processed with different reference");
      return new Response("Payment already processed", { status: 400 });
    }

    // ---- Calculate platform fee & net amount ----
    const platformFee = Math.round(amountGross * PLATFORM_FEE_RATE * 100) / 100;
    const netAmount = Math.round((amountGross - platformFee) * 100) / 100;

    // ---- Update payment record ----
    const newPaymentStatus =
      paymentStatus === "COMPLETE" ? "completed" : "failed";

    const { error: paymentUpdateError } = await supabase
      .from("payments")
      .update({
        payment_status: newPaymentStatus,
        transaction_reference: pfPaymentId,
        fee: platformFee,
        net_amount: netAmount,
      })
      .eq("id", paymentId)
      .eq("payment_status", "pending"); // Only update if still pending

    if (paymentUpdateError) {
      console.error("Payment update error:", paymentUpdateError);
      return new Response("Database error", { status: 500 });
    }

    // ---- Update handshake only if payment is COMPLETE ----
    if (paymentStatus === "COMPLETE") {
      const { data: handshake, error: handshakeError } = await supabase
        .from("handshakes")
        .select(
          "amount_paid, amount, transaction_fee, late_fee, status, requester_id, payback_day, net_amount_received"
        )
        .eq("id", handshakeId)
        .single();

      if (handshakeError) {
        console.error("Handshake fetch error:", handshakeError);
        return new Response("Database error", { status: 500 });
      }

      // Don't update already completed handshakes
      if (handshake.status === "completed") {
        return new Response("OK", { status: 200 });
      }

      const currentPaid = handshake.amount_paid || 0;
      const newAmountPaid = currentPaid + amountGross;
      const totalDue =
        handshake.amount +
        (handshake.transaction_fee || 0) +
        (handshake.late_fee || 0);

      // Calculate cumulative net_amount_received (amount minus 3.5% fee)
      const currentNet = handshake.net_amount_received || 0;
      const newNetAmountReceived = Math.round((currentNet + netAmount) * 100) / 100;

      // Determine new status
      let newStatus = handshake.status;
      let completedAt = null;

      if (newAmountPaid >= totalDue) {
        newStatus = "completed";
        completedAt = new Date().toISOString();
      } else if (
        handshake.status === "pending" ||
        handshake.status === "approved"
      ) {
        newStatus = "active";
      }

      // Update handshake with net_amount_received
      const { error: updateError } = await supabase
        .from("handshakes")
        .update({
          amount_paid: newAmountPaid,
          net_amount_received: newNetAmountReceived,
          status: newStatus,
          completed_at: completedAt,
          payment_status: "completed",
          payment_completed_at: new Date().toISOString(),
        })
        .eq("id", handshakeId);

      if (updateError) {
        console.error("Handshake update error:", updateError);
        return new Response("Database error", { status: 500 });
      }

      // ---- Store platform earnings ----
      const { error: earningsError } = await supabase
        .from("platform_earnings")
        .insert({
          handshake_id: handshakeId,
          fee_amount: platformFee,
        });

      if (earningsError) {
        // Log but don't fail the ITN — payment is already processed
        console.error("Platform earnings insert error:", earningsError);
      }

      // ---- Update requester cash_rating based on lateness ----
      if (handshake.requester_id && handshake.payback_day) {
        const paybackDate = new Date(handshake.payback_day);
        const today = new Date();
        const daysLate = Math.max(
          0,
          Math.floor(
            (today.getTime() - paybackDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        );

        if (daysLate > 0) {
          // Deduct 0.5 per day late, minimum rating 0
          const { data: profile } = await supabase
            .from("profiles")
            .select("cash_rating")
            .eq("id", handshake.requester_id)
            .single();

          if (profile) {
            const currentRating = profile.cash_rating || 100;
            const penalty = daysLate * 0.5;
            const newRating = Math.max(0, currentRating - penalty);

            await supabase
              .from("profiles")
              .update({
                cash_rating: newRating,
                updated_at: new Date().toISOString(),
              })
              .eq("id", handshake.requester_id);

            // Also update days_late on handshake
            await supabase
              .from("handshakes")
              .update({ days_late: daysLate })
              .eq("id", handshakeId);

            console.log(
              `Cash rating updated for ${handshake.requester_id}: ${currentRating} → ${newRating} (${daysLate} days late)`
            );
          }
        }
      }

      console.log(
        `Payment ${paymentId} completed: gross=${amountGross}, fee=${platformFee}, net=${netAmount}, handshake=${handshakeId}, newStatus=${newStatus}`
      );
    }

    // Return 200 OK to PayFast
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("payfastITN unhandled error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
