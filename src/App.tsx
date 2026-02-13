import { Layout } from './components/Layout';
import { Interconnect } from './components/Interconnect';
import { Controls } from './components/Controls';
import { EventLog } from './components/EventLog';
import { useSimulation } from './hooks/useSimulation';

function App() {
  const {
    state,
    isPlaying,
    setIsPlaying,
    triggerAction,
    handleMessageArrival,
    reset,
    setProtocol,
    setCoherenceType
  } = useSimulation('MESI', 4);

  return (
    <Layout
      controls={
        <div className="flex flex-col h-full gap-4">
          <Controls
            protocol={state.protocol}
            setProtocol={setProtocol}
            coherenceType={state.coherenceType}
            setCoherenceType={setCoherenceType}
            onTrigger={triggerAction}
            onReset={reset}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
          />
          <div className="h-px bg-slate-800 shrink-0" />
          <div className="flex-1 min-h-0">
            <EventLog messages={state.eventLog} />
          </div>
        </div>
      }
    >
      <Interconnect
        state={state}
        onMessageArrival={handleMessageArrival}
      />
    </Layout>
  );
}

export default App;
