import type { Metadata } from 'next';
import { StoryblokProvider } from '@/components/StoryblokProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'SBX Demo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk">
      <body>
        <StoryblokProvider>{children}</StoryblokProvider>
      </body>
    </html>
  );
}
