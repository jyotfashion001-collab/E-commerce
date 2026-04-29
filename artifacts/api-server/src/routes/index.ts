import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import meRouter from "./me";
import dashboardRouter from "./dashboard";
import ordersRouter from "./orders";
import inventoryRouter from "./inventory";
import uploadRouter from "./upload";
import imageUploadsRouter from "./image-uploads";
import usersRouter from "./users";
import accountingRouter from "./accounting";
import companiesRouter from "./companies";
import purchasesRouter from "./purchases";
import returnOrdersRouter from "./return-orders";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(meRouter);
router.use(companiesRouter);
router.use(dashboardRouter);
router.use(ordersRouter);
router.use(inventoryRouter);
router.use(uploadRouter);
router.use(imageUploadsRouter);
router.use(usersRouter);
router.use(accountingRouter);
router.use(purchasesRouter);
router.use(returnOrdersRouter);
router.use(paymentsRouter);

export default router;
