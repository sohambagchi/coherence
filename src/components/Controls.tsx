import React, { useState } from 'react';
import type { Protocol, PrAction, CoherenceType } from '../types';
import { Play, RotateCcw, Activity, ArrowRight, Pause, ChevronUp, ChevronDown } from 'lucide-react';

interface ControlsProps {
    protocol: Protocol;
    setProtocol: (p: Protocol) => void;
    coherenceType: CoherenceType;
    setCoherenceType: (t: CoherenceType) => void;
    onTrigger: (coreId: number, action: PrAction, address: number) => void;
    onReset: () => void;
    isPlaying: boolean;
    setIsPlaying: (p: boolean) => void;
}

export const Controls: React.FC<ControlsProps> = ({
    protocol, setProtocol, coherenceType, setCoherenceType, onTrigger, onReset, isPlaying, setIsPlaying
}) => {
    const [selectedCore, setSelectedCore] = useState(0);
    const [selectedAction, setSelectedAction] = useState<PrAction>('PrRd');
    const [address, setAddress] = useState(0);

    const handleAction = () => {
        onTrigger(selectedCore, selectedAction, address);
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Coherence Type Selector */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Coherence Mode</h3>
                <div className="bg-slate-900 p-1 rounded-lg flex gap-1 border border-slate-800">
                    <button
                        onClick={() => setCoherenceType('Snooping')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all
                            ${coherenceType === 'Snooping'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}
                        `}
                    >
                        <span>Snooping</span>
                    </button>
                    <button
                        onClick={() => setCoherenceType('Directory')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all
                            ${coherenceType === 'Directory'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}
                        `}
                    >
                        <span>Directory</span>
                    </button>
                </div>
            </div>

            <div className="h-px bg-slate-800" />
            {/* Protocol Selector */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Protocol</h3>
                <div className="grid grid-cols-2 gap-2">
                    {(['MSI', 'MESI', 'MOSI', 'MOESI'] as Protocol[]).map(p => (
                        <button
                            key={p}
                            onClick={() => setProtocol(p)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all
                                ${protocol === p
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}
                            `}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-px bg-slate-800" />

            {/* Action Trigger */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} />
                    <span>Trigger Event</span>
                </h3>

                <div className="space-y-3">
                    {/* Core Select */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500">Core</label>
                        <div className="flex gap-2">
                            {[0, 1, 2, 3].map(id => (
                                <button
                                    key={id}
                                    onClick={() => setSelectedCore(id)}
                                    className={`flex-1 py-1.5 rounded border text-xs font-mono transition-colors
                                        ${selectedCore === id
                                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                            : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'}
                                    `}
                                >
                                    #{id}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Action Select */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500">Operation</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedAction('PrRd')}
                                className={`flex-1 py-1.5 rounded border text-xs font-bold transition-colors
                                    ${selectedAction === 'PrRd'
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                        : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'}
                                `}
                            >
                                READ
                            </button>
                            <button
                                onClick={() => setSelectedAction('PrWr')}
                                className={`flex-1 py-1.5 rounded border text-xs font-bold transition-colors
                                    ${selectedAction === 'PrWr'
                                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                                        : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'}
                                `}
                            >
                                WRITE
                            </button>
                        </div>
                    </div>

                    {/* Address Input */}
                    {/* Address Input */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500 font-medium">Address (0-15)</label>
                        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1 group focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                            <input
                                type="number"
                                min={0}
                                max={15}
                                value={address}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val >= 0 && val <= 15) setAddress(val);
                                    else if (e.target.value === '') setAddress(0);
                                }}
                                className="w-full bg-transparent border-none text-slate-200 text-sm font-mono focus:outline-none px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <div className="flex flex-col gap-0.5 border-l border-slate-800 pl-1">
                                <button
                                    onClick={() => setAddress(prev => Math.min(15, prev + 1))}
                                    className="text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-sm p-0.5 transition-colors"
                                >
                                    <ChevronUp size={10} />
                                </button>
                                <button
                                    onClick={() => setAddress(prev => Math.max(0, prev - 1))}
                                    className="text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-sm p-0.5 transition-colors"
                                >
                                    <ChevronDown size={10} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleAction}
                        className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-semibold py-2 rounded-lg shadow-lg shadow-indigo-500/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <span>Execute</span>
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-800 space-y-3">
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors text-sm font-medium
                            ${isPlaying
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-500 hover:bg-amber-500/30'
                                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/30'}
                        `}
                    >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        <span>{isPlaying ? 'Pause Auto-Step' : 'Auto-Step'}</span>
                    </button>

                    <button
                        onClick={onReset}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm"
                    >
                        <RotateCcw size={14} />
                        <span>Reset</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
