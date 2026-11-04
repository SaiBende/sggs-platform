import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  BarChart3,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  LayoutDashboard,
  Link2,
  MousePointerClick,
  Plus,
  Search,
  TrendingUp,
} from "lucide-react";
import { apiFetch } from "../utils/auth";
import { shortUrl } from "../lib/brand";
import { cn } from "../lib/utils";
import VisitTrends from "../components/VisitTrends";
import AnalyticsBreakdown from "../components/AnalyticsBreakdown";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";
import { Badge } from "../components/ui/badge";
import { Button, buttonVariants } from "../components/ui/button";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 0, label: "All time" },
];

const formatNumber = (value) => Number(value || 0).toLocaleString();

const prettyUrl = (value) => String(value || "").replace(/^https?:\/\//, "");

const clickCount = (url) => {
  if (Number.isFinite(url?.clicks)) return url.clicks;
  return (url?.visitCount || 0) + (url?.visitHistory?.length || 0);
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function OverviewCard({ label, value, hint, icon: Icon }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">
          {label}
        </p>
        <Icon className="h-3.5 w-3.5 text-brand-600" />
      </div>
      <p className="mt-1.5 truncate font-display text-lg font-semibold tracking-[-0.03em] text-ink">
        {value}
      </p>
      <p className="text-[10px] leading-4 text-muted">{hint}</p>
    </div>
  );
}

function Analytics() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [userData, setUserData] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [visitHistory, setVisitHistory] = useState([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [linkSearch, setLinkSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedShortId = searchParams.get("link") || "";
  const requestedDays = Number(searchParams.get("range"));
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 0;

  const links = useMemo(() => {
    return [...(userData?.urls || [])].sort(
      (a, b) => clickCount(b) - clickCount(a)
    );
  }, [userData]);

  const selectedLink =
    links.find((link) => link.shortId === selectedShortId) || links[0] || null;
  const activeShortId = selectedLink?.shortId || "";

  const totalClicks = useMemo(
    () => links.reduce((sum, link) => sum + clickCount(link), 0),
    [links]
  );

  const filteredLinks = useMemo(() => {
    const query = linkSearch.trim().toLowerCase();
    if (!query) return links;

    return links.filter(
      (link) =>
        link.shortId.toLowerCase().includes(query) ||
        String(link.redirectURL || "").toLowerCase().includes(query)
    );
  }, [links, linkSearch]);

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "" || value === 0) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });

    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;

    const loadLinks = async () => {
      setLoadingUser(true);
      setUserError(null);

      try {
        const response = await apiFetch("/user/dashboard", { method: "POST" });
        if (response.status === 401) {
          navigate("/login");
          return;
        }

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Could not load your links.");
        }

        if (!cancelled) setUserData(result);
      } catch (error) {
        if (!cancelled) {
          setUserError(
            error.message === "Failed to fetch"
              ? "Could not reach the server. Check your connection and try again."
              : error.message || "Could not load your links."
          );
        }
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    };

    loadLinks();

    return () => {
      cancelled = true;
    };
  }, [navigate, reloadKey]);

  useEffect(() => {
    if (!links.length) return;
    if (links.some((link) => link.shortId === selectedShortId)) return;

    // Keep the chosen link in the URL so a refresh or shared link reopens it.
    const next = new URLSearchParams(searchParams);
    next.set("link", links[0].shortId);
    setSearchParams(next, { replace: true });
  }, [links, searchParams, selectedShortId, setSearchParams]);

  useEffect(() => {
    if (!activeShortId) {
      setAnalytics(null);
      setVisitHistory([]);
      return undefined;
    }

    let cancelled = false;

    const loadAnalytics = async () => {
      setLoadingAnalytics(true);
      setAnalyticsError(null);
      setAnalytics(null);
      setVisitHistory([]);

      try {
        const response = await apiFetch(`/${activeShortId}/status`, {
          method: "POST",
          body: JSON.stringify({ days }),
        });

        if (response.status === 401) {
          navigate("/login");
          return;
        }

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Could not load analytics.");
        }

        if (!cancelled) {
          setVisitHistory(result.visitHistory || []);
          setAnalytics(result.analytics || null);
        }
      } catch (error) {
        if (!cancelled) {
          setAnalyticsError(
            error.message === "Failed to fetch"
              ? "Could not reach the server. Check your connection and try again."
              : error.message || "Could not load analytics."
          );
        }
      } finally {
        if (!cancelled) setLoadingAnalytics(false);
      }
    };

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [activeShortId, days, navigate, reloadKey]);

  const copyLink = async () => {
    if (!selectedLink) return;

    try {
      await navigator.clipboard.writeText(shortUrl(selectedLink.shortId));
      setCopied(true);
      toast.success("Short link copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  };

  const rangeLabel = days ? `the last ${days} days` : "all time";

  return (
    <div className="pb-20">
      <section className="relative overflow-hidden border-b border-ink/10">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-fade opacity-60" />
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-[20rem] w-[38rem] -translate-x-1/2 rounded-full bg-brand-400/10 blur-[100px]"
        />
        <div className="container-page relative py-10 sm:py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/55 shadow-sm backdrop-blur">
                <BarChart3 className="h-3 w-3 text-brand-600" /> Analytics
              </div>
              <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.06] tracking-[-0.05em] text-ink sm:text-4xl">
                Every click, explained.
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-muted">
                Pick a link to see when people click, where they are, what they
                use and where they came from.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/dashboard"
                className={buttonVariants({ variant: "secondary", size: "md" })}
              >
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
              <Link
                to="/shortenlink"
                className={buttonVariants({ variant: "primary", size: "md" })}
              >
                <Plus className="h-4 w-4" /> New link
              </Link>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <OverviewCard
              label="All-time clicks"
              value={formatNumber(totalClicks)}
              hint="Across every link"
              icon={MousePointerClick}
            />
            <OverviewCard
              label="Active links"
              value={formatNumber(links.length)}
              hint="Short links in your account"
              icon={Link2}
            />
            <OverviewCard
              label="Best link"
              value={selectedLink ? `/${links[0]?.shortId || "—"}` : "—"}
              hint={
                links[0]
                  ? `${formatNumber(clickCount(links[0]))} clicks`
                  : "Create your first link"
              }
              icon={TrendingUp}
            />
            <OverviewCard
              label="Viewing"
              value={days ? `Last ${days} days` : "All time"}
              hint="Selected link range"
              icon={CalendarDays}
            />
          </div>
        </div>
      </section>

      <div className="container-page pt-8">
        {loadingUser ? (
          <div className="rounded-2xl border border-ink/10 bg-white shadow-card">
            <Loading message="Loading your links..." className="py-20" />
          </div>
        ) : userError ? (
          <div className="rounded-2xl border border-ink/10 bg-white shadow-card">
            <ErrorState
              title="Couldn't load analytics"
              message={userError}
              onRetry={() => setReloadKey((value) => value + 1)}
              className="py-16"
            />
          </div>
        ) : !links.length ? (
          <div className="mx-auto max-w-lg rounded-3xl border border-ink/10 bg-white p-8 text-center shadow-card">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <BarChart3 className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold tracking-[-0.03em] text-ink">
              No links to analyse yet
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-muted">
              Create a short link, share it, and its clicks will show up here
              with timing, locations and devices.
            </p>
            <Link
              to="/shortenlink"
              className={buttonVariants({
                variant: "primary",
                size: "md",
                className: "mt-5",
              })}
            >
              <Plus className="h-4 w-4" /> Create a short link
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
            <aside className="rounded-2xl border border-ink/10 bg-white p-3 shadow-card lg:sticky lg:top-6">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-semibold text-ink">Your links</p>
                <Badge variant="outline">{links.length}</Badge>
              </div>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/30" />
                <input
                  value={linkSearch}
                  onChange={(event) => setLinkSearch(event.target.value)}
                  placeholder="Search links"
                  className="h-9 w-full rounded-lg border border-ink/10 bg-canvas pl-8 pr-2 text-[11px] text-ink outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-0.5 lg:max-h-[65vh]">
                {filteredLinks.map((link) => {
                  const active = link.shortId === activeShortId;

                  return (
                    <button
                      key={link.shortId}
                      type="button"
                      onClick={() => updateParams({ link: link.shortId })}
                      className={cn(
                        "w-full rounded-xl p-2.5 text-left transition",
                        active
                          ? "bg-ink text-white"
                          : "hover:bg-ink/[0.035]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-[11px] font-semibold",
                            active ? "text-white" : "text-ink"
                          )}
                        >
                          /{link.shortId}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-[10px] tabular-nums",
                            active ? "text-white/60" : "text-muted"
                          )}
                        >
                          {formatNumber(clickCount(link))}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "mt-0.5 truncate text-[10px]",
                          active ? "text-white/45" : "text-muted"
                        )}
                      >
                        {prettyUrl(link.redirectURL)}
                      </p>
                    </button>
                  );
                })}
                {!filteredLinks.length && (
                  <p className="px-2 py-6 text-center text-[11px] text-muted">
                    No links match “{linkSearch}”.
                  </p>
                )}
              </div>
            </aside>

            <main className="min-w-0">
              {selectedLink && (
                <>
                  <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                          <Link2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <a
                            href={shortUrl(selectedLink.shortId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate font-display text-lg font-semibold tracking-[-0.03em] text-ink transition hover:text-brand-600"
                          >
                            {prettyUrl(shortUrl(selectedLink.shortId))}
                          </a>
                          <p
                            className="truncate text-[11px] text-muted"
                            title={selectedLink.redirectURL}
                          >
                            → {selectedLink.redirectURL}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={copyLink}
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copied ? "Copied" : "Copy"}
                        </Button>
                        <a
                          href={shortUrl(selectedLink.shortId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({
                            variant: "soft",
                            size: "sm",
                          })}
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Open
                        </a>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                      <Badge variant="brand">
                        {formatNumber(clickCount(selectedLink))} all-time clicks
                      </Badge>
                      <span>Created {formatDate(selectedLink.createdAt)}</span>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 border-t border-ink/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] font-semibold text-ink">
                        Showing {rangeLabel}
                      </p>
                      <div className="flex flex-wrap gap-1 rounded-xl border border-ink/10 bg-canvas p-1">
                        {RANGES.map((range) => (
                          <button
                            key={range.days}
                            type="button"
                            onClick={() =>
                              updateParams({ range: range.days || null })
                            }
                            className={cn(
                              "rounded-lg px-3 py-1.5 text-[11px] font-semibold transition",
                              days === range.days
                                ? "bg-white text-ink shadow-sm"
                                : "text-muted hover:text-ink"
                            )}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-card sm:p-6">
                    {loadingAnalytics ? (
                      <Loading
                        message="Loading link analytics..."
                        className="py-20"
                      />
                    ) : analyticsError ? (
                      <ErrorState
                        title="Couldn't load link analytics"
                        message={analyticsError}
                        onRetry={() => setReloadKey((value) => value + 1)}
                        className="py-14"
                      />
                    ) : (
                      <>
                        <VisitTrends
                          visitHistory={visitHistory}
                          title={`Clicks for /${selectedLink.shortId}`}
                          height={260}
                        />
                        <AnalyticsBreakdown analytics={analytics} />
                      </>
                    )}
                  </div>
                </>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

export default Analytics;
