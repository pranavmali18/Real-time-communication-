import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { UserModel } from "../models/User.js";

const router = Router();

router.use(requireAuth);

// GET /api/users/me
router.get("/me", async (req, res) => {
  const user = await UserModel.publicById(req.userId);
  res.json({ user });
});

// GET /api/users?search=foo
router.get("/", async (req, res) => {
  const { search } = req.query;
  const users = await UserModel.searchOthers(req.userId, search?.trim());
  res.json({ users });
});

export default router;
