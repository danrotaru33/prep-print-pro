
import { FileImage } from "lucide-react";

export const Header = () => {
  return (
    <header className="border-b bg-white">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/lovable-uploads/bbb264b1-c234-4740-a029-203d800cf5a8.png" 
              alt="Daisler Print House Logo" 
              className="h-8 w-auto"
            />
            <h1 className="text-xl font-semibold text-gray-900">
              Daisler Print Optimizer
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
};
