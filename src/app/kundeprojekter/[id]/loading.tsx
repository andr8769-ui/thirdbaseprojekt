// Vises mens kundeprojektet hentes.
export default function Loading() {
  const bar = (w: number | string, h = 12, mt = 0) => (
    <div className="tb-skeleton" style={{ width: w, height: h, marginTop: mt, borderRadius: 3 }} />
  );
  return (
    <div style={{ minHeight: "100vh", background: "#F7F8F9" }}>
      <div className="tb-pad" style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px 80px" }}>
        {bar(120, 16)}
        {bar(300, 30, 28)}
        {bar(200, 14, 12)}
        <div style={{ background: "#fff", border: "1px solid #E6E8EC", borderTop: "3px solid #E6E8EC", padding: 24, marginTop: 28 }}>
          {bar(200, 16)}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 18 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                {bar(90, 10)}
                {bar("100%", 32, 6)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
