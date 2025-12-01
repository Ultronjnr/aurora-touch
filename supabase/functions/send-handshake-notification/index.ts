import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "handshake_request" | "handshake_approved" | "handshake_rejected" | "payment_reminder" | "payment_received" | "payment_overdue" | "penalty_notification";
  handshakeId: string;
  recipientEmail: string;
  recipientName: string;
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
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, recipientEmail, recipientName, data }: NotificationRequest = await req.json();

    console.log("Sending email notification:", { type, recipientEmail });

    let emailContent = {
      subject: "",
      html: "",
    };

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
                  <p style="margin: 10px 0 5px 0; color: #6b7280; font-size: 13px;">Transaction Fee (5%): R ${data.transactionFee?.toFixed(2)}</p>
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
                    <strong>Note:</strong> CashMe operates on a pay-as-you-go model. A 5% transaction fee is applied to all handshakes.
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
        const daysLate = data.daysLate || 0;
        const isOverdue = daysLate > 0;
        
        emailContent = {
          subject: isOverdue ? "⚠️ Overdue Payment Reminder - CashMe" : "Payment Reminder - CashMe",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
              <div style="background: ${isOverdue ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}; padding: 30px; border-radius: 12px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">CashMe</h1>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="font-size: 64px;">${isOverdue ? '⚠️' : '🔔'}</span>
                </div>
                
                <h2 style="color: #1f2937; margin-top: 0; text-align: center;">
                  ${isOverdue ? 'Overdue Payment Notice' : 'Payment Reminder'}
                </h2>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                  Hello ${recipientName},
                </p>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                  ${isOverdue 
                    ? `Your payment to <strong>${data.supporterName}</strong> is now <strong style="color: #ef4444;">${daysLate} day${daysLate > 1 ? 's' : ''} overdue</strong>.`
                    : `This is a friendly reminder that you have a payment due to <strong>${data.supporterName}</strong>.`
                  }
                </p>
                
                <div style="background: ${isOverdue ? '#fef2f2' : '#fef3c7'}; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid ${isOverdue ? '#ef4444' : '#f59e0b'};">
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">Amount Due</p>
                  <p style="margin: 5px 0; color: ${isOverdue ? '#ef4444' : '#f59e0b'}; font-size: 32px; font-weight: bold;">R ${data.amount}</p>
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
                ` : `
                  <div style="background: #dbeafe; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #075985; font-size: 14px;">
                      <strong>Tip:</strong> Making payments on time helps maintain your excellent cash rating!
                    </p>
                  </div>
                `}
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://app.cashme.com'}/dashboard" 
                     style="display: inline-block; background: ${isOverdue ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
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
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">Penalty Amount</p>
                  <p style="margin: 5px 0; color: #f59e0b; font-size: 32px; font-weight: bold;">R ${data.penaltyAmount}</p>
                  <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
                    Days Overdue: ${data.daysOverdue}
                  </p>
                </div>
                
                <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #991b1b; font-size: 14px;">
                    <strong>Important:</strong> This penalty has been added to your outstanding balance. Please make payment soon to avoid further penalties.
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
        throw new Error("Invalid notification type");
    }

    const emailResponse = await resend.emails.send({
      from: "CashMe <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-handshake-notification function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
