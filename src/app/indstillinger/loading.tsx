export default function Loading() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F8F9" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px" }}>
        <div className="tb-skeleton" style={{ width: 180, height: 28, borderRadius: 3 }} />
        <div className="tb-skeleton" style={{ width: 260, height: 14, borderRadius: 3, marginTop: 12 }} />
        <div style={{ background: "#fff", border: "1px solid #E6E8EC", marginTop: 28, padding: 20 }}>
          <div className="tb-skeleton" style={{ width: "100%", height: 44, borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}
