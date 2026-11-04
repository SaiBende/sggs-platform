import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth, useUser } from "@clerk/react";
import { SubscriptionDetailsButton } from "@clerk/react/experimental";
import { toast } from "react-toastify";
import {
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  HelpCircle,
  Home,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Plus,
  QrCode,
  Settings2,
  UserRound,
  X,
} from "lucide-react";
import { apiFetch } from "../utils/auth";
import { clerkBillingAppearance } from "../utils/clerkAppearance";
import { platformUrl } from "../lib/platform";
import { cn } from "../lib/utils";
import BillingBoundary from "./BillingBoundary";
import { BrandMark } from "./ui/brand-mark";
import { buttonVariants } from "./ui/button";

const workspaceLinks = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

const createLinks = [
  { to: "/shortenlink", label: "Shorten link", icon: Plus },
  { to: "/qrgenerate", label: "QR studio", icon: QrCode },
  { to: "/linktree", label: "Link in bio", icon: UserRound },
];

const moreLinks = [
  { to: "/", label: "Back to website", icon: Home },
  {
    href: "mailto:hello@saibende.tech",
    label: "Help & feedback",
    icon: HelpCircle,
  },
];

const pageLabels = {
  "/dashboard": "Overview",
  "/analytics": "Analytics",
  "/shortenlink": "Shorten link",
  "/qrgenerate": "QR studio",
  "/linktree": "Link in bio",
};

const itemClassName = (active) =>
  cn(
    "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition",
    active
      ? "bg-brand-50 text-brand-700 shadow-[inset_0_0_0_1px_rgba(109,94,246,0.12)]"
      : "text-ink/60 hover:bg-ink/[0.04] hover:text-ink"
  );

const iconClassName = (active) =>
  cn(
    "h-4 w-4 shrink-0 transition",
    active ? "text-brand-600" : "text-ink/35 group-hover:text-ink/55"
  );

const formatPlanDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

function WorkspaceNavItem({ item, onNavigate }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) => itemClassName(isActive)}
    >
      {({ isActive }) => (
        <>
          <Icon className={iconClassName(isActive)} />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {isActive && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
          )}
        </>
      )}
    </NavLink>
  );
}

