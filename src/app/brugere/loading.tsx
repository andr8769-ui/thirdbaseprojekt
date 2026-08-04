export default function Loading() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F8F9" }}>
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "48px 24px" }}>
        <div className="tb-skeleton" style={{ width: 160, height: 28, borderRadius: 3 }} />
        <div className="tb-skeleton" style={{ width: 380, height: 14, borderRadius: 3, marginTop: 12 }} />
        <div style={{ background: "#fff", border: "1px solid #E6E8EC", marginTop: 28, padding: 20, display: "flex", gap: 12 }}>
          <div className="tb-skeleton" style={{ flex: 1, height: 42, borderRadius: 3 }} />
          <div className="tb-skeleton" style={{ flex: 1, height: 42, borderRadius: 3 }} />
          <div className="tb-skeleton" style={{ width: 220, height: 42, borderRadius: 3 }} />
        </div>
        <div style={{ background: "#fff", border: "1px solid #E6E8EC", marginTop: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid #F5F6F8" }}>
              <div className="tb-skeleton" style={{ width: i % 2 ? "55%" : "70%", height: 14, borderRadius: 3 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
