import type { Metadata } from 'next';
import { Inter, Space_Mono } from 'next/font/google';
import './globals.css';
import { TrpcProvider } from '@/components/providers/TrpcProvider';
import { ToastProvider } from '@/components/ui/use-toast';
import { ConditionalLayout } from '@/components/layout/ConditionalLayout';
import { LoteProvider } from '@/components/providers/LoteProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'AgriFlow — Agricultura de Precisión',
  description: 'Sistema inteligente de monitoreo y predicción de rendimientos agrícolas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${spaceMono.variable}`}>
      <body className="bg-background text-foreground antialiased min-h-screen">
        <TrpcProvider>
          <ToastProvider>
            <LoteProvider>
              <ConditionalLayout>{children}</ConditionalLayout>
            </LoteProvider>
          </ToastProvider>
        </TrpcProvider>
      </body>
    </html>
  );
}