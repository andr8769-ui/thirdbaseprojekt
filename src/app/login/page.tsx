import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth, signIn } from "@/auth";
import { HUSK_COOKIE, SIKRE_COOKIES } from "@/auth.config";

export const dynamic = "force-dynamic";

const FEJL: Record<string, string> = {
  AccessDenied:
    "Kun verificerede @thirdbase.dk-konti har adgang til projektstyringen. Log ind med din thirdbase-mail.",
  Configuration:
    "Login er ikke sat korrekt op. Kontakt en administrator (mangler Google-nøgler eller AUTH_SECRET).",
  Verification: "Login-linket er udløbet eller allerede brugt. Prøv igen.",
  Default: "Der opstod en fejl under login. Prøv igen.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;
  const fejlBesked = error ? FEJL[error] || FEJL.Default : null;

  async function loginMedGoogle(formData: FormData) {
    "use server";
    // Fluebenet kan ikke sendes med gennem Googles OAuth-redirect, så det lægges
    // i en kortlivet, httpOnly cookie som jwt-callbacken læser når brugeren
    // kommer retur. 10 minutter er rigeligt til at gennemføre et login.
    const husk = formData.get("husk") === "on";
    (await cookies()).set(HUSK_COOKIE, husk ? "1" : "0", {
      httpOnly: true,
      secure: SIKRE_COOKIES,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
    await signIn("google", { redirectTo: "/" });
  }

  return (
    <div style={{ height: "100vh", width: "100%", overflow: "hidden", background: "#F7F8F9", color: "#181818" }}>
      <div style={{ height: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {/* Venstre — brand */}
        <div
          style={{
            background: "#181818",
            color: "#F7F8F9",
            padding: 56,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "9px 9px", gap: 3, transform: "rotate(45deg)" }}>
              <div style={{ width: 9, height: 9, background: "#FF442B" }} />
              <div style={{ width: 9, height: 9, background: "#FF442B" }} />
              <div style={{ width: 9, height: 9, background: "#FF442B" }} />
              <div style={{ width: 9, height: 9, background: "#FF442B" }} />
            </div>
            <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>thirdbase</span>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9E9E9E",
                marginBottom: 20,
              }}
            >
              Internt projektstyringsværktøj
            </div>
            <div
              style={{
                fontSize: 48,
                lineHeight: 1.05,
                fontWeight: 400,
                letterSpacing: "-0.02em",
                maxWidth: "14ch",
                textWrap: "pretty",
              }}
            >
              Alle kunder. Ét overblik.
            </div>
            <div style={{ fontSize: 16, color: "#9E9E9E", marginTop: 24, maxWidth: "44ch", lineHeight: 1.5 }}>
              Boards, opgaver og deadlines for hver kunde vi arbejder med — samlet ét sted.
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#6E6E6E" }}>thirdbase ApS · intern adgang</div>
        </div>

        {/* Højre — login */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 56 }}>
          <div style={{ width: "100%", maxWidth: 380 }}>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>Log ind</div>
            <div style={{ fontSize: 15, color: "#6E6E6E", marginTop: 8 }}>
              Brug din thirdbase Google-konto.
            </div>

            {fejlBesked && (
              <div
                style={{
                  marginTop: 24,
                  border: "1px solid #FFD7CF",
                  background: "#FFF3F0",
                  color: "#B4291A",
                  fontSize: 13,
                  lineHeight: 1.5,
                  padding: "12px 14px",
                }}
              >
                {fejlBesked}
              </div>
            )}

            <form action={loginMedGoogle} style={{ marginTop: 32 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                  fontSize: 14,
                  color: "#4A4A4A",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  name="husk"
                  style={{ width: 16, height: 16, accentColor: "#FF442B", cursor: "pointer", flex: "none" }}
                />
                Forbliv logget ind
              </label>

              <button
                type="submit"
                style={{
                  width: "100%",
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  background: "#fff",
                  border: "1px solid #DDE0E5",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#181818",
                  cursor: "pointer",
                }}
              >
                <GoogleG />
                Log ind med Google
              </button>
            </form>

            <div
              style={{
                marginTop: 24,
                fontSize: 12.5,
                color: "#9E9E9E",
                lineHeight: 1.55,
              }}
            >
              Kun medarbejdere med en <strong style={{ color: "#6E6E6E" }}>@thirdbase.dk</strong>-adresse kan oprette
              sig og logge ind. Første login opretter automatisk din profil.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2582h2.9082c1.7018-1.5668 2.6841-3.874 2.6841-6.6151z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9082-2.2582c-.8059.54-1.8368.859-3.0482.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2822-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4409 1.346l2.5813-2.5814C15.4632.8918 13.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
    </svg>
  );
}
