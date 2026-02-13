import React from 'react';

interface LayoutProps {
    children: React.ReactNode;
    controls: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, controls }) => {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">
            <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                        Coherence Visualizer
                    </h1>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                    {/* Header actions or links could go here */}
                    <span>v1.0.0</span>
                </div>
            </header>

            <main className="container mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-73px)]">
                {/* Controls Sidebar */}
                <aside className="lg:col-span-1 bg-slate-950 rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col overflow-hidden">
                    {controls}
                </aside>

                {/* Visualization Area */}
                <section className="lg:col-span-3 bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden shadow-2xl flex flex-col">
                    <div className="flex-1 relative">
                        {children}
                    </div>
                </section>
            </main>
        </div>
    );
};
