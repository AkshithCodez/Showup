'use client';

import { useGameSocket } from '../context/GameSocketContext';
import { LandingView } from '../components/LandingView';
import { LobbyView } from '../components/LobbyView';
import { DraftView } from '../components/DraftView';
import { TeamBuilderView } from '../components/TeamBuilderView';
import { TeamRevealView } from '../components/TeamRevealView';
import { BattleView } from '../components/BattleView';

export default function HomePage() {
  const { room } = useGameSocket();

  if (!room) {
    return <LandingView />;
  }

  switch (room.phase) {
    case 'lobby':
      return <LobbyView />;
    case 'draft':
      return <DraftView />;
    case 'team-building':
      return <TeamBuilderView />;
    case 'team-reveal':
      return <TeamRevealView />;
    case 'battle':
    case 'finished':
      return <BattleView />;
    default:
      return <LobbyView />;
  }
}
