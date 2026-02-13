import type { CoherenceState, Protocol, PrAction, BusAction } from '../types';

interface TransitionResult {
    nextState: CoherenceState;
    busAction?: BusAction; // Action to broadcast on the bus
    dataAction?: 'Flush' | 'PutM' | 'PutO' | 'PutE' | 'None'; // Data movement
}

// Default state if nothing happens
const NO_CHANGE = (state: CoherenceState): TransitionResult => ({ nextState: state, dataAction: 'None' });

/**
 * MSI Protocol Logic
 */
const MSI = {
    // Processor Actions
    // return { nextState, busAction }
    pr: (state: CoherenceState, action: PrAction): TransitionResult => {
        switch (state) {
            case 'Invalid':
                if (action === 'PrRd') return { nextState: 'Shared', busAction: 'BusRd', dataAction: 'None' };
                if (action === 'PrWr') return { nextState: 'Modified', busAction: 'BusRdX', dataAction: 'None' };
                break;
            case 'Shared':
                if (action === 'PrRd') return NO_CHANGE('Shared');
                if (action === 'PrWr') return { nextState: 'Modified', busAction: 'BusRdX', dataAction: 'None' };
                break;
            case 'Modified':
                // Read/Write hit
                return NO_CHANGE('Modified');
        }
        return NO_CHANGE(state);
    },
    // Bus Actions (Snooping)
    // return { nextState, dataAction } (dataAction usually means Flush to bus/memory)
    bus: (state: CoherenceState, action: BusAction): TransitionResult => {
        switch (state) {
            case 'Invalid':
                return NO_CHANGE('Invalid');
            case 'Shared':
                if (action === 'BusRd') return NO_CHANGE('Shared');
                if (action === 'BusRdX') return { nextState: 'Invalid', dataAction: 'None' }; // Others invalidating
                break;
            case 'Modified':
                if (action === 'BusRd') return { nextState: 'Shared', dataAction: 'Flush' }; // Another core reads, we flush, go directly to Shared/Invalid? MSI usually goes to S and flushes.
                if (action === 'BusRdX') return { nextState: 'Invalid', dataAction: 'Flush' }; // Another core writes, we flush and invalidate
                break;
        }
        return NO_CHANGE(state);
    }
};

/**
 * MESI Protocol Logic
 */
const MESI = {
    pr: (state: CoherenceState, action: PrAction, otherHasCopy: boolean = false): TransitionResult => {
        switch (state) {
            case 'Invalid':
                if (action === 'PrRd') {
                    // If shared signal (C) is true, go to Shared, else Exclusive
                    return {
                        nextState: otherHasCopy ? 'Shared' : 'Exclusive',
                        busAction: 'BusRd',
                        dataAction: 'None'
                    };
                }
                if (action === 'PrWr') return { nextState: 'Modified', busAction: 'BusRdX', dataAction: 'None' };
                break;
            case 'Exclusive':
                if (action === 'PrRd') return NO_CHANGE('Exclusive');
                if (action === 'PrWr') return { nextState: 'Modified', busAction: undefined, dataAction: 'None' }; // Silent transition to M
                break;
            case 'Shared':
                if (action === 'PrRd') return NO_CHANGE('Shared');
                if (action === 'PrWr') return { nextState: 'Modified', busAction: 'BusUpgr', dataAction: 'None' }; // Or BusRdX
                break;
            case 'Modified':
                return NO_CHANGE('Modified');
        }
        return NO_CHANGE(state);
    },
    bus: (state: CoherenceState, action: BusAction): TransitionResult => {
        switch (state) {
            case 'Invalid': return NO_CHANGE('Invalid');
            case 'Exclusive':
                if (action === 'BusRd') return { nextState: 'Shared', dataAction: 'Flush' }; // Provide data (cache-to-cache)
                if (action === 'BusRdX') return { nextState: 'Invalid', dataAction: 'Flush' };
                break;
            case 'Shared':
                if (action === 'BusRd') return NO_CHANGE('Shared');
                if (action === 'BusRdX' || action === 'BusUpgr') return { nextState: 'Invalid', dataAction: 'None' };
                break;
            case 'Modified':
                if (action === 'BusRd') return { nextState: 'Shared', dataAction: 'Flush' }; // Writeback to memory + share
                if (action === 'BusRdX') return { nextState: 'Invalid', dataAction: 'Flush' };
                break;
        }
        return NO_CHANGE(state);
    }
};

/**
 * MOSI Protocol Logic (Modified, Owner, Shared, Invalid)
 * Owner state allows sharing dirty data without writeback to memory.
 */
