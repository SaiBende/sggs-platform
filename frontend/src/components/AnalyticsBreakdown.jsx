import { lazy, Suspense, useMemo } from "react";
import {
  CalendarDays,
  Clock3,
  Compass,
  Gamepad2,
  Globe2,
  History,
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
import { countryName } from "../lib/geo";

const TrafficMap = lazy(() => import("./TrafficMap"));

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

// MongoDB $dayOfWeek: 1 = Sunday … 7 = Saturday.
const WEEKDAYS = [
  { day: 1, label: "Sun" },
  { day: 2, label: "Mon" },
  { day: 3, label: "Tue" },
  { day: 4, label: "Wed" },
  { day: 5, label: "Thu" },
  { day: 6, label: "Fri" },
  { day: 7, label: "Sat" },
];

const totalOf = (items) =>
  items.reduce((sum, item) => sum + (item.count || 0), 0);

const peakOf = (items) =>
  items.reduce(
    (best, item) => (item.count > (best?.count || 0) ? item : best),
    null
  );

const formatHour = (hour) => {
  if (!Number.isFinite(hour)) return "—";
  return `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`;
};

const formatVisitTime = (value, timezone) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const options = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };

  try {
    return date.toLocaleString(
      undefined,
      timezone ? { ...options, timeZone: timezone } : options
    );
  } catch {
    return date.toLocaleString(undefined, options);
  }
};

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

