import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/cashme-logo.png";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/onboarding");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-radial opacity-50 animate-pulse-glow" />
      
      {/* Floating circles */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-secondary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
      
      {/* Logo */}
      <div className="relative z-10 animate-scale-in">
        <img 
          src={logo} 
          alt="CashMe Logo" 
          className="w-64 h-64 object-contain glow-cyan-strong animate-pulse-glow"
        />
      </div>
    </div>
  );
};

export default Splash;
