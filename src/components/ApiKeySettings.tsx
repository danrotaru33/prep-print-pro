
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Settings } from "lucide-react";

interface ApiKeySettingsProps {
  onKeysChange?: (keys: { openai?: string; huggingface?: string }) => void;
}

export const ApiKeySettings = ({ onKeysChange }: ApiKeySettingsProps) => {
  const [huggingfaceKey, setHuggingfaceKey] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved keys from localStorage
    const savedHuggingfaceKey = localStorage.getItem('huggingface_api_key') || "";
    setHuggingfaceKey(savedHuggingfaceKey);
    
    // Notify parent of current keys (only HuggingFace now)
    if (onKeysChange) {
      onKeysChange({
        huggingface: savedHuggingfaceKey
      });
    }
  }, [onKeysChange]);

  const handleSave = () => {
    localStorage.setItem('huggingface_api_key', huggingfaceKey);
    
    if (onKeysChange) {
      onKeysChange({
        huggingface: huggingfaceKey
      });
    }

    toast({
      title: "API Key Saved",
      description: "Your HuggingFace API key has been saved locally and will be used for AI bleed generation.",
    });
    
    setIsOpen(false);
  };

  const hasKey = huggingfaceKey.length > 0;
  const isKeyHidden = hasKey && !isOpen;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>AI Configuration</span>
          </div>
          <Badge variant={hasKey ? "default" : "outline"}>
            {hasKey ? "Configured" : "Optional"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>Configure HuggingFace API key to enable AI-powered bleed generation.</p>
          <p className="text-xs mt-1">
            Without an API key, the system will use fallback methods for bleed areas.
          </p>
        </div>

        {!isOpen ? (
          <div className="space-y-2">
            {isKeyHidden && (
              <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                ✓ HuggingFace API key is configured and saved
              </div>
            )}
            <Button 
              onClick={() => setIsOpen(true)} 
              variant="outline" 
              className="w-full"
            >
              {hasKey ? "Update API Key" : "Configure API Key"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="huggingface-key">HuggingFace API Key (Primary)</Label>
              <Input
                id="huggingface-key"
                type="password"
                placeholder="hf_..."
                value={huggingfaceKey}
                onChange={(e) => setHuggingfaceKey(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                For LaMa inpainting. Get one at{" "}
                <a 
                  href="https://huggingface.co/settings/tokens" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  HuggingFace
                </a>
              </p>
            </div>

            <div className="flex space-x-2">
              <Button onClick={handleSave} className="flex-1">
                Save Key
              </Button>
              <Button 
                onClick={() => setIsOpen(false)} 
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
