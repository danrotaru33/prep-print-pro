
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Palette, Zap, Download } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Index: Landing page with simple navigation to the main app
 */
const Index = () => (
  <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
    <div className="container mx-auto px-6 py-16">
      <div className="text-center mb-16">
        <div className="flex justify-center mb-6">
          <img 
            src="/lovable-uploads/bbb264b1-c234-4740-a029-203d800cf5a8.png" 
            alt="Daisler Print House Logo" 
            className="h-20 w-auto"
          />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Print Image Optimiser
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Funcționalități actuale: bleed, safe margin, DPI 300.
        </p>
        <Link to="/dashboard">
          <Button size="lg" className="mr-4">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

    </div>
  </div>
);

export default Index;
