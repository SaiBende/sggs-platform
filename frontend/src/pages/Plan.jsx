import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PricingTable } from "@clerk/react";
import { SubscriptionDetailsButton } from "@clerk/react/experimental";
import { toast } from "react-toastify";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  Link2,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { apiFetch } from "../utils/auth";
import { clerkBillingAppearance } from "../utils/clerkAppearance";
import BillingBoundary from "../components/BillingBoundary";
import Loading from "../components/Loading";
import { Badge } from "../components/ui/badge";
import { Button, buttonVariants } from "../components/ui/button";
import { BackgroundBeams } from "../components/ui/background-beams";

const included = [
  "Personal page and subdomain",
  "Custom short-link back-halves",
  "QR code downloads",
  "Visit analytics and traffic map",
  "Link-in-bio editor",
];

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function Plan() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const startedRef = useRef(false);
  const billingSuccess = useMemo(
    () => searchParams.get("billing") === "success",
    [searchParams]
  );

  const loadProfile = useCallback(
    async ({ refreshBilling = false } = {}) => {
      setLoading(true);
      setError(null);

      try {
        const attempts = refreshBilling ? 4 : 1;
        let user = null;

        for (let attempt = 0; attempt < attempts; attempt += 1) {
          const response = await apiFetch(
            `/user/isauth${refreshBilling ? "?refreshBilling=1" : ""}`,
            { method: "POST" }
          );

          if (!response.ok) {
            throw new Error(
              response.status === 401
                ? "Your session expired. Please sign in again."
                : `Could not load your plan (HTTP ${response.status}).`
            );
          }

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.message || "Could not load your plan.");
          }

          user = result.user;
          if (!refreshBilling || user.plan?.source === "clerk") break;
          if (attempt < attempts - 1) await delay(1200);
        }

        setProfile(user);
        return user;
      } catch (loadError) {
        console.error("Error loading plan:", loadError);
        setError(loadError.message || "Could not load your plan.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const load = async () => {
      if (!billingSuccess) {
        await loadProfile();
        return;
      }

      const user = await loadProfile({ refreshBilling: true });
      if (user?.plan?.source === "clerk") {
        toast.success("Your plan is active.");
      }
      navigate("/plan", { replace: true });
    };

    load();
  }, [billingSuccess, loadProfile, navigate]);

  const plan = profile?.plan;
  const urlCount = Number.isFinite(profile?.urlCount) ? profile.urlCount : 0;
  const isUnlimited = Boolean(plan?.unlimited);
  const limit = isUnlimited
    ? Infinity
    : Number.isFinite(plan?.limit)
      ? plan.limit
      : 0;
  const usagePercent =
    !isUnlimited && Number.isFinite(limit) && limit > 0
      ? Math.min(100, Math.round((urlCount / limit) * 100))
      : 0;
  const canManage = plan?.source === "clerk";
  const periodEnd = formatDate(plan?.currentPeriodEnd);

  let statusText = "Upgrade for more links and richer analytics.";
  if (plan?.source === "clerk") {
    if (plan.status === "past_due") {
      statusText = "Payment past due. Update your billing details to keep the plan active.";
    } else if (plan.cancelAtPeriodEnd && periodEnd) {
      statusText = `Cancels on ${periodEnd}. Your links stay active until then.`;
    } else if (periodEnd) {
      const period = plan.period === "year" ? "Yearly" : "Monthly";
      statusText = `${period} plan · renews on ${periodEnd}`;
    } else {
      statusText = "Managed securely through Clerk Billing.";
    }
  } else if (plan?.source === "legacy") {
    statusText = periodEnd
      ? `Legacy plan · active until ${periodEnd}`
      : "Legacy plan · active";
  }

  const planStateLabel =
    plan?.status === "past_due"
      ? "Past due"
      : plan?.source === "clerk"
        ? plan.cancelAtPeriodEnd
          ? "Cancels soon"
          : "Active"
        : plan?.source === "legacy"
          ? "Legacy"
          : "Free";

  const statusVariant =
    plan?.status === "past_due" || plan?.cancelAtPeriodEnd
      ? "warning"
      : plan?.source === "clerk"
        ? "success"
        : plan?.source === "legacy"
          ? "brand"
          : "dark-outline";

  if (loading) {
    return (
      <section className="container-page py-16">
        <Loading message="Loading your plan..." className="min-h-[55vh]" />
      </section>
    );
  }

  if (error && !profile) {
    return (
      <section className="container-page py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-ink/10 bg-white p-6 text-center shadow-card">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <RefreshCw className="h-5 w-5" />
          </span>
          <h1 className="mt-4 font-display text-xl font-semibold tracking-[-0.03em] text-ink">
            Couldn&apos;t load your plan
          </h1>
          <p className="mt-2 text-[12px] leading-6 text-muted">{error}</p>
          <Button className="mt-5" onClick={() => loadProfile()}>
            Try again
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="pb-16">
      <section className="border-b border-ink/10 bg-white/60">
        <div className="container-page py-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                Workspace
              </p>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-0.045em] text-ink sm:text-4xl">
                Plan & billing
              </h1>
              <p className="mt-2 max-w-xl text-[13px] leading-6 text-muted">
                See your current plan, track link usage, and manage your
                subscription in one place.
              </p>
            </div>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink/60 transition hover:text-brand-700"
            >
              Public pricing page <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page pt-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="min-w-0 space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-ink/10 bg-ink p-5 text-white shadow-card sm:p-6">
              <BackgroundBeams className="opacity-25" />
              <div className="relative z-10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      Current plan
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2.5">
                      <h2 className="font-display text-2xl font-semibold tracking-[-0.04em]">
                        {plan?.name || "Free"} plan
                      </h2>
                      <Badge variant={statusVariant} dot>
                        {planStateLabel}
                      </Badge>
                    </div>
                    <p className="mt-2 max-w-lg text-[11px] leading-5 text-white/45">
                      {statusText}
                    </p>
                  </div>
                  <Wallet className="h-5 w-5 text-brand-300" />
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">
                        Links used
                      </p>
                      <p className="text-[11px] font-semibold text-white/60">
                        {urlCount} / {isUnlimited ? "∞" : limit}
                      </p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-400 to-sky-300 transition-all duration-700"
                        style={{
                          width: isUnlimited ? "100%" : `${Math.max(4, usagePercent)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-white/35">
                      {isUnlimited
                        ? "Unlimited links on this plan."
                        : `${Math.max(0, limit - urlCount)} spots remaining.`}
                    </p>
                  </div>

                  {canManage ? (
                    <BillingBoundary fallback={null}>
                      <SubscriptionDetailsButton
                        subscriptionDetailsProps={{
                          appearance: clerkBillingAppearance,
                        }}
                      >
                        <Button variant="white" size="md">
                          <Settings2 className="h-4 w-4" /> Manage plan
                        </Button>
                      </SubscriptionDetailsButton>
                    </BillingBoundary>
                  ) : (
                    <a
                      href="#plans"
                      className={buttonVariants({ variant: "white", size: "md" })}
                    >
                      {plan?.source === "legacy" ? "See available plans" : "Upgrade plan"}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <section id="plans" className="scroll-mt-20">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold tracking-[-0.035em] text-ink">
                    Compare plans
                  </h2>
                  <p className="mt-1 text-[12px] leading-5 text-muted">
                    Upgrade, switch between monthly and yearly billing, or
                    change plans. Checkout is handled by Clerk.
                  </p>
                </div>
                <Badge variant="outline" className="gap-1.5 self-start px-2.5 py-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Secure checkout
                </Badge>
              </div>

              <div className="pricing-table-shell mt-4 overflow-hidden rounded-[1.75rem] border border-ink/10 bg-white p-2 shadow-card sm:p-4">
                <BillingBoundary>
                  <PricingTable
                    for="user"
                    highlightedPlan="standard"
                    newSubscriptionRedirectUrl="/plan?billing=success"
                    appearance={clerkBillingAppearance}
                    checkoutProps={{ appearance: clerkBillingAppearance }}
                    fallback={
                      <div className="flex min-h-[18rem] items-center justify-center rounded-2xl border border-dashed border-ink/10 bg-canvas px-6 text-center">
                        <div>
                          <Sparkles className="mx-auto h-5 w-5 text-brand-500" />
                          <p className="mt-3 text-[13px] font-semibold text-ink">
                            Loading plans…
                          </p>
                          <p className="mt-1 text-[11px] text-muted">
                            Plans are loaded securely from Clerk Billing.
                          </p>
                        </div>
                      </div>
                    }
                  />
                </BillingBoundary>
              </div>

              <p className="mt-3 text-[11px] leading-5 text-muted">
                Existing links are never deleted when a plan changes or ends.
                If you cancel, access continues until the end of the paid
                period.
              </p>
            </section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <CreditCard className="h-4 w-4" />
                </span>
                <p className="text-[12px] font-semibold text-ink">Billing details</p>
              </div>
              <dl className="mt-4 space-y-3 text-[11px]">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted">Plan</dt>
                  <dd className="text-right font-semibold text-ink">
                    {plan?.name || "Free"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted">Billing</dt>
                  <dd className="text-right font-semibold text-ink">
                    {plan?.source === "clerk"
                      ? plan.period === "year"
                        ? "Yearly"
                        : "Monthly"
                      : plan?.source === "legacy"
                        ? "One-time"
                        : "Free"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted">Links</dt>
                  <dd className="text-right font-semibold text-ink">
                    {urlCount} / {isUnlimited ? "∞" : limit}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted">
                    {plan?.cancelAtPeriodEnd || plan?.source === "legacy"
                      ? "Access until"
                      : "Renews"}
                  </dt>
                  <dd className="text-right font-semibold text-ink">
                    {periodEnd || "No renewal"}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 border-t border-ink/10 pt-3 text-[10px] leading-5 text-muted">
                Card details are handled by Clerk. SGGS only stores your plan
                and subscription status.
              </p>
            </div>

            <div className="rounded-2xl border border-ink/10 bg-canvas p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
                  <Link2 className="h-4 w-4" />
                </span>
                <p className="text-[12px] font-semibold text-ink">Every plan includes</p>
              </div>
              <ul className="mt-4 space-y-2.5">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11px] text-ink/60">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-brand-200/70 bg-brand-50/70 p-5">
              <p className="text-[12px] font-semibold text-ink">Questions about billing?</p>
              <p className="mt-1.5 text-[11px] leading-5 text-muted">
                Read the plan FAQs or contact us before changing your
                subscription.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
                >
                  Plan FAQs <ArrowUpRight className="h-3 w-3" />
                </Link>
                <a
                  href="mailto:hello@saibende.tech"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
                >
                  Contact support <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          </aside>
        </div>

        {error && profile && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            {error} You can keep using your workspace, then refresh this page.
          </div>
        )}
      </section>
    </div>
  );
}

export default Plan;
