
import { useState } from "react";
import { ProcessingParameters } from "@/types/print";

export function useParameters() {
  const [parameters, setParameters] = useState<ProcessingParameters>({
    finalDimensions: { width: 210, height: 297 }, // A4 default
    bleedMargin: 3,
    dpi: 300,
    cutLineType: "rectangle"
  });
  const [bleedPrompt, setBleedPrompt] = useState<string>("");

  const handleParameterChange = (newParams: Partial<ProcessingParameters>) => {
    setParameters(prev => ({ ...prev, ...newParams }));
  };

  return {
    parameters,
    setParameters,
    bleedPrompt,
    setBleedPrompt,
    handleParameterChange,
  };
}
