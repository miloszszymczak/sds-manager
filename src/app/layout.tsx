import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'Karty charakterystyki — edytor SDS',
  description: 'Edytor kart charakterystyki zgodnych z rozporządzeniem (WE) nr 1907/2006 (REACH) i (UE) 2020/878',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="min-h-full">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
