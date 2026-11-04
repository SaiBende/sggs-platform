import shortid from "shortid";
import { URL } from "../models/url.model.js";
import { User } from "../models/user.model.js";
import { resolvePlan } from "../utils/plans.js";
import { isReservedShortId } from "../utils/shortId.js";

async function handleGenerateNewShortURL(req, res) {
    try {
        // req.user is set by the auth middleware
        const userId = req.user.user_id;

        // Fetch the user from the database
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const body = req.body || {};

        if (typeof body.url !== "string" || !body.url.trim()) {
            return res.status(400).json({ error: "URL is required" });
        }

        const destination = body.url.trim();
        const customURL =
            typeof body.customURL === "string" ? body.customURL.trim() : "";

        // Reuse the user's existing link instead of creating a duplicate. The
        // query is scoped to the owner so one user can never discover another
        // user's short link. If historical duplicates exist, return the oldest.
        const existingURL = await URL.findOne({
            createdBy: userId,
            redirectURL: destination,
        })
            .select("shortId redirectURL createdAt visitCount")
            .sort({ createdAt: 1 })
            .lean();

        if (existingURL) {
            return res.status(409).json({
                duplicate: true,
                id: existingURL.shortId,
                shortId: existingURL.shortId,
                redirectURL: existingURL.redirectURL,
                createdAt: existingURL.createdAt,
                visitCount: existingURL.visitCount || 0,
                error: "You already shortened this link.",
                message: "This destination is already in your account.",
            });
        }

        // Effective plan (Clerk subscription or legacy purchase, expiry-aware)
        const plan = resolvePlan(user);
        const urlLimit = plan.limit;

        // Check if the user has reached their limit
        if (user.urlCount >= urlLimit) {
            return res.status(403).json({ error: `You have reached your limit of ${urlLimit} short URLs` });
        }

        let newURL;
        if (!customURL) {
            // Generated IDs may land on a reserved name; regenerate until safe.
            let generatedShortId;
            do {
                generatedShortId = shortid.generate();
            } while (isReservedShortId(generatedShortId));

            newURL = await URL.create({
                shortId: generatedShortId,
                redirectURL: destination,
                createdBy: userId,
                visitHistory: [],
            });
        } else {
            if (isReservedShortId(customURL)) {
                return res.status(400).json({ error: "This short URL is reserved" });
            }
            const alreadypresenturl = await URL.findOne({ shortId: customURL });
            if (alreadypresenturl) {
                return res.status(400).json({ error: "Custom URL already present" });
            }
            newURL = await URL.create({
                shortId: customURL,
                redirectURL: destination,
                createdBy: userId,
                visitHistory: [],
            });
        }

        // Increment the user's URL count after successful creation
        user.urlCount += 1;
        await user.save();

        return res.json({ id: newURL.shortId, message: "URL created successfully" });
    } catch (error) {
        // Duplicate key race condition (custom URL taken between check and insert)
        if (error.code === 11000) {
            return res.status(400).json({ error: "This short URL is already taken" });
        }
        console.error("Error creating short URL:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export { handleGenerateNewShortURL };
