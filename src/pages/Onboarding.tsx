import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { ArrowRight, Handshake, TrendingUp, Calendar, Shield } from "lucide-react";

const slides = [
  {
    icon: Handshake,
    title: "Create Handshakes",
    description: "Request or support loans with trusted peers. Build financial connections that matter.",
  },
  {
    icon: TrendingUp,
    title: "Build Your Cash Rating",
    description: "Complete paybacks on time to improve your Cash Rating and unlock better opportunities.",
  },
  {
    icon: Calendar,
    title: "Never Miss a Payback Day",
    description: "Get heads-up alerts and use Auto Payback to stay on track with your agreements.",
  },
  {
    icon: Shield,
    title: "Safe & Secure",
    description: "Quick ID Check verification and fraud monitoring keep your money safe.",
  },
];

const Onboarding = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/auth");
    }
  };

  const handleSkip = () => {
    navigate("/auth");
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      {/* Skip button */}
      <div className="w-full max-w-md flex justify-end z-10">
        <Button variant="ghost" onClick={handleSkip} className="text-foreground/70 hover:text-foreground">
          Skip
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center w-full max-w-md z-10">
        <GlassCard className="w-full text-center animate-slide-up">
          <div className="mb-8 flex justify-center">
            <div className="p-6 rounded-full bg-gradient-to-br from-primary to-secondary glow-cyan">
              <Icon className="w-16 h-16 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-4 gradient-text">
            {slide.title}
          </h1>
          
          <p className="text-foreground/80 text-lg leading-relaxed">
            {slide.description}
          </p>
        </GlassCard>
      </div>

      {/* Navigation */}
      <div className="w-full max-w-md space-y-6 z-10">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "w-8 bg-secondary"
                  : "w-2 bg-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Next button */}
        <Button
          onClick={handleNext}
          className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white text-lg py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
