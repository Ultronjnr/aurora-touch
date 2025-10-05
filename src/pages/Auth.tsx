import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/GlassCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/cashme-logo.png";

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [role, setRole] = useState<"requester" | "supporter">("requester");
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signUp(
      registerEmail,
      registerPassword,
      registerName,
      registerPhone,
      role
    );

    if (error) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account created!",
        description: "Welcome to CashMe",
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="pointer-events-none absolute top-0 left-0 w-72 sm:w-96 h-72 sm:h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-glow" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md sm:max-w-lg z-10 space-y-6 sm:space-y-8 animate-slide-up">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={logo} alt="CashMe" className="w-24 h-24 sm:w-32 sm:h-32 object-contain" />
        </div>

        {/* Auth card */}
        <GlassCard>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 bg-muted/30">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 sm:space-y-6">
              <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="bg-input/50 border-border/50 focus:border-secondary transition-all"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
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
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white py-5 sm:py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  {loading ? "Logging in..." : "Login to CashMe"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 sm:space-y-6">
              {/* Role selection */}
              <div className="space-y-3 sm:space-y-4">
                <Label>I want to be a...</Label>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <GlassCard
                    hover
                    onClick={() => setRole("requester")}
                    className={`p-4 text-center cursor-pointer transition-all ${
                      role === "requester" ? "border-secondary glow-cyan" : ""
                    }`}
                  >
                    <UserPlus className="w-7 h-7 sm:w-8 sm:h-8 mx-auto mb-2 text-secondary" />
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
                    <Users className="w-7 h-7 sm:w-8 sm:h-8 mx-auto mb-2 text-secondary" />
                    <div className="font-medium">Supporter</div>
                    <div className="text-xs text-foreground/60 mt-1">Help others grow</div>
                  </GlassCard>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    className="bg-input/50 border-border/50 focus:border-secondary transition-all"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
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
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
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
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
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
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white py-5 sm:py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  {loading ? "Creating Account..." : "Create Account"}
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
