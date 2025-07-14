
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
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Daisler Print Optimizer
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Transform your images for perfect print production with precise dimensions, bleed, and margins.
        </p>
        <Link to="/auth">
          <Button size="lg" className="mr-4">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Simple Upload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Drag and drop your images or PDFs for instant processing.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Precise Control
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Set exact dimensions, bleed, and safe margins for perfect print output.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Download print-ready PDFs at 300 DPI with exact specifications.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

export default Index;
