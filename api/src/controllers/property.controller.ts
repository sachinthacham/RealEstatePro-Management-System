import { Request, Response, NextFunction } from "express";
import { PropertyService, PropertyViewer } from "../services/property.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import { IPropertyResponse } from "../interfaces/IProperty";
import Property from "../models/property.model";
import { createPropertyValidation } from "../validations/property.validation";
import { notifyAdmins } from "../services/notification.service";

const propertyService = new PropertyService();

const getViewer = (req: AuthRequest): PropertyViewer | undefined =>
  req.user ? { id: req.user._id.toString(), role: req.user.role } : undefined;

export class PropertyController {
  createProperty = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      let address = req.body.address;
      let location = req.body.location;
      let amenities = req.body.amenities;

      try {
        if (typeof address === "string") address = JSON.parse(address);
        if (typeof location === "string") location = JSON.parse(location);
        if (typeof amenities === "string") amenities = JSON.parse(amenities);
      } catch (e) {
        res
          .status(400)
          .json({
            success: false,
            message: "Invalid JSON format in address/location",
          });
        return;
      }

      // 2. Extract Images
      const files = (req.files as Express.Multer.File[]) || [];
      const imageUrls = files.map((file) => file.path);

      const propertyData = {
        ...req.body,

        price: Number(req.body.price),
        bedrooms: Number(req.body.bedrooms),
        bathrooms: Number(req.body.bathrooms),
        area: Number(req.body.area),
        landArea: req.body.landArea ? Number(req.body.landArea) : undefined,
        parking: req.body.parking ? Number(req.body.parking) : 0,
        // Handle optional number fields carefully
        yearBuilt: req.body.yearBuilt ? Number(req.body.yearBuilt) : undefined,

        // Add the parsed objects
        address: address,
        location: location,
        amenities: amenities,
        images: imageUrls,
      };

      const { error, value: validatedData } = createPropertyValidation.validate(propertyData, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.details.map((d) => d.message),
        });
        return;
      }

      // Fields set by the server, not the client payload.
      const property = await propertyService.createProperty({
        ...validatedData,
        agent: req.user._id,
        createdBy: req.user._id,
      });

      if (req.user.role !== "admin") {
        notifyAdmins({
          type: "property_submitted",
          title: "New listing awaiting approval",
          message: `${req.user.name} submitted "${property.title}" for review.`,
          link: `/admin/listings?propertyId=${property._id}`,
        }).catch(() => undefined);
      }

      const response: IPropertyResponse = {
        success: true,
        message: "Property created successfully and submitted for approval",
        data: property,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error("Create Property Error:", error); // Helpful for debugging
      next(error);
    }
  };

  /**
   * Get all properties with filters and pagination
   */
  getProperties = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Pass the entire query object to the service
      const result = await propertyService.getProperties(req.query, getViewer(req));

      const response: IPropertyResponse = {
        success: true,
        data: result.properties,
        pagination: {
          page: result.page,
          limit: req.query.limit ? Number(req.query.limit) : 10,
          total: result.total,
          totalPages: result.totalPages,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a single property by ID
   */
  getPropertyById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const propertyId = req.params.id as string;
      const property = await propertyService.getPropertyById(propertyId, getViewer(req));
      propertyService.incrementViews(propertyId).catch(() => undefined);

      res.status(200).json({
        success: true,
        data: property,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update property details
   * Standard: Business logic for ownership is handled in the Service
   */
  updateProperty = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const updatedProperty = await propertyService.updateProperty(
        req.params.id as string,
        req.body,
        req.user._id.toString(),
        req.user.role,
      );

      res.status(200).json({
        success: true,
        message: "Property updated successfully",
        data: updatedProperty,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a property
   */
  deleteProperty = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      await propertyService.deleteProperty(
        req.params.id as string,
        req.user._id.toString(),
        req.user.role,
      );

      res.status(200).json({
        success: true,
        message: "Property deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get properties by a specific Agent ID
   */
  getPropertiesByAgent = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const agentId = req.params.agentId as string;
      const result = await propertyService.getPropertiesByAgent(
        agentId,
        req.query as any,
        getViewer(req),
      );

      res.status(200).json({
        success: true,
        data: result.properties,
        pagination: {
          page: result.page,
          limit: req.query.limit ? Number(req.query.limit) : 10,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Geospatial search for nearby properties
   */
  // src/controllers/propertyController.ts
  getNearbyProperties = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { lat, lng, radius = 10 } = req.query; // Radius in Kilometers (default 10km)

      // 1. Validation: Coordinates are required
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide latitude and longitude (e.g. ?lat=6.9&lng=79.8)",
        });
      }

      // 2. Convert Kilometers to Meters (MongoDB uses meters for maxDistance)
      const radiusInMeters = Number(radius) * 1000;

      // 3. The Geospatial Query
      const properties = await Property.find({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              // MongoDB expects [Longitude, Latitude] order!
              coordinates: [Number(lng), Number(lat)],
            },
            $maxDistance: radiusInMeters,
          },
        },
      }).limit(1); // Limit results to avoid overloading

      res.status(200).json({
        success: true,
        count: properties.length,
        data: properties,
      });
    } catch (error) {
      next(error);
    }
  };
}
