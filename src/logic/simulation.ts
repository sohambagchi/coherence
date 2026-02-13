import type { SimulationState, Message, Protocol, CoreData, CacheLine, PrAction, CoherenceState, CoherenceType } from '../types';
import { getNextState } from './protocols';

export const createInitialState = (numCores: number, protocol: Protocol, coherenceType: CoherenceType = 'Directory'): SimulationState => {
    const cores: CoreData[] = [];
    for (let i = 0; i < numCores; i++) {
        cores.push({
            id: i,
            cache: [] // Empty cache initially
        });
    }
    return {
        numCores,
        protocol,
        coherenceType,
        cores,
        memory: Array(16).fill(0), // 16 memory blocks initialized to 0
        directory: Array(16).fill(null).map(() => ({ state: 'Invalid', sharers: [], owner: null })),
        messages: [],
        eventLog: [],
        globalTime: 0,
        pendingRequests: {}
    };
};

export interface StepResult {
    newState: SimulationState;
    newMessages: Message[];
}

// Helper to find a line in cache
const findLine = (cache: CacheLine[], address: number) => cache.find(l => l.tag === address);

export const processCoreAction = (state: SimulationState, coreId: number, action: PrAction, address: number): StepResult => {
    const newState = JSON.parse(JSON.stringify(state)) as SimulationState;

    // Prevent duplicate requests if one is already pending for this core
    if (newState.pendingRequests[coreId]) {
        console.warn(`Core ${coreId} already has a pending request. Ignoring action ${action}.`);
        return { newState: state, newMessages: [] };
    }

    const core = newState.cores[coreId];
    let line = findLine(core.cache, address);
    const currentState = line ? line.state : 'Invalid';

    // Determine bus action needed
    // Note: getNextState returns 'busAction' but for Directory protocols it's effectively the request type
    const { busAction, nextState } = getNextState(newState.protocol, currentState, { type: 'Pr', action });

    const newMessages: Message[] = [];

    if (busAction) {
        // Track pending request to transition state correctly upon completion
        newState.pendingRequests[coreId] = {
            address,
            action,
            timestamp: newState.globalTime
        };

        const target = newState.coherenceType === 'Snooping' ? 'Bus' : 'Directory';

        newMessages.push({
            id: crypto.randomUUID(),
            from: coreId,
            to: target,
            type: 'Request',
            action: busAction,
            address: address,
            timestamp: newState.globalTime + 1
        });
    } else {
        // Silent transition (e.g. Exclusive -> Modified, or Hit)
        if (!line && nextState !== 'Invalid') {
            line = { tag: address, state: nextState, data: 0 };
            core.cache.push(line);
        } else if (line) {
            line.state = nextState;
        }
    }

    // Update Event Log
    newState.eventLog = [...newState.eventLog, ...newMessages];

    return { newState, newMessages };
};

