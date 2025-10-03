import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { toast } from "sonner";

const CreateHandshake = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [supporter, setSupporter] = useState("");
  const [paybackDay, setPaybackDay] = useState<Date>();
  const [autoPayback, setAutoPayback] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show success toast
    toast.success("Handshake created successfully!", {
      description: "Your request has been sent to the supporter.",
    });
    
    // Navigate back to dashboard
    setTimeout(() => {
      navigate("/dashboard");
    }, 1000);
  };

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
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 text-lg bg-input/50 border-border/50 focus:border-secondary transition-all"
                  required
                />
              </div>
            </div>

            {/* Supporter */}
            <div className="space-y-2">
              <Label htmlFor="supporter">Select Supporter</Label>
              <Input
                id="supporter"
                type="text"
                placeholder="Search or enter name..."
                value={supporter}
                onChange={(e) => setSupporter(e.target.value)}
                className="bg-input/50 border-border/50 focus:border-secondary transition-all"
                required
              />
            </div>

            {/* Payback Day */}
            <div className="space-y-2">
              <Label>Payback Day</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
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
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Create Handshake
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};

export default CreateHandshake;
