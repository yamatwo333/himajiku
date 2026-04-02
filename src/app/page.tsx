import Script from "next/script";
import BrandLogo from "@/components/BrandLogo";

const entryRedirectScript = `
(() => {
  try {
    var hasAuthCookie = document.cookie
      .split(";")
      .map(function (cookie) { return cookie.trim(); })
      .some(function (cookie) {
        return cookie.startsWith("sb-") && cookie.includes("auth-token");
      });

    window.location.replace(hasAuthCookie ? "/calendar" : "/login");
  } catch (error) {
    window.location.replace("/login");
  }
})();
`;

export default function Home() {
  return (
    <>
      <Script id="entry-redirect" strategy="beforeInteractive">
        {entryRedirectScript}
      </Script>

      <div
        className="flex min-h-svh flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <BrandLogo variant="lockup" className="mx-auto" />
        <div
          role="status"
          aria-live="polite"
          className="mt-6 flex items-center gap-2 text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <span
            className="h-2.5 w-2.5 animate-pulse rounded-full"
            style={{ backgroundColor: "var(--color-primary)" }}
          />
          読み込み中...
        </div>
      </div>
    </>
  );
}
