import express from "express";
import controller from "../controllers/adminController.js";
const router = express.Router();

router.post("/validate", controller.validateAdmin);
router.post("/check", controller.checkAdminStatus);

export default router;
