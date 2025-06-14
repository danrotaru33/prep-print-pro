
import { Download, Eye, FileText, CheckCircle, Loader2, Image, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProcessingState, ProcessingParameters } from "@/types/print";
import { useToast } from "@/components/ui/use-toast";

interface OutputPanelProps {
  processingState: ProcessingState;
  outputUrl: string | null;
  parameters: ProcessingParameters;
  processedImageUrl?: string | null;
  processingStep?: string | null;
  processingError?: string | null;
}

export const OutputPanel = ({
  processingState,
  outputUrl,
  parameters,
  processedImageUrl,
  processingStep,
  processingError
}: OutputPanelProps) => {
  const { toast } = useToast();
  const isCompleted = processingState === "completed" && outputUrl;
  const isProcessing = processingState === "processing";
  const isError = processingError !== null;

  const handleDownload = () => {
    if (!outputUrl) return;
    try {
      const link = document.createElement('a');
      link.href = outputUrl;
      link.download = `print-ready-${parameters.finalDimensions.width}x${parameters.finalDimensions.height}mm-${parameters.bleedMargin}mm-bleed.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
    if (!outputUrl) return;
    try {
      window.open(outputUrl, '_blank');
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

        {(processingState === "uploaded" || processingState === "validating" || processingState === "validated") && !isError && (
          <div className="text-center py-8 text-gray-500">
            <Loader2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Waiting for processing...</p>
          </div>
        )}

        {isProcessing && !isError && (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-600" />
            <p className="font-medium text-blue-700">Processing your file...</p>
            <p className="text-sm text-gray-500 mt-2">
              Applying {parameters.finalDimensions.width}×{parameters.finalDimensions.height}mm dimensions
            </p>
            <p className="text-sm text-gray-500">
              Adding {parameters.bleedMargin}mm bleed margin and {parameters.cutLineType} cut lines
            </p>
            {processingStep && (
              <div className="mt-4 text-sm text-blue-900">
                <span className="font-semibold">Step:</span> {processingStep}
              </div>
            )}
          </div>
        )}

        {isError && (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-600" />
            <p className="font-medium text-red-700">Processing Failed</p>
            {processingStep && (
              <p className="text-sm mt-2 text-red-800">
                <span className="font-semibold">Failed step:</span> {processingStep}
              </p>
            )}
            {processingError && (
              <p className="text-xs mt-2 text-red-700">
                <span className="font-semibold">Error:</span> {processingError}
              </p>
            )}
            <p className="text-xs mt-4 text-gray-500">
              Check the details above and try again. Contact support if the problem persists.
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

            {processedImageUrl && (
              <div className="border rounded-lg p-2 bg-gray-50">
                <div className="flex items-center space-x-2 mb-2">
                  <Image className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Processed Preview</span>
                </div>
                <img 
                  src={processedImageUrl} 
                  alt="Processed image with bleed and cut lines"
                  className="w-full h-auto rounded border max-h-64 object-contain"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Shows bleed extension and {parameters.cutLineType} cut lines
                </p>
              </div>
            )}

            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Format:</span> PDF</p>
                <p><span className="font-medium">Dimensions:</span> {parameters.finalDimensions.width}×{parameters.finalDimensions.height}mm</p>
                <p><span className="font-medium">DPI:</span> {parameters.dpi}</p>
                <p><span className="font-medium">Bleed:</span> {parameters.bleedMargin}mm</p>
                <p><span className="font-medium">Cut Lines:</span> {parameters.cutLineType}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Button onClick={handlePreview} variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Preview PDF
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
