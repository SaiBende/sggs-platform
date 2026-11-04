import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navigationbar from "./components/Navigationbar";
import WorkspaceLayout from "./components/WorkspaceLayout";
import Footer from "./components/Footer";

// Signed-in app pages use the workspace shell instead of the marketing header.
// Keeping this route-based means the shell stays stable while Clerk loads and
// public pages (home, pricing, profiles) keep the top navigation.
const workspaceRoutes = new Set([
  "/dashboard",
  "/analytics",
  "/plan",
  "/shortenlink",
  "/qrgenerate",
  "/linktree",
]);

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const timer = window.setTimeout(() => {
        const target = document.getElementById(hash.slice(1));
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 0);

      return () => window.clearTimeout(timer);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}

function Layout() {
  const { pathname } = useLocation();
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const isWorkspace = workspaceRoutes.has(normalizedPath);

  return (
    <>
      <ScrollToTop />
      {isWorkspace ? (
        <WorkspaceLayout>
          <Outlet />
        </WorkspaceLayout>
      ) : (
        <div className="flex min-h-screen flex-col bg-paper">
          <Navigationbar />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </div>
      )}
    </>
  );
}

export default Layout;

