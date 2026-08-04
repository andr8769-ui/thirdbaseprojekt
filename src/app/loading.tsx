// Vises med det samme ved (gen)indlæsning af "/" mens RSC'en renderes.
export default function Loading() {
  const bar = (w: number | string, h = 12, mt = 0) => (
    <div className="tb-skeleton" style={{ width: w, height: h, marginTop: mt, borderRadius: 3 }} />
  );
  return (
    <div style={{ height: "100vh", width: "100%", overflow: "hidden", background: "#F7F8F9" }}>
      <div style={{ display: "grid", gridTemplateColumns: "264px 1fr", height: "100vh" }}>
        {/* Sidebar */}
        <div style={{ background: "#181818", padding: "20px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "8px 8px", gap: 2.5, transform: "rotate(45deg)" }}>
              <div style={{ width: 8, height: 8, background: "#FF442B" }} />
              <div style={{ width: 8, height: 8, background: "#FF442B" }} />
              <div style={{ width: 8, height: 8, background: "#FF442B" }} />
              <div style={{ width: 8, height: 8, background: "#FF442B" }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#F7F8F9", letterSpacing: "-0.01em" }}>thirdbase</span>
          </div>
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14, opacity: 0.25 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="tb-skeleton" style={{ height: 12, width: i % 2 ? "70%" : "85%", borderRadius: 3, background: "#3a3a3a" }} />
            ))}
          </div>
        </div>

        {/* Main */}
        <div>
          <div style={{ height: 64, background: "#fff", borderBottom: "1px solid #E6E8EC", display: "flex", alignItems: "center", padding: "0 28px", gap: 16 }}>
            <div>{bar(80, 10)}{bar(150, 14, 8)}</div>
            <div style={{ marginLeft: "auto" }}>{bar(340, 38)}</div>
          </div>
          <div style={{ padding: "32px 28px" }}>
            {bar(220, 28)}
            {bar(320, 14, 10)}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginTop: 28 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #E6E8EC", borderTop: "3px solid #E6E8EC", padding: 20 }}>
                  {bar(160, 16)}
                  {bar(120, 12, 8)}
                  {bar("100%", 8, 18)}
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <div className="tb-skeleton" style={{ flex: 1, height: 44, borderRadius: 3 }} />
                    <div className="tb-skeleton" style={{ flex: 1, height: 44, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
