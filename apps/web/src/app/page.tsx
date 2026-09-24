'use client';

import { useGameSocket } from '../context/GameSocketContext';
import { LandingView } from '../components/LandingView';
import { LobbyView } from '../components/LobbyView';
import { DraftView } from '../components/DraftView';
import { TeamBuildingView } from '../components/TeamBuildingView';

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
      return <TeamBuildingView />;
    default:
      return <LobbyView />;
  }
}
