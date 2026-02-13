
import { describe, expect, test } from "bun:test";
import { createInitialState, processCoreAction, processMessageArrival } from "./simulation";
import type { SimulationState, Message } from "../types";

// Helper to resolve all pending messages in the simulation
// Returns the final state and the history of processed messages
const resolveMessages = (initialState: SimulationState, initialMessages: Message[]): SimulationState => {
    let state = initialState;
    let messageQueue = [...initialMessages];

    // We also want to track new messages added to queue for debugging/logging, 
    // but the state.eventLog already does that.

    let iterations = 0;
    const MAX_ITERATIONS = 100;

    while (messageQueue.length > 0 && iterations < MAX_ITERATIONS) {
        // Sort by timestamp to simulate correct order
        messageQueue.sort((a, b) => a.timestamp - b.timestamp);

        const message = messageQueue.shift()!;

        // Simulating the "arrival"
        // In useSimulation, we remove the message from state.messages logic
        // But processMessageArrival doesn't care about state.messages content for logic, 
        // it just needs the message and current state.

        const result = processMessageArrival(state, message);
        state = result.newState;

        // Append new messages to queue
        messageQueue.push(...result.newMessages);

        iterations++;
    }

    if (iterations >= MAX_ITERATIONS) {
        console.warn("Simulation loop limit reached!");
    }

    return state;
};

describe("Coherence Message Verification", () => {
    test("MESI Directory: Write Miss -> Read Miss (Flush)", () => {
        let state = createInitialState(4, 'MESI', 'Directory');

        // 1. Core 0 Write Miss
        const res1 = processCoreAction(state, 0, 'PrWr', 0);
        state = res1.newState;

        // Expect Request BusRdX
        expect(res1.newMessages.length).toBe(1);
        expect(res1.newMessages[0].type).toBe('Request');
        expect(res1.newMessages[0].action).toBe('BusRdX');

        // Resolve Messages
        state = resolveMessages(state, res1.newMessages);

        // Verify Core 0 has Modified
        const c0Line = state.cores[0].cache.find(l => l.tag === 0);
        expect(c0Line?.state).toBe('Modified');

        // Verify Event Log size
        // 1 Request + 1 Response (from Directory/Memory)
        // Check log for exact sequence
        const logAfterWrite = state.eventLog;
        const msgTypes = logAfterWrite.map(m => m.type);
        expect(msgTypes).toContain('Request');
        expect(msgTypes).toContain('Response');

        // 2. Core 1 Read Miss
        const res2 = processCoreAction(state, 1, 'PrRd', 0);
        state = res2.newState;

        // Expect Request BusRd
        expect(res2.newMessages.length).toBe(1);
        expect(res2.newMessages[0].type).toBe('Request');
        expect(res2.newMessages[0].action).toBe('BusRd');

        // Resolve Messages
        state = resolveMessages(state, res2.newMessages);

        // Verify Core 1 has Shared (and Core 0 Downgraded to Shared)
        const c0LineAfter = state.cores[0].cache.find(l => l.tag === 0);
        const c1LineAfter = state.cores[1].cache.find(l => l.tag === 0);

        expect(c0LineAfter?.state).toBe('Shared');
        expect(c1LineAfter?.state).toBe('Shared');

        // Verify duplicate messages in log
        const ids = state.eventLog.map(m => m.id);
        const uniqueIds = new Set(ids);
        expect(ids.length).toBe(uniqueIds.size);

        // Verify Message Flow for Read Miss (Intervention)
        // We expect:
        // 1. Request (BusRd) from C1
        // 2. Snoop (BusRd) from Directory to C0
        // 3. Response (Flush) from C0 to Directory
        // 4. Response (Data) from Directory to C1

        // Filter log messages after the Write phase (we know write phase ended at length logAfterWrite.length)
        const readPhaseLog = state.eventLog.slice(logAfterWrite.length);

        const types = readPhaseLog.map(m => `${m.from}->${m.to}:${m.type}`);
        // Cannot checks exact order easily due to async/queue nature, but verify presence

        // Note: from/to can be number or string.
        const hasReq = readPhaseLog.some(m => m.type === 'Request' && m.from === 1 && m.to === 'Directory');
        const hasSnoop = readPhaseLog.some(m => m.type === 'Snoop' && m.from === 'Directory' && m.to === 0);
        const hasFlush = readPhaseLog.some(m => m.type === 'Response' && m.from === 0 && m.to === 'Directory');
        const hasFwd = readPhaseLog.some(m => m.type === 'Response' && m.from === 'Directory' && m.to === 1);

        expect(hasReq).toBe(true);
        expect(hasSnoop).toBe(true);
        expect(hasFlush).toBe(true);
        expect(hasFwd).toBe(true);

        console.log("Read Phase Log:", types);
    });

    test("Prevent Duplicate Requests (Double Trigger)", () => {
        const state = createInitialState(4, 'MESI', 'Directory');

        // 1. Trigger Action
        const res1 = processCoreAction(state, 0, 'PrRd', 0);

        // 2. Trigger Same Action Immediately (Simulation of pending request)
        // Use res1.newState which has the pendingRequest set
        const res2 = processCoreAction(res1.newState, 0, 'PrRd', 0);

        // Expect NO new messages from second trigger
        expect(res2.newMessages.length).toBe(0);

        // Expect Pending Request to persist
        expect(res2.newState.pendingRequests[0]).toBeDefined();
    });
});
