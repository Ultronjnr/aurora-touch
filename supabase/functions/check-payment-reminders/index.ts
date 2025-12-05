import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HandshakeWithProfiles {
  id: string;
  amount: number;
  payback_day: string;
  days_late: number | null;
  amount_paid: number | null;
  transaction_fee: number | null;
  late_fee: number | null;
  requester: {
    id: string;
    full_name: string;
    phone: string | null;
  };
  supporter: {
    id: string;
    full_name: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate dates for reminders
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);
    const twoDaysStr = twoDaysFromNow.toISOString().split('T')[0];
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];
    
    console.log(`Checking reminders for dates: today=${todayStr}, 2days=${twoDaysStr}, 3days=${threeDaysStr}`);
    
    // Find handshakes that need reminders
    // 1. Due in 3 days
    // 2. Due in 2 days
    // 3. Due today
    // 4. Overdue
    const { data: handshakes, error: fetchError } = await supabase
      .from('handshakes')
      .select(`
        id,
        amount,
        payback_day,
        days_late,
        amount_paid,
        transaction_fee,
        late_fee,
        requester:requester_id(id, full_name, phone),
        supporter:supporter_id(id, full_name)
      `)
      .in('status', ['approved', 'active']);

    if (fetchError) throw fetchError;

    console.log(`Found ${handshakes?.length || 0} active/approved handshakes`);

    const reminderResults = {
      threeDays: 0,
      twoDays: 0,
      dueToday: 0,
      overdue: 0,
      errors: 0,
    };

    // Process each handshake
    for (const handshake of (handshakes || []) as HandshakeWithProfiles[]) {
      try {
        const paybackDate = handshake.payback_day;
        const outstandingBalance = (handshake.amount || 0) + 
          (handshake.transaction_fee || 0) + 
          (handshake.late_fee || 0) - 
          (handshake.amount_paid || 0);
        
        // Skip if fully paid
        if (outstandingBalance <= 0) {
          continue;
        }

        // Get requester's email and phone
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(
          handshake.requester.id
        );

        if (userError || !user?.email) {
          console.error(`Could not get email for user ${handshake.requester.id}`);
          continue;
        }

        let reminderType: string | null = null;
        let notificationType: string | null = null;

        // Determine reminder type based on date
        if (paybackDate === threeDaysStr) {
          reminderType = 'payment_reminder_3_days';
          notificationType = 'payment_reminder_3_days';
          reminderResults.threeDays++;
        } else if (paybackDate === twoDaysStr) {
          reminderType = 'payment_reminder_2_days';
          notificationType = 'payment_reminder_2_days';
          reminderResults.twoDays++;
        } else if (paybackDate === todayStr) {
          reminderType = 'payment_reminder_due_today';
          notificationType = 'payment_reminder_due_today';
          reminderResults.dueToday++;
        } else if (paybackDate < todayStr) {
          // Overdue - send daily reminder
          reminderType = 'payment_reminder';
          notificationType = 'payment_overdue';
          reminderResults.overdue++;
        }

        if (!reminderType) {
          continue;
        }

        // Check if we already sent this type of reminder today
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('handshake_id', handshake.id)
          .eq('type', notificationType)
          .gte('sent_at', todayStr)
          .single();

        if (existingNotification) {
          console.log(`Already sent ${notificationType} reminder for handshake ${handshake.id} today`);
          continue;
        }

        // Send notification via edge function
        const { error: invokeError } = await supabase.functions.invoke('send-handshake-notification', {
          body: {
            type: reminderType,
            handshakeId: handshake.id,
            recipientEmail: user.email,
            recipientName: handshake.requester.full_name,
            recipientPhone: handshake.requester.phone,
            data: {
              amount: outstandingBalance,
              supporterName: handshake.supporter.full_name,
              paybackDate: handshake.payback_day,
              daysLate: handshake.days_late || 0,
            }
          }
        });

        if (invokeError) {
          console.error(`Failed to send ${reminderType} for handshake ${handshake.id}:`, invokeError);
          reminderResults.errors++;
          continue;
        }

        // Create in-app notification
        const notificationTitle = reminderType === 'payment_reminder_3_days' 
          ? 'Payment Due in 3 Days'
          : reminderType === 'payment_reminder_2_days'
          ? 'Payment Due in 2 Days'
          : reminderType === 'payment_reminder_due_today'
          ? 'Payment Due Today!'
          : 'Payment Overdue';

        const daysOverdue = handshake.days_late || 0;
        const notificationMessage = reminderType === 'payment_reminder_3_days'
          ? `Your payment of R${outstandingBalance.toFixed(2)} to ${handshake.supporter.full_name} is due in 3 days.`
          : reminderType === 'payment_reminder_2_days'
          ? `Reminder: Your payment of R${outstandingBalance.toFixed(2)} to ${handshake.supporter.full_name} is due in 2 days.`
          : reminderType === 'payment_reminder_due_today'
          ? `URGENT: Your payment of R${outstandingBalance.toFixed(2)} to ${handshake.supporter.full_name} is due today!`
          : `Your payment of R${outstandingBalance.toFixed(2)} to ${handshake.supporter.full_name} is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue.`;

        await supabase.from('notifications').insert({
          user_id: handshake.requester.id,
          handshake_id: handshake.id,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          action_url: `/handshake/${handshake.id}`,
          data: {
            amount: outstandingBalance,
            due_date: handshake.payback_day,
            supporter_name: handshake.supporter.full_name,
            days_late: handshake.days_late || 0,
          }
        });

        console.log(`Sent ${reminderType} reminder for handshake ${handshake.id}`);
      } catch (error) {
        console.error(`Error processing handshake ${handshake.id}:`, error);
        reminderResults.errors++;
      }
    }

    console.log('Reminder results:', reminderResults);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: reminderResults,
        totalSent: reminderResults.threeDays + reminderResults.twoDays + reminderResults.dueToday + reminderResults.overdue
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
    console.error("Error in check-payment-reminders function:", error);
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
