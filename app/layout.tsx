import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { MAIN_CONTENT_ID, SkipLink } from "../components/SkipLink";
import { Providers } from "./Providers";
import { defaultMetadata } from "./site-metadata";

// design.md: "No monospace font" — only Geist Sans is loaded.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <Providers>
          <SkipLink />
          {/* The single main area of every page (home-redesign RF-5): the skip
              link points at it and sends focus to it. It is a focus target,
              not a control, so it draws no focus ring of its own. */}
          <main
            id={MAIN_CONTENT_ID}
            tabIndex={-1}
            className="flex flex-1 flex-col focus-visible:outline-none"
          >
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
