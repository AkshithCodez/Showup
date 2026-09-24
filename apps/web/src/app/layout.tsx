import type { Metadata } from 'next';
import './globals.css';
import { GameSocketProvider } from '../context/GameSocketContext';
import { Header } from '../components/Header';

export const metadata: Metadata = {
  title: 'Showup | Pokémon Draft & Multiplayer Battle',
  description: 'Randomized 1-out-of-3 Pokémon team draft and real-time multiplayer battle platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 min-h-screen flex flex-col antialiased stadium-grid">
        <GameSocketProvider>
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
        </GameSocketProvider>
      </body>
    </html>
  );
}