const MOSI = {
    pr: (state: CoherenceState, action: PrAction): TransitionResult => {
        // Similar to MSI but handles Owner
        switch (state) {
            case 'Invalid':
                if (action === 'PrRd') return { nextState: 'Shared', busAction: 'BusRd', dataAction: 'None' };
                if (action === 'PrWr') return { nextState: 'Modified', busAction: 'BusRdX', dataAction: 'None' };
                break;
            case 'Shared': // In MOSI, Shared can be dirty if there is an Owner? No, Shared implies clean or consistent with Owner.
                if (action === 'PrRd') return NO_CHANGE('Shared');
                if (action === 'PrWr') return { nextState: 'Modified', busAction: 'BusRdX', dataAction: 'None' };
                break;
            case 'Owner':
                if (action === 'PrRd') return NO_CHANGE('Owner');
                if (action === 'PrWr') return { nextState: 'Modified', busAction: 'BusRdX', dataAction: 'None' }; // Invalidate others
                break;
            case 'Modified':
                return NO_CHANGE('Modified');
        }
        return NO_CHANGE(state);
    },
    bus: (state: CoherenceState, action: BusAction): TransitionResult => {
        switch (state) {
            case 'Invalid': return NO_CHANGE('Invalid');
            case 'Shared':
                if (action === 'BusRd') return NO_CHANGE('Shared');
                if (action === 'BusRdX') return { nextState: 'Invalid', dataAction: 'None' };
                break;
            case 'Modified':
                // Someone reads, we become Owner and supply data
                if (action === 'BusRd') return { nextState: 'Owner', dataAction: 'Flush' };
                if (action === 'BusRdX') return { nextState: 'Invalid', dataAction: 'Flush' };
                break;
            case 'Owner':
                if (action === 'BusRd') return { nextState: 'Owner', dataAction: 'Flush' }; // Supply data
                if (action === 'BusRdX') return { nextState: 'Invalid', dataAction: 'Flush' };
                break;
        }
        return NO_CHANGE(state);
    }
}

/**
 * MOESI Protocol Logic
 */
const MOESI = {
    pr: (state: CoherenceState, action: PrAction, otherHasCopy: boolean = false): TransitionResult => {
        switch (state) {
            case 'Invalid':
                if (action === 'PrRd') return { nextState: otherHasCopy ? 'Shared' : 'Exclusive', busAction: 'BusRd', dataAction: 'None' };
                if (action === 'PrWr') return { nextState: 'Modified', busAction: 'BusRdX', dataAction: 'None' };
                break;
            case 'Exclusive':
                if (action === 'PrRd') return NO_CHANGE('Exclusive');
                if (action === 'PrWr') return { nextState: 'Modified', busAction: undefined, dataAction: 'None' };
                break;
            case 'Shared':
                if (action === 'PrRd') return NO_CHANGE('Shared');
                if (action === 'PrWr') return { nextState: 'Modified', busAction: 'BusUpgr', dataAction: 'None' };
                break;
            case 'Owner':
                if (action === 'PrRd') return NO_CHANGE('Owner');
                if (action === 'PrWr') return { nextState: 'Modified', busAction: 'BusUpgr', dataAction: 'None' }; // Invalidate others
                break;
            case 'Modified':
                return NO_CHANGE('Modified');
        }
        return NO_CHANGE(state);
    },
    bus: (state: CoherenceState, action: BusAction): TransitionResult => {
        switch (state) {
            case 'Invalid': return NO_CHANGE('Invalid');
            case 'Exclusive':
                if (action === 'BusRd') return { nextState: 'Shared', dataAction: 'Flush' }; // Supply data, go to Shared (some variants go to Owner, but standard is Shared/Clean)
                if (action === 'BusRdX' || action === 'BusUpgr') return { nextState: 'Invalid', dataAction: 'Flush' };
                break;
            case 'Shared':
                if (action === 'BusRd') return NO_CHANGE('Shared');
                if (action === 'BusRdX' || action === 'BusUpgr') return { nextState: 'Invalid', dataAction: 'None' };
                break;
            case 'Modified':
                if (action === 'BusRd') return { nextState: 'Owner', dataAction: 'Flush' }; // Supply data, become Owner
                if (action === 'BusRdX') return { nextState: 'Invalid', dataAction: 'Flush' };
                break;
            case 'Owner':
                if (action === 'BusRd') return { nextState: 'Owner', dataAction: 'Flush' }; // Supply data
                if (action === 'BusRdX' || action === 'BusUpgr') return { nextState: 'Invalid', dataAction: 'Flush' }; // If Upgr, someone else has it? Actually, if Owner, others are Shared. Upgr comes from Shared. Owner sees Upgr -> Invalid.
                break;
        }
        return NO_CHANGE(state);

    }
}


export const getNextState = (
    protocol: Protocol,
    state: CoherenceState,
    event: { type: 'Pr' | 'Bus', action: PrAction | BusAction },
    otherHasCopy: boolean = false
): TransitionResult => {
    if (event.type === 'Pr') {
        const action = event.action as PrAction;
        switch (protocol) {
            case 'MSI': return MSI.pr(state, action);
            case 'MESI': return MESI.pr(state, action, otherHasCopy);
            case 'MOSI': return MOSI.pr(state, action);
            case 'MOESI': return MOESI.pr(state, action, otherHasCopy);
        }
    } else {
        const action = event.action as BusAction;
        switch (protocol) {
            case 'MSI': return MSI.bus(state, action);
            case 'MESI': return MESI.bus(state, action);
            case 'MOSI': return MOSI.bus(state, action);
            case 'MOESI': return MOESI.bus(state, action);
        }
    }
    return NO_CHANGE(state);
};
