import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Check, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AIKeySetup() {
  const [huggingfaceKey, setHuggingfaceKey] = useState("");
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    const existingKey = localStorage.getItem('huggingface_api_key');
    setHasExistingKey(!!(existingKey && existingKey.length > 0));
  }, []);

  const handleSaveKey = () => {
    if (huggingfaceKey.trim()) {
      localStorage.setItem('huggingface_api_key', huggingfaceKey.trim());
      setHasExistingKey(true);
      setShowKeyInput(false);
      setHuggingfaceKey("");
    }
  };

  const handleRemoveKey = () => {
    localStorage.removeItem('huggingface_api_key');
    setHasExistingKey(false);
    setHuggingfaceKey("");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          AI Enhancement Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasExistingKey ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Add a HuggingFace API key to enable AI-powered bleed area enhancement. 
              Without this, basic pattern fill will be used instead.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              HuggingFace API key is configured. AI enhancement is available.
            </AlertDescription>
          </Alert>
        )}

        {!hasExistingKey && !showKeyInput && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              To get better bleed area results, you can configure a HuggingFace API key.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setShowKeyInput(true)}>
                Add HuggingFace API Key
              </Button>
              <Button variant="outline" asChild>
                <a 
                  href="https://huggingface.co/settings/tokens" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  Get API Key
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        )}

        {showKeyInput && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="huggingface-key">HuggingFace API Key</Label>
              <Input
                id="huggingface-key"
                type="password"
                placeholder="hf_..."
                value={huggingfaceKey}
                onChange={(e) => setHuggingfaceKey(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveKey} disabled={!huggingfaceKey.trim()}>
                Save Key
              </Button>
              <Button variant="outline" onClick={() => setShowKeyInput(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {hasExistingKey && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowKeyInput(true)}>
              Update Key
            </Button>
            <Button variant="destructive" onClick={handleRemoveKey}>
              Remove Key
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}