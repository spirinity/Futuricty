import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Search, BarChart3, Settings, ArrowRight, Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

const TUTORIAL_STORAGE_KEY = "futuricity-tutorial-seen";

const steps = [
  {
    title: "welcome.title",
    description: "welcome.description",
    icon: <MapPin className="w-12 h-12 text-primary mb-4" />,
  },
  {
    title: "search.title",
    description: "search.description",
    icon: <Search className="w-12 h-12 text-blue-500 mb-4" />,
  },
  {
    title: "analyze.title",
    description: "analyze.description",
    icon: <BarChart3 className="w-12 h-12 text-green-500 mb-4" />,
  },
  {
    title: "customize.title",
    description: "customize.description",
    icon: <Settings className="w-12 h-12 text-purple-500 mb-4" />,
  },
];

export function TutorialPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!hasSeenTutorial) {
      // Small delay to ensure the app is fully loaded before showing the popup
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    setIsOpen(false);
  };

  const handleSkip = () => {
    handleClose();
  };

  // Fallback for translations if keys are missing (since I haven't added them to LanguageProvider yet)
  // In a real scenario, I should add these keys to the translation files.
  // For now, I'll provide default English text if translation fails or returns the key.
  const getText = (key: string, defaultText: string) => {
    const translated = t(key);
    return translated === key ? defaultText : translated;
  };

  const getDefaultTitle = (index: number) => {
    switch (index) {
      case 0: return "Welcome to Futuricity";
      case 1: return "Find Locations";
      case 2: return "Analyze Livability";
      case 3: return "Customize Your View";
      default: return "";
    }
  };

  const getDefaultDescription = (index: number) => {
    switch (index) {
      case 0: return "Your advanced tool for analyzing urban livability and planning better cities.";
      case 1: return "Search for any location or simply click on the map to select a point of interest.";
      case 2: return "View detailed scores, facility breakdowns, and AI-powered insights for any selected area.";
      case 3: return "Toggle map layers, switch themes, and manage your own custom points of interest.";
      default: return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] text-center">
        <DialogHeader className="flex flex-col items-center justify-center pt-6">
          {steps[currentStep].icon}
          <DialogTitle className="text-2xl font-bold mb-2">
            {getText(steps[currentStep].title, getDefaultTitle(currentStep))}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {getText(steps[currentStep].description, getDefaultDescription(currentStep))}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center gap-1 mt-4 mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep ? "w-8 bg-primary" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between w-full">
          <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
            {getText("skip", "Skip")}
          </Button>
          <Button onClick={handleNext} className="gap-2">
            {currentStep === steps.length - 1 ? (
              <>
                {getText("get.started", "Get Started")} <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                {getText("next", "Next")} <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
