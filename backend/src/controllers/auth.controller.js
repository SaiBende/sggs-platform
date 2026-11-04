import { resolvePlan } from "../utils/plans.js";
import { syncUserBilling } from "../utils/clerkBilling.js";

// Clerk owns registration, login, email verification and password reset.
// This endpoint exists so the frontend can confirm a session, read the
// effective plan, and trigger the local MongoDB user sync performed by the
// auth middleware.
const isauthenticated = async (req, res) => {
    try {
        // The plan page uses this after a Clerk checkout to avoid waiting for
        // the normal billing-sync TTL.
        const refreshBilling = String(
            req.query?.refreshBilling ?? req.body?.refreshBilling ?? ""
        ).toLowerCase();

        if (
            (refreshBilling === "1" || refreshBilling === "true") &&
            req.dbUser
        ) {
            try {
                await syncUserBilling(req.dbUser, { force: true });
            } catch (error) {
                // Keep serving the cached entitlement rather than failing the
                // whole request after a successful checkout.
                console.warn(
                    "[billing] Plan refresh failed:",
                    error?.message || error
                );
            }
        }

        const plan = resolvePlan(req.dbUser);
        const publicPlan = {
            ...plan,
            limit: plan.unlimited ? null : plan.limit,
        };

        return res.status(200).json({
            success: true,
            message: "You are authenticated",
            user: {
                ...req.user,
                urlCount: Number(req.dbUser?.urlCount) || 0,
                plan: publicPlan,
            },
        });
    } catch (error) {
        console.error("Could not load the authenticated user:", error);

        return res.status(500).json({
            success: false,
            message: "Could not load your account details.",
        });
    }
};

export { isauthenticated };
