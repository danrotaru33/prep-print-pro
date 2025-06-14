
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Image as ImageIcon, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadedFile, ProcessingState } from "@/types/print";
import { toast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileUpload: (file: UploadedFile) => void;
  uploadedFile: UploadedFile | null;
  processingState: ProcessingState;
}

export const FileUpload = ({ onFileUpload, uploadedFile, processingState }: FileUploadProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    const isPDF = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    
    if (!isPDF && !isImage) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or image file (JPEG, PNG)",
        variant: "destructive"
      });
      return;
    }

    // Create file object
    const uploadedFile: UploadedFile = {
      file,
      type: isPDF ? "pdf" : "image",
    };

    // Create preview for images
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedFile.preview = e.target?.result as string;
        onFileUpload(uploadedFile);
      };
      reader.readAsDataURL(file);
    } else {
      onFileUpload(uploadedFile);
    }

    toast({
      title: "File uploaded successfully",
      description: `${file.name} is ready for processing`,
    });
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png']
    },
    maxFiles: 1,
    disabled: processingState === "processing" || processingState === "validating"
  });

  const removeFile = () => {
    onFileUpload(null as any);
  };

  if (uploadedFile) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                {uploadedFile.type === "pdf" ? (
                  <FileText className="h-5 w-5 text-blue-600" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{uploadedFile.file.name}</p>
                <p className="text-sm text-gray-500">
                  {uploadedFile.type.toUpperCase()} • {Math.round(uploadedFile.file.size / 1024)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              disabled={processingState === "processing" || processingState === "validating"}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {uploadedFile.preview && (
            <div className="mt-4">
              <img
                src={uploadedFile.preview}
                alt="Preview"
                className="max-w-full h-32 object-contain rounded-lg border"
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          
          {isDragActive ? (
            <p className="text-blue-600 font-medium">Drop the file here...</p>
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                Drag & drop your file here
              </p>
              <p className="text-gray-500">
                or click to browse
              </p>
              <p className="text-sm text-gray-400">
                Supports PDF, JPEG, PNG files
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