function HourlyBars({ hours = [] }) {
  const data = hours.length
    ? hours
    : Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const max = Math.max(...data.map((item) => item.count), 1);
  const peak = peakOf(data);

  return (
    <div>
      <div className="mt-3 flex h-24 items-end gap-[3px]">
        {data.map((item) => (
          <div
            key={item.hour}
            className="group flex h-full flex-1 items-end"
            title={`${formatHour(item.hour)} · ${number(item.count)} ${
              item.count === 1 ? "visit" : "visits"
            }`}
          >
            <div
              className="w-full rounded-t-[3px] bg-brand-500/80 transition group-hover:bg-brand-600"
              style={{
                height: `${
                  item.count ? Math.max(5, (item.count / max) * 100) : 2
                }%`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[9px] text-muted">
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>11 PM</span>
      </div>
      <p className="mt-2 text-[10px] text-muted">
        Visitor local time
        {peak?.count ? ` · peak ${formatHour(peak.hour)}` : ""}
      </p>
    </div>
  );
}

function WeekdayBars({ days = [] }) {
  const data = WEEKDAYS.map((meta) => ({
    ...meta,
    count: days.find((item) => item.day === meta.day)?.count || 0,
  }));
  const max = Math.max(...data.map((item) => item.count), 1);
  const peak = peakOf(data);

  return (
    <div>
      <ul className="mt-3 space-y-2">
        {data.map((item) => (
          <li key={item.day} className="flex items-center gap-2">
            <span className="w-8 text-[10px] font-medium text-muted">
              {item.label}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
              <div
                className="h-full rounded-full bg-sky-500"
                style={{
                  width: `${
                    item.count ? Math.max(3, (item.count / max) * 100) : 0
                  }%`,
                }}
              />
            </div>
            <span className="w-8 text-right text-[10px] tabular-nums text-muted">
              {number(item.count)}
            </span>
          </li>
        ))}
      </ul>
      {peak?.count > 0 && (
        <p className="mt-2 text-[10px] text-muted">
          Busiest on {peak.label} · visitor local time
        </p>
      )}
    </div>
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

function TrafficMapPanel({ points = [] }) {
  if (!points.length) {
    return (
      <Empty>
        No map coordinates yet. New visits will appear as location bubbles.
      </Empty>
    );
  }

  return (
    <>
      <div className="mt-3">
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-xl border border-ink/10 bg-ink/[0.04]" />
          }
        >
          <TrafficMap points={points} />
        </Suspense>
      </div>
      <p className="mt-2 text-[10px] text-muted">
        Bubble size reflects visits, grouped to roughly 10 km.
      </p>
    </>
  );
}

function RecentVisits({ visits = [] }) {
  if (!visits.length) {
    return <Empty>No individual visits recorded in this range.</Empty>;
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-ink/10">
      <div className="hidden grid-cols-[1.1fr_1fr_1fr_0.9fr] gap-3 bg-canvas px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted sm:grid">
        <span>When</span>
        <span>Location</span>
        <span>Device</span>
        <span>Source</span>
      </div>
      <ul className="divide-y divide-ink/[0.06]">
        {visits.slice(0, 12).map((visit, index) => {
          const device = DEVICES[visit.deviceType] || DEVICES.unknown;
          const DeviceIcon = device.icon;
          const channel = CHANNELS[visit.channel] || {
            label: visit.channel || "Direct",
          };

          return (
            <li
              key={`${visit.clickedAt}-${index}`}
              className="grid gap-1.5 px-3 py-2.5 sm:grid-cols-[1.1fr_1fr_1fr_0.9fr] sm:items-center sm:gap-3"
            >
              <div>
                <span className="mr-1 text-[9px] uppercase tracking-wide text-muted sm:hidden">
                  When
                </span>
                <span className="text-[11px] font-medium text-ink">
                  {formatVisitTime(visit.clickedAt, visit.timezone)}
                </span>
              </div>
              <div>
                <span className="mr-1 text-[9px] uppercase tracking-wide text-muted sm:hidden">
                  Location
                </span>
                <span className="text-[11px] text-muted">
                  {[visit.city, countryName(visit.country)]
                    .filter(Boolean)
                    .join(", ") || "Unknown"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-1 text-[9px] uppercase tracking-wide text-muted sm:hidden">
                  Device
                </span>
                <DeviceIcon className="h-3 w-3 text-ink/40" />
                <span className="truncate text-[11px] text-muted">
                  {visit.browser || device.label}
                  {visit.os ? ` · ${visit.os}` : ""}
                </span>
              </div>
              <div className="truncate">
                <span className="mr-1 text-[9px] uppercase tracking-wide text-muted sm:hidden">
                  Source
                </span>
                <span className="text-[11px] text-muted">
                  {channel.label}
                  {visit.referrerHost ? ` · ${visit.referrerHost}` : ""}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AnalyticsBreakdown({ analytics, className }) {
  const derived = useMemo(() => {
    const channels = [...(analytics?.channels || [])].sort(
      (a, b) => b.count - a.count
    );
    const peakHour = peakOf(analytics?.hourly || []);
    const peakDay = peakOf(analytics?.weekdays || []);

    return {
      topChannel: channels[0]
        ? CHANNELS[channels[0].name]?.label || channels[0].name
        : "—",
      peakHour: peakHour?.count ? formatHour(peakHour.hour) : "—",
      peakDay: peakDay?.count
        ? WEEKDAYS.find((day) => day.day === peakDay.day)?.label || "—"
        : "—",
    };
  }, [analytics]);

  if (!analytics) return null;

  const hasTracked = (analytics.trackedVisits || 0) > 0;
  const visitsHint =
    analytics.legacyVisits > 0
      ? "All-time total"
      : "Bots and prefetches excluded";

  return (
    <div className={cn("mt-6 border-t border-ink/10 pt-5", className)}>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
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
          label="Peak hour"
          value={derived.peakHour}
          hint="Visitor local time"
          icon={Clock3}
          accent="text-amber-600"
        />
        <MetricCard
          label="Peak day"
          value={derived.peakDay}
          hint="Visitor local time"
          icon={CalendarDays}
          accent="text-violet-600"
        />
        <MetricCard
          label="Top source"
          value={derived.topChannel}
          hint="Where clicks begin"
          icon={Compass}
          accent="text-brand-600"
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Panel
          title="Visit patterns"
          icon={Clock3}
          className="sm:col-span-2"
        >
          <div className="mt-3 grid gap-5 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                Hour of day
              </p>
              <HourlyBars hours={analytics.hourly} />
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                Weekday
              </p>
              <WeekdayBars days={analytics.weekdays} />
            </div>
          </div>
        </Panel>

        <Panel title="Traffic map" icon={Globe2} className="sm:col-span-2">
          <TrafficMapPanel points={analytics.mapPoints || []} />
        </Panel>

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

        <Panel
          title="Recent visits"
          icon={History}
          className="sm:col-span-2"
        >
          <RecentVisits visits={analytics.recentVisits || []} />
        </Panel>
      </div>

      <p className="mt-3 text-[10px] leading-4 text-muted">
        Counts exclude bots and prefetches. Times and weekdays use each
        visitor&apos;s timezone when the edge provides it. Unique visitors use
        the first-party analytics cookie, not fingerprints.
      </p>
    </div>
  );
}

export default AnalyticsBreakdown;
