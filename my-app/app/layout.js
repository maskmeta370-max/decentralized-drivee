import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Decentralized Drive',
  description: 'Your secure Web3 digital vault.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-space-indigo text-light-silver`}>
        {children}
      </body>
    </html>
  );
}
