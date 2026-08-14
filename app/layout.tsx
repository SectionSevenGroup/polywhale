import "./globals.css";

export const metadata = {
  title: "POLY WHALE | Signal Control Room",
  description: "Read-only Polymarket whale intelligence and signal scoring",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
