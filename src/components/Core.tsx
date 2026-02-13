import React from 'react';
import type { CoreData, CoherenceState } from '../types';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Cpu } from 'lucide-react';

interface CoreProps {
    core: CoreData;
    isActive: boolean; // If involved in current animation/action
}

const getStateColor = (state: CoherenceState) => {
    switch (state) {
        case 'Modified': return 'bg-red-500 border-red-400 text-white';
        case 'Owner': return 'bg-orange-500 border-orange-400 text-white';
        case 'Exclusive': return 'bg-yellow-400 border-yellow-300 text-black';
        case 'Shared': return 'bg-green-500 border-green-400 text-white';
        case 'Invalid': return 'bg-slate-700 border-slate-600 text-slate-400';
        default: return 'bg-slate-800 border-slate-700 text-slate-500';
    }
};

const getStateLabel = (state: CoherenceState) => {
    switch (state) {
        case 'Modified': return 'M';
        case 'Owner': return 'O';
        case 'Exclusive': return 'E';
        case 'Shared': return 'S';
        case 'Invalid': return 'I';
        default: return '?';
    }
};

export const Core: React.FC<CoreProps> = ({ core }) => {
    // We assume fixed cache size for visualization, e.g. 4 sets
    // If cache is empty, show empty slots. 
    // If we map by address, we can show specific lines.
    // Let's visualize a 4-line fully associative or direct mapped cache.
    // For simplicity, we just list the valid lines plus empty slots up to 4.

    return (
        <div className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 rounded-xl border border-indigo-500/30 shadow-lg relative">
            <div className="absolute -top-3 bg-slate-900 border border-indigo-500/50 px-3 py-1 rounded-full flex items-center gap-2 text-indigo-300 text-sm font-semibold shadow-sm">
                <Cpu size={14} />
                <span>Core {core.id}</span>
            </div>

            <div className="w-full mt-4 flex flex-col gap-2">
                {/* Header */}
                {/* Header */}
                <div className="grid grid-cols-4 gap-1 text-xs text-slate-500 px-2 font-mono uppercase tracking-wider mb-1">
                    <span className="col-span-1 text-center">State</span>
                    <span className="col-span-1 text-center">Tag</span>
                    <span className="col-span-2 text-right">Data</span>
                </div>

                {/* Cache Lines */}
                <div className="space-y-1.5 min-h-[160px]"> {/* Fixed height for alignment */}
                    {core.cache.map((line) => (
                        <motion.div
                            key={line.tag}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={clsx(
                                "grid grid-cols-4 items-center gap-1 py-1.5 px-2 rounded-md border text-xs font-mono shadow-sm transition-colors duration-300",
                                getStateColor(line.state)
                            )}
                        >
                            <div className="col-span-1 flex justify-center font-bold">
                                {getStateLabel(line.state)}
                            </div>
                            <div className="col-span-1 text-center opacity-90">
                                0x{line.tag.toString(16).toUpperCase()}
                            </div>
                            <div className="col-span-2 text-right opacity-90 truncate">
                                {line.data}
                            </div>
                        </motion.div>
                    ))}
                    {/* Empty Slots Filler */}
                    {[...Array(Math.max(0, 4 - core.cache.length))].map((_, i) => (
                        <div key={`empty-${i}`} className="h-[34px] rounded-md border border-slate-800/50 bg-slate-900/30 border-dashed flex items-center justify-center text-slate-700 text-xs">
                            Empty
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
