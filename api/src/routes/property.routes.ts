import { Router } from "express";
import { PropertyController } from "../controllers/property.controller";
import { authenticate, authorize, optionalAuthenticate } from "../middlewares/auth.middleware";
import { validate, validateQuery } from "../middlewares/validate";
import {
  createPropertyValidation,
  updatePropertyValidation,
  propertyQueryValidation,
} from "../validations/property.validation";
import upload from '../middlewares/upload.middleware'; // IMPORT YOUR MULTER CONFIG
// Import the review router
import reviewRouter from './review.routes'; 

const router = Router();
const propertyController = new PropertyController();

/**
 * PUBLIC ROUTES
 */

// Important: Specific routes must come BEFORE parameterized routes (/:id)
router.get('/nearby', propertyController.getNearbyProperties);

router.get(
  "/",
  optionalAuthenticate,
  validateQuery(propertyQueryValidation),
  propertyController.getProperties
);

router.get(
  "/agent/:agentId",
  optionalAuthenticate,
  validateQuery(propertyQueryValidation),
  propertyController.getPropertiesByAgent
);

router.get(
  "/:id",
  optionalAuthenticate,
  propertyController.getPropertyById
);

/**
 * PROTECTED ROUTES (Require Login)
 */

router.post(
  '/', 
  authenticate,          // 1. Check if user is logged in
  authorize('agent', 'admin'),
  upload.array('images'), // 2.  CRITICAL: Parse the Multipart Data (Files + Body)
  //validate(createPropertyValidation), // 3. (Optional) Validate body AFTER Multer parses it
  propertyController.createProperty // 4. Finally, run the controller
);

router.put(
  "/:id",
  authenticate,
  authorize('agent', 'admin'),
  validate(updatePropertyValidation),
  propertyController.updateProperty
);

router.delete(
  "/:id",
  authenticate,
  authorize('agent', 'admin'),
  propertyController.deleteProperty
);

//Review routes
// --- 1. MOUNT REVIEW ROUTER ---
// This tells Express: "If a route matches /:id/reviews, verify it and hand it over to reviewRouter"
router.use('/:id/reviews', reviewRouter);


export default router;