export const processMessageArrival = (state: SimulationState, message: Message): StepResult => {
    const newState = JSON.parse(JSON.stringify(state)) as SimulationState; // Deep copy
    const newMessages: Message[] = [];

    // Prioritize Bus -> Broadcast Response handling to ensure it works
    // Bus Handling (Snooping Protocol)
    if (message.to === 'Bus' && message.type === 'Request' && state.coherenceType === 'Snooping') {
        const sourceId = message.from as number;

        // Broadcast Snoop to all other cores
        state.cores.forEach(c => {
            if (c.id !== sourceId) {
                newMessages.push({
                    id: crypto.randomUUID(),
                    from: 'Bus',
                    to: c.id,
                    type: 'Snoop',
                    action: message.action,
                    address: message.address,
                    timestamp: newState.globalTime + 1
                });
            }
        });

        // Memory Controller Logic for Bus Requests (Simple Model)
        // If it's a Read (BusRd) or ReadX (BusRdX), Memory *might* need to respond.
        // In a real bus, memory responds if no cache asserts 'Modified' (Shared line). 
        // For simulation simplicity: Memory always schedules a response, but 
        // caches flushing will override/update it? 
        // OR: We let the Requestor wait. If a Flush happens, it uses that. 
        // If no Flush happens, we need Memory data.

        // Let's explicitly schedule a Memory response for Reads.
        // If a cache flushes, it will arrive *after* or *with* memory. 
        // In real hardware, 'inhibit' lines prevent memory response.

        // Optimization: Check if any other cache has it in Modified/Owner state?
        // We can't cheat by looking at other cores' state directly here to decide logic 
        // (unless we model the shared line). Behave like a dumb bus:
        // Memory always attempts to respond to Read/ReadX.

        if (message.action === 'BusRd' || message.action === 'BusRdX') {
            newMessages.push({
                id: crypto.randomUUID(),
                from: 'Memory',
                to: sourceId,
                type: 'Response',
                address: message.address,
                payload: newState.memory[message.address] || 0,
                timestamp: newState.globalTime + 2, // Slightly slower than snoop check?
                shared: true // Default assumption, updated by snoop results in real HW
            });
        }
    }

    // Message for a specific Core
    if (message.to === 'Broadcast' || (typeof message.to === 'number')) {
        const coreId = message.to as number;
        const core = newState.cores[coreId];
        let line = findLine(core.cache, message.address);

        if (message.type === 'Snoop' && message.action) {
            const currentState = line ? line.state : 'Invalid';
            const { nextState, dataAction } = getNextState(
                newState.protocol,
                currentState,
                { type: 'Bus', action: message.action }
            );

            if (line) {
                line.state = nextState;
            }

            if (dataAction === 'Flush') {
                newMessages.push({
                    id: crypto.randomUUID(),
                    from: coreId,
                    to: 'Directory', // Send Response to Directory to forward
                    type: 'Response',
                    address: message.address,
                    payload: line ? line.data : 0,
                    timestamp: newState.globalTime + 1
                });
            }
        }
        else if (message.type === 'Response') {
            // Data Arrived
            const pending = newState.pendingRequests[coreId];

            // Check if this response matches our pending request
            if (pending && pending.address === message.address) {
                const action = pending.action;

                // Determine next state based on the original request
                let finalState: CoherenceState = 'Shared';

                if (action === 'PrWr') {
                    finalState = 'Modified';
                } else {
                    // PrRd
                    // Use the shared signal from the message to decide Shared vs Exclusive
                    const startState = line ? line.state : 'Invalid';
                    const { nextState } = getNextState(
                        newState.protocol,
                        startState,
                        { type: 'Pr', action: 'PrRd' },
                        message.shared
                    );
                    finalState = nextState;
                }

                if (!line) {
                    line = { tag: message.address, state: finalState as any, data: message.payload };
                    core.cache.push(line);
                } else {
                    line.data = message.payload;
                    line.state = finalState;
                }

                // Clear pending request
                delete newState.pendingRequests[coreId];
            } else {
                // Unsolicited response? Or broadcast to non-requester?
                if (line) {
                    line.data = message.payload;
                }
            }
        }
    }
    else if (message.to === 'Directory') {
        const sourceId = message.from as number;
        const dirEntry = newState.directory[message.address];

        if (message.type === 'Request') {
            // 1. Update Directory State & Sharers
            // 2. Send Invalidations/Snoops

            // Read Request (BusRd)
            if (message.action === 'BusRd') {
                // Add to sharers
                if (!dirEntry.sharers.includes(sourceId)) {
                    dirEntry.sharers.push(sourceId);
                }

                // If Owner exists, ask Owner for data
                if (dirEntry.owner !== null) {
                    newMessages.push({
                        id: crypto.randomUUID(),
                        from: 'Directory',
                        to: dirEntry.owner,
                        type: 'Snoop',
                        action: 'BusRd',
                        address: message.address,
                        timestamp: newState.globalTime + 1
                    });

                    // Optimization: If MSI/MESI, Owner downgrades to Shared and clears Owner
                    // Logic handled by Core 'Snoop' handler (downgrades state). 
                    // Directory should update its view too.
                    // Assuming Cores behave correctly:
                    if (newState.protocol === 'MSI' || newState.protocol === 'MESI') {
                        dirEntry.owner = null;
                        dirEntry.state = 'Shared';
                    } else {
                        // MOSI/MOESI: Owner stays Owner
                        dirEntry.state = 'Owner'; // Conceptual state
                    }

                } else {
                    // No owner, reply from Memory
                    const isShared = dirEntry.sharers.length > 1; // Basic shared check
                    newMessages.push({
                        id: crypto.randomUUID(),
                        from: 'Directory', // Or 'Memory'
                        to: sourceId,
                        type: 'Response',
                        address: message.address,
                        payload: newState.memory[message.address] || 0,
                        timestamp: newState.globalTime + 1,
                        shared: isShared
                    });
                    dirEntry.state = 'Shared';
                }
            }
            // Write Request (BusRdX / BusUpgr)
            else if (message.action === 'BusRdX' || message.action === 'BusUpgr') {
                // Invalidate all other sharers
                dirEntry.sharers.forEach(sharerId => {
                    if (sharerId !== sourceId) {
                        newMessages.push({
                            id: crypto.randomUUID(),
                            from: 'Directory',
                            to: sharerId,
                            type: 'Snoop',
                            action: 'BusRdX', // Treat as Invalidate/FetchInvalidate
                            address: message.address,
                            timestamp: newState.globalTime + 1
                        });
                    }
                });

                // If Owner exists and is not us (should be covered by sharers check usually, but explicitly handle)
                if (dirEntry.owner !== null) {
                    // Only send if not sent above (Owner is usually a sharer too)
                    if (!dirEntry.sharers.includes(dirEntry.owner) && dirEntry.owner !== sourceId) {
                        newMessages.push({
                            id: crypto.randomUUID(),
                            from: 'Directory',
                            to: dirEntry.owner,
                            type: 'Snoop',
                            action: 'BusRdX',
                            address: message.address,
                            timestamp: newState.globalTime + 1
                        });
                    }
                }

                // Update Directory
                dirEntry.sharers = [sourceId];
                dirEntry.owner = sourceId;
                dirEntry.state = 'Modified';

                // Assume data comes from previous owner (via Flush) or Memory if no owner
                // If no previous owner, send data from Memory immediately
                // If previous owner existed, they will Flush (Response) to Directory, and we forward.
                // HOWEVER, to prevent deadlock if previous owner doesn't flush (Shared -> Modified upgrade), check actions.

                // If standard Memory->Core is needed (e.g. Invalid -> Modified)
                // Check if data is coming from Owner?
                // Simple logic for simulation: Always send Memory data unless Owner intercepts?
                // Better: If we didn't ask an Owner to flush, send Memory data.
                // We asked Owner to flush if we sent Snoop BusRdX to Owner.

                // Wait, if it was Shared -> Modified, we invalidated sharers. One might have been Owner?
                // If we had an Owner, they will Flush. If not, we need Memory data.
                // BUT: If it's a Hit (Upgrade), we already have data?
                // If BusUpgr (Hit), we don't need data.
                // If BusRdX (Miss), we need data.


            }

            // Quick fix for data response on BusRdX if no owner exists:
            if (message.action === 'BusRdX') {
                // Check if we notified an owner (who wasn't us)
                // Start with fresh check of *previous* state?
                // We need to look at if *anyone* is going to Flush.
                // We know they flush if we sent Snoop and they have data.
                // Let's assume initialized directory correctly tracks owner.
                // If initialization sets owner=null, then for first write we send data.
                if (state.directory[message.address].owner === null) {
                    newMessages.push({
                        id: crypto.randomUUID(),
                        from: 'Memory', // Or Directory
                        to: sourceId,
                        type: 'Response',
                        address: message.address,
                        payload: newState.memory[message.address] || 0,
                        timestamp: newState.globalTime + 1
                    });
                }
            }

        }
        else if (message.type === 'Response') {
            // Received Data (Flush) -> Forward to identifying Requestor
            // Logic: Find who is requesting this address in pendingRequests

            // Update Memory (Writeback)
            newState.memory[message.address] = message.payload;

            // Find Requestor
            const requestorIdStr = Object.keys(newState.pendingRequests).find(key => {
                return newState.pendingRequests[parseInt(key)].address === message.address;
            });

            if (requestorIdStr) {
                const requestorId = parseInt(requestorIdStr);
                newMessages.push({
                    id: crypto.randomUUID(),
                    from: 'Directory',
                    to: requestorId,
                    type: 'Response',
                    address: message.address,
                    payload: message.payload,
                    timestamp: newState.globalTime + 1,
                    shared: true // Usually implies Shared if coming from another core
                });
            }
        }
    }
    else if (message.to === 'Memory') {
        // Direct Memory requests (unlikely in directory protocol as Directory mediates, except maybe direct DMA?)
        // Keep existing logic or ignore.
        if (message.type === 'Response') {
            newState.memory[message.address] = message.payload;
        }
    }

    // Update Event Log
    newState.eventLog = [...newState.eventLog, ...newMessages];

    return { newState, newMessages };
};
