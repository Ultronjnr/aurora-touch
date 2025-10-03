import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Crown, 
  Settings,
  LogOut
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Profile = () => {
  const navigate = useNavigate();

  const user = {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+27 82 123 4567",
    role: "Requester",
    verified: true,
    premium: false,
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
        <h1 className="text-2xl font-bold">Profile</h1>
      </header>

      <div className="max-w-md mx-auto space-y-6">
        {/* Profile Header */}
        <GlassCard className="text-center animate-scale-in">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-secondary/50">
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-secondary text-white">
                  {user.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              {user.verified && (
                <div className="absolute -bottom-2 -right-2 p-2 rounded-full bg-secondary glow-cyan">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-1">{user.name}</h2>
          <div className="text-sm text-foreground/60 mb-4">{user.role}</div>
          {user.verified && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-secondary text-sm">
              <Shield className="w-4 h-4" />
              Quick ID Verified
            </div>
          )}
        </GlassCard>

        {/* Premium Card */}
        {!user.premium && (
          <GlassCard 
            hover 
            className="bg-gradient-to-r from-primary/50 to-secondary/50 border-secondary/30 cursor-pointer animate-slide-in-right"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-secondary/30">
                <Crown className="w-8 h-8 text-secondary" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg mb-1">Go Premium</div>
                <div className="text-sm text-foreground/80">
                  Unlock Auto Payback, analytics & more
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Info Cards */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <GlassCard>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <Mail className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="text-sm text-foreground/60">Email</div>
                <div className="font-medium">{user.email}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <Phone className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="text-sm text-foreground/60">Phone</div>
                <div className="font-medium">{user.phone}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <User className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="text-sm text-foreground/60">Account Type</div>
                <div className="font-medium">{user.role}</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 border-border/50 hover:bg-muted/50 py-6 rounded-xl transition-all"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 border-destructive/50 text-destructive hover:bg-destructive/10 py-6 rounded-xl transition-all"
            onClick={() => navigate("/auth")}
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
