import { ImageResponse } from "next/og";

export const SHARE_SIZE = { width: 1200, height: 630 };

/** KOB share card: espresso background, the line in cream, the promise underneath. */
export function shareImage(title: string, kicker = "The restaurant manager for owners") {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#2b211c",
          color: "#f6efe6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: "#5b8a5a" }} />
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>KOB</div>
        </div>
        <div style={{ display: "flex", fontSize: title.length > 60 ? 58 : 72, fontWeight: 600, lineHeight: 1.08, letterSpacing: -2 }}>
          {title}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#d9cbb8" }}>
          <div>{kicker}</div>
          <div>trykob.com</div>
        </div>
      </div>
    ),
    SHARE_SIZE,
  );
}
