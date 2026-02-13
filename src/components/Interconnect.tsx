import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SimulationState, Message } from '../types';
import { Core } from './Core';
import { Memory } from './Memory';
import { Directory } from './Directory';

interface InterconnectProps {
    state: SimulationState;
    onMessageArrival: (msg: Message) => void;
}

// Coordinate mapping (percentages)
export const Interconnect: React.FC<InterconnectProps> = ({ state, onMessageArrival }) => {
    const isSnooping = state.coherenceType === 'Snooping';

    // Coordinate mapping (percentages)
    const getPosition = (id: string | number) => {
        const mapping: Record<string | number, { x: number; y: number }> = {
            // Cores (Top row)
            0: { x: 20, y: 15 },
            1: { x: 40, y: 15 },
            2: { x: 60, y: 15 },
            3: { x: 80, y: 15 },
            // Bus (Middle Line)
            'Bus': { x: 50, y: 50 },
            // Memory
            'Memory': isSnooping ? { x: 50, y: 85 } : { x: 25, y: 85 },
            // Directory
            'Directory': { x: 65, y: 85 }
        };
        return mapping[id] || { x: 50, y: 50 };
    };

    // Render Message Packet
    const renderMessage = (msg: Message) => {
        const start = getPosition(msg.from);
        const end = getPosition(msg.to);

        // Bus Line Y-coordinate (50%)
        const BUS_Y = 50;

        const times = [0, 0.3, 0.7, 1]; // Timing for each segment

        return (
            <motion.div
                key={msg.id}
                initial={{ left: `${start.x}%`, top: `${start.y}%`, opacity: 0, scale: 0.5 }}
                animate={{
                    left: [`${start.x}%`, `${start.x}%`, `${end.x}%`, `${end.x}%`],
                    top: [`${start.y}%`, `${BUS_Y}%`, `${BUS_Y}%`, `${end.y}%`],
                    opacity: [0, 1, 1, 1],
                    scale: [0.5, 1, 1, 1]
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeInOut", times: times }}
                onAnimationComplete={() => onMessageArrival(msg)}
                className="absolute w-6 h-6 -ml-3 -mt-3 z-50 flex items-center justify-center pointer-events-none"
            >
                <div className={`w-4 h-4 rounded-full shadow-md border border-white
                    ${msg.type === 'Request' ? 'bg-blue-500' :
                        msg.type === 'Response' ? 'bg-green-500' :
                            msg.type === 'Snoop' ? 'bg-purple-500' : 'bg-gray-500'}
                `}></div>
                <div className="absolute -top-5 text-[10px] bg-slate-800 text-white px-1.5 rounded-md whitespace-nowrap opacity-80 z-50">
                    {msg.action || msg.type}
                    {msg.address !== undefined ? ` @${msg.address}` : ''}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="w-full h-full relative bg-slate-950 p-4">
            {/* Background Diagram / Bus Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20 stroke-slate-600">
                {/* Main Bus Line (Horizontal Middle) */}
                <line x1="10%" y1="50%" x2="90%" y2="50%" strokeWidth="4" />

                {/* Drops to Cores */}
                <line x1="20%" y1="15%" x2="20%" y2="50%" strokeWidth="2" strokeDasharray="4" />
                <line x1="40%" y1="15%" x2="40%" y2="50%" strokeWidth="2" strokeDasharray="4" />
                <line x1="60%" y1="15%" x2="60%" y2="50%" strokeWidth="2" strokeDasharray="4" />
                <line x1="80%" y1="15%" x2="80%" y2="50%" strokeWidth="2" strokeDasharray="4" />

                {/* Drop to Memory */}
                {isSnooping ? (
                    <line x1="50%" y1="50%" x2="50%" y2="85%" strokeWidth="4" />
                ) : (
                    <line x1="25%" y1="50%" x2="25%" y2="85%" strokeWidth="4" />
                )}

                {/* Drop to Directory */}
                {!isSnooping && (
                    <line x1="65%" y1="50%" x2="65%" y2="85%" strokeWidth="4" />
                )}
            </svg>

            {/* Cores Container */}
            <div className="absolute top-[5%] left-0 w-full flex justify-around px-[10%]">
                {state.cores.map(core => (
                    <div key={core.id} className="relative z-10 w-[20%] max-w-[200px]">
                        <Core core={core} isActive={false} />
                    </div>
                ))}
            </div>

            {/* Memory & Directory Container */}

            {/* Memory */}
            <div
                className={`absolute bottom-[5%] -translate-x-1/2 z-10 transition-all duration-500
                    ${isSnooping ? 'left-[50%]' : 'left-[25%]'}
                `}
            >
                <Memory />
            </div>

            {/* Directory */}
            {!isSnooping && (
                <div className="absolute bottom-[5%] left-[40%] right-[2%] top-[60%] z-10 flex">
                    <Directory directory={state.directory} />
                </div>
            )}

            {/* Application Messages */}
            <AnimatePresence>
                {state.messages.map(msg => renderMessage(msg))}
            </AnimatePresence>
        </div>
    );
};
