///
// Main
///
const settings = {
  apikey: "a64dec6ac221a36cfa8a08b65b65e8ea",
  debug: false,
  locale: "en-gb",
  geodiscovery: true
}

// Set the API key.
WeatherApp.init(settings);

// Run the Weather Dashboard.
WeatherApp.run();

// Set the debug mode.
WeatherApp.setDebug(true);
