import { Router, type IRouter } from "express";
import { authLimiter } from "../../middleware/rate-limit.js";

/* Ensure shared TOTP cleanup interval runs and shared helpers are registered */
import "./auth-common.js";

import configRouter from "./config.js";
import identifierRouter from "./identifier.js";
import phoneRouter from "./phone.routes.js";
import emailRouter from "./email.routes.js";
import totpRouter from "./totp.routes.js";
import passwordRouter from "./password.js";
import registerRouter from "./register.js";
import refreshRouter from "./refresh.js";
import socialRouter from "./social.js";
import magicLinkRouter from "./magic-link.js";
import mergeRouter from "./merge.js";
import miscRouter from "./misc.js";
import sessionsRouter from "./sessions.js";
import phoneAccountRouter from "./phone-account.js";

const router: IRouter = Router();

router.use(authLimiter);

/* Mount sub-routers (each module registers its own route paths) */
router.use(configRouter);
router.use(identifierRouter);
router.use(phoneRouter);       // replaces otp.ts
router.use(emailRouter);       // replaces email-otp.ts
router.use(totpRouter);        // replaces two-factor.ts
router.use(passwordRouter);
router.use(registerRouter);
router.use(refreshRouter);
router.use(socialRouter);
router.use(magicLinkRouter);
router.use(mergeRouter);
router.use(miscRouter);
router.use(sessionsRouter);
router.use(phoneAccountRouter);

export default router;
