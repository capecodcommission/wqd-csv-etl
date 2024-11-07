# WQD to JSON Converter

This Node.js console application fetches Water Quality Data from the wqd API endpoint for each station listeed in the config, parses the returned csv files, maps specific properties, groups data by station and parameter, and outputs JSON files for each unique station identifier. It also allows custom mapping of parameter names.

In the future potentially, JSON files can be uploaded directly to an Azure Blob Storage container.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [How It Works](#how-it-works)
- [Example Configuration](#example-configuration)
- [Example JSON Output](#example-json-output)

## Prerequisites

- Node.js (version 18 or later recommended)

## Installation

1. **Clone the repository** or download the project files.
2. **Install dependencies** by running:
   ```bash
   npm install
   ```

## Configuration

Currently there are no "secrets" in the config.json file, and so it is being committed with the rest of the project. If azure blob storage is added later, this will need to be updated.

### Explanation of Configuration

- **outputDirectory**: Directory to store the resulting JSON files.
- **baseApiUrl**: base api url used to query the WQP data. MUST end this with the `siteId=` query string param
- **stationIds**: each of the station ids used to query the WQP data. These should map directly with the **MonitoringLocationIdentifier** property.
- **propertyMappings**: Maps CSV column headers to custom property names in the output JSON.
- **parameterMappings**: Maps `parameter` values from the CSV to custom names for better readability.

## Usage

1. **Prepare Input Directory**: Place all CSV files to be processed in the `inputDirectory` specified in `config.json`.
2. **Run the Application**:

   ```bash
   node transform.js
   ```

3. **Output**: The application will create JSON files for each unique location identifier in the `outputDirectory`. Each JSON file will have:
   - Grouped data by `parameter`, with each `parameter` containing a list of data points.
   - Mapped property names and parameters based on `config.json`.

## How It Works

1. **Read Configuration**: The application reads `config.json` to get input and output directories, property mappings, and parameter mappings.
2. **Loop over each station**: The application loops over each stationId provided, and performs the below functionality:
3. **Fetch and Process CSV Files**:
   - Fetch station data by hitting the WQP API endpoint
   - Parse the resulting zip and retrieve the csv files inside
   - Each row in each CSV file is processed and mapped to new property names.
   - `parameter` values are updated based on `parameterMappings`.
   - Rows are grouped by `stationId`, and each parameter has a list of data points.
4. **Write JSON Files**: The application writes a JSON file for each unique `stationId`.

## Example JSON Output

A JSON file for a given `stationId` might look like:

```json
{
  "stationId": {
    "Total Nitrogen - Reported": [
      {
        "stationId": "12345",
        "stationName": "Lake Example",
        "depth": "5",
        "timestamp": "2024-01-01",
        "value": "7.0",
        "quality": "High",
        "dataQualityText": "Good",
        "program": "Water Quality Program"
      }
    ],
    "Water Temperature": [
      {
        "stationId": "12345",
        "stationName": "Lake Example",
        "depth": "5",
        "timestamp": "2024-01-01",
        "value": "15.5",
        "quality": "High",
        "dataQualityText": "Good",
        "program": "Water Quality Program"
      }
    ]
  }
}
```

## Notes

- Only include stations in the config you want to fetch data for.
- Ensure `outputDirectory` are correctly specified and accessible.
- In general, it is best to keep these outside of the project directory to limit commit size. OR, alternatively, just do not commit or push any of the files that have been created.

### Azure Blob Storage Integration

- this could easily be updated to write the json files directly to an azure blog storage container.
- **Azure Blob Storage**: Only configure Azure settings if you intend to upload files. Otherwise, omit the `azureStorage` section in `config.json`.

---

### Parameter Mappings

WQP Data Parameters they have that WISKI does not:

- Ammonium
- Oxidation reduction potential (OP)
- Specific Conductance
- pH
- Nitrogen (should this be total nitrogen??)
- Nitrate

---
