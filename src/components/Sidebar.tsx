
import { ProcessingParameters, ProcessingState } from "@/types/print";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  parameters: ProcessingParameters;
  onParameterChange: (params: Partial<ProcessingParameters>) => void;
  processingState: ProcessingState;
}

export const Sidebar = ({ parameters, onParameterChange, processingState }: SidebarProps) => {
  const isDisabled = processingState === "processing" || processingState === "validating";

  return (
    <aside className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Processing Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Final Dimensions */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Final Dimensions (mm)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="width" className="text-xs text-gray-500">Width</Label>
                <Input
                  id="width"
                  type="number"
                  value={parameters.finalDimensions.width}
                  onChange={(e) => onParameterChange({
                    finalDimensions: {
                      ...parameters.finalDimensions,
                      width: Number(e.target.value)
                    }
                  })}
                  disabled={isDisabled}
                  className="h-8"
                />
              </div>
              <div>
                <Label htmlFor="height" className="text-xs text-gray-500">Height</Label>
                <Input
                  id="height"
                  type="number"
                  value={parameters.finalDimensions.height}
                  onChange={(e) => onParameterChange({
                    finalDimensions: {
                      ...parameters.finalDimensions,
                      height: Number(e.target.value)
                    }
                  })}
                  disabled={isDisabled}
                  className="h-8"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Bleed Margin */}
          <div className="space-y-2">
            <Label htmlFor="bleed" className="text-sm font-medium">Bleed Margin (mm)</Label>
            <Input
              id="bleed"
              type="number"
              value={parameters.bleedMargin}
              onChange={(e) => onParameterChange({ bleedMargin: Number(e.target.value) })}
              disabled={isDisabled}
              className="h-8"
            />
          </div>

          <Separator />

          {/* DPI Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">DPI</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={parameters.dpi === 150 ? "default" : "outline"}
                size="sm"
                onClick={() => onParameterChange({ dpi: 150 })}
                disabled={isDisabled}
              >
                150 DPI
              </Button>
              <Button
                variant={parameters.dpi === 300 ? "default" : "outline"}
                size="sm"
                onClick={() => onParameterChange({ dpi: 300 })}
                disabled={isDisabled}
              >
                300 DPI
              </Button>
            </div>
          </div>

          <Separator />

          {/* Cut Line Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cut Line Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={parameters.cutLineType === "rectangle" ? "default" : "outline"}
                size="sm"
                onClick={() => onParameterChange({ cutLineType: "rectangle" })}
                disabled={isDisabled}
              >
                Rectangle
              </Button>
              <Button
                variant={parameters.cutLineType === "circle" ? "default" : "outline"}
                size="sm"
                onClick={() => onParameterChange({ cutLineType: "circle" })}
                disabled={isDisabled}
              >
                Circle
              </Button>
            </div>
          </div>

          <Separator />

          {/* Presets */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Presets</Label>
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => onParameterChange({
                  finalDimensions: { width: 85, height: 55 },
                  bleedMargin: 2,
                  dpi: 300
                })}
                disabled={isDisabled}
              >
                Business Card (85×55mm)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => onParameterChange({
                  finalDimensions: { width: 210, height: 297 },
                  bleedMargin: 3,
                  dpi: 300
                })}
                disabled={isDisabled}
              >
                A4 Flyer (210×297mm)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => onParameterChange({
                  finalDimensions: { width: 420, height: 594 },
                  bleedMargin: 5,
                  dpi: 150
                })}
                disabled={isDisabled}
              >
                A2 Poster (420×594mm)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
};
