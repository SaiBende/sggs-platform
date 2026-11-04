import { URL } from "../models/url.model.js";
import { Visit } from "../models/visit.model.js";

// Bots and speculative prefetches are stored for auditability, but they are
// not people clicking the link. Every report below excludes them.
const HUMAN_MATCH = {
    isBot: { $ne: true },
    isPrefetch: { $ne: true },
};

const breakdownPipeline = (field, limit = 8) => [
    { $match: { [field]: { $nin: [null, ""] } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
];

const toBreakdown = (rows) =>
    (rows || []).map((row) => ({
        name: String(row._id),
        count: row.count || 0,
    }));

export const handleURLStatus = async (req, res) => {
    const { shortId } = req.params;

    try {
        // `visitHistory` is select:false on the schema so dashboard/list queries
        // never pay for the legacy array. Analytics explicitly opts in.
        const url = await URL.findOne({ shortId })
            .select("createdBy +visitHistory")
            .lean();

        if (!url) {
            return res.status(404).json({ error: "URL not found" });
        }

        // Only the owner can view the analytics of a URL (req.user from auth middleware)
        if (String(url.createdBy) !== req.user.user_id) {
            return res.status(403).json({ error: "You are not allowed to view this URL's analytics" });
        }

        // One pass over the Visit collection produces the chart timestamps and
        // every breakdown. The raw timestamps keep the existing client-side
        // local-date grouping, while the facets avoid one query per metric.
        const [summary = {}] = await Visit.aggregate([
            {
                $match: {
                    urlId: url._id,
                    ...HUMAN_MATCH,
                },
            },
            {
                $facet: {
                    totals: [{ $count: "visits" }],
                    uniqueVisitors: [
                        { $match: { visitorId: { $nin: [null, ""] } } },
                        { $group: { _id: "$visitorId" } },
                        { $count: "count" },
                    ],
                    countriesReached: [
                        { $match: { country: { $nin: [null, ""] } } },
                        { $group: { _id: "$country" } },
                        { $count: "count" },
                    ],
                    timestamps: [
                        { $sort: { clickedAt: 1 } },
                        { $project: { _id: 0, timestamp: "$clickedAt" } },
                    ],
                    countries: breakdownPipeline("country"),
                    cities: breakdownPipeline("city", 6),
                    referrers: breakdownPipeline("referrerHost"),
                    devices: [
                        {
                            $group: {
                                _id: { $ifNull: ["$deviceType", "unknown"] },
                                count: { $sum: 1 },
                            },
                        },
                        { $sort: { count: -1, _id: 1 } },
                    ],
                    browsers: [
                        {
                            $group: {
                                _id: { $ifNull: ["$browser", "Unknown"] },
                                count: { $sum: 1 },
                            },
                        },
                        { $sort: { count: -1, _id: 1 } },
                        { $limit: 8 },
                    ],
                    operatingSystems: [
                        {
                            $group: {
                                _id: { $ifNull: ["$os", "Unknown"] },
                                count: { $sum: 1 },
                            },
                        },
                        { $sort: { count: -1, _id: 1 } },
                        { $limit: 6 },
                    ],
                    channels: [
                        {
                            $group: {
                                _id: { $ifNull: ["$channel", "direct"] },
                                count: { $sum: 1 },
                            },
                        },
                        { $sort: { count: -1, _id: 1 } },
                    ],
                },
            },
        ]);

        // Legacy timestamps are merged with the new Visit rows so the chart
        // keeps the link's full history during and after the migration.
        const legacyTimestamps = (url.visitHistory || [])
            .map((visit) => visit.timestamp)
            .filter((timestamp) => Number.isFinite(timestamp));

        const liveTimestamps = (summary.timestamps || [])
            .map((visit) => new Date(visit.timestamp).getTime())
            .filter((timestamp) => Number.isFinite(timestamp));

        const visitHistory = [...legacyTimestamps, ...liveTimestamps]
            .sort((a, b) => a - b)
            .map((timestamp) => ({ timestamp }));

        const trackedVisits = summary.totals?.[0]?.visits || 0;

        return res.status(200).json({
            visitHistory,
            visitHistoryLength: visitHistory.length,
            visitCount: visitHistory.length,
            shortId,
            analytics: {
                totalVisits: visitHistory.length,
                trackedVisits,
                legacyVisits: legacyTimestamps.length,
                uniqueVisitors: summary.uniqueVisitors?.[0]?.count || 0,
                countriesReached: summary.countriesReached?.[0]?.count || 0,
                countries: toBreakdown(summary.countries),
                cities: toBreakdown(summary.cities),
                devices: toBreakdown(summary.devices),
                browsers: toBreakdown(summary.browsers),
                operatingSystems: toBreakdown(summary.operatingSystems),
                channels: toBreakdown(summary.channels),
                referrers: toBreakdown(summary.referrers),
            },
        });
    } catch (error) {
        console.error("Error fetching URL status:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
