export type Protocol = 'MSI' | 'MESI' | 'MOSI' | 'MOESI';

export type CoherenceType = 'Snooping' | 'Directory';

// Coherence States
export type CoherenceState = 'Modified' | 'Owner' | 'Exclusive' | 'Shared' | 'Invalid';

// Actions triggered by the processor (Core)
export type PrAction = 'PrRd' | 'PrWr';

// Actions observed on the bus (Interconnect)
// Actions observed on the bus (Interconnect) or Directory
export type BusAction = 'BusRd' | 'BusRdX' | 'BusUpgr' | 'Flush' | 'FlushOpt';

export interface DirectoryEntry {
    state: CoherenceState; // Directory state (e.g., Shared, Modified/Exclusive, Uncached/Invalid)
    sharers: number[];     // List of core IDs holding the block
    owner: number | null;  // Core ID that owns the modified block (if any)
}

export interface CacheLine {
    tag: number;
    state: CoherenceState;
    data: number; // For simplicity, just a number
    // We can add dirty bit if needed, but state often implies it
}

export interface CoreData {
    id: number;
    cache: CacheLine[]; // Array of cache lines (sets)
}

export type MessageType =
    | 'Request' // Core -> Directory/Bus (e.g., GetS, GetM)
    | 'Response' // Memory/Cache -> Core (Data)
    | 'Invalidate' // Directory -> Core
    | 'Snoop'; // Bus -> Core

export interface Message {
    id: string; // Unique ID for animation tracking
    from: number | 'Memory' | 'Directory' | 'Bus';
    to: number | 'Memory' | 'Directory' | 'Broadcast' | 'Bus';
    type: MessageType;
    action?: BusAction; // Specific bus transaction type
    address: number;
    payload?: any; // Data payload
    timestamp: number; // Logical timestamp for ordering
    shared?: boolean; // Signal if other caches have a copy (for Exclusive state)
}

export interface SimulationState {
    numCores: number;
    protocol: Protocol;
    coherenceType: CoherenceType;
    cores: CoreData[];
    memory: number[]; // Main memory data
    directory: DirectoryEntry[]; // Directory state for each memory block
    messages: Message[];
    globalTime: number;
    // Map of coreId -> { address, action, timestamp }
    pendingRequests: Record<number, { address: number; action: PrAction; timestamp: number }>;
}
