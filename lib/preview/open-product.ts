/** Owner walkthrough: homepage → onboard → Talk. No login required. */
export function isOpenProductPath(pathname: string): boolean {
  return (
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname === "/meet" ||
    pathname.startsWith("/meet/") ||
    pathname.startsWith("/onboard") ||
    pathname.startsWith("/dashboard")
  );
}