function WorkspaceLayout({ children }) {
  const [profile, setProfile] = useState(null);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
  );
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user: clerkUser } = useUser();
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const onProfileUpdated = () => setProfileRefreshKey((value) => value + 1);
    window.addEventListener("sggs:profile-updated", onProfileUpdated);
    return () =>
      window.removeEventListener("sggs:profile-updated", onProfileUpdated);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      if (!isLoaded) return;
      if (!isSignedIn) {
        setProfile(null);
        return;
      }

      try {
        const response = await apiFetch("/user/isauth", { method: "POST" });
        if (response.status === 401) {
          if (!cancelled) setProfile(null);
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (!cancelled && result.success) setProfile(result.user);
      } catch (error) {
        console.error("Error fetching workspace profile:", error);
      }
    };

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, profileRefreshKey]);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onChange = (event) => {
      setIsDesktop(event.matches);
      if (event.matches) setMobileOpen(false);
    };

    setIsDesktop(desktop.matches);
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  const handleLogout = async () => {
    try {
      setMobileOpen(false);
      toast.success("You’re signed out");
      await signOut({ redirectUrl: "/" });
      setProfile(null);
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Could not log out. Please try again.");
    }
  };

  const displayName =
    profile?.username ||
    profile?.email?.split("@")[0] ||
    clerkUser?.firstName ||
    "Account";
  const email =
    profile?.email || clerkUser?.primaryEmailAddress?.emailAddress || "";
  const initials = String(displayName)
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const publicUrl = profile?.handle
    ? platformUrl(profile.handle)
    : profile?.username
      ? `/u/${profile.username}`
      : null;
  const pageLabel =
    pageLabels[location.pathname.replace(/\/+$/, "") || "/"] || "Workspace";

  const plan = profile?.plan;
  const usedLinks = Number.isFinite(profile?.urlCount) ? profile.urlCount : 0;
  const hasLimitedPlan =
    Boolean(plan) && !plan.unlimited && Number.isFinite(plan.limit);
  const usagePercent = hasLimitedPlan
    ? Math.min(100, Math.round((usedLinks / Math.max(plan.limit, 1)) * 100))
    : 0;
  const canManagePlan = plan?.source === "clerk";
  const planTitle = plan ? `${plan.name} plan` : null;

  let planStatus = "Upgrade for more links and analytics.";
  if (plan?.source === "clerk") {
    const periodEnd = formatPlanDate(plan.currentPeriodEnd);

    if (plan.status === "past_due") {
      planStatus = "Payment past due. Update your billing details.";
    } else if (plan.cancelAtPeriodEnd && periodEnd) {
      planStatus = `Cancels on ${periodEnd}`;
    } else if (periodEnd) {
      const periodLabel = plan.period === "year" ? "Yearly" : "Monthly";
      planStatus = `${periodLabel} · renews ${periodEnd}`;
    } else {
      planStatus = "Managed by Clerk Billing";
    }
  } else if (plan?.source === "legacy") {
    const periodEnd = formatPlanDate(plan.currentPeriodEnd);
    planStatus = periodEnd ? `Active until ${periodEnd}` : "Legacy plan · active";
  }

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-paper">
      <button
        type="button"
        aria-label="Close workspace menu"
        aria-hidden={!mobileOpen}
        tabIndex={mobileOpen ? 0 : -1}
        onClick={closeMobile}
        className={cn(
          "fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        id="workspace-sidebar"
        aria-label="Workspace navigation"
        aria-hidden={!isDesktop && !mobileOpen}
        inert={!isDesktop && !mobileOpen ? "" : undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col border-r border-ink/10 bg-white shadow-[18px_0_60px_-50px_rgba(11,11,16,0.6)] transition-transform duration-300 ease-out lg:translate-x-0 lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-[76px] shrink-0 items-center gap-2 border-b border-ink/10 px-4">
          <Link
            to="/dashboard"
            onClick={closeMobile}
            className="group flex min-w-0 items-center gap-2.5"
            aria-label="SGGS workspace"
          >
            <BrandMark />
            <span className="min-w-0 leading-none">
              <span className="block font-display text-[18px] font-extrabold tracking-[-0.05em] text-ink">
                SGGS
              </span>
              <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.24em] text-ink/40">
                workspace
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={closeMobile}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-ink/45 transition hover:bg-ink/[0.05] hover:text-ink lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 px-3 pt-3">
          <Link
            to="/shortenlink"
            onClick={closeMobile}
            className={buttonVariants({
              variant: "brand",
              size: "md",
              className: "w-full justify-between",
            })}
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create link
            </span>
            <ChevronRight className="h-4 w-4 opacity-70" />
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-3">
          <nav className="space-y-1" aria-label="Workspace">
            <p className="px-3 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink/30">
              Workspace
            </p>
            {workspaceLinks.map((item) => (
              <WorkspaceNavItem
                key={item.to}
                item={item}
                onNavigate={closeMobile}
              />
            ))}
            <Link
              to="/dashboard#links"
              onClick={() => {
                closeMobile();
                window.setTimeout(() => {
                  document
                    .getElementById("links")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 0);
              }}
              className={itemClassName(false)}
            >
              <Link2 className={iconClassName(false)} />
              <span className="min-w-0 flex-1 truncate">Your links</span>
            </Link>

            <p className="px-3 pb-1.5 pt-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink/30">
              Create
            </p>
            {createLinks.map((item) => (
              <WorkspaceNavItem
                key={item.to}
                item={item}
                onNavigate={closeMobile}
              />
            ))}

            <p className="px-3 pb-1.5 pt-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink/30">
              More
            </p>
            {moreLinks.map((item) => {
              const Icon = item.icon;
              const className = itemClassName(false);

              if (item.href) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={closeMobile}
                    className={className}
                  >
                    <Icon className={iconClassName(false)} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </a>
                );
              }

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={closeMobile}
                  className={className}
                >
                  <Icon className={iconClassName(false)} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}

            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobile}
                className={itemClassName(false)}
              >
                <ArrowUpRight className={iconClassName(false)} />
                <span className="min-w-0 flex-1 truncate">Public page</span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink/25">
                  Live
                </span>
              </a>
            )}
          </nav>
        </div>

        <div className="shrink-0 border-t border-ink/10 p-3">
          {plan && (
            <div className="mb-2 rounded-xl border border-brand-200/60 bg-gradient-to-br from-brand-50/90 to-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-brand-700/60">
                  Your plan
                </p>
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-brand-700 shadow-sm ring-1 ring-brand-200/60">
                  {planTitle}
                </span>
              </div>
              <p className="mt-2 text-[11px] font-semibold text-ink">
                {plan.unlimited
                  ? "Unlimited links"
                  : `${usedLinks} of ${plan.limit} links used`}
              </p>
              {hasLimitedPlan && (
                <div
                  className="mt-1.5 h-1 overflow-hidden rounded-full bg-brand-200/60"
                  role="progressbar"
                  aria-label="Link usage"
                  aria-valuemin={0}
                  aria-valuemax={plan.limit}
                  aria-valuenow={usedLinks}
                >
                  <span
                    className={cn(
                      "block h-full rounded-full transition-[width]",
                      usagePercent >= 80 ? "bg-amber-500" : "bg-brand-500"
                    )}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              )}
              <p className="mt-1.5 text-[9px] leading-4 text-muted">
                {planStatus}
              </p>
              {canManagePlan ? (
                <BillingBoundary
                  fallback={
                    <Link
                      to="/pricing"
                      onClick={closeMobile}
                      className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-ink/10 bg-white py-2 text-[10px] font-semibold text-ink transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                    >
                      <Settings2 className="h-3 w-3" /> Manage plan
                    </Link>
                  }
                >
                  <SubscriptionDetailsButton
                    subscriptionDetailsProps={{
                      appearance: clerkBillingAppearance,
                    }}
                  >
                    <button
                      type="button"
                      onClick={closeMobile}
                      className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-ink/10 bg-white py-2 text-[10px] font-semibold text-ink transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                    >
                      <Settings2 className="h-3 w-3" /> Manage plan
                    </button>
                  </SubscriptionDetailsButton>
                </BillingBoundary>
              ) : (
                <Link
                  to="/pricing"
                  onClick={closeMobile}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-ink/10 bg-white py-2 text-[10px] font-semibold text-ink transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                >
                  {plan.source === "legacy" ? "View plans" : "Upgrade plan"}
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}

          <div className="flex items-center gap-2.5 rounded-xl border border-ink/10 bg-canvas p-2.5">
            {clerkUser?.imageUrl ? (
              <img
                src={clerkUser.imageUrl}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-sky-400 text-[10px] font-bold text-white">
                {initials || "S"}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-ink">
                {displayName}
              </p>
              <p className="truncate text-[10px] text-muted">
                {email || "Signed in"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink/35 transition hover:bg-red-50 hover:text-red-600"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[17rem]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink/10 bg-canvas/90 px-4 backdrop-blur-xl lg:hidden">
          <Link
            to="/dashboard"
            className="flex shrink-0 items-center gap-2"
            aria-label="SGGS workspace"
          >
            <BrandMark size="sm" />
            <span className="font-display text-[16px] font-extrabold tracking-[-0.05em] text-ink">
              SGGS
            </span>
          </Link>
          <span className="h-4 w-px bg-ink/10" aria-hidden="true" />
          <span className="hidden min-w-0 truncate text-[12px] font-medium text-ink/45 sm:block">
            {pageLabel}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Link
              to="/shortenlink"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-[0_8px_20px_-12px_rgba(91,74,232,0.9)] transition hover:bg-brand-700"
              aria-label="Create a short link"
              title="Create a short link"
            >
              <Plus className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/10 bg-white text-ink/60 transition hover:border-ink/20 hover:text-ink"
              aria-label="Open workspace menu"
              aria-expanded={mobileOpen}
              aria-controls="workspace-sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] lg:min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}

export default WorkspaceLayout;
