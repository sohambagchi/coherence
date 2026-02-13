import React from 'react';
import { Database } from 'lucide-react';

interface MemoryProps {
    // No props needed for logical view currently
}

export const Memory: React.FC<MemoryProps> = () => {
    return (
        <div className="w-32 h-32 bg-slate-900 rounded-xl border border-slate-700 shadow-xl flex flex-col items-center justify-center gap-2 relative group overflow-hidden">
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-slate-900 to-slate-900"></div>

            <div className="z-10 bg-slate-800 p-3 rounded-full border border-slate-600 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Database size={24} className="text-indigo-400" />
            </div>
            <div className="z-10 text-xs font-bold text-slate-300 tracking-wider">MAIN MEMORY</div>

            {/* Active indicator (simulated) */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
        </div>
    );
};
