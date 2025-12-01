import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, Calendar as CalendarIcon, Search, AlertTriangle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  unique_code: string;
  full_name: string;
  account_number: string | null;
  branch_code: string | null;
  account_type: string | null;
  phone: string | null;
}

const CreateHandshake = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [amount, setAmount] = useState("");
  const [supporterSearch, setSupporterSearch] = useState("");
  const [selectedSupporter, setSelectedSupporter] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [paybackDay, setPaybackDay] = useState<Date>();
  const [autoPayback, setAutoPayback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  
  // Penalty will be set by supporter during approval

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (supporterSearch.length >= 2) {
      searchSupporters();
    } else {
      setProfiles([]);
    }
  }, [supporterSearch]);

  const searchSupporters = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, unique_code, full_name, account_number, branch_code, account_type, phone')
        .neq('id', user?.id)
        .eq('kyc_completed', true) // Only show verified users
        .or(`unique_code.ilike.%${supporterSearch}%,full_name.ilike.%${supporterSearch}%`)
        .limit(5);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error("Error searching supporters");
    }
  };

  const selectSupporter = (profile: Profile) => {
    setSelectedSupporter(profile);
    setSupporterSearch(`${profile.full_name} (${profile.unique_code})`);
    setProfiles([]);
    setSearchFocused(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSupporter || !paybackDay) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);

    try {
      // Calculate 5% transaction fee
      const transactionFee = parseFloat(amount) * 0.05;
      
      // Create handshake - supporter will set penalty terms during approval
      const { data: handshakeData, error: handshakeError } = await supabase
        .from('handshakes')
        .insert({
          requester_id: user?.id,
          supporter_id: selectedSupporter.id,
          amount: parseFloat(amount),
          payback_day: format(paybackDay, 'yyyy-MM-dd'),
          auto_payback: autoPayback,
          status: 'pending',
          transaction_fee: transactionFee,
          payment_status: 'pending',
        })
        .select()
        .single();

      if (handshakeError) throw handshakeError;

      // Get supporter email
      const { data: supporterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', selectedSupporter.id)
        .single();

      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      // Send email notification to supporter
      try {
        const transactionFee = parseFloat(amount) * 0.05;
        await supabase.functions.invoke('send-handshake-notification', {
          body: {
            type: 'handshake_request',
            handshakeId: handshakeData.id,
            recipientEmail: user?.email, // In production, get supporter's email
            recipientName: supporterProfile?.full_name || 'Supporter',
            data: {
              amount: parseFloat(amount),
              requesterName: requesterProfile?.full_name || 'User',
              paybackDate: format(paybackDay, 'yyyy-MM-dd'),
              transactionFee: transactionFee,
            }
          }
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't block the flow if email fails
      }

      toast.success("Handshake created successfully!", {
        description: "Your request has been sent to the supporter.",
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (error: any) {
      toast.error("Error creating handshake", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <header className="flex items-center gap-4 mb-8 animate-slide-up">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="hover:bg-muted/50"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-2xl font-bold">Create Handshake</h1>
      </header>

      <div className="max-w-md mx-auto">
        <GlassCard className="animate-scale-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (ZAR)</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/60 text-lg">
                  R
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 text-lg bg-input/50 border-border/50 focus:border-secondary transition-all"
                  required
                />
              </div>
            </div>

            {/* Supporter Search */}
            <div className="space-y-2 relative">
              <Label htmlFor="supporter">Select Supporter</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/60" />
                <Input
                  id="supporter"
                  type="text"
                  placeholder="Search by name or unique code..."
                  value={supporterSearch}
                  onChange={(e) => setSupporterSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  className="pl-10 bg-input/50 border-border/50 focus:border-secondary transition-all"
                  required
                />
              </div>
              
              {/* Search Results */}
              {searchFocused && profiles.length > 0 && (
                <div className="absolute z-10 w-full mt-1 glass border border-border/50 rounded-lg overflow-hidden">
                  {profiles.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => selectSupporter(profile)}
                      className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                    >
                      <div className="font-medium">{profile.full_name}</div>
                      <div className="text-sm text-foreground/60 font-mono">{profile.unique_code}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Supporter - Full Banking Details */}
            {selectedSupporter && (
              <GlassCard className="bg-secondary/10 border-secondary/30 space-y-4">
                <div className="flex items-center justify-between border-b border-border/30 pb-3">
                  <div>
                    <div className="font-bold text-lg">{selectedSupporter.full_name}</div>
                    <div className="text-sm text-foreground/60 font-mono">
                      Code: {selectedSupporter.unique_code}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedSupporter(null);
                      setSupporterSearch("");
                    }}
                    className="hover:bg-secondary/20"
                  >
                    Change
                  </Button>
                </div>

                {/* Banking Details Display */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
                    Banking Information
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-foreground/60 uppercase">Account Number</div>
                      <div className="font-mono font-medium text-sm">
                        {selectedSupporter.account_number || "Not provided"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-foreground/60 uppercase">Branch Code</div>
                      <div className="font-mono font-medium text-sm">
                        {selectedSupporter.branch_code || "Not provided"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-foreground/60 uppercase">Account Type</div>
                      <div className="font-medium text-sm capitalize">
                        {selectedSupporter.account_type || "Not provided"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-foreground/60 uppercase">Phone</div>
                      <div className="font-medium text-sm">
                        {selectedSupporter.phone || "Not provided"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/30">
                  <p className="text-xs text-foreground/60 italic">
                    ✓ Verified user - All details confirmed through KYC
                  </p>
                </div>
              </GlassCard>
            )}

            {/* Payback Day */}
            <div className="space-y-2">
              <Label>Payback Day</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-input/50 border-border/50 hover:border-secondary transition-all"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paybackDay ? format(paybackDay, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 glass border-border/50" align="start">
                  <Calendar
                    mode="single"
                    selected={paybackDay}
                    onSelect={setPaybackDay}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Auto Payback */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/30">
              <div className="space-y-1">
                <Label htmlFor="auto-payback" className="cursor-pointer">
                  Enable Auto Payback
                </Label>
                <p className="text-sm text-foreground/60">
                  Automatically pay on the due date
                </p>
              </div>
              <Switch
                id="auto-payback"
                checked={autoPayback}
                onCheckedChange={setAutoPayback}
              />
            </div>

            {/* Info Note */}
            <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
              <p className="text-sm text-foreground/70">
                💡 The supporter will set penalty terms (if any) when approving your request.
              </p>
            </div>

            {/* Transaction Fee Info */}
            {amount && parseFloat(amount) > 0 && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-foreground/80">Amount Requested:</span>
                  <span className="font-semibold">R {parseFloat(amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-foreground/80">Transaction Fee (5%):</span>
                  <span className="font-semibold text-secondary">R {(parseFloat(amount) * 0.05).toFixed(2)}</span>
                </div>
                <div className="border-t border-border/30 pt-2 mt-2 flex justify-between items-center">
                  <span className="font-semibold">Total to Repay:</span>
                  <span className="font-bold text-lg gradient-text">R {(parseFloat(amount) + parseFloat(amount) * 0.05).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
              <p className="text-sm text-foreground/80">
                Your handshake request will be sent to the supporter for approval. 
                You'll receive a notification once they respond.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {loading ? "Creating..." : "Create Handshake"}
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};

export default CreateHandshake;
