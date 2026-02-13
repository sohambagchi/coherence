import { useState, useCallback } from 'react';
import type { SimulationState, Protocol, Message, PrAction, CoherenceType } from '../types';
import { createInitialState, processMessageArrival, processCoreAction } from '../logic/simulation';

export const useSimulation = (initialProtocol: Protocol = 'MESI', numCores: number = 4, initialCoherence: CoherenceType = 'Directory') => {
    const [state, setState] = useState<SimulationState>(() => createInitialState(numCores, initialProtocol, initialCoherence));
    const [isPlaying, setIsPlaying] = useState(false);

    // Trigger a core action (User Interface)
    const triggerAction = useCallback((coreId: number, action: PrAction, address: number) => {
        setState(prev => {
            const result = processCoreAction(prev, coreId, action, address);
            // Add new messages to the system
            const currentMessages = prev.messages;
            // We keep existing messages? Yes.
            // But we should filter out messages that are "done"?
            // For now, let's just append. Functional update.
            return {
                ...result.newState,
                messages: [...currentMessages, ...result.newMessages]
            };
        });
    }, []);

    // Called by UI when a message animation completes
    const handleMessageArrival = useCallback((message: Message) => {
        setState(prev => {
            // Remove the arrived message from the active list
            // Note: If we have multiple messages with same ID (unlikely due to UUID), be careful.
            const messagesExcludingArrived = prev.messages.filter(m => m.id !== message.id);

            // Process the arrival
            const result = processMessageArrival({ ...prev, messages: messagesExcludingArrived }, message);

            return {
                ...result.newState,
                messages: [...messagesExcludingArrived, ...result.newMessages]
            };
        });
    }, []);

    // Add a message to the system (e.g. start a request)
    const dispatchMessage = useCallback((msg: Message) => {
        setState(prev => ({
            ...prev,
            ...prev,
            messages: [...prev.messages, msg],
            eventLog: [...prev.eventLog, msg]
        }));
    }, []);

    const reset = useCallback(() => {
        setState(createInitialState(numCores, initialProtocol, initialCoherence));
    }, [initialProtocol, numCores, initialCoherence]);

    const setProtocol = useCallback((newProtocol: Protocol) => {
        setState(createInitialState(numCores, newProtocol, state.coherenceType));
    }, [numCores, state.coherenceType]);

    const setCoherenceType = useCallback((newType: CoherenceType) => {
        setState(createInitialState(numCores, state.protocol, newType));
    }, [numCores, state.protocol]);

    return {
        state,
        isPlaying,
        setIsPlaying,
        triggerAction,
        handleMessageArrival,
        dispatchMessage,
        reset,
        setProtocol,
        setCoherenceType
    };
};
