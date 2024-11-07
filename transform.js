const fs = require("fs");
const path = require("path");
const axios = require("axios");
const csv = require("csv-parser");
const AdmZip = require("adm-zip");

// Load configuration from config.json
const config = require("./config.json");
const outputDirectory = path.resolve(__dirname, config.outputDirectory);
const propertyMappings = config.propertyMappings || {};
const parameterMappings = config.parameterMappings || {};
const baseApiUrl = config.baseApiUrl;
const stationIds = config.stationIds;

// Temporary file path for the downloaded zip
const tempZipFilePath = path.resolve(__dirname, "data.zip");

// Function to apply custom mappings to a data row
const applyCustomMappings = (row) => {
  const mappedRow = {};
  for (const [originalKey, newKey] of Object.entries(propertyMappings)) {
    mappedRow[newKey] = row[originalKey];
  }

  // Apply parameter mapping if it exists
  const parameterValue = mappedRow["parameter"];
  if (parameterMappings[parameterValue]) {
    mappedRow["parameter"] = parameterMappings[parameterValue];
  }

  return mappedRow;
};

// Function to write all data by location to JSON files
const writeAllToJson = (dataByStation) => {
  Object.keys(dataByStation).forEach((stationId) => {
    const outputFilePath = path.join(outputDirectory, `${stationId}.json`);
    fs.writeFile(
      outputFilePath,
      JSON.stringify(dataByStation[stationId], null, 2),
      (err) => {
        if (err) {
          console.error(`Error writing JSON file for ${stationId}:`, err);
        } else {
          console.log(`JSON file created for ${stationId}:`, outputFilePath);
        }
      }
    );
  });
};

// Validate directories
const validateDirectories = () => {
  if (!fs.existsSync(outputDirectory)) {
    console.log("Output directory not found, creating:", outputDirectory);
    fs.mkdirSync(outputDirectory);
  }
  return true;
};

// Function to download and save the zip file for a specific station ID
const fetchAndProcessDataForStation = async (stationId) => {
  const apiUrl = `${baseApiUrl}${stationId}`;
  try {
    console.log(`Starting data download for station ID: ${stationId}`);

    // Download the zip file
    const response = await axios({
      url: apiUrl,
      method: "GET",
      responseType: "arraybuffer",
    });

    // Save the downloaded zip file to disk
    fs.writeFileSync(tempZipFilePath, response.data);
    console.log(
      `Download complete for station ID: ${stationId}. Zip file saved locally.`
    );

    // Unzip and process each CSV file inside the zip
    const zip = new AdmZip(tempZipFilePath);
    const zipEntries = zip.getEntries();

    const dataByStation = {};

    zipEntries.forEach((entry, index) => {
      if (entry.entryName.endsWith(".csv")) {
        console.log(`Processing file: ${entry.entryName}`);

        // Create a read stream for the CSV entry
        const tempCsvPath = path.join(__dirname, entry.entryName);
        fs.writeFileSync(tempCsvPath, entry.getData());

        fs.createReadStream(tempCsvPath)
          .pipe(csv())
          .on("data", (data) => {
            const mappedData = applyCustomMappings(data);
            const parameter = mappedData["parameter"];

            // Initialize structure for each parameter if not already created
            if (!dataByStation[stationId]) {
              dataByStation[stationId] = {};
            }
            if (!dataByStation[stationId][parameter]) {
              dataByStation[stationId][parameter] = [];
            }

            // Add the data point to the relevant parameter list
            dataByStation[stationId][parameter].push(mappedData);
          })
          .on("end", () => {
            console.log(`Finished processing file: ${entry.entryName}`);
            // If this is the last file, write the grouped JSON files
            if (index === zipEntries.length - 1) {
              writeAllToJson(dataByStation);
              console.log(
                `All JSON files have been successfully created for station ID: ${stationId}`
              );
            }
            if (zip) fs.unlinkSync(tempCsvPath); // Delete the temporary CSV file after processing
          });
      }
    });

    // Clean up the downloaded zip file
    fs.unlinkSync(tempZipFilePath);
  } catch (error) {
    console.error(
      `Error fetching or processing data for station ID ${stationId}:`,
      error
    );
  }
};

// Main function to loop over station IDs and fetch data for each
const fetchAndProcessData = async () => {
  validateDirectories();

  for (const stationId of stationIds) {
    await fetchAndProcessDataForStation(stationId);
  }
};

// Run the function to fetch and process data for each station ID
fetchAndProcessData();
