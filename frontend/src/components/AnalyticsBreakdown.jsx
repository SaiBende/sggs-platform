import { useMemo } from "react";
import {
  Compass,
  Gamepad2,
  Globe2,
  Link2,
  Mail,
  MapPin,
  Megaphone,
  Monitor,
  MonitorSmartphone,
  MousePointerClick,
  QrCode,
  Search,
  Share2,
  Smartphone,
  Tablet,
  Tv,
  Users,
  Watch,
} from "lucide-react";
import { cn } from "../lib/utils";

const number = (value) => Number(value || 0).toLocaleString();

const DEVICES = {
  mobile: { label: "Mobile", icon: Smartphone, color: "bg-brand-500" },
  desktop: { label: "Desktop", icon: Monitor, color: "bg-emerald-500" },
  tablet: { label: "Tablet", icon: Tablet, color: "bg-sky-500" },
  smarttv: { label: "Smart TV", icon: Tv, color: "bg-amber-500" },
  console: { label: "Console", icon: Gamepad2, color: "bg-rose-500" },
  wearable: { label: "Wearable", icon: Watch, color: "bg-violet-500" },
  embedded: { label: "Embedded", icon: MonitorSmartphone, color: "bg-cyan-500" },
  unknown: { label: "Unknown", icon: MonitorSmartphone, color: "bg-ink/30" },
};

const CHANNELS = {
  direct: { label: "Direct", icon: MousePointerClick },
  internal: { label: "Internal", icon: Link2 },
  search: { label: "Search", icon: Search },
  social: { label: "Social", icon: Share2 },
  paid: { label: "Paid", icon: Megaphone },
  email: { label: "Email", icon: Mail },
  qr: { label: "QR code", icon: QrCode },
  referral: { label: "Referral", icon: Globe2 },
};

let regionNames = null;
try {
  regionNames = new Intl.DisplayNames(["en"], { type: "region" });
} catch {
  regionNames = null;
}

const countryName = (code) => {
  try {
    return regionNames?.of(code) || code;
  } catch {
    return code;
  }
};

const totalOf = (items) =>
  items.reduce((sum, item) => sum + (item.count || 0), 0);

function Empty({ children }) {
  return (
    <p className="mt-3 rounded-lg border border-dashed border-ink/10 bg-canvas/60 px-3 py-4 text-center text-[10px] leading-4 text-muted">
      {children}
    </p>
  );
}

