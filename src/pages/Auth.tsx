import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/GlassCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Users } from "lucide-react";
import logo from "@/assets/cashme-logo.png";

const Auth = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<"requester" | "supporter">("requester");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // For demo purposes, navigate directly to dashboard
    navigate("/dashboard");
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // For demo purposes, navigate directly to dashboard
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md z-10 space-y-8 animate-slide-up">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={logo} alt="CashMe" className="w-32 h-32 object-contain" />
        </div>

        {/* Auth card */}
        <GlassCard>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/30">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="bg-input/50 border-border/50 focus:border-secondary transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="bg-input/50 border-border/50 focus:border-secondary transition-all"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  Login to CashMe
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-6">
              {/* Role selection */}
              <div className="space-y-4">
                <Label>I want to be a...</Label>
                <div className="grid grid-cols-2 gap-4">
                  <GlassCard
                    hover
                    onClick={() => setRole("requester")}
                    className={`p-4 text-center cursor-pointer transition-all ${
                      role === "requester" ? "border-secondary glow-cyan" : ""
                    }`}
                  >
                    <UserPlus className="w-8 h-8 mx-auto mb-2 text-secondary" />
                    <div className="font-medium">Requester</div>
                    <div className="text-xs text-foreground/60 mt-1">Need cash support</div>
                  </GlassCard>

                  <GlassCard
                    hover
                    onClick={() => setRole("supporter")}
                    className={`p-4 text-center cursor-pointer transition-all ${
                      role === "supporter" ? "border-secondary glow-cyan" : ""
                    }`}
                  >
                    <Users className="w-8 h-8 mx-auto mb-2 text-secondary" />
                    <div className="font-medium">Supporter</div>
                    <div className="text-xs text-foreground/60 mt-1">Help others grow</div>
                  </GlassCard>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    className="bg-input/50 border-border/50 focus:border-secondary transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@example.com"
                    className="bg-input/50 border-border/50 focus:border-secondary transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+27 XX XXX XXXX"
                    className="bg-input/50 border-border/50 focus:border-secondary transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="••••••••"
                    className="bg-input/50 border-border/50 focus:border-secondary transition-all"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </GlassCard>
      </div>
    </div>
  );
};

export default Auth;
