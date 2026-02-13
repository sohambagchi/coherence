
import { createInitialState, processCoreAction, processMessageArrival } from './simulation';
import type { SimulationState } from '../types';

const logState = (state: SimulationState, step: string) => {
    console.log(`\n--- Step: ${step} ---`);
    state.cores.forEach(c => {
        console.log(`Core ${c.id} Cache:`, JSON.stringify(c.cache));
    });
    console.log(`Messages:`, state.messages.length);
    state.messages.forEach(m => console.log(`  ${m.from} -> ${m.to} [${m.type} ${m.action}]`));
};

const run = () => {
    console.log("Starting Reproduction...");
    let state = createInitialState(4, 'MESI');
    logState(state, "Initial");

    // 1. Trigger Read Miss on Core 0, Address 0
    console.log("\n>>> Triggering PrRd on Core 0, Address 0");
    const res1 = processCoreAction(state, 0, 'PrRd', 0);
    state = res1.newState;
    state.messages = [...state.messages, ...res1.newMessages];
    logState(state, "After PrRd (Expect BusRd Request)");

    if (state.messages.length === 0) {
        console.error("FAIL: No message generated!");
        return;
    }

    // 2. Process Bus Request (Core 0 -> Bus)
    const reqMsg = state.messages[0];
    console.log(`\n>>> Processing Message: ${reqMsg.from} -> ${reqMsg.to}`);
    // Simulate arrival
    const res2 = processMessageArrival(state, reqMsg);
    // Remove processed message and add new ones
    state = res2.newState;
    state.messages = res2.newMessages;
    // Note: In real app, we keep other messages, but here only 1 exists.
    logState(state, "After Bus Request Processing (Expect Snoops & Mem Request)");

    // 3. Process Memory Request (Bus -> Memory)
    const memReq = state.messages.find(m => m.to === 'Memory');
    if (!memReq) {
        console.error("FAIL: No Memory Request found!");
        return;
    }
    console.log(`\n>>> Processing Message: ${memReq.from} -> ${memReq.to}`);
    const res3 = processMessageArrival(state, memReq);
    state = res3.newState;
    state.messages = res3.newMessages;
    logState(state, "After Memory Request Processing (Expect Response)");

    // 4. Process Memory Response (Memory -> Bus)
    const memResp = state.messages.find(m => m.from === 'Memory' && m.to === 'Bus');
    if (!memResp) {
        // Maybe it went directly?
        console.log("Messages present:", state.messages);
        console.error("FAIL: No Memory Response found!");
        return;
    }
    console.log(`\n>>> Processing Message: ${memResp.from} -> ${memResp.to}`);
    const res4 = processMessageArrival(state, memResp);
    state = res4.newState;
    state.messages = res4.newMessages;
    logState(state, "After Memory Response (Expect Broadcast to Cores)");

    // 5. Process Response at Core 0 (Bus -> Core 0)
    const coreResp = state.messages.find(m => m.to === 0 && m.type === 'Response');
    if (!coreResp) {
        console.error("FAIL: No Core Response found!");
        return;
    }
    console.log(`\n>>> Processing Message: ${coreResp.from} -> ${coreResp.to}`);
    const res5 = processMessageArrival(state, coreResp);
    state = res5.newState;
    // Don't care about new messages here (none expected)
    logState(state, "After Core 0 Response Processing (Expect Cache Population)");

    // Verification
    const line = state.cores[0].cache.find(l => l.tag === 0);
    if (line) {
        console.log("\nSUCCESS: Cache Line Found:", line);
    } else {
        console.error("\nFAIL: Cache Line NOT Found!");
    }
};

run();
