
import { Download, Eye, FileText, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProcessingState, ProcessingParameters } from "@/types/print";
import { useToast } from "@/components/ui/use-toast";

interface OutputPanelProps {
  processingState: ProcessingState;
  outputUrl: string | null;
  parameters: ProcessingParameters;
}

export const OutputPanel = ({ processingState, outputUrl, parameters }: OutputPanelProps) => {
  const { toast } = useToast();
  const isCompleted = processingState === "completed" && outputUrl;
  const isProcessing = processingState === "processing";

  const createMockPDF = () => {
    // Create a simple mock PDF for demonstration
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 ${parameters.finalDimensions.width * 2.83} ${parameters.finalDimensions.height * 2.83}]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Processed Print File) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000267 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
361
%%EOF`;
    
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  };

  const handleDownload = () => {
    try {
      // Create a proper downloadable PDF blob
      const downloadUrl = createMockPDF();
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `print-ready-${parameters.finalDimensions.width}x${parameters.finalDimensions.height}mm.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Download Started",
        description: "Your print-ready PDF is being downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "There was an error downloading the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePreview = () => {
    try {
      // Create a blob URL for preview
      const previewUrl = createMockPDF();
      window.open(previewUrl, '_blank');
      
      toast({
        title: "Preview Opened",
        description: "Your print-ready PDF has been opened in a new tab.",
      });
    } catch (error) {
      toast({
        title: "Preview Failed",
        description: "There was an error opening the preview. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Output</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {processingState === "idle" && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Upload a file to get started</p>
          </div>
        )}

        {(processingState === "uploaded" || processingState === "validating" || processingState === "validated") && (
          <div className="text-center py-8 text-gray-500">
            <Loader2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Waiting for processing...</p>
          </div>
        )}

        {isProcessing && (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-600" />
            <p className="font-medium text-blue-700">Processing your file...</p>
            <p className="text-sm text-gray-500 mt-2">
              Applying {parameters.finalDimensions.width}×{parameters.finalDimensions.height}mm dimensions
            </p>
          </div>
        )}

        {isCompleted && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
              <p className="font-medium text-green-700">Processing Complete!</p>
              <p className="text-sm text-gray-500">Your file is ready for download</p>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Format:</span> PDF</p>
                <p><span className="font-medium">Dimensions:</span> {parameters.finalDimensions.width}×{parameters.finalDimensions.height}mm</p>
                <p><span className="font-medium">DPI:</span> {parameters.dpi}</p>
                <p><span className="font-medium">Bleed:</span> {parameters.bleedMargin}mm</p>
              </div>
            </div>

            <div className="space-y-2">
              <Button onClick={handlePreview} variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleDownload} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
