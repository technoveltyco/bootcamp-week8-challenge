/*
      Version: 0.1.0
      Author: Daniel Rodriguez
      Description: Weather Dashboard App
 */
(function (global, localStorage) {

	'use strict';

	const VERSION = '0.1.0';
  const DEBUG = true;

  // Starter backend logic 
  
  const settings = {
    apikey: "a64dec6ac221a36cfa8a08b65b65e8ea"
  };
  const endpoints = {
    // https://api.openweathermap.org/geo/1.0/direct?q={city name},{state code},{country code}&limit={limit}&appid={API key}
    geocoding: {
      url: "https://api.openweathermap.org/geo/1.0/direct?",
      params: ["q", "limit"]
    },
    // https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={API key}
    forecast: {
      url: "https://api.openweathermap.org/data/2.5/forecast?",
      params: ["lat", "lon"]
    }
  };


  function getForecast(lat, lon) {
    const params = {
      lat: lat,
      lon: lon
    };
    const query = buildQuery(endpoints["forecast"], params);

    return fetchJsonResponse(query)
      .then(jsonResponse => jsonResponse.list)
      .then(forecastObj => {
        if (DEBUG) console.log(forecastObj);
      });
  }

  function getGeolocation(location) {
    const params = {
      q: location,
      limit: 1
    };
    const query = buildQuery(endpoints["geocoding"], params);

    return fetchJsonResponse(query)
      .then(jsonResponse => jsonResponse[0])
      .then(geoObj => {

        localStorage.setItem("lat", geoObj.lat);
        localStorage.setItem("lon", geoObj.lon);

        return [geoObj.lat, geoObj.lon];
      });
  }

  function fetchJsonResponse(query) {
    return fetch(query)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return response.json();
      });
  }

  function buildQuery(endpoint, params) {
    let query = endpoint.url

    // add api key
    query += "appid=" + settings.apikey;

    // add params
    for (const key of endpoint.params) {
      if (params[key]) {
        query += `&${key}=${params[key]}`;
      }
    }

    if (DEBUG) console.log(query);

    return query;
  }

  ///
  // Main

  const locationDefaults = [
    {
      name: "London",
      lat: .0,
      lon: .0
    },
    {
      name: "Paris",
      lat: .0,
      lon: .0
    }
  ];
  localStorage.setItem("locations", JSON.stringify(locationDefaults));

  let locations = JSON.parse(localStorage.getItem("locations")) || locationDefaults;

  for (const location of locations) {
    getGeolocation(location.name)
      .then(geolocation => {

        if (DEBUG) console.log(geolocation);

        if (geolocation) {
          getForecast(...geolocation);
        }
      })
      .catch(error => {
        console.error(error);
      });
  }

})(window, localStorage);
