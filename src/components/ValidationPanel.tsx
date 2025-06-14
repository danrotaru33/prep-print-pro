
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ValidationResult } from "@/types/print";

interface ValidationPanelProps {
  validationResult: ValidationResult;
  onApprove: () => void;
}

export const ValidationPanel = ({ validationResult, onApprove }: ValidationPanelProps) => {
  const hasIssues = validationResult.warnings.length > 0 || validationResult.errors.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {validationResult.isValid ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
          <span>Validation Results</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasIssues ? (
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <p className="text-green-700 font-medium">All checks passed!</p>
            <p className="text-sm text-gray-500">Your file is ready for processing</p>
          </div>
        ) : (
          <div className="space-y-3">
            {validationResult.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-700">Errors</span>
                </div>
                {validationResult.errors.map((error, index) => (
                  <div key={index} className="ml-6 p-2 bg-red-50 rounded border-l-4 border-red-400">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-red-700">{error.message}</p>
                      <Badge variant="destructive" className="text-xs">
                        {error.category}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {validationResult.warnings.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-700">Warnings</span>
                </div>
                {validationResult.warnings.map((warning, index) => (
                  <div key={index} className="ml-6 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-yellow-700">{warning.message}</p>
                      <Badge variant="secondary" className="text-xs">
                        {warning.category}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {validationResult.isValid && (
          <Button onClick={onApprove} className="w-full">
            <CheckCircle className="h-4 w-4 mr-2" />
            Proceed with Processing
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
