const { getValidConfigSettingByIds } = require("./ConfigUtil.cjs");
const { type } = require("@sap/cds");
const { loadDestination } = require("sap-cap-sdm-plugin/lib/util/index");
const _supportedMediaTypes = ["image/jpeg", "image/png", "application/pdf"];
const _maxFileSize = 10000000; // 10MB
const _localFileContentDestination = "LOCAL";
const mime = require("mime-types");
const cds = require("@sap/cds/libx/_runtime/cds");

const LOG = cds.log("ls.claims");

const supportedImageMediaTypes = async () => {
  let settings = await _loadRepositorySettings();
  return settings.supportedMediaTypes.filter(mimeType => mimeType.startsWith('image/'));
};


/**
 * Loads the repository settings from the configuration.
 *
 * This function asynchronously retrieves settings related to the document repository,
 * including the repository ID, destination, and maximum file size. If the maximum file size
 * is not specified in the settings, it defaults to 10MB. The function throws an error if
 * the repository ID is missing in the configuration.
 *
 * @async
 * @returns {Promise<Object>} A promise that resolves to an object containing the repository settings.
 * @throws {Error} Throws an error if the document repository settings are missing.
 */
const _loadRepositorySettings = async () => {
  let sdmSettings = {};
  let settings = await getValidConfigSettingByIds([
    "SDM_REP_ID",
    "SDM_DEST",
    "SDM_FILE_S",
    "SDM_FILE_T",
  ]);
  for (let setting of settings) {
    if (setting.setting_id === "SDM_REP_ID") {
      sdmSettings.repositoryId = setting.value;
    } else if (setting.setting_id === "SDM_DEST") {
      sdmSettings.destination = setting.value;
    } else if (setting.setting_id === "SDM_FILE_S") {
      sdmSettings.max_file_size = setting.value * 1000000;
    } else if (setting.setting_id === "SDM_FILE_T") {
      
      sdmSettings.supportedMediaTypes = setting.value.split(',');
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
    let message =
      "Document Repository settings are missing. Please check the configuration";
    LOG.error(message);
    throw new Error(message);
  }
  return sdmSettings;
};

/**
 * Validates the attachments in the request.
 *
 * This asynchronous function checks if the request contains data content and then validates
 * the content type of the attachments. It logs information about the validation process and
 * checks if the content type of the attachment is supported, based on a predefined list of
 * supported media types. If the content type is not supported, it logs a warning and sends
 * an error response through the request object.
 *
 * @async
 * @param {Object} req - The request object containing the data and headers.
 * @throws {Error} Throws an error if the attachment type is not supported.
 */
const validateAttachments = async (req) => {
  if (req?.data?.content) {
    LOG.info("Validating attachments");

    let settings = await _loadRepositorySettings();
    LOG.info("Loaded Settings for Repository Details: " + JSON.stringify(settings));

    LOG.info("Validating content type");
    const mediaType = req.headers["content-type"];
    if (!_supportedMediaTypes.includes(mediaType)) {
      let message =
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
      let message = "Attachment is too large. Max allowed size is " + (settings.max_file_size / 1000000) + " MB";
      LOG.warn(message);
      req.error(400, message);
    }
  }
};

const _readAttachmentLocally = async (attachment) => {
  const fs = require("fs");
  const path = require("path");

  const fileName = attachment.ID + "." + mime.extension(attachment.contentType);

  const filePath = path.resolve(
    __dirname,
    "../..",
    "test",
    "attachments",
    fileName
  );
  LOG.info(
    "Reading the file content from the local file system at path: " + filePath
  );

  const fileContent = fs.createReadStream(filePath);
  return fileContent;
};

/**
 * Retrieves the content stream of an attachment.
 *
 * This asynchronous function is responsible for fetching the content stream of a specified attachment
 * from the document repository. It begins by logging the attempt to read content using the attachment's
 * Object ID. It then loads the repository settings and establishes a connection to the CMIS client.
 * After loading the destination settings, it logs the successful preparation for the CMIS client call.
 * Finally, it calls the CMIS client to read the file content from the repository and returns the content
 * as a stream.
 *
 * @async
 * @param {Object} attachment - The attachment object containing the objectId to be read.
 * @returns {Promise<Stream>} A promise that resolves to the content stream of the requested attachment.
 */
const getAttachmentStream = async (attachment) => {
  LOG.info(
    "Reading content from document repository with Object Id " +
      attachment.objectId
  );

  let settings = await _loadRepositorySettings();
  LOG.info("Loaded Settings for Repository Details: " + JSON.stringify(settings));

  if (
    settings.destination === _localFileContentDestination &&
    process.env.NODE_ENV !== "production"
  ) {
    LOG.info("Reading the file content from the local file system");
    const localFileContent = await _readAttachmentLocally(attachment);
    return localFileContent;
  }

  const cmisClient = await cds.connect.to("cmis-client");
  const destination = await loadDestination();
  LOG.info("Client and Destination loaded");
  LOG.info("Calling CMIS Client to read file from the repository");

  // Returns the file content as a stream
  let fileContent = await cmisClient
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
  const fs = require("fs");
  const path = require("path");
  const stream = require("stream");
  const util = require("util");
  const pipeline = util.promisify(stream.pipeline);
  LOG.info("Uploading the file content to the local file system");
  const filePath = path.resolve(
    __dirname,
    "../..",
    "test",
    "attachments",
    attachment.fileName
  );
  try {
    await pipeline(attachment.content, fs.createWriteStream(filePath));

    LOG.info("File successfully written to the local file system");
    return {
      succinctProperties: {
        "cmis:objectId": cds.utils.uuid(),
        filePath: filePath,
      },
    };
  } catch (error) {
    LOG.error("Failed to write file to the local file system", error);
    throw error; // Rethrow or handle as needed
  }

  return { succinctProperties: { "cmis:objectId": cds.utils.uuid() } };
};

/**
 * Uploads an attachment to the repository.
 *
 * This asynchronous function is responsible for uploading an attachment to a specified document repository.
 * It logs the attempt to upload the attachment using the attachment's ID. It generates a filename for the
 * attachment based on its ID and content type, then logs this filename. The function loads the repository
 * settings and establishes a connection to the CMIS client. After loading the destination settings, it logs
 * the successful preparation for the CMIS client call. It then calls the CMIS client to upload the file to
 * the repository using the repository ID, generated filename, and attachment content. The function returns
 * the document object representing the uploaded file in the repository.
 *
 * @async
 * @param {Object} attachment - The attachment object containing the ID and contentType of the file to be uploaded.
 * @param {Buffer} content - The content of the file to be uploaded.
 * @returns {Promise<Object>} A promise that resolves to the document object of the uploaded file.
 */
const uploadAttachmentToRepository = async (attachment) => {

  
  const id = attachment.content.url.match(/attachments\(ID=([0-9a-fA-F-]{36})/)[1];
  LOG.info(
    "Attempting to upload attachment for " + id + " to repository"
  );
  const fileName = id + "." + mime.extension(attachment.contentType);
  LOG.info("Attempting to upload file: " + fileName);
  let settings = await _loadRepositorySettings();
  LOG.info("Loaded Settings for Repository Details: " + + JSON.stringify(settings));

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

  let document = await cmisClient
    .createDocument(
      settings.repositoryId,
      fileName,
      attachment.content
    )
    .execute(destination);
  return document;
};

module.exports = {
  validateAttachments: validateAttachments,
  getAttachmentStream: getAttachmentStream,
  supportedImageMediaTypes: supportedImageMediaTypes,
  uploadAttachmentToRepository: uploadAttachmentToRepository,
};
