
import { createInitialState, processCoreAction, processMessageArrival } from './src/logic/simulation';
import type { Message } from './src/types';

const logMessages = (stepName: string, messages: Message[]) => {
    console.log(`--- ${stepName} ---`);
    messages.forEach(msg => {
        console.log(JSON.stringify(msg, null, 2));
    });
};

const run = () => {
    let state = createInitialState(2, 'MESI', 'Directory');

    // Core 0 Writes (GetM)
    console.log("Processing Core 0 PrWr...");
    let result = processCoreAction(state, 0, 'PrWr', 0x0);
    state = result.newState;
    logMessages("Core 0 Request", result.newMessages);

    // Process Request at Directory
    const reqMsg = result.newMessages[0];
    if (reqMsg) {
        result = processMessageArrival(state, reqMsg);
        state = result.newState;
        logMessages("Directory Processing Request", result.newMessages);
    }

    // Process Response at Core 0
    const respMsg = result.newMessages[0]; // Assuming immediate response from Memory
    if (respMsg) {
        result = processMessageArrival(state, respMsg);
        state = result.newState;
        logMessages("Core 0 Processing Response", result.newMessages);
    }

    // Now Core 1 Reads (GetS) - should trigger Snoop/Flush
    console.log("\nProcessing Core 1 PrRd...");
    result = processCoreAction(state, 1, 'PrRd', 0x0);
    state = result.newState;
    logMessages("Core 1 Request", result.newMessages);

    const reqMsg2 = result.newMessages[0];
    if (reqMsg2) {
        result = processMessageArrival(state, reqMsg2);
        state = result.newState;
        logMessages("Directory Processing Request 2", result.newMessages);

        // Should see Snoop to Core 0
        const snoopMsg = result.newMessages.find(m => m.type === 'Snoop');
        if (snoopMsg) {
            result = processMessageArrival(state, snoopMsg); // Core 0 processes Snoop
            state = result.newState;
            logMessages("Core 0 Processing Snoop (Flush)", result.newMessages);
        }
    }

    // Manual Ack Message Test
    console.log("\nTesting Manual Ack Message...");
    const ackMsg: Message = {
        id: crypto.randomUUID(),
        from: 1,
        to: 0,
        type: 'Ack',
        address: 0x0,
        timestamp: state.globalTime + 1
    };
    logMessages("Manual Ack Message", [ackMsg]);
};

run();
