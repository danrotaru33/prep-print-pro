import { AlertTriangle, FileImage, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PDFConversionGuideProps {
  onDismiss?: () => void;
}

export function PDFConversionGuide({ onDismiss }: PDFConversionGuideProps) {
  const conversionSteps = [
    {
      title: "Online PDF to Image Converters",
      description: "Use free online tools like PDF24, SmallPDF, or ILovePDF",
      steps: ["Upload your PDF", "Select PNG or JPG format", "Download the converted image"]
    },
    {
      title: "Adobe Acrobat Reader",
      description: "Export your PDF as an image",
      steps: ["Open PDF in Acrobat Reader", "File → Export To → Image", "Choose PNG format"]
    },
    {
      title: "Built-in OS Tools",
      description: "Use your operating system's built-in tools",
      steps: [
        "Mac: Open PDF in Preview → File → Export As → PNG",
        "Windows: Open PDF, take screenshot, or use Snipping Tool"
      ]
    }
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <CardTitle className="text-lg">PDF Conversion Required</CardTitle>
        </div>
        <CardDescription>
          We're having trouble processing your PDF. Please convert it to PNG or JPG format first.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <FileImage className="h-4 w-4" />
          <AlertDescription>
            Converting to PNG format will preserve the highest quality for print processing.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Conversion Options:</h4>
          
          {conversionSteps.map((method, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-2">
              <h5 className="font-medium text-sm">{method.title}</h5>
              <p className="text-sm text-muted-foreground">{method.description}</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {method.steps.map((step, stepIndex) => (
                  <li key={stepIndex} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://www.pdf24.org/en/pdf-to-jpg', '_blank')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Try PDF24 (Free)
          </Button>
          
          {onDismiss && (
            <Button variant="secondary" size="sm" onClick={onDismiss}>
              I'll Convert My PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}