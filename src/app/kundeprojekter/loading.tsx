// Vises mens oversigten hentes. Samme skelet-stil som resten af appen.
export default function Loading() {
  const bar = (w: number | string, h = 12, mt = 0) => (
    <div className="tb-skeleton" style={{ width: w, height: h, marginTop: mt, borderRadius: 3 }} />
  );
  return (
    <div style={{ minHeight: "100vh", background: "#F7F8F9" }}>
      <div className="tb-pad" style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>
        {bar(120, 16)}
        {bar(240, 28, 28)}
        {bar(380, 14, 12)}
        <div className="tb-kort-grid" style={{ marginTop: 32 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #E6E8EC", borderTop: "3px solid #E6E8EC", padding: 20 }}>
              {bar(180, 16)}
              {bar(120, 12, 10)}
              {bar("100%", 8, 20)}
              {bar(200, 12, 16)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
