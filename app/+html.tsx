import { ScrollViewStyleReset } from "expo-router/html";
import type { ReactNode } from "react";
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="referrer" content="no-referrer" />
        <meta name="color-scheme" content="dark" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html,body{background:#090B0A;color:#fff;} #root{min-height:100vh;}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
