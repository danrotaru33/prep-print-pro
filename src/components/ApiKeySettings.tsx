
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
  const [openaiKey, setOpenaiKey] = useState("");
  const [huggingfaceKey, setHuggingfaceKey] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved keys from localStorage
    const savedOpenaiKey = localStorage.getItem('openai_api_key') || "";
    const savedHuggingfaceKey = localStorage.getItem('huggingface_api_key') || "";
    setOpenaiKey(savedOpenaiKey);
    setHuggingfaceKey(savedHuggingfaceKey);
    
    // Notify parent of current keys
    if (onKeysChange) {
      onKeysChange({
        openai: savedOpenaiKey,
        huggingface: savedHuggingfaceKey
      });
    }
  }, [onKeysChange]);

  const handleSave = () => {
    localStorage.setItem('openai_api_key', openaiKey);
    localStorage.setItem('huggingface_api_key', huggingfaceKey);
    
    if (onKeysChange) {
      onKeysChange({
        openai: openaiKey,
        huggingface: huggingfaceKey
      });
    }

    toast({
      title: "API Keys Saved",
      description: "Your API keys have been saved locally and will be used for AI bleed generation.",
    });
    
    setIsOpen(false);
  };

  const hasAnyKey = openaiKey.length > 0 || huggingfaceKey.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>AI Configuration</span>
          </div>
          <Badge variant={hasAnyKey ? "default" : "outline"}>
            {hasAnyKey ? "Configured" : "Optional"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>Configure API keys to enable AI-powered bleed generation.</p>
          <p className="text-xs mt-1">
            Without API keys, the system will use fallback methods for bleed areas.
          </p>
        </div>

        {!isOpen ? (
          <Button 
            onClick={() => setIsOpen(true)} 
            variant="outline" 
            className="w-full"
          >
            Configure API Keys
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key (Primary)</Label>
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                For DALL-E 3 inpainting. Get one at{" "}
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  OpenAI
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="huggingface-key">HuggingFace API Key (Fallback)</Label>
              <Input
                id="huggingface-key"
                type="password"
                placeholder="hf_..."
                value={huggingfaceKey}
                onChange={(e) => setHuggingfaceKey(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                For LaMa inpainting fallback. Get one at{" "}
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
                Save Keys
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
