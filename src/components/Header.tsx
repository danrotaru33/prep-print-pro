
import { Printer, Settings } from "lucide-react";

export const Header = () => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Printer className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Print Image Optimiser</h1>
            <p className="text-sm text-gray-500">Professional print preparation tool</p>
          </div>
        </div>
        
        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};
