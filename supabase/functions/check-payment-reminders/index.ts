import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    // Find handshakes that need reminders (3 days before due date or overdue)
    const { data: handshakes, error: fetchError } = await supabase
      .from('handshakes')
      .select(`
        id,
        amount,
        payback_day,
        days_late,
        requester:requester_id(id, full_name),
        supporter:supporter_id(id, full_name)
      `)
      .in('status', ['approved', 'active'])
      .or(`payback_day.eq.${threeDaysFromNow.toISOString().split('T')[0]},days_late.gt.0`);

    if (fetchError) throw fetchError;

    console.log(`Found ${handshakes?.length || 0} handshakes needing reminders`);

    // Send reminders
    const reminderPromises = (handshakes || []).map(async (handshake) => {
      try {
        // Get requester's email from auth.users
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(
          handshake.requester.id
        );

        if (userError || !user?.email) {
          console.error(`Could not get email for user ${handshake.requester.id}`);
          return;
        }

        await supabase.functions.invoke('send-handshake-notification', {
          body: {
            type: 'payment_reminder',
            handshakeId: handshake.id,
            recipientEmail: user.email,
            recipientName: handshake.requester.full_name,
            data: {
              amount: handshake.amount,
              supporterName: handshake.supporter.full_name,
              paybackDate: handshake.payback_day,
              daysLate: handshake.days_late || 0,
            }
          }
        });

        console.log(`Sent reminder for handshake ${handshake.id}`);
      } catch (error) {
        console.error(`Failed to send reminder for handshake ${handshake.id}:`, error);
      }
    });

    await Promise.all(reminderPromises);

    return new Response(
      JSON.stringify({ 
        success: true, 
        remindersSent: handshakes?.length || 0 
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