function MetricCard({ label, value, hint, icon: Icon, accent = "text-brand-600" }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          {label}
        </p>
        <Icon className={cn("h-3.5 w-3.5", accent)} />
      </div>
      <p className="mt-1.5 truncate font-display text-xl font-semibold tracking-[-0.03em] text-ink">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] leading-4 text-muted">{hint}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, children, className }) {
  return (
    <section className={cn("rounded-2xl border border-ink/10 bg-white p-4", className)}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-[11px] font-semibold text-ink">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ListBars({
  items = [],
  formatName = (value) => value,
  color = "bg-brand-500",
  limit = 6,
  empty,
}) {
  const visible = items.slice(0, limit);
  const total = totalOf(items);

  if (!visible.length) return <Empty>{empty}</Empty>;

  return (
    <ul className="mt-3 space-y-3">
      {visible.map((item) => {
        const pct = total ? Math.round((item.count / total) * 100) : 0;

        return (
          <li key={item.name}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[11px] font-medium text-ink">
                {formatName(item.name)}
              </span>
              <span className="shrink-0 text-[10px] tabular-nums text-muted">
                {number(item.count)} · {pct}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
              <div
                className={cn("h-full rounded-full", color)}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DevicePanel({ items = [] }) {
  const total = totalOf(items);

  if (!items.length) return <Empty>No device data yet.</Empty>;

  return (
    <>
      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-ink/[0.06]">
        {items.map((item) => {
          const meta = DEVICES[item.name] || DEVICES.unknown;
          return (
            <span
              key={item.name}
              className={meta.color}
              style={{ width: `${total ? (item.count / total) * 100 : 0}%` }}
              title={`${meta.label}: ${number(item.count)}`}
            />
          );
        })}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        {items.map((item) => {
          const meta = DEVICES[item.name] || DEVICES.unknown;
          const Icon = meta.icon;
          return (
            <li
              key={item.name}
              className="flex items-center gap-1.5 text-[10px] text-muted"
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-md text-white",
                  meta.color
                )}
              >
                <Icon className="h-3 w-3" />
              </span>
              <span className="truncate text-ink">{meta.label}</span>
              <span className="ml-auto tabular-nums">{number(item.count)}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ChannelList({ items = [] }) {
  const total = totalOf(items);

  if (!items.length) return <Empty>No source data yet.</Empty>;

  return (
    <ul className="mt-3 space-y-2.5">
      {items.map((item) => {
        const meta = CHANNELS[item.name] || {
          label: item.name,
          icon: Compass,
        };
        const Icon = meta.icon;
        const pct = total ? Math.round((item.count / total) * 100) : 0;

        return (
          <li key={item.name} className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
              <Icon className="h-3 w-3" />
            </span>
            <span className="w-16 shrink-0 truncate text-[11px] font-medium text-ink">
              {meta.label}
            </span>
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-[10px] tabular-nums text-muted">
              {number(item.count)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function AnalyticsBreakdown({ analytics, className }) {
  const topChannel = useMemo(() => {
    const top = [...(analytics?.channels || [])].sort(
      (a, b) => b.count - a.count
    )[0];

    return top ? CHANNELS[top.name]?.label || top.name : "—";
  }, [analytics]);

  if (!analytics) return null;

  const hasTracked = (analytics.trackedVisits || 0) > 0;
  const visitsHint =
    analytics.legacyVisits > 0
      ? "All-time total"
      : "Bots and prefetches excluded";

  return (
    <div className={cn("mt-6 border-t border-ink/10 pt-5", className)}>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MetricCard
          label="Visits"
          value={number(analytics.totalVisits)}
          hint={visitsHint}
          icon={MousePointerClick}
        />
        <MetricCard
          label="Unique visitors"
          value={number(analytics.uniqueVisitors)}
          hint={hasTracked ? "Distinct browsers" : "Awaiting new clicks"}
          icon={Users}
          accent="text-sky-600"
        />
        <MetricCard
          label="Countries"
          value={number(analytics.countriesReached)}
          hint="From edge geolocation"
          icon={Globe2}
          accent="text-emerald-600"
        />
        <MetricCard
          label="Top source"
          value={topChannel}
          hint="Where clicks begin"
          icon={Compass}
          accent="text-amber-600"
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Panel title="Top locations" icon={MapPin}>
          <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
            Countries
          </p>
          <ListBars
            items={analytics.countries}
            formatName={countryName}
            empty="No country data yet."
            limit={5}
          />
          <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
            Cities
          </p>
          <ListBars
            items={analytics.cities}
            empty="No city data yet."
            limit={4}
            color="bg-sky-500"
          />
        </Panel>

        <div className="space-y-3">
          <Panel title="Devices" icon={MonitorSmartphone}>
            <DevicePanel items={analytics.devices} />
          </Panel>
          <Panel title="Traffic sources" icon={Compass}>
            <ChannelList items={analytics.channels} />
          </Panel>
        </div>

        <Panel title="Browsers" icon={Globe2}>
          <ListBars
            items={analytics.browsers}
            empty="No browser data yet."
            color="bg-emerald-500"
          />
        </Panel>

        <Panel title="Referrers" icon={Link2}>
          <ListBars
            items={analytics.referrers}
            empty="Direct traffic or untracked sources only."
            color="bg-amber-500"
          />
        </Panel>

        <Panel title="Operating systems" icon={Monitor} className="sm:col-span-2">
          <ListBars
            items={analytics.operatingSystems}
            empty="No operating system data yet."
            color="bg-violet-500"
          />
        </Panel>
      </div>

      <p className="mt-3 text-[10px] leading-4 text-muted">
        Counts come from the redirect host and exclude bots and prefetches.
        Unique visitors use the first-party analytics cookie, not fingerprints.
      </p>
    </div>
  );
}

export default AnalyticsBreakdown;
