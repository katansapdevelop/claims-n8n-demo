import cds from "@sap/cds";
import mime from "mime-types";
import { loadDestination } from "sap-cap-sdm-plugin/lib/util/index.js";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import stream from "node:stream";
import { promisify } from "node:util";
import { getValidConfigSettingByIds } from "./ConfigUtil.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pipeline = promisify(stream.pipeline);

const _supportedMediaTypes = ["image/jpeg", "image/png", "application/pdf"];
const _maxFileSize = 5000000; // 5MB
const _localFileContentDestination = "LOCAL";

const LOG = cds.log("ls.claims");

export const supportedImageMediaTypes = async () => {
  const settings = await _loadRepositorySettings();
  return settings.supportedMediaTypes.filter((mimeType) =>
    mimeType.startsWith("image/")
  );
};

/**
 * Loads the repository settings from the configuration.
 */
const _loadRepositorySettings = async () => {
  const sdmSettings = {};
  const settings = await getValidConfigSettingByIds([
    "SDM_REP_ID",
    "SDM_DEST",
    "SDM_FILE_S",
    "SDM_FILE_T",
  ]);

  for (const setting of settings) {
    if (setting.setting_id === "SDM_REP_ID") {
      sdmSettings.repositoryId = setting.value;
    } else if (setting.setting_id === "SDM_DEST") {
      sdmSettings.destination = setting.value;
    } else if (setting.setting_id === "SDM_FILE_S") {
      sdmSettings.max_file_size = setting.value * 1000000;
    } else if (setting.setting_id === "SDM_FILE_T") {
      sdmSettings.supportedMediaTypes = setting.value.split(",");
      LOG.info(
        "Setting default supported media types to " +
          sdmSettings.supportedMediaTypes.toString() +
          " from configuration"
      );
    }
  }

  if (!sdmSettings.supportedMediaTypes) {
    LOG.info(
      "Setting default supported media types to " +
        _supportedMediaTypes.toString() +
        " as no record found in the configuration"
    );
    sdmSettings.supportedMediaTypes = _supportedMediaTypes;
  }

  if (!sdmSettings.max_file_size) {
    LOG.info(
      "Setting default max file size to 10MB as no record found in the configuration"
    );
    sdmSettings.max_file_size = _maxFileSize;
  }

  if (!sdmSettings.repositoryId) {
    const message =
      "Document Repository settings are missing. Please check the configuration";
    LOG.error(message);
    throw new Error(message);
  }

  return sdmSettings;
};

/**
 * Validates the attachments in the request.
 */
export const validateAttachments = async (req) => {
  if (req?.data?.content) {
    LOG.info("Validating attachments");

    const settings = await _loadRepositorySettings();
    LOG.info("Loaded Settings for Repository Details: " + JSON.stringify(settings));

    LOG.info("Validating content type");
    const mediaType = req.headers["content-type"];
    if (!_supportedMediaTypes.includes(mediaType)) {
      const message =
        "Attachment type " +
        mediaType +
        " is not supported. Only types " +
        _supportedMediaTypes.toString() +
        " are allowed";
      LOG.warn(message);
      req.error(message);
    }

    LOG.info("Validating if file size of the attachment is acceptable");

    const fileSize = req.headers["content-length"];
    if (fileSize > settings.max_file_size) {
      const message =
        "Attachment is too large. Max allowed size is " +
        settings.max_file_size / 1000000 +
        " MB";
      LOG.warn(message);
      req.error(400, message);
    }
  }
};

const _streamToBuffer = async (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
};

/**
 * Converts a stream to base64 encoded text.
 */
export const streamToBase64 = async (stream) => {
  const buffer = await _streamToBuffer(stream);
  return buffer.toString("base64");
};

const _readAttachmentLocally = async (attachment) => {
  const fileName = attachment.ID + "." + mime.extension(attachment.contentType);
  const filePath = path.resolve(__dirname, "../..", "test", "attachments", fileName);

  LOG.info(
    "Reading the file content from the local file system at path: " + filePath
  );

  return fs.createReadStream(filePath);
};

/**
 * Retrieves the content stream of an attachment.
 */
export const getAttachmentStream = async (attachment) => {
  LOG.info(
    "Reading content from document repository with Object Id " +
      attachment.objectId
  );

  const settings = await _loadRepositorySettings();
  LOG.info("Loaded Settings for Repository Details: " + JSON.stringify(settings));

  if (
    settings.destination === _localFileContentDestination &&
    process.env.NODE_ENV !== "production"
  ) {
    LOG.info("Reading the file content from the local file system");
    return await _readAttachmentLocally(attachment);
  }

  const cmisClient = await cds.connect.to("cmis-client");
  const destination = await loadDestination();
  LOG.info("Client and Destination loaded");
  LOG.info("Calling CMIS Client to read file from the repository");

  const fileContent = await cmisClient
    .downloadFile(settings.repositoryId, attachment.objectId, {
      download: "inline",
      filename: attachment.name,
      config: {
        customRequestConfiguration: {
          responseType: "stream",
        },
      },
    })
    .execute(destination);

  LOG.info("Successfully read the file content from the repository");

  return fileContent;
};

const _uploadAttachmentLocally = async (attachment) => {
  const filePath = path.resolve(
    __dirname,
    "../..",
    "test",
    "attachments",
    attachment.fileName
  );

  LOG.info("Uploading the file content to the local file system");

  try {
    await pipeline(attachment.content, fs.createWriteStream(filePath));

    LOG.info("File successfully written to the local file system");
    return {
      succinctProperties: {
        "cmis:objectId": cds.utils.uuid(),
        filePath,
      },
    };
  } catch (error) {
    LOG.error("Failed to write file to the local file system", error);
    throw error;
  }
};

/**
 * Uploads an attachment to the repository.
 */
export const uploadAttachmentToRepository = async (attachment) => {
  const id = attachment.content.url.match(/attachments\(ID=([0-9a-fA-F-]{36})/)[1];
  LOG.info("Attempting to upload attachment for " + id + " to repository");

  const fileName = id + "." + mime.extension(attachment.contentType);
  LOG.info("Attempting to upload file: " + fileName);

  const settings = await _loadRepositorySettings();
  LOG.info("Loaded Settings for Repository Details: " + JSON.stringify(settings));

  if (
    settings.destination === _localFileContentDestination &&
    process.env.NODE_ENV !== "production"
  ) {
    attachment.fileName = fileName;
    return await _uploadAttachmentLocally(attachment);
  }

  const cmisClient = await cds.connect.to("cmis-client");
  const destination = await loadDestination();
  LOG.info("Client and Destination loaded");
  LOG.info("Calling CMIS Client to upload file to the repository");

  const document = await cmisClient
    .createDocument(settings.repositoryId, fileName, attachment.content)
    .execute(destination);

  return document;
};
