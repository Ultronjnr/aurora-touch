 import { useNavigate, useSearchParams } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import { GlassCard } from "@/components/GlassCard";
 import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
 
 const PaymentCancel = () => {
   const navigate = useNavigate();
   const [searchParams] = useSearchParams();
   const handshakeId = searchParams.get("handshake_id");
 
   return (
     <div className="min-h-screen flex flex-col items-center justify-center p-6">
       <GlassCard className="text-center py-12 max-w-md animate-scale-in">
         <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
           <XCircle className="w-12 h-12 text-yellow-500" />
         </div>
         
         <h1 className="text-2xl font-bold mb-2">Payment Cancelled</h1>
         <p className="text-foreground/60 mb-8">
           Your payment was cancelled. No charges have been made to your account.
         </p>
 
         <div className="space-y-3">
           {handshakeId && (
             <Button
               onClick={() => navigate(`/handshake/${handshakeId}`)}
               className="w-full bg-gradient-to-r from-primary to-secondary"
             >
               <RefreshCw className="w-4 h-4 mr-2" />
               Try Again
             </Button>
           )}
           
           <Button
             variant="outline"
             onClick={() => navigate("/dashboard")}
             className="w-full"
           >
             <ArrowLeft className="w-4 h-4 mr-2" />
             Back to Dashboard
           </Button>
         </div>
       </GlassCard>
     </div>
   );
 };
 
 export default PaymentCancel;