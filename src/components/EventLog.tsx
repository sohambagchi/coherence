import React, { useRef, useEffect } from 'react';
import type { Message } from '../types';
import { ScrollText, ArrowRight, ArrowLeft, Check } from 'lucide-react';

interface EventLogProps {
    messages: Message[];
}

export const EventLog: React.FC<EventLogProps> = ({ messages }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of log when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (messages.length === 0) {
        return (
            <div className="flex flex-col gap-2 h-full">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <ScrollText size={16} />
                    <span>Event Log</span>
                </h3>
                <div className="flex-1 bg-slate-900/50 rounded-lg border border-slate-800/50 flex items-center justify-center text-slate-500 text-sm italic p-4 text-center">
                    System initialized. Waiting for events...
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 h-full min-h-0">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 shrink-0">
                <ScrollText size={16} />
                <span>Event Log</span>
                <span className="ml-auto text-xs font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full">
                    {messages.length} events
                </span>
            </h3>

            <div
                ref={scrollRef}
                className="flex-1 bg-slate-900 rounded-lg border border-slate-800 overflow-y-auto p-2 space-y-1.5 font-mono text-xs custom-scrollbar"
            >
                {messages.map((msg, idx) => {
                    // Determine styling based on message type
                    let borderColor = 'border-slate-800';
                    let iconColor = 'text-slate-500';
                    let bgColor = 'bg-slate-900/50';

                    if (msg.type === 'Request') {
                        borderColor = 'border-indigo-500/30';
                        iconColor = 'text-indigo-400';
                        bgColor = 'bg-indigo-950/10 hover:bg-indigo-950/20';
                    } else if (msg.type === 'Response') {
                        borderColor = 'border-emerald-500/30';
                        iconColor = 'text-emerald-400';
                        bgColor = 'bg-emerald-950/10 hover:bg-emerald-950/20';
                    } else if (msg.type === 'Snoop' || msg.type === 'Invalidate') {
                        borderColor = 'border-amber-500/30';
                        iconColor = 'text-amber-400';
                        bgColor = 'bg-amber-950/10 hover:bg-amber-950/20';
                    } else if (msg.type === 'Ack') {
                        borderColor = 'border-teal-500/30';
                        iconColor = 'text-teal-400';
                        bgColor = 'bg-teal-950/10 hover:bg-teal-950/20';
                    }

                    // Format source/dest
                    const formatEntity = (e: number | string) => {
                        if (typeof e === 'number') return `Core ${e}`;
                        return e;
                    };

                    return (
                        <div
                            key={`${msg.id}-${idx}`}
                            className={`p-2 rounded border ${borderColor} ${bgColor} transition-colors group`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className={`font-bold ${iconColor} flex items-center gap-1`}>
                                    {msg.action || msg.type}
                                    {msg.type === 'Response' && <ArrowLeft size={10} />}
                                    {msg.type === 'Request' && <ArrowRight size={10} />}
                                    {msg.type === 'Ack' && <Check size={10} />}
                                </span>
                                <span className="text-slate-600 text-[10px]">
                                    @{msg.timestamp}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                                <span className="opacity-70">{formatEntity(msg.from)}</span>
                                <ArrowRight size={10} className="text-slate-600" />
                                <span className="opacity-70">{formatEntity(msg.to)}</span>
                            </div>
                            <div className="mt-1 pt-1 border-t border-slate-800/50 flex justify-between text-slate-500">
                                <span>Addr: 0x{msg.address.toString(16).toUpperCase()}</span>
                                {msg.payload !== undefined && (
                                    <span>Data: {msg.payload}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
