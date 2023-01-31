/*
  Version: 0.1.0
  Author: Daniel Rodriguez
  Description: Weather Dashboard App
 */
(function (global, localStorage, moment) {

  'use strict';

  ///
  // Private API
  ///

  const VERSION = '0.1.0';
  let DEBUG = false;
  let LOCALE = "en-gb";
  let GEODISCOVERY = false;

  moment.locale(LOCALE);


  /**
   * The Weather API object.
   */
  let WeatherAPI = {

    settings: {
      apikey: "YOUR API KEY",
      daysPerForecast: 5,
      hoursPerForecast: 3
    },

    /**
     * The endpoint discovery object.
     */
    endpoints: {
      // geocoding
      // https://api.openweathermap.org/geo/1.0/direct?q={city name},{state code},{country code}&limit={limit}&appid={API key}
      geocoding: {
        url: "https://api.openweathermap.org/geo/1.0/direct?",
        params: ["q", "limit"]
      },
      // 5 day / 3 hour forecast
      // https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={API key}
      forecast: {
        url: "https://api.openweathermap.org/data/2.5/forecast?",
        params: ["lat", "lon", "units", "lang"]
      }
    },

    /**
     * Builds the HTTP query.
     * 
     * @param {String} endpoint
     *   The API endpoint.
     * @param {Array} allowedParams
     *   The list of allowed parameters. 
     * @param {Object} params 
     *   An object with key values of the parameters to query.
     * @returns {String}
     *    A RESTful API query.
     */
    buildQuery: function (endpoint, allowedParams, params) {
      let query = endpoint;

      // add api key
      query += "appid=" + this.settings.apikey;

      // add params
      for (const key of allowedParams) {
        if (params[key]) {
          query += `&${key}=${params[key]}`;
        }
      }

      if (DEBUG) console.log("buildQuery", query);

      return query;
    },

    /**
     * Fetches the json response from the given query URI.
     * 
     * @param {String} query 
     *   The RESTful API request URI.
     * @returns {Promise}
     *   A promise with the parsed JSON response if success,
     *   or thrown Error if fails.
     */
    fetchJsonResponse: async function (query) {
      const response = await fetch(query);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    }

  };

  // Init locations history from Weather App storage.
  let locations = getLocations();

  // Init geolocation history from Weather App storage.
  let geolocation = getGeolocation();

  ///
  // Front end logic (Browser).
  ///

  // DOM Elements
  const searchForm = global.document.querySelector("#search-form");
  const searchInput = global.document.querySelector("#search-input");
  const searchBtn = global.document.querySelector("#search-button");
  const historyCtn = global.document.querySelector("#history");
  const todaySection = global.document.querySelector("#today");
  const forecastSection = global.document.querySelector("#forecast");


  // Search button event.
  searchForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    // Get user input.
    const input = searchInput.value.trim();
    if (input) {

      searchInput.value = "";

      // Resolve location geocoding.
      const geolocationFound = await fetchGeolocation(input);
      if (geolocationFound) {

        // Save the location input and the related geocoding in history.
        const [lat, lon] = geolocationFound;
        saveGeolocation(lat, lon);

        const location = {
          name: input,
          lat: lat,
          lon: lon
        };
        updateHistory(location);

        // Today's forecast of the latest location. 
        // Following 5 days forecast of the latest location.

        // Fetches weather today and 5 days forecasts data objects.
        const [today, forecast] = await fetchForecast(...geolocationFound);

        // Display Weather APP objects (today and forecast).
        displayToday(today);
        displayForecast(forecast);
      }
      else {
        throw new Error("Search Error! Location could not be found.");
      }
    }
  });

  // History buttons event.
  historyCtn.addEventListener("click", async function (event) {

    if (event.target.matches("button.location")) {

      const locationBtn = event.target;

      const latitude = Number.parseFloat(locationBtn.getAttribute("data-geo-lat"));
      const longitude = Number.parseFloat(locationBtn.getAttribute("data-geo-lon"));

      if (DEBUG) console.log("locationBtn", locationBtn);

      // Fetches weather today and 5 days forecasts data objects.
      const [today, forecast] = await fetchForecast(latitude, longitude);

      // Display Weather APP objects (today and forecast).
      displayToday(today);
      displayForecast(forecast);
    }
  });

  /**
   * Loads the geolocation history.
   * 
   * @returns {Object|null}
   *   The geolocation object {lat, lon}, or null if not set.
   */
  function getGeolocation() {
    return global.JSON.parse(localStorage.getItem('geolocation')) || null;
  }

  /**
   * Saves a geolocation object into the local storage.
   * 
   * @param {Number} latitude
   *   The latitude geo coordinate.
   * @param {Number} longitude
   *   The longitude geo coordinate. 
   */
  function saveGeolocation(latitude, longitude) {
    geolocation = {
      lat: latitude,
      lon: longitude
    };
    localStorage.setItem("geolocation", global.JSON.stringify(geolocation));
  }

  /**
   * Loads the locations from local storage or return an empty list.
   * 
   * @returns {Array[Object]}
   *   A list of location objects [{name, lat, lon}...].
   */
  function getLocations() {
    return global.JSON.parse(localStorage.getItem("locations")) || [];
  }

  /**
   * Saves a location object into the local storage.
   * 
   * @param {Object} location
   *    The location object {name, lat, lon}. 
   */
  function saveLocation(location) {
    locations.push(location);
    localStorage.setItem("locations", global.JSON.stringify(locations));
  }

  /**
   * Display the weather history.
   */
  function displayHistory() {
    historyCtn.innerHTML = "";
    for (const location of locations) {
      displayLocation(location);
    }
  }

  /**
   * Updates the weather history.
   * 
   * @param {Object} location
   *   The location object {name, lat, lon}.
   */
  function updateHistory(location) {
    saveLocation(location);
    displayLocation(location);
  }

  /**
   * Creates a DOM element that contains the location name and geocoding data,
   * and includes it at the top of the list in the location history container.
   * 
   * @param {Object} location
   *   The location object {name, lat: latitude, lon: longitude}. 
   */
  function displayLocation({ name, lat: latitude, lon: longitude }) {
    const locbtn = global.document.createElement("button");
    locbtn.textContent = name;
    locbtn.className = "list-group-item d-grid location";
    locbtn.setAttribute("data-geo-lat", latitude);
    locbtn.setAttribute("data-geo-lon", longitude);

    historyCtn.prepend(locbtn);
  }

  /**
   * Display the today weather section.
   * 
   * @param {Object} weatherObject 
   *   The weather object with today forecast data.
   */
  function displayToday(weatherObject) {
    // Add today weather card.
    todaySection.innerHTML = `
        <div id="weather-today" class="card text-white bg-image shadow-4-strong weather today">
          <div class="card-body">
            <h2 class="card-title">
              <span class="city">${weatherObject.city.name}</span>,&nbsp;
              <span class="country">${weatherObject.city.country}</span>
            </h2>
            <h3 class="card-subtitle mb-2">
              <span class="date">${moment.unix(weatherObject.date).format('L')}</span>
              <img class="icon" src="${weatherObject.weather.icon}" alt="${weatherObject.weather.description}">
            </h3>
            <div class="measure temperature">
              <span class="label">Temp</span>:&nbsp;<strong><span class="value">${weatherObject.temperature.avg}</span>&nbsp;<span class="unit">&#8451;</span></strong>
            </div>
            <div class="measure wind">
              <span class="label">Wind</span>:&nbsp;<strong><span class="value">${weatherObject.wind.speed}</span>&nbsp;<span class="unit">KPH</span></strong>
            </div>
            <div class="measure humidity">
              <span class="label">Humidity</span>:&nbsp;<strong><span class="value">${weatherObject.humidity}</span>&nbsp;<span class="unit">%</span></strong>
            </div>
          </div>
        </div> 
      `;

      displayBackgrounds(weatherObject.weather, "weather-today");
  }

  /**
   * Display the forecast weather section.
   * 
   * @param {Array[Object]} weatherObjectList 
   *   A list of weather objects with the 5 days forecast data.
   */
  function displayForecast(weatherObjectList) {

    forecastSection.innerHTML = "";

    // Add heading.
    const headerEl = document.createElement("h2");
    headerEl.textContent = "5-Day Forecast:"
    forecastSection.appendChild(headerEl);

    // Create weather forecast cards.
    weatherObjectList.forEach((weatherObject, index) => {
      // Create container wrapper.
      const ctn = document.createElement("div");
      ctn.id = `forecast-${index}`;
      ctn.className = `card text-white bg-image shadow-4-strong weather forecast forecast-${index}`;
      ctn.style = "width: 13rem;";
      ctn.setAttribute("data-weather-date", weatherObject.date);

      // Add forecast data.
      ctn.innerHTML = `
          <div class="card-body">
            <h3 class="card-title mb-2">
              <span class="date">${moment.unix(weatherObject.date).format('L')}</span>
            </h3>
            <div class="card-subtitle mb-2">
              <img class="icon" src="${weatherObject.weather.icon}" alt="${weatherObject.weather.description}">
            </div>
            <div class="measure temperature">
              <span class="label">Temp</span>:&nbsp;<strong><span class="value">${weatherObject.temperature.avg}</span>&nbsp;<span class="unit">&#8451;</span></strong>
            </div>
            <div class="measure wind">
              <span class="label">Wind</span>:&nbsp;<strong><span class="value">${weatherObject.wind.speed}</span>&nbsp;<span class="unit">KPH</span></strong>
            </div>
            <div class="measure humidity">
              <span class="label">Humidity</span>:&nbsp;<strong><span class="value">${weatherObject.humidity}</span>&nbsp;<span class="unit">%</span></strong>
            </div>
          </div>
        `;

      // Add weather forecast card.
      forecastSection.appendChild(ctn);

      displayBackgrounds(weatherObject.weather, `forecast-${index}`);
    });
  }

  /**
   * Sets the background images to the weather cards.
   * 
   * @param {Object} weather 
   *   The weather object.
   * @param {String} idElement
   *   The DOM element id.
   */
  function displayBackgrounds(weather, idElement) {
    // Backgrounds
    switch (weather.condition) {
      case "Snow":
        document.getElementById(idElement).style.background =
          "center / cover no-repeat url('https://mdbgo.io/ascensus/mdb-advanced/img/snow.gif')";
        break;
      case "Clouds":
        document.getElementById(idElement).style.background =
          "center / cover no-repeat url('https://mdbgo.io/ascensus/mdb-advanced/img/clouds.gif')";
        break;
      case "Fog":
        document.getElementById(idElement).style.background =
          "center / cover no-repeat url('https://mdbgo.io/ascensus/mdb-advanced/img/fog.gif')";
        break;
      case "Rain":
        document.getElementById(idElement).style.background =
          "center / cover no-repeat url('https://mdbgo.io/ascensus/mdb-advanced/img/rain.gif')";
        break;
      case "Clear":
        document.getElementById(idElement).style.background =
          "center / cover no-repeat url('https://mdbgo.io/ascensus/mdb-advanced/img/clear.gif')";
        break;
      case "Thunderstorm":
        document.getElementById(idElement).style.background =
          "center / cover no-repeat url('https://mdbgo.io/ascensus/mdb-advanced/img/thunderstorm.gif')";
        break;
      default:
        document.getElementById(idElement).style.background =
          "center / cover no-repeat url('https://mdbgo.io/ascensus/mdb-advanced/img/clear.gif')";
        break;
    }
  }

  ///
  // Backend logic (Weather API).
  ///

  /**
   * Resolves the geocoding for a given location (OpenWeather API).
   * 
   * @param {String} locationDetails 
   *   The location details 
   *   (i.e. City name, state code and country code divided by comma, 
   *    use ISO 3166 country codes.)
   * @returns {Array}
   *   The correspondent geocoding [latitude, longitude].
   */
  function fetchGeolocation(locationDetails) {
    const params = {
      q: locationDetails,
      limit: 1
    };
    const { url: endpoint, params: allowedParams } = WeatherAPI.endpoints["geocoding"];
    const query = WeatherAPI.buildQuery(endpoint, allowedParams, params);

    return WeatherAPI.fetchJsonResponse(query)
      .then(jsonResponse => jsonResponse[0])
      .then(geoObj => [geoObj.lat, geoObj.lon]);
  }

  /**
   * Fetches the 5 days / 3 hours forecast (OpenWeather API).
   * 
   * @param {Number} latitude
   *   The latitude. 
   * @param {Number} longitude
   *   The longitude.
   * @param {String} units
   *   The unit of measurement. 
   *   Default: metric.
   *   Allowed: [standard, metric, imperial]
   * @param {String} lang
   *   The language code.
   *   Default: en. 
   * @returns {Array}
   *   List with today and forecast Weather App objects.
   */
  function fetchForecast(latitude, longitude, units = "metric", lang = "en") {
    const params = {
      lat: latitude,
      lon: longitude,
      units: units,
      lang: lang
    };
    const { url: endpoint, params: allowedParams } = WeatherAPI.endpoints["forecast"];
    const query = WeatherAPI.buildQuery(endpoint, allowedParams, params);

    return WeatherAPI.fetchJsonResponse(query)
      // Get Weather JSON data.
      .then(jsonResponse => ({ cityApiObject: jsonResponse.city, forecastApiObject: jsonResponse.list }))
      // Weather filtering for today and forecasts for 5 days.
      .then(({ cityApiObject, forecastApiObject }) => {

        // Filter forecasts for today and next days.
        const forecastToday = forecastApiObject.filter((apiObject, index) => index === 0);
        const forecastNextDays = forecastApiObject.filter((apiObject, index) => {
          const days = WeatherAPI.settings.daysPerForecast; // 5 days =  WeatherAPI.settings.daysPerForecast
          const offset = Math.floor(24 / WeatherAPI.settings.hoursPerForecast); // (24 / 3) = 8 forecasts per day
          const indexes = Array.from({ length: days }, (value, index) => (index + 1) * offset - 1); // [7, 15, 23, 31, 39]
          return indexes.includes(index);
        });

        return { cityApiObject, forecastsFiltered: [forecastToday, forecastNextDays] };
      })
      // Data mapping from API to Weather APP objects.
      .then(({ cityApiObject, forecastsFiltered }) => {

        const [forecastToday, forecastNextDays] = forecastsFiltered;

        const today = weatherDataMapping(forecastToday[0], cityApiObject);
        const forecast = forecastNextDays.map(forecastApiObject => weatherDataMapping(forecastApiObject, cityApiObject));

        return [today, forecast];
      });
  }

  /**
   * Map data from API to Weather Dashboard objects.
   * 
   * @param {Object} forecastApiObject 
   *   The forecast API object to map.
   * @param {Object} cityApiObject
   *   The city API object to map.
   * @returns {Object}
   *   The Weather object.
   */
  function weatherDataMapping(forecastApiObject, cityApiObject) {
    const weatherObject = {
      city: {
        name: cityApiObject.name,
        country: cityApiObject.country,
        latitude: cityApiObject.coord.lat,
        longitude: cityApiObject.coord.lon,
        population: cityApiObject.population,
        timezone: cityApiObject.timezone,
        sunrise: cityApiObject.sunrise,
        sunset: cityApiObject.sunset
      },
      date: forecastApiObject.dt, // Unix timestamp
      date_formatted: forecastApiObject.dt_txt,
      weather: {
        icon: `http://openweathermap.org/img/wn/${forecastApiObject.weather[0].icon}@2x.png`,
        condition: forecastApiObject.weather[0].main,
        description: forecastApiObject.weather[0].description
      },
      temperature: {
        feels_like: forecastApiObject.main.feels_like,
        avg: forecastApiObject.main.temp,
        min: forecastApiObject.main.temp_min,
        max: forecastApiObject.main.temp_max
      },
      wind: {
        speed: forecastApiObject.wind.speed,
        direction: forecastApiObject.wind.deg,
        gust: forecastApiObject.wind.gust
      },
      humidity: forecastApiObject.main.humidity,
      pressure: forecastApiObject.main.pressure,
      sea_level: forecastApiObject.main.sea_level,
      visibility: forecastApiObject.visibility
    };

    return weatherObject;
  }

  /**
   * Resolves current geolocation, if user gives consent.
   */
  function getCurrentGeolocation() {
    if (confirm("Do you consent to get your current browser's geo location?")) {
      const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      };

      async function success(pos) {
        geolocation = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude
        };

        const { lat, lon } = geolocation;
        saveGeolocation(lat, lon);

        const { latitude, longitude } = pos.coords;
        const [today, forecast] = await fetchForecast(latitude, longitude);

        displayToday(today);
        displayForecast(forecast);
      }

      function error(err) {
        console.warn(`ERROR(${err.code}): ${err.message}`);
      }

      global.navigator.geolocation.getCurrentPosition(success, error, options);
    }
    else {
      localStorage.removeItem("geolocation");
      geolocation = getGeolocation();
    }
  }

  ///
  // Public API (Weather Dashboard App).
  ///

  /**
   * Initialise the Weather API.
   * 
   * @param {String} apikey
   *   The API key token. 
   */
  function init({ apikey, debug, locale, geodiscovery }) {
    try {
      WeatherAPI.settings.apikey = apikey;
      setDebug(debug);
      setLocale(locale);
      setGeoDiscovery(geodiscovery);
    }
    catch (error) {
      console.error(error);
    }
  }

  /**
   * Runs the entry point of Weather Dashboard App.
   */
  function run() {
    try {
      getCurrentGeolocation();
      displayHistory();
    }
    catch (error) {
      console.error(error);
    }
  }

  /**
   * Sets the debug mode in Weather Dashboard App.
   * 
   * @param {boolean} debug 
   *   The debug mode.
   */
  function setDebug(debug) {
    DEBUG = debug === true;
  }

  /**
   * Sets the locale in Weather Dashboard App.
   * 
   * @param {String} locale 
   *   The locale setting
   */
  function setLocale(locale) {
    LOCALE = locale;
    moment.locale(locale);
  }

  /**
   * Sets the browser's geolocation api.
   * 
   * @param {boolean} geodiscovery 
   *    The geodiscovery flag that enabled browser's geolocation api.
   */
  function setGeoDiscovery(geodiscovery) {
    GEODISCOVERY = geodiscovery === true;
  }

  /**
   * Reset the Weather Dashboard App.
   */
  function reset() {
    try {
      // Delete geolocation history.
      global.localStorage.removeItem("geolocation");
      geolocation = getGeolocation();

      // Delete location history.
      global.localStorage.removeItem("locations");
      locations = getLocations();

      // Clear containers.
      searchInput.value = "";
      historyCtn.innerHTML = "";
      todaySection.innerHTML = "";
      forecastSection.innerHTML = "";
    }
    catch (error) {
      console.error(error);
    }
  }

  global.WeatherApp = {
    VERSION,
    DEBUG,
    LOCALE,
    GEODISCOVERY,
    setDebug,
    setLocale,
    setGeoDiscovery,
    init,
    run,
    reset
  };

})(window, localStorage, moment);
