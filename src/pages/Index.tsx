import { GameProvider } from "@/contexts/GameContext";
import { GameContainer } from "@/components/game/GameContainer";

const Index = () => {
  return (
    <GameProvider>
      <GameContainer />
    </GameProvider>
  );
};

export default Index;
