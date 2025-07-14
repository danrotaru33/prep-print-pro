import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileImage, Download } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { processImageToPDF, ProcessingParams } from '@/services/simplePdfProcessor';

export default function SimpleDashboard() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [params, setParams] = useState<ProcessingParams>({
    width: 210, // A4 default
    height: 297,
    bleed: 3,
    safeMargin: 5
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setUploadedFile(file);
        
        // Create preview for images
        if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          setPreviewUrl(url);
        } else if (file.type === 'application/pdf') {
          setPreviewUrl(''); // We'll handle PDF preview separately if needed
        }
        
        toast({
          title: "File uploaded",
          description: `${file.name} uploaded successfully`
        });
      }
    }
  });

  const calculateOutputSize = () => {
    const totalWidth = params.width + (params.bleed * 2);
    const totalHeight = params.height + (params.bleed * 2);
    const pixelWidth = Math.round((totalWidth / 25.4) * 300); // Convert mm to pixels at 300 DPI
    const pixelHeight = Math.round((totalHeight / 25.4) * 300);
    return { pixelWidth, pixelHeight, totalWidth, totalHeight };
  };

  const outputSize = calculateOutputSize();

  const handleExport = async () => {
    if (!uploadedFile) {
      toast({
        title: "No file selected",
        description: "Please upload an image or PDF first",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Process the image
      const processedBlob = await processImageToPDF(uploadedFile, params);
      
      // Download the PDF
      const url = URL.createObjectURL(processedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${uploadedFile.name.replace(/\.[^/.]+$/, '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export successful",
        description: "Your PDF has been generated and downloaded"
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "There was an error processing your file",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/lovable-uploads/bbb264b1-c234-4740-a029-203d800cf5a8.png" 
              alt="Daisler Print House Logo" 
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Print Image Optimiser</h1>
          <p className="text-muted-foreground mt-2">Gata de print în câteva click-uri.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <FileImage className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {uploadedFile ? (
                  <div>
                    <p className="font-medium text-foreground">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-foreground mb-2">Drop your file here or click to browse</p>
                    <p className="text-sm text-muted-foreground">Supports JPG, PNG, and PDF files</p>
                  </div>
                )}
              </div>
              
              {previewUrl && (
                <div className="mt-4">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-32 object-contain border rounded"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parameters Section */}
          <Card>
            <CardHeader>
              <CardTitle>Print Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="width">Width (mm)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={params.width}
                    onChange={(e) => setParams(prev => ({ ...prev, width: Number(e.target.value) }))}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height (mm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={params.height}
                    onChange={(e) => setParams(prev => ({ ...prev, height: Number(e.target.value) }))}
                    min="1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bleed">Bleed (mm)</Label>
                  <Input
                    id="bleed"
                    type="number"
                    value={params.bleed}
                    onChange={(e) => setParams(prev => ({ ...prev, bleed: Number(e.target.value) }))}
                    min="0"
                    step="0.5"
                  />
                </div>
                <div>
                  <Label htmlFor="safeMargin">Safe Margin (mm)</Label>
                  <Input
                    id="safeMargin"
                    type="number"
                    value={params.safeMargin}
                    onChange={(e) => setParams(prev => ({ ...prev, safeMargin: Number(e.target.value) }))}
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Output Resolution:</span>
                    <span className="font-medium">300 DPI</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Size:</span>
                    <span className="font-medium">
                      {outputSize.totalWidth} × {outputSize.totalHeight} mm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pixels:</span>
                    <span className="font-medium">
                      {outputSize.pixelWidth} × {outputSize.pixelHeight} px
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Section */}
        <Card>
          <CardContent className="pt-6">
            <Button 
              onClick={handleExport}
              disabled={!uploadedFile || isProcessing}
              size="lg"
              className="w-full"
            >
              <Download className="h-5 w-5 mr-2" />
              {isProcessing ? 'Processing...' : 'Export PDF'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
