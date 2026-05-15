import { Router, Request, Response } from "express";
import {
  getAllItems,
  getItemsByCategory,
  getCategories,
  getRestaurantInfo,
} from "../services/menuService";

const router = Router();

// GET /api/menu — full menu
router.get("/", (_req: Request, res: Response) => {
  res.json({
    restaurant: getRestaurantInfo(),
    categories: getCategories(),
    items: getAllItems(),
  });
});

// GET /api/menu/categories
router.get("/categories", (_req: Request, res: Response) => {
  res.json({ categories: getCategories() });
});

// GET /api/menu/category/:name
router.get("/category/:name", (req: Request, res: Response) => {
  const items = getItemsByCategory(req.params.name);
  if (items.length === 0) {
    res.status(404).json({ error: `No items found in category "${req.params.name}"` });
    return;
  }
  res.json({ items });
});

export default router;