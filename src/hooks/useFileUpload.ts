
import { useState } from "react";
import { UploadedFile, ProcessingState } from "@/types/print";

export function useFileUpload() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  const handleFileUpload = (file: UploadedFile) => {
    setUploadedFile(file);
  };

  const clearFile = () => {
    setUploadedFile(null);
  };

  return {
    uploadedFile,
    setUploadedFile,
    handleFileUpload,
    clearFile,
  };
}
