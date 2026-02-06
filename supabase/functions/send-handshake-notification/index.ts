import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Restrict CORS to allowed origins only
const getAllowedOrigins = () => {
  return [
    'https://jooafkmoizocxgjnfnmg.lovable.app',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:54321',
  ];
};

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = origin && (
    allowedOrigins.includes(origin) || 
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovableproject.com')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin! : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
};

interface NotificationRequest {
  type: "handshake_request" | "handshake_approved" | "handshake_rejected" | "payment_reminder" | "payment_received" | "payment_overdue" | "penalty_notification" | "payment_reminder_3_days" | "payment_reminder_2_days" | "payment_reminder_due_today";
  handshakeId: string;
  recipientEmail?: string; // Optional - will be looked up from recipientId if not provided
  recipientId?: string; // User ID - used to look up email server-side
  recipientName: string;
  recipientPhone?: string;
  data: {
    amount?: number;
    requesterName?: string;
    supporterName?: string;
    paybackDate?: string;
    daysLate?: number;
    transactionFee?: number;
    paymentAmount?: number;
    daysOverdue?: number;
    penaltyAmount?: number;
    daysUntilDue?: number;
  };
}

// Africa's Talking SMS sender
async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  const apiKey = Deno.env.get("AFRICAS_TALKING_API_KEY")?.trim();
  const username = Deno.env.get("AFRICAS_TALKING_USERNAME")?.trim();

  if (!apiKey || !username) {
    console.log("Africa's Talking credentials not configured, skipping SMS");
    return false;
  }

  try {
    // Format phone number for South Africa if needed
    let formattedPhone = phoneNumber;
    if (phoneNumber.startsWith("0")) {
      formattedPhone = "+27" + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith("+")) {
      formattedPhone = "+" + phoneNumber;
    }

    // Use sandbox URL for testing (change to production URL when going live)
    const isSandbox = username.toLowerCase().includes("sandbox");
    const apiUrl = isSandbox 
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging";

    console.log(`Sending SMS to ${formattedPhone} via ${isSandbox ? 'sandbox' : 'production'} API (username: ${username})`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apiKey": apiKey,
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        username: username,
        to: formattedPhone,
        message: message,
      }),
    });

    const responseText = await response.text();
    console.log("SMS API response:", responseText);
    
    try {
      const result = JSON.parse(responseText);
      if (result.SMSMessageData?.Recipients?.[0]?.status === "Success") {
        return true;
      }
      console.log("SMS status:", result.SMSMessageData?.Recipients?.[0]?.status || "Unknown");
    } catch {
      console.log("SMS response was not JSON:", responseText);
    }
    
    return false;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
}

