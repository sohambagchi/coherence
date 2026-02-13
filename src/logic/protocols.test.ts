import { describe, expect, test } from "bun:test";
import { createInitialState, processCoreAction, processMessageArrival } from "./simulation";
import type { SimulationState, Protocol, Message, CoherenceState } from "../types";

// Helper to resolve all pending messages in the simulation
const resolveMessages = (initialState: SimulationState, initialMessages: Message[]): SimulationState => {
    let state = initialState;
    let messageQueue = [...initialMessages];

    // Limit iterations to prevent infinite loops in bad logic
    let iterations = 0;
    const MAX_ITERATIONS = 100;

    while (messageQueue.length > 0 && iterations < MAX_ITERATIONS) {
        // Process one message at a time (FIFO)
        // In a real simulation, we might process them based on timestamp, but for functional info FIFO is often enough if timestamping isn't critical for correctness of *final state* here.
        // However, the simulation logic uses timestamps. Let's sort by timestamp?
        // simple FIFO for now as the logic is synchronous step-based.

        // Actually, let's sort to be safe, mimicking time order
        messageQueue.sort((a, b) => a.timestamp - b.timestamp);

        const message = messageQueue.shift()!;
        const result = processMessageArrival(state, message);

        state = result.newState;
        messageQueue.push(...result.newMessages);
        iterations++;
    }

    if (iterations >= MAX_ITERATIONS) {
        console.warn("Simulation loop limit reached! Potential infinite message loop.");
    }

    return state;
};

// Helper to execute a sequence of actions
// Actions format: "C0-R-0" (Core 0 Reads Address 0), "C1-W-0" (Core 1 Writes Address 0)
const executeFlow = (protocol: Protocol, actions: string[]): SimulationState => {
    let state = createInitialState(4, protocol); // 4 Cores

    for (const actionStr of actions) {
        const [coreStr, op, addrStr] = actionStr.split('-');
        const coreId = parseInt(coreStr.substring(1));
        const address = parseInt(addrStr);
        const actionType = op === 'R' ? 'PrRd' : 'PrWr';

        // 1. Core Action
        const result = processCoreAction(state, coreId, actionType, address);
        state = result.newState;

        // 2. Resolve resulting bus messages
        state = resolveMessages(state, result.newMessages);
    }

    return state;
};

// Helper to get state of a line
const getLineState = (state: SimulationState, coreId: number, address: number): CoherenceState | 'Invalid' => {
    const line = state.cores[coreId].cache.find(l => l.tag === address);
    return line ? line.state : 'Invalid';
};

describe("Coherence Protocol Flows", () => {

    describe("MSI Protocol", () => {
        test("Modified (M): C0-W-0", () => {
            const state = executeFlow('MSI', ['C0-W-0']);
            expect(getLineState(state, 0, 0)).toBe('Modified');
        });

        test("Shared (S): C0-R-0", () => {
            const state = executeFlow('MSI', ['C0-R-0']);
            expect(getLineState(state, 0, 0)).toBe('Shared');
        });

        test("Invalid (I): C0-R-0 -> C1-W-0", () => {
            const state = executeFlow('MSI', ['C0-R-0', 'C1-W-0']);
            expect(getLineState(state, 0, 0)).toBe('Invalid'); // C0 invalidated
            expect(getLineState(state, 1, 0)).toBe('Modified'); // C1 modified
        });
    });

    describe("MESI Protocol", () => {
        test("Modified (M): C0-W-0", () => {
            const state = executeFlow('MESI', ['C0-W-0']);
            expect(getLineState(state, 0, 0)).toBe('Modified');
        });

        test("Exclusive (E): C0-R-0", () => {
            const state = executeFlow('MESI', ['C0-R-0']);
            expect(getLineState(state, 0, 0)).toBe('Exclusive');
        });

        test("Shared (S): C0-R-0 -> C1-R-0", () => {
            const state = executeFlow('MESI', ['C0-R-0', 'C1-R-0']);
            expect(getLineState(state, 0, 0)).toBe('Shared');
            expect(getLineState(state, 1, 0)).toBe('Shared');
        });

        test("Invalid (I): C0-R-0 -> C1-W-0", () => {
            const state = executeFlow('MESI', ['C0-R-0', 'C1-W-0']);
            expect(getLineState(state, 0, 0)).toBe('Invalid');
            expect(getLineState(state, 1, 0)).toBe('Modified');
        });
    });

    describe("MOSI Protocol", () => {
        test("Modified (M): C0-W-0", () => {
            const state = executeFlow('MOSI', ['C0-W-0']);
            expect(getLineState(state, 0, 0)).toBe('Modified');
        });

        test("Owner (O): C0-W-0 -> C1-R-0", () => {
            const state = executeFlow('MOSI', ['C0-W-0', 'C1-R-0']);
            expect(getLineState(state, 0, 0)).toBe('Owner');
            expect(getLineState(state, 1, 0)).toBe('Shared');
        });

        test("Shared (S): C0-R-0", () => {
            const state = executeFlow('MOSI', ['C0-R-0']);
            expect(getLineState(state, 0, 0)).toBe('Shared');
        });

        test("Invalid (I): C0-R-0 -> C1-W-0", () => {
            const state = executeFlow('MOSI', ['C0-R-0', 'C1-W-0']);
            expect(getLineState(state, 0, 0)).toBe('Invalid');
            expect(getLineState(state, 1, 0)).toBe('Modified');
        });
    });

    describe("MOESI Protocol", () => {
        test("Modified (M): C0-W-0", () => {
            const state = executeFlow('MOESI', ['C0-W-0']);
            expect(getLineState(state, 0, 0)).toBe('Modified');
        });

        test("Owner (O): C0-W-0 -> C1-R-0", () => {
            const state = executeFlow('MOESI', ['C0-W-0', 'C1-R-0']);
            expect(getLineState(state, 0, 0)).toBe('Owner');
            expect(getLineState(state, 1, 0)).toBe('Shared');
        });

        test("Exclusive (E): C0-R-0", () => {
            const state = executeFlow('MOESI', ['C0-R-0']);
            expect(getLineState(state, 0, 0)).toBe('Exclusive');
        });

        test("Shared (S): C0-R-0 -> C1-R-0", () => {
            const state = executeFlow('MOESI', ['C0-R-0', 'C1-R-0']);
            expect(getLineState(state, 0, 0)).toBe('Shared');
            expect(getLineState(state, 1, 0)).toBe('Shared');
        });

        test("Invalid (I): C0-R-0 -> C1-W-0", () => {
            const state = executeFlow('MOESI', ['C0-R-0', 'C1-W-0']);
            expect(getLineState(state, 0, 0)).toBe('Invalid');
            expect(getLineState(state, 1, 0)).toBe('Modified');
        });
    });
});
