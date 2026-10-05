import { Home } from './screens/Home';
import { LabPlayer } from './screens/LabPlayer';
import { MasteryMap } from './screens/MasteryMap';
import { WorldMap } from './screens/WorldMap';
import { useGame } from './store/game';

export function App() {
  const screen = useGame((s) => s.screen);
  switch (screen.name) {
    case 'home':
      return <Home />;
    case 'map':
      return <WorldMap />;
    case 'mastery':
      return <MasteryMap />;
    case 'lab':
      return <LabPlayer key={screen.labId} labId={screen.labId} />;
  }
}
