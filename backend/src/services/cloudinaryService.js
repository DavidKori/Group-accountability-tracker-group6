import cloudinary from "../config/cloudinary.js";
import fs from "fs";

export const uploadFile = async (filePath, folder = "gpat") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "auto",
    });
    fs.unlinkSync(filePath);
    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw err;
  }
};

export const deleteFile = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};
