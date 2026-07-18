import type { ReactNode } from "react";

export const metadata = {
  title: "Agent Session Timer",
  description: "Keep your Claude session window warm with a tiny scheduled ping.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
          background: "#0b0b0f",
          color: "#e6e6ea",
          lineHeight: 1.6,
        }}
      >
        {children}
      </body>
    </html>
  );
}
