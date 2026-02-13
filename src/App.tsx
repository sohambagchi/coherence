import { Layout } from './components/Layout';
import { Interconnect } from './components/Interconnect';
import { Controls } from './components/Controls';
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
