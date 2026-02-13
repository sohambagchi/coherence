import React from 'react';
import { FolderOpen } from 'lucide-react';
import type { DirectoryEntry } from '../types';

interface DirectoryProps {
    directory: DirectoryEntry[];
}

export const Directory: React.FC<DirectoryProps> = ({ directory }) => {
    return (
        <div className="w-full h-full bg-slate-900 rounded-xl border border-slate-700 shadow-xl p-4 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-slate-300 font-semibold border-b border-slate-800 pb-2 w-full justify-center">
                <FolderOpen size={16} />
                <span>Directory</span>
            </div>

            <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950 text-slate-200 font-mono text-xs uppercase">
                        <tr>
                            <th className="px-3 py-2 border-b border-slate-800">Addr</th>
                            <th className="px-3 py-2 border-b border-slate-800">State</th>
                            <th className="px-3 py-2 border-b border-slate-800">Sharers</th>
                            <th className="px-3 py-2 border-b border-slate-800">Owner</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {directory.map((entry, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                                <td className="px-3 py-1 font-mono text-slate-500">0x{idx.toString(16).toUpperCase()}</td>
                                <td className={`px-3 py-1 font-semibold ${entry.state === 'Modified' ? 'text-red-400' :
                                    entry.state === 'Exclusive' ? 'text-orange-400' :
                                        entry.state === 'Shared' ? 'text-blue-400' :
                                            entry.state === 'Owner' ? 'text-purple-400' :
                                                'text-slate-600'
                                    }`}>
                                    {entry.state}
                                </td>
                                <td className="px-3 py-1 font-mono">
                                    {entry.sharers.length > 0 ? (
                                        <div className="flex gap-1">
                                            {entry.sharers.map(s => (
                                                <span key={s} className="bg-slate-700 text-slate-200 px-1 rounded text-[10px]">C{s}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-slate-700">-</span>
                                    )}
                                </td>
                                <td className="px-3 py-1 font-mono">
                                    {entry.owner !== null ? (
                                        <span className="bg-red-900/50 text-red-200 px-1 rounded text-[10px] border border-red-800/50">C{entry.owner}</span>
                                    ) : (
                                        <span className="text-slate-700">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
