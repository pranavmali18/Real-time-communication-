import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { UserModel } from "../models/User.js";

const router = Router();

router.use(requireAuth);

// GET /api/users/me
router.get("/me", (req, res) => {
  const user = UserModel.publicById(req.userId);
  res.json({ user });
});

// GET /api/users?search=foo
router.get("/", (req, res) => {
  const { search } = req.query;
  const users = UserModel.searchOthers(req.userId, search?.trim());
  res.json({ users });
});

export default router;