// Get SMS content based on notification type
function getSMSContent(type: string, recipientName: string, data: NotificationRequest["data"]): string {
  const firstName = recipientName.split(" ")[0];
  
  switch (type) {
    case "payment_reminder_3_days":
      return `Hi ${firstName}, your CashMe payment of R${data.amount?.toFixed(2)} to ${data.supporterName} is due in 3 days (${new Date(data.paybackDate!).toLocaleDateString('en-ZA')}). Pay on time to maintain your cash rating!`;
    
    case "payment_reminder_2_days":
      return `Hi ${firstName}, REMINDER: Your CashMe payment of R${data.amount?.toFixed(2)} to ${data.supporterName} is due in 2 days. Login to make your payment now.`;
    
    case "payment_reminder_due_today":
      return `Hi ${firstName}, URGENT: Your CashMe payment of R${data.amount?.toFixed(2)} to ${data.supporterName} is DUE TODAY. Pay now to avoid late fees and protect your cash rating!`;
    
    case "payment_reminder":
      const daysLate = data.daysLate || 0;
      if (daysLate > 0) {
        return `Hi ${firstName}, your CashMe payment is ${daysLate} days OVERDUE! Please pay R${data.amount?.toFixed(2)} to ${data.supporterName} immediately to avoid further penalties.`;
      }
      return `Hi ${firstName}, reminder: CashMe payment of R${data.amount?.toFixed(2)} to ${data.supporterName} is due on ${new Date(data.paybackDate!).toLocaleDateString('en-ZA')}.`;
    
    case "handshake_request":
      return `Hi ${firstName}, you have a new CashMe handshake request from ${data.requesterName} for R${data.amount?.toFixed(2)}. Login to approve or decline.`;
    
    case "handshake_approved":
      return `Great news ${firstName}! Your CashMe request of R${data.amount?.toFixed(2)} was approved by ${data.supporterName}. Payback due: ${new Date(data.paybackDate!).toLocaleDateString('en-ZA')}.`;
    
    case "handshake_rejected":
      return `Hi ${firstName}, your CashMe request to ${data.supporterName} for R${data.amount?.toFixed(2)} was declined. Try another supporter.`;
    
    case "payment_received":
      return `Hi ${firstName}, you received a CashMe payment of R${data.paymentAmount?.toFixed(2)} from ${data.requesterName}. Check your dashboard for details.`;
    
    case "penalty_notification":
      return `Hi ${firstName}, a late fee of R${data.penaltyAmount?.toFixed(2)} has been added to your CashMe payment (${data.daysOverdue} days overdue). Total now due: R${data.amount?.toFixed(2)}.`;
    
    default:
      return `Hi ${firstName}, you have a new notification on CashMe. Login to view details.`;
  }
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication - require a valid auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth token to validate identity
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate the JWT and get user
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No user ID in token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { type, recipientEmail: providedEmail, recipientId, recipientName, recipientPhone, data, handshakeId }: NotificationRequest & { handshakeId: string } = await req.json();

    // Verify the authenticated user is involved in this handshake
    const { data: handshake, error: handshakeError } = await supabaseClient
      .from('handshakes')
      .select('requester_id, supporter_id')
      .eq('id', handshakeId)
      .single();

    if (handshakeError || !handshake) {
      return new Response(
        JSON.stringify({ error: 'Handshake not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow users who are part of this handshake to send notifications
    if (handshake.requester_id !== userId && handshake.supporter_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Not authorized for this handshake' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use admin client for privileged operations (email lookup, etc.)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Resolve recipient email - use provided email or look up from recipientId
    let recipientEmail = providedEmail;
    if (!recipientEmail && recipientId) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(recipientId);
      if (userError) {
        console.error("Error looking up user email:", userError);
      } else if (userData?.user?.email) {
        recipientEmail = userData.user.email;
        console.log("Resolved email from recipientId");
      }
    }

    console.log("Sending notification:", { type, handshakeId, callerUserId: userId, hasEmail: !!recipientEmail, recipientPhone: recipientPhone ? "****" + recipientPhone.slice(-4) : "none" });

    let emailContent = {
      subject: "",
      html: "",
    };

    // Determine reminder type for email subject/content
    const getReminderLabel = () => {
      if (type === "payment_reminder_3_days") return "3 Days Until Due";
      if (type === "payment_reminder_2_days") return "2 Days Until Due";
      if (type === "payment_reminder_due_today") return "Payment Due Today";
      return null;
    };

    const reminderLabel = getReminderLabel();

    switch (type) {
      case "handshake_request":
        const totalAmountWithFee = (data.amount || 0) + (data.transactionFee || 0);
        emailContent = {
          subject: "New Handshake Request on CashMe",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
              <div style="background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); padding: 30px; border-radius: 12px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">CashMe</h1>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #1f2937; margin-top: 0;">Hello ${recipientName}! 👋</h2>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                  You have received a new handshake request from <strong>${data.requesterName}</strong>.
                </p>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Amount Requested</p>
                  <p style="margin: 5px 0; color: #0ea5e9; font-size: 32px; font-weight: bold;">R ${data.amount?.toFixed(2)}</p>
                  <p style="margin: 10px 0 5px 0; color: #6b7280; font-size: 13px;">Transaction Fee (4.5%): R ${data.transactionFee?.toFixed(2)}</p>
                  <div style="border-top: 2px solid #e5e7eb; margin: 10px 0; padding-top: 10px;">
                    <p style="margin: 0; color: #1f2937; font-size: 16px; font-weight: bold;">Total to Receive: R ${totalAmountWithFee.toFixed(2)}</p>
                  </div>
                </div>
                
                <p style="color: #4b5563; font-size: 14px;">
                  <strong>Payback Date:</strong> ${new Date(data.paybackDate!).toLocaleDateString('en-ZA', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                
                <div style="background: #dbeafe; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #075985; font-size: 13px;">
                    <strong>Note:</strong> CashMe operates on a pay-as-you-go model. A 4.5% transaction fee is applied to all handshakes.
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://app.cashme.com'}/dashboard" 
                     style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    View Request
                  </a>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
                <p>This is an automated notification from CashMe</p>
              </div>
            </div>
          `,
        };
        break;

      case "handshake_approved":
        emailContent = {
          subject: "Your Handshake Request Was Approved! 🎉",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">CashMe</h1>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="font-size: 64px;">🎉</span>
                </div>
                
                <h2 style="color: #1f2937; margin-top: 0; text-align: center;">Great News, ${recipientName}!</h2>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
                  Your handshake request has been <strong style="color: #10b981;">approved</strong> by ${data.supporterName}!
                </p>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">Approved Amount</p>
                  <p style="margin: 5px 0 0 0; color: #10b981; font-size: 32px; font-weight: bold;">R ${data.amount}</p>
                </div>
                
                <p style="color: #4b5563; font-size: 14px;">
                  <strong>Payback Date:</strong> ${new Date(data.paybackDate!).toLocaleDateString('en-ZA', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>Important:</strong> Please ensure payment is made by the due date to maintain your cash rating.
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://app.cashme.com'}/dashboard" 
                     style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    View Details
                  </a>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
                <p>This is an automated notification from CashMe</p>
              </div>
            </div>
          `,
        };
        break;

      case "payment_reminder":
      case "payment_reminder_3_days":
      case "payment_reminder_2_days":
      case "payment_reminder_due_today":
        const daysLate = data.daysLate || 0;
        const isOverdue = daysLate > 0;
        const isDueToday = type === "payment_reminder_due_today";
        
        let urgencyColor = "#f59e0b"; // yellow for normal reminder
        let urgencyLabel = reminderLabel || "Payment Reminder";
        
        if (isOverdue) {
          urgencyColor = "#ef4444"; // red for overdue
          urgencyLabel = `${daysLate} Day${daysLate > 1 ? 's' : ''} Overdue`;
        } else if (isDueToday) {
          urgencyColor = "#ef4444"; // red for due today
        } else if (type === "payment_reminder_2_days") {
          urgencyColor = "#f59e0b"; // orange for 2 days
        } else if (type === "payment_reminder_3_days") {
          urgencyColor = "#06b6d4"; // cyan for 3 days
        }
        
        emailContent = {
          subject: isOverdue ? "⚠️ OVERDUE Payment - CashMe" : isDueToday ? "🔴 Payment Due TODAY - CashMe" : `🔔 ${urgencyLabel} - CashMe`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
              <div style="background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyColor}dd 100%); padding: 30px; border-radius: 12px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">CashMe</h1>
                <p style="color: white; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">${urgencyLabel}</p>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="font-size: 64px;">${isOverdue ? '⚠️' : isDueToday ? '🔴' : '🔔'}</span>
                </div>
                
                <h2 style="color: #1f2937; margin-top: 0; text-align: center;">
                  ${isOverdue ? 'Overdue Payment Notice' : isDueToday ? 'Payment Due Today!' : urgencyLabel}
                </h2>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                  Hello ${recipientName},
                </p>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                  ${isOverdue 
                    ? `Your payment to <strong>${data.supporterName}</strong> is now <strong style="color: #ef4444;">${daysLate} day${daysLate > 1 ? 's' : ''} overdue</strong>.`
                    : isDueToday
                    ? `Your payment to <strong>${data.supporterName}</strong> is <strong style="color: #ef4444;">due today</strong>. Please make your payment now to avoid late fees.`
                    : type === "payment_reminder_2_days"
                    ? `Your payment to <strong>${data.supporterName}</strong> is due in <strong style="color: #f59e0b;">2 days</strong>. Plan ahead to ensure on-time payment.`
                    : type === "payment_reminder_3_days"
                    ? `Your payment to <strong>${data.supporterName}</strong> is due in <strong style="color: #06b6d4;">3 days</strong>. This is a friendly early reminder.`
                    : `This is a friendly reminder that you have a payment due to <strong>${data.supporterName}</strong>.`
                  }
                </p>
                
                <div style="background: ${isOverdue || isDueToday ? '#fef2f2' : type === "payment_reminder_3_days" ? '#ecfeff' : '#fef3c7'}; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid ${urgencyColor};">
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">Amount Due</p>
                  <p style="margin: 5px 0; color: ${urgencyColor}; font-size: 32px; font-weight: bold;">R ${data.amount?.toFixed(2)}</p>
                  <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
                    Due Date: ${new Date(data.paybackDate!).toLocaleDateString('en-ZA', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                
                ${isOverdue ? `
                  <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #991b1b; font-size: 14px;">
                      <strong>Warning:</strong> Late payments affect your cash rating and may incur additional fees.
                    </p>
                  </div>
                ` : isDueToday ? `
                  <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #991b1b; font-size: 14px;">
                      <strong>Act Now:</strong> Pay today to avoid late fees and protect your cash rating!
                    </p>
                  </div>
                ` : `
                  <div style="background: #dbeafe; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #075985; font-size: 14px;">
                      <strong>Tip:</strong> Making payments on time helps maintain your excellent cash rating!
                    </p>
                  </div>
                `}
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://app.cashme.com'}/dashboard" 
                     style="display: inline-block; background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyColor}dd 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Make Payment Now
                  </a>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
                <p>This is an automated notification from CashMe</p>
              </div>
            </div>
          `,
        };
        break;

      case "handshake_rejected":
        emailContent = {
          subject: "Handshake Request Declined - CashMe",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
              <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 12px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">CashMe</h1>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #1f2937; margin-top: 0;">Hello ${recipientName},</h2>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                  Unfortunately, your handshake request to <strong>${data.supporterName}</strong> was declined.
                </p>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">Requested Amount</p>
                  <p style="margin: 5px 0 0 0; color: #ef4444; font-size: 32px; font-weight: bold;">R ${data.amount}</p>
                </div>
                
                <div style="background: #dbeafe; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #075985; font-size: 14px;">
                    <strong>Tip:</strong> Try reaching out to other supporters or adjust your request amount.
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://app.cashme.com'}/dashboard" 
                     style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Create New Request
                  </a>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
                <p>This is an automated notification from CashMe</p>
              </div>
            </div>
          `,
        };
        break;

      case "payment_received":
        emailContent = {
          subject: "Payment Received - CashMe",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">CashMe</h1>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="font-size: 64px;">✅</span>
                </div>
                
                <h2 style="color: #1f2937; margin-top: 0; text-align: center;">Payment Received!</h2>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
                  Great news, ${recipientName}! You've received a payment from <strong>${data.requesterName}</strong>.
                </p>
                
                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #10b981;">
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">Payment Amount</p>
                  <p style="margin: 5px 0; color: #10b981; font-size: 32px; font-weight: bold;">R ${data.paymentAmount}</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://app.cashme.com'}/dashboard" 
                     style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    View Details
                  </a>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
                <p>This is an automated notification from CashMe</p>
              </div>
            </div>
          `,
        };
        break;

      case "penalty_notification":
        emailContent = {
          subject: "Late Payment Penalty Applied - CashMe",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">CashMe</h1>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="font-size: 64px;">⚠️</span>
                </div>
                
                <h2 style="color: #1f2937; margin-top: 0; text-align: center;">Late Payment Penalty</h2>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                  Hello ${recipientName},
                </p>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                  A late payment penalty has been applied to your handshake with <strong>${data.supporterName}</strong>.
                </p>
                
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #f59e0b;">
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Days Overdue</p>
                  <p style="margin: 0 0 15px 0; color: #f59e0b; font-size: 24px; font-weight: bold;">${data.daysOverdue} days</p>
                  <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Penalty Amount</p>
                  <p style="margin: 0; color: #ef4444; font-size: 24px; font-weight: bold;">R ${data.penaltyAmount?.toFixed(2)}</p>
                </div>
                
                <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #991b1b; font-size: 14px;">
                    <strong>Action Required:</strong> Please make your payment as soon as possible to avoid further penalties and protect your cash rating.
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://app.cashme.com'}/dashboard" 
                     style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Make Payment
                  </a>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
                <p>This is an automated notification from CashMe</p>
              </div>
            </div>
          `,
        };
        break;

      default:
        emailContent = {
          subject: "Notification from CashMe",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1>Hello ${recipientName}</h1>
              <p>You have a new notification on CashMe.</p>
            </div>
          `,
        };
    }

    // Send email only if we have a recipient email
    let emailResponse = null;
    if (recipientEmail) {
      emailResponse = await resend.emails.send({
        from: "CashMe <notifications@resend.dev>",
        to: [recipientEmail],
        subject: emailContent.subject,
        html: emailContent.html,
      });
      console.log("Email sent successfully:", emailResponse);
    } else {
      console.log("No recipient email available, skipping email notification");
    }

    // Send SMS if phone number is provided
    let smsSent = false;
    if (recipientPhone) {
      const smsContent = getSMSContent(type, recipientName, data);
      smsSent = await sendSMS(recipientPhone, smsContent);
      console.log("SMS sent:", smsSent);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse?.data?.id,
        emailSent: !!recipientEmail,
        smsSent 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-handshake-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
