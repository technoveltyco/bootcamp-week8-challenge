/*
  Version: 0.1.0
  Author: Daniel Rodriguez
  Description: Weather Dashboard App
 */
(function (global, localStorage) {

	'use strict';

	const VERSION = '0.1.0';
  const DEBUG = true;

  // DOM Elements
  const searchForm = global.document.querySelector("#search-form");
  const searchInput = global.document.querySelector("#search-input");
  const searchBtn = global.document.querySelector("#search-button");
  const historyCtn = global.document.querySelector("#history");
  const todaySection = global.document.querySelector("#today");
  const forecastSection = global.document.querySelector("#forecast");

  ///
  // Search
  ///
  let locations = getLocations();

  searchBtn.addEventListener("click", async function (event) {
    
    event.preventDefault();

    const input = searchInput.value;
    searchInput.value = "";

    // Resolve location geocoding.
    const geolocation = await getGeolocation(input);
    if (!geolocation) {
      throw new Error("Search Error! Location could not be found.");
    }

    // Save the location input and the related geocoding in history.
    const location = {
      name: input,
      lat: geolocation[0],
      lon: geolocation[1]
    };
    updateHistory(location);

    // Today's forecast of the latest location. 
    // Following 5 days forecast of the latest location.
    getForecast(...geolocation);
  });

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
   * Loads the locations from local storage or return an empty list.
   * 
   * @returns {Array[Object]}
   *   A list of location objects [{name, lat, lon}...].
   */
  function getLocations() {
    return global.JSON.parse(global.localStorage.getItem("locations")) || [];
  }

  /**
   * Saves a location object into the local storage.
   * 
   * @param {Object} location
   *    The location object {name, lat, lon}. 
   */
  function saveLocation(location) {
    locations.push(location);
    global.localStorage.setItem("locations", JSON.stringify(locations));
  }

  /**
   * Creates a DOM element that contains the location name and geocoding data,
   * and includes it at the top of the list in the location history container.
   * 
   * @param {Object} location
   *   The location object {name, lat: latitude, lon: longitude}. 
   * @returns {Element}
   *    The location DOM element.
   */
  function displayLocation({name, lat: latitude, lon: longitude}) {
    
    const locationCtn = global.document.createElement("div");
    locationCtn.className = "list-item";

    const btn = global.document.createElement("button");
    btn.textContent = name;
    btn.className = "btn location";
    btn.setAttribute("data-geo-lat", latitude);
    btn.setAttribute("data-geo-lon", longitude);

    locationCtn.appendChild(btn);

    historyCtn.prepend(locationCtn);
  }


  ///
  // Backend logic 
  ///

  const settings = {
    apikey: "a64dec6ac221a36cfa8a08b65b65e8ea"
  };

  const endpoints = {
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
      params: ["lat", "lon"]
    }
  };

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
  function getGeolocation(locationDetails) {
    const params = {
      q: locationDetails,
      limit: 1
    };
    const {url: endpoint, params: allowedParams} = endpoints["geocoding"];
    const query = buildQuery(endpoint, allowedParams, params);

    return fetchJsonResponse(query)
      .then(jsonResponse => jsonResponse[0])
      .then(geoObj => {

        localStorage.setItem("lat", geoObj.lat);
        localStorage.setItem("lon", geoObj.lon);

        return [geoObj.lat, geoObj.lon];
      });
  }

  /**
   * Gets the 5 days / 3 hours forecast (OpenWeather API).
   * 
   * @param {Number} latitude
   *   The latitude. 
   * @param {Number} longitude
   *   The longitude.
   * @returns {Object}
   *   Today and following 5 days / 3 hours weather forecast.
   */
  function getForecast(latitude, longitude) {
    const params = {
      lat: latitude,
      lon: longitude
    };
    const {url: endpoint, params: allowedParams} = endpoints["forecast"];
    const query = buildQuery(endpoint, allowedParams, params);

    return fetchJsonResponse(query)
      .then(jsonResponse => jsonResponse.list)
      .then(forecastObj => {
        if (DEBUG) console.log(forecastObj);
      });
  }

  /**
   * Fetches the json response from the given query URI.
   * 
   * @param {String} query 
   *   The RESTful API request URI.
   * @returns {Promise}
   *   A promise with the parsed JSON response if success,
   *   or thrown Error if fails.
   */
  function fetchJsonResponse(query) {
    return fetch(query)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return response.json();
      });
  }

  /**
   * Builds a RESTful API query.
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
  function buildQuery(endpoint, allowedParams, params) {

    console.log(endpoint, allowedParams);
    let query = endpoint;

    // add api key
    query += "appid=" + settings.apikey;

    // add params
    for (const key of allowedParams) {
      if (params[key]) {
        query += `&${key}=${params[key]}`;
      }
    }

    if (DEBUG) console.log(query);

    return query;
  }

  ///
  // Main
  ///
  if (DEBUG) console.log(locations);

  for (const location of locations) {
    displayLocation(location);

    // getGeolocation(location.name)
    //   .then(geolocation => {

    //     if (DEBUG) console.log(geolocation);

    //     if (geolocation) {
    //       getForecast(...geolocation);
    //     }
    //   })
    //   .catch(error => {
    //     console.error(error);
    //   });
  }

})(window, localStorage);
