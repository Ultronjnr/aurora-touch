 import { useEffect, useState } from "react";
 import { useNavigate, useSearchParams } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import { GlassCard } from "@/components/GlassCard";
 import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 
 const PaymentSuccess = () => {
   const navigate = useNavigate();
   const [searchParams] = useSearchParams();
   const [loading, setLoading] = useState(true);
   const [handshakeId, setHandshakeId] = useState<string | null>(null);
 
   useEffect(() => {
     const paymentId = searchParams.get("payment_id");
     
     if (paymentId) {
       // Fetch payment to get handshake ID
       const fetchPayment = async () => {
         try {
           const { data } = await supabase
             .from("payments")
             .select("handshake_id")
             .eq("id", paymentId)
             .single();
           
           if (data?.handshake_id) {
             setHandshakeId(data.handshake_id);
           }
         } catch (error) {
           console.error("Error fetching payment:", error);
         } finally {
           setLoading(false);
         }
       };
       fetchPayment();
     } else {
       setLoading(false);
     }
   }, [searchParams]);
 
   if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center p-6">
         <div className="flex items-center gap-3">
           <Loader2 className="w-6 h-6 animate-spin text-primary" />
           <span>Verifying payment...</span>
         </div>
       </div>
     );
   }
 
   return (
     <div className="min-h-screen flex flex-col items-center justify-center p-6">
       <GlassCard className="text-center py-12 max-w-md animate-scale-in">
         <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
           <CheckCircle2 className="w-12 h-12 text-green-500" />
         </div>
         
         <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
         <p className="text-foreground/60 mb-8">
           Your payment has been processed successfully. The handshake has been updated.
         </p>
 
         <div className="space-y-3">
           {handshakeId && (
             <Button
               onClick={() => navigate(`/handshake/${handshakeId}`)}
               className="w-full bg-gradient-to-r from-primary to-secondary"
             >
               View Handshake
               <ArrowRight className="w-4 h-4 ml-2" />
             </Button>
           )}
           
           <Button
             variant="outline"
             onClick={() => navigate("/dashboard")}
             className="w-full"
           >
             Go to Dashboard
           </Button>
         </div>
       </GlassCard>
     </div>
   );
 };
 
 export default PaymentSuccess;