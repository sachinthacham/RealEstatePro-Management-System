import { Request, Response, NextFunction } from "express";
import { heroService } from "../services/hero.service";
import {
  updateHeroSchema,
  UpdateHeroInput,
} from "../validations/hero.validation";

class HeroController {
  // GET /api/herosection
  public getHero = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const hero = await heroService.getHeroSection();

      res.status(200).json({
        success: true,
        data: hero ?? {
          title: "Find Your Dream Home",
          description: "Browse thousands of verified listings across the island.",
          imageUrl: "",
          isActive: true,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/herosection
  public updateHero = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = updateHeroSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
        return;
      }

      const updatedHero = await heroService.updateHeroSection(value as UpdateHeroInput);

      res.status(200).json({
        success: true,
        message: "Hero section updated successfully",
        data: updatedHero,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const heroController = new HeroController();
