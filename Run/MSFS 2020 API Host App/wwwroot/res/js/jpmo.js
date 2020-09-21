//░ 🛈 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//░ Author: John Penny © 2020; All rights reserved
//░ License: MIT

// Instructions: Edit the host var. Paste the code into a web browser console on a supported map webpage.

var JPMO = (function () {

    var options = {
        host: 'PCNAME.local', //HST::RGX
        demoMode: false, //DMO::RGX
        autoRun: false, //ARN::RGX
        apiInterval: 32, // milliseconds - // given everything going on, even on a local network 20 or 32 are reasonable lower bounds
        // READ ME! with some prviders synching will not make an api request unless you moved far enough, so setting mapInterval low just ties the use of the api service to the sim plane speed HOWEVER -
        // HOWEVER some providers will send requests on each movement, and hammering them will get you quickly (rightfully) blocked. Bottom line if you don't understand these values just dont change them.
        mapInterval: 6000, // milliseconds - DON'T SET THIS LOW! flooding the map provider will get you blocked.
        geonamesOrgAccount: '', // go to geonames.org and get your own account
        geonamesOrgInterval: 60, // seconds - this really does not need to be lower than a minute
        reticleSizeSq: 100, // (no unit; pixels)
        reticleScale: 1, // decimal scale
        flightInfoVisibility: 'visible',
        flightInfoDistance: 0, // arbitrary px
        fightInfoBgOpacity: 255, // 0 -255
        showMapScale: 'visible', // visible / hidden
        showMapZoomer: 'visible', // visible / hidden
        mapZoom: 19,
        lockCameraToAircraft: true,
        showHeadingDot: 'visible',
        showQueryLocation: 'hidden',
        showQueryOcean: 'hidden',
        showQueryWeather: 'hidden',
        showQueryWikipedia: 'hidden',
        queryBgOpacity: 255, // 0 -255
        createJourneyLine: true,
        layerProvider: 'OpenStreetMap',
    }

    var leaflet = {
        map: {},
        layers: {},
        overlays: {},
    }

    var managedDOMEls = {}

    var simConnectData = {};
    var fetchReturned = true;
    var mapProvider = '';
    var apiURI = '';
    var fetchFailCount = 0;

    var doSimConnectApiGetLoop; // interval
    var doMapUnderlaySyncLoop; // interval
    var doGeonamesQueries; // interval

    var mapProviderAdjustLeft = 0; // (no unit; pixels)
    var mapProviderAdjustTop = 0; // (no unit; pixels)

    var oldlatlon = ''; // cache
    var latlon = '';

    var simAltitudeFromGroundFt = 0;
    var simPitchDeg = 0;
    var simRollDeg = 0;

    //

    var thisJourneyPath; // rendered leaflet polyline
    var thisJourneyPathShadow; // rendered leaflet polyline - this is adjusted heavily to create a shadow of the path, which gives altitude feedback
    var thisJourneyData = {
        started: '',
        ended: '',
        pathVertsLatLon: [],
        pathVertsAltitudeFt: [],
    }; // the raw journey data

    //

    var mapFirstRunDone = false;
    var apiFirstRunDone = false;

    //

    var zooming = false;
    var moving = false;

    var centralUIPositionDirty = true; // the central UI will be positoned via map data in the full app, so we need to know when its dirty

    //

    function doSimConnectApiFetch() {

        // read the api at an interval

        // ensure handling rate
        if (!fetchReturned) { // if the last request didn't return we should not request more, wait another tick and warn user to check reason
            console.log('NO NEW DATA : fetch is waiting or you are just requesting data too often.');
            return;
        }

        // fetch
        fetchReturned = false;
        fetch(apiURI)
            .then(function (response) {

                fetchReturned = true;

                if (response.status !== 200) {
                    console.log('unwanted response : ' + response.status);
                    fetchFailCount++; // log a failure
                    return;
                }

                //console.log('fetched data OK');

                response.json().then(data => simConnectData = data); // sync

                // update the core UI
                doUpdateCoreUI();

                // update full app features
                if (mapProvider == 'u') {

                    doUpdateFullUI();

                    if (!apiFirstRunDone) {
                        doGeonamesQueriesFetch();
                        apiFirstRunDone = true;
                    }
                }

                // store the lat,lon for use in the map sync (also checked for diff before calling any provider sync)
                oldlatlon = latlon;
                latlon = simConnectData.latitude + "," + simConnectData.longitude;

                fetchFailCount = 0; // reset
            })//;
            .catch(function (err) {
                fetchReturned = true;
                console.log('API LOOP ERROR : ' + err);
                fetchFailCount++; // log a failure
            });

        // handle repeated connection failure or resource error
        if (fetchFailCount > 8) { // allow 10 fails then shut down loops
            console.log('\n\n##################################################################################\n\nResource requests have failed repeatedly. Check connection or resource URI.\n\nDisconnected : Stopping all loops : Refresh the browser to try again\n\n##################################################################################\n\n');
            clearInterval(doSimConnectApiGetLoop);
            clearInterval(doMapUnderlaySyncLoop);
            return;
        }
    }

    function doGeonamesQueriesFetch(forceFetch) {

        if (!options.geonamesOrgAccount) return;
        if (!forceFetch) forceFetch = 'all';

        console.log('Query fetch ' +forceFetch);

        if (forceFetch == 'all' && options.showQueryLocation == 'visible' || forceFetch == 'location') {
            fetch(`\//secure.geonames.org/countrySubdivisionJSON?lat=${simConnectData.latitude.toFixed(15)}&lng=${simConnectData.longitude.toFixed(15)}&username=${options.geonamesOrgAccount}`)
                .then(function (response) {
                    if (response.status !== 200) {
                        console.log('Fetch Query Location : unwanted response : ' + response.status);
                        return;
                    }
                    response.json().then(function (data) {
                        //console.log(data);
                        var info = `${(data.countryName) ? `<p>Country: ${data.countryName}<br />Sub State: ${data.adminName1}</p>` : 'Plane Is Over Water'}`;
                        var html = `${info}`;//end html
                        document.querySelector(`#${managedDOMEls.queryUILocation.id} .JPMOQueryExpandoData`).innerHTML = html;
                    });
                })
                .catch(function (err) {
                    console.log('Fetch Query Location : ERROR : ' + err);
                });
        }

        if (forceFetch == 'all' && options.showQueryOcean == 'visible' || forceFetch == 'ocean') {
            fetch(`\//secure.geonames.org/oceanJSON?lat=${simConnectData.latitude.toFixed(15)}&lng=${simConnectData.longitude.toFixed(15)}&username=${options.geonamesOrgAccount}`)
                .then(function (response) {
                    if (response.status !== 200) {
                        console.log('Fetch Query Ocean : unwanted response : ' + response.status);
                        return;
                    }
                    response.json().then(function (data) {
                        //console.log(data);
                        var info = `${(data.ocean) ? data.ocean.name : 'Plane Is Over Land'}`;
                        var html = `${info}`;//end html
                        document.querySelector(`#${managedDOMEls.queryUIOcean.id} .JPMOQueryExpandoData`).innerHTML = html;
                    });
                })
                .catch(function (err) {
                    console.log('Fetch Query Ocean : ERROR : ' + err);
                });
        }

        if (forceFetch == 'all' && options.showQueryWeather == 'visible' || forceFetch == 'weather') {
            fetch(`\//secure.geonames.org/findNearByWeatherJSON?lat=${simConnectData.latitude.toFixed(15)}&lng=${simConnectData.longitude.toFixed(15)}&username=${options.geonamesOrgAccount}`)
                .then(function (response) {
                    if (response.status !== 200) {
                        console.log('Fetch Query Weather : unwanted response : ' + response.status);
                        return;
                    }
                    response.json().then(function (data) {
                        //console.log(data);
                        var info = `Observation @: ${data.weatherObservation.datetime}<br/>Station name: ${data.weatherObservation.stationName}<br/>Station ICAO: ${data.weatherObservation.ICAO}<br/>Wind direction: ${data.weatherObservation.windDirection}<br/>Wind Speed: ${data.weatherObservation.windSpeed}<br/>hPa: ${data.weatherObservation.hectoPascAltimeter}<br/>Station Elevation: ${data.weatherObservation.elevation}<br/>Temperature: ${data.weatherObservation.temperature}<br/>Humidity: ${data.weatherObservation.humidity}<br/>Clouds: ${data.weatherObservation.clouds}<br/>Cloud code: ${data.weatherObservation.cloudsCode}<br/>Dew point: ${data.weatherObservation.dewPoint}<br/>Conditions: ${data.weatherObservation.weatherCondition}`;
                        var svairportlink = `<hr/><a href="https:\//skyvector.com/airport/${data.weatherObservation.ICAO}" target="_blank">skyvector.com ${data.weatherObservation.ICAO}<a/>`
                        var html = `${info}${svairportlink}`;//end html
                        document.querySelector(`#${managedDOMEls.queryUIWeather.id} .JPMOQueryExpandoData`).innerHTML = html;
                    });
                })
                .catch(function (err) {
                    console.log('Fetch Query Weather : ERROR : ' + err);
                });
        }

        if (forceFetch == 'all' && options.showQueryWikipedia == 'visible' || forceFetch == 'wikipedia') {
            fetch(`\//secure.geonames.org/findNearbyWikipediaJSON?lat=${simConnectData.latitude.toFixed(15)}&lng=${simConnectData.longitude.toFixed(15)}&username=${options.geonamesOrgAccount}`)
                .then(function (response) {
                    if (response.status !== 200) {
                        console.log('Fetch Query Wikipedia : unwanted response : ' + response.status);
                        return;
                    }
                    response.json().then(function (data) {
                        //console.log(data);
                        var info = '';
                        for (var i = 0; i < data.geonames.length; i++) {
                            var o = data.geonames[i];
                            info += `<small> ${o.summary}<br/><a href="//${o.wikipediaUrl}" target="_blank">${o.title} on Wikipedia</a></small><hr/>`
                        }
                        if (data.geonames.length == 0) info += `No Wikipedia entries nearby`;
                        var html = `${info}`;//end html
                        document.querySelector(`#${managedDOMEls.queryUIWikipedia.id} .JPMOQueryExpandoData`).innerHTML = html;
                    });
                })
                .catch(function (err) {
                    console.log('Fetch Query Wikipedia : ERROR : ' + err);
                });
        }

        // ocean
        // http://secure.geonames.org/oceanJSON?lat=51.4&lng=-3&username=demo
        // OK {"ocean":{"distance":"0","geonameId":6640393,"name":"Bristol Channel"}}
        // NONE { "status": { "message": "we are afraid we could not find an ocean for latitude and longitude :52.4,-1.5", "value": 15 } }

        //
        // weather
        // http://secure.geonames.org/findNearByWeatherJSON?lat=43&lng=-2&username=demo
        // {"weatherObservation":{"elevation":8,"lng":-1.8,"observation":"LESO 190500Z 20003KT 170V250 CAVOK 23/15 Q1009","ICAO":"LESO","clouds":"clouds and visibility OK","dewPoint":"15","cloudsCode":"CAVOK","datetime":"2020-09-19 05:00:00","countryCode":"ES","temperature":"23","humidity":60,"stationName":"San Sebastian / Fuenterrabia","weatherCondition":"n/a","windDirection":200,"hectoPascAltimeter":1009,"windSpeed":"03","lat":43.35}}

        //

        // country info

        // basic info
        // http://secure.geonames.org/countryCodeJSON?lat=52.396857&lng=-1.522013&username=demo
        // {"languages":"en-GB,cy-GB,gd","distance":"0","countryCode":"GB","countryName":"United Kingdom"}

        // get subdivision
        // http://secure.geonames.org/countrySubdivisionJSON?lat=52.396857&lng=-1.522013&username=demo
        // {"codes":[{"code":"ENG","level":"1","type":"ISO3166-2"}],"adminCode1":"ENG","distance":0,"countryCode":"GB","countryName":"United Kingdom","adminName1":"England"}

        // more detail - from country code
        // http://api.geonames.org/countryInfoJSON?country=gb&username=demo
        // {"geonames":[{"continent":"EU","capital":"London","languages":"en-GB,cy-GB,gd","geonameId":2635167,"south":49.9028622252397,"isoAlpha3":"GBR","north":59.3607741849963,"fipsCode":"UK","population":"66488991","east":1.7689121033873,"isoNumeric":"826","areaInSqKm":"244820.0","countryCode":"GB","west":-8.61772077108559,"countryName":"United Kingdom","continentName":"Europe","currencyCode":"GBP"}]}

        //

        // wikipedia entries
        // http://api.geonames.org/findNearbyWikipediaJSON?lat=47&lng=9&username=demo
        // {"geonames":[{"summary":"The Glärnisch is a mountain massif of the Schwyz Alps, overlooking the valley of the Linth in the Swiss canton of Glarus. It consists of several summits, of which the highest, Bächistock, is 2,915 metres above sea level (...)","elevation":2880,"geoNameId":2660595,"feature":"mountain","lng":8.99849,"distance":"0.1853","countryCode":"CH","rank":93,"lang":"en","title":"Glärnisch","lat":46.99869,"wikipediaUrl":"en.wikipedia.org/wiki/Gl%C3%A4rnisch"},{"summary":"Oberblegisee is a lake in the Canton of Glarus, Switzerland. It is located at an elevation of , above the village of Luchsingen and below the peaks of Glärnisch. Its surface area is .  (...)","elevation":1410,"geoNameId":11397104,"feature":"waterbody","lng":9.013333,"distance":"2.3589","countryCode":"CH","rank":57,"lang":"en","title":"Oberblegisee","lat":46.980833,"wikipediaUrl":"en.wikipedia.org/wiki/Oberblegisee"},{"summary":"The Rüchigrat (2,657 m) is a mountain of the Schwyzer Alps, located west of Luchsingen in the canton of Glarus. It lies south of the Glärnisch, on the range between the valley of the Klöntalersee and the main Linth valley (...)","elevation":2625,"geoNameId":6938281,"feature":"mountain","lng":8.97765,"distance":"2.8585","countryCode":"CH","rank":48,"lang":"en","title":"Rüchigrat","lat":46.9793,"wikipediaUrl":"en.wikipedia.org/wiki/R%C3%BCchigrat"},{"summary":"Klöntalersee is a natural lake in the canton of Glarus, Switzerland and covers the major part of the  valley floor. Since 1908, it has been used as a reservoir for electricity production. The dam's construction substantially increased the lake's volume (...)","elevation":835,"geoNameId":11396208,"lng":8.980555555555556,"distance":"3.2011","thumbnailImg":"http://www.geonames.org/img/wikipedia/2000/thumb-1904-100.jpg","title":"Klöntalersee","wikipediaUrl":"en.wikipedia.org/wiki/Kl%C3%B6ntalersee","feature":"waterbody","countryCode":"CH","rank":92,"lang":"en","lat":47.025555555555556},{"summary":"The Vorder Glärnisch (2,327 m) is a mountain of the Schwyzer Alps, overlooking the valley of the Linth in the canton of Glarus. It lies north-east of the higher Glärnisch (2,914 m). Unlike its higher neighbour, the Vorder Glärnisch can be ascended via a trail on its north-west side.  (...)","elevation":2153,"geoNameId":6938509,"feature":"mountain","lng":9.04151,"distance":"4.0178","countryCode":"CH","rank":69,"lang":"en","title":"Vorder Glärnisch","lat":47.022464,"wikipediaUrl":"en.wikipedia.org/wiki/Vorder_Gl%C3%A4rnisch"}]}
    }

    function doSyncMapUnderlay() {

        // sync the map underlay with the plane's position at an interval

        if (!simConnectData || latlon == oldlatlon) return; // abort if data was not found yet or no change in latlon

        switch (mapProvider) {
            case 'u':
                doUpdateLeaflet();
                break;
            case 'osm':
                // REMOVED - this was very hacky, not good, and not worth keeping in as if you want OSM just use the new self hosted option
                break;
            case 'sv':
                // I cannot find sky vector usage terms, but their basic positioning API is open on their public site
                // YOU ARE ENTIRELY RESPONSIBLE FOR ANY USAGE
                SkyVector.getChart({ 'z': 1, 'll': latlon });
                break;
            default:
                console.log('Map Provider not found : Stopping map underlay loop');
                clearInterval(doMapUnderlaySyncLoop);
                break;
        }
    }

    function doUpdateCoreUI() {

        // recalculations

        simAltitudeFromGroundFt = (simConnectData.planeAltitude - (simConnectData.groundAltitude * 3.281)).toFixed(0);
        simPitchDeg = (simConnectData.pitch * (180 / Math.PI)).toFixed(3);
        simRollDeg = (simConnectData.roll * (180 / Math.PI)).toFixed(3);

        //

        // js restyling

        managedDOMEls.centralUI.style.width = options.reticleSizeSq + 'px';
        managedDOMEls.centralUI.style.height = options.reticleSizeSq + 'px';

        // if we are not running the full app just express some arbitrary offset for altitude feedback - full version has 'accurate' shadow projection, see doUpdateLeaflet
        if (mapProvider != 'u') managedDOMEls.planeShadowRotater.style.transform = `translate(${simAltitudeFromGroundFt * -0.0045}px, ${simAltitudeFromGroundFt * 0.01}px) rotateZ(${simConnectData.heading}deg)`;

        managedDOMEls.planeRotater.style.transform = `rotateZ(${simConnectData.heading}deg)`;
        managedDOMEls.planeShadow.style.transform = `rotateX(${-simPitchDeg}deg) rotateY(${simRollDeg}deg)`;
        managedDOMEls.planeStroke.style.transform = `rotateX(${-simPitchDeg}deg) rotateY(${simRollDeg}deg)`;
        managedDOMEls.planeFront.style.transform = `rotateX(${-simPitchDeg}deg) rotateY(${simRollDeg}deg)`;
        managedDOMEls.planeBack.style.transform = `rotateX(${-simPitchDeg}deg) rotateY(${simRollDeg - 180}deg)`;
        managedDOMEls.planeHeadingDot.style.visibility = options.showHeadingDot;

        managedDOMEls.flightData.style.visibility = options.flightInfoVisibility;
        managedDOMEls.flightData.style.backgroundColor = `rgba(0,0,0,${options.fightInfoBgOpacity / 255})`;
        managedDOMEls.flightData.style.top = `calc(100% + ${options.flightInfoDistance}px)`;
        managedDOMEls.flightData.style.left = `calc(100% + ${options.flightInfoDistance}px)`;
        managedDOMEls.flightData.innerText = `Airborne: ${!simConnectData.isOnGround}

Flight Number: ${simConnectData.flightNumber}
Tail Number: ${simConnectData.tailNumber}
Type: ${simConnectData.craftType.replace('TT:ATCCOM.ATC_NAME', '').replace('.0.text', '')}
Model: ${simConnectData.craftModel.replace('TT:ATCCOM.AC_MODEL', '').replace('.0.text', '')}

Latitude: ${simConnectData.latitude.toFixed(15)}
Longitude: ${simConnectData.longitude.toFixed(15)}
Heading: ${simConnectData.heading.toFixed(2)}°

Craft Altitude: ${simConnectData.planeAltitude.toFixed(1)} ft
Ground Altitude: ${simConnectData.groundAltitude.toFixed(1)} m (${(simConnectData.groundAltitude * 3.281).toFixed(1)} ft)

Pitch: ${-(simConnectData.pitch * (180 / Math.PI)).toFixed(3)}°
Yaw: ${simConnectData.heading.toFixed(3)}°
Roll: ${(simConnectData.roll * (180 / Math.PI)).toFixed(3)}°

Indicated Airspeed: ${simConnectData.airspeedIndicated.toFixed(1)} knots
True Airspeed: ${simConnectData.airspeedTrue.toFixed(1)} knots
Ground Speed: ${simConnectData.groundSpeed.toFixed(1)} knots
Mach: ${simConnectData.airspeedMach.toFixed(5)}
`;// end inner text
    }

    function doUpdateFullUI() {

        // sync app options with input UI

        // raw values
        options.reticleSizeSq = managedDOMEls.optionsReticleSize.value;
        options.flightInfoDistance = managedDOMEls.optionsFlightInfoDistance.value;
        options.fightInfoBgOpacity = managedDOMEls.optionsFlightInfoBgOpacity.value;
        options.queryBgOpacity = managedDOMEls.optionsQueryBgOpacity.value;

        // checkbox bool
        options.lockCameraToAircraft = managedDOMEls.optionsLockCameraToAircraft.checked;

        // checkbox to string
        options.flightInfoVisibility = (managedDOMEls.optionsFlightInfoVisibility.checked) ? 'visible' : 'hidden';
        options.showHeadingDot = (managedDOMEls.optionsShowHeadingDot.checked) ? 'visible' : 'hidden';

        options.showQueryLocation = (managedDOMEls.optionsShowQueryLocation.checked) ? 'visible' : 'hidden';
        options.showQueryOcean = (managedDOMEls.optionsShowQueryOcean.checked) ? 'visible' : 'hidden';
        options.showQueryWeather = (managedDOMEls.optionsShowQueryWeather.checked) ? 'visible' : 'hidden';
        options.showQueryWikipedia = (managedDOMEls.optionsShowQueryWikipedia.checked) ? 'visible' : 'hidden';

        //

        // store state data in DOM for CSS restyling

        managedDOMEls.queryUILocation.setAttribute('data-visibility', options.showQueryLocation);
        managedDOMEls.queryUIOcean.setAttribute('data-visibility', options.showQueryOcean);
        managedDOMEls.queryUIWeather.setAttribute('data-visibility', options.showQueryWeather);
        managedDOMEls.queryUIWikipedia.setAttribute('data-visibility', options.showQueryWikipedia);

        //

        // js restyling

        managedDOMEls.queryUILocation.style.backgroundColor = `rgba(0,0,0,${options.queryBgOpacity / 255})`;
        managedDOMEls.queryUIOcean.style.backgroundColor = `rgba(0,0,0,${options.queryBgOpacity / 255})`;
        managedDOMEls.queryUIWeather.style.backgroundColor = `rgba(0,0,0,${options.queryBgOpacity / 255})`;
        managedDOMEls.queryUIWikipedia.style.backgroundColor = `rgba(0,0,0,${options.queryBgOpacity / 255})`;
    }

    function doUpdateLeaflet() {

        // sync app options and restyle

        options.mapZoom = managedDOMEls.optionsZoom.value;
        options.showMapScale = (managedDOMEls.optionsShowScale.checked) ? 'visible' : 'hidden';
        options.showMapZoomer = (managedDOMEls.optionsShowZoomer.checked) ? 'visible' : 'hidden';

        managedDOMEls.leafletScale.setAttribute('data-visibility', options.showMapScale);
        managedDOMEls.leafletZoomer.setAttribute('data-visibility', options.showMapZoomer);

        //

        // recentre map

        // pan map centre to plane sim position
        leaflet.map.panTo([simConnectData.latitude, simConnectData.longitude], options.mapZoom, {
            animate: (mapFirstRunDone) ? true : false,
            duration: (options.mapInterval / 1000) * 1,
            easeLinearity: 1.0,
            noMoveStart: true,
        });

        //

        // do journey line

        // journey line init and add
        if (options.createJourneyLine) {

            // save the values we need to render the path - the vertex position in lat lon and also its sim altitude in ft
            thisJourneyData.pathVertsLatLon.push([simConnectData.latitude, simConnectData.longitude]);
            thisJourneyData.pathVertsAltitudeFt.push(simAltitudeFromGroundFt);

            var pathVert = thisJourneyData.pathVertsLatLon[thisJourneyData.pathVertsLatLon.length - 1];

            // restyle the central UI based on map data - not just the viewport center - ensures perfect sync with map data
            if (centralUIPositionDirty) {
                // BUG LOW this doesnt always create a perfect visual position - must be a premature dirty resolution
                var pathPixelCoords = leaflet.map.latLngToContainerPoint(pathVert);
                managedDOMEls.centralUI.style.transform = `translate(${pathPixelCoords.x - (options.reticleSizeSq / 2)}px, ${pathPixelCoords.y - (options.reticleSizeSq / 2)}px)`;
                centralUIPositionDirty = false;
            }

            // generate shadow path coords
            // At around 45deg summer sun the shadow for 12192m (40,000ft flight ceiling) is around 14423m (47319.554ft)
            // 1 deg latitude = 110574m (362775.591ft)
            // 110574m / 14423m = 7.666
            // 1 / 7.666 = 0.1304461257500652 deg lat for each max shadow
            // 0.1304461257500652 / 40000 = 0.00000326115 in latitude for each foot in height
            // 0.1304461257500652 / 12192 = 0.00001069932 for each meter in height
            // we are going to assume longitude is equatorial and is approximately 1:1 with latitude

            var shadowVertLatitudeOffset = ((thisJourneyData.pathVertsAltitudeFt[thisJourneyData.pathVertsAltitudeFt.length - 1] * 0.00000326115));
            var shadowVert = [thisJourneyData.pathVertsLatLon[thisJourneyData.pathVertsLatLon.length - 1][0] - shadowVertLatitudeOffset, thisJourneyData.pathVertsLatLon[thisJourneyData.pathVertsLatLon.length - 1][1] - shadowVertLatitudeOffset];
            var shadowPixelCoords = leaflet.map.latLngToContainerPoint(shadowVert);

            // restyle plane shadow container
            managedDOMEls.planeShadowRotater.style.width = options.reticleSizeSq + 'px';
            managedDOMEls.planeShadowRotater.style.height = options.reticleSizeSq + 'px';
            managedDOMEls.planeShadowRotater.style.transform = `translate(${shadowPixelCoords.x - (options.reticleSizeSq / 2)}px, ${shadowPixelCoords.y - (options.reticleSizeSq / 2)}px) rotateZ(${simConnectData.heading}deg)`;

            // the guasian blur applied to the plane and path shadow - scale it with zoom
            managedDOMEls.planeShadowGBlur.setAttribute('stdDeviation', 0.25 * leaflet.map.getZoom());

            if (!thisJourneyPath) { // init
                var now = new Date();
                thisJourneyData.started = `${now.toDateString()}-${now.toTimeString()}`;
                thisJourneyPath = L.polyline(thisJourneyData.pathVertsLatLon, {
                    smoothFactor: 1,
                    color: 'blue', //stroke
                    weight: 3, //stroke
                    opacity: 0.3, //stroke
                    className: 'path-thisjourney',
                }).addTo(leaflet.map);

                thisJourneyPathShadow = L.polyline([shadowVert], {
                    smoothFactor: 1,
                    color: 'black', //stroke
                    weight: 4, //stroke
                    opacity: 0.7, //stroke
                    className: 'path-thisjourneyshadow',
                }).addTo(leaflet.map);

                document.querySelector('.path-thisjourneyshadow').setAttribute('filter', 'url(#9dn32i-c8h3sk)'); // apply the plane shadow to the path shadow too
            }
            else { // add a vert
                thisJourneyPath.addLatLng(pathVert);
                thisJourneyPathShadow.addLatLng(shadowVert);
            }

            // TODO a button to zoom out to see the whole journey path like so:
            // leaflet.map.fitBounds(thisJourneyPath.getBounds()); // zoom out to show the journey
        }

        mapFirstRunDone = true;
    }

    //

    function onUpdateLeafletLayer() {

        // rm old
        leaflet.map.removeLayer(leaflet.layers[options.layerProvider]);
        //leaflet.map.eachLayer(function (layer) { // clear all
        //    leaflet.map.removeLayer(layer);
        //});

        // get and set new
        options.layerProvider = document.querySelector('input[name=leaflet-opt-layerchooser]:checked').value;
        leaflet.map.addLayer(leaflet.layers[options.layerProvider]);
    }

    function onUpdateLeafletZoom() {
        if (!leaflet.map.getZoom() || options.mapZoom < leaflet.map.getMaxZoom()) {
            // TODO LOW need to integrate into leaflet zoom function before adding zoom slider
            leaflet.map.setZoom(options.mapZoom);
        }
    }

    function onUpdateGeonamesAccount() {
        options.geonamesOrgAccount = managedDOMEls.optionsGeonamesAccount.value;
    }

    function onUpdateGeonamesInterval() {
        clearInterval(doGeonamesQueries);
        options.geonamesOrgInterval = managedDOMEls.optionsGeonamesInterval.value;
        doGeonamesQueries = setInterval(doGeonamesQueriesFetch, options.geonamesOrgInterval * 1000);
        console.log(`Query interval changed to: ${options.geonamesOrgInterval} seconds`);
    }

    //

    function setupCoreDOM() {

        // create DOM elements

        managedDOMEls.css = document.createElement('style');
        managedDOMEls.css.id = 'JPMOCSS';

        managedDOMEls.centralUI = document.createElement('div');
        managedDOMEls.centralUI.id = 'JPMOCentralUI';

        managedDOMEls.reticleContainer = document.createElement('div');
        managedDOMEls.reticleContainer.id = 'JPMOReticleContainer';

        managedDOMEls.flightData = document.createElement('div');
        managedDOMEls.flightData.id = 'JPMOFlightData';

        //

        // construct elements and add to doc

        // stylesheet
        var css = `
html,
body
{
    width: 100%;
    height: 100%;
    overflow: hidden;
}

#JPMOCentralUI
{
    pointer-events:none;
    position:absolute;
    transform-origin:center center;
    transform:translate(-50%, -50%);
    top: calc(50vh + ${mapProviderAdjustTop}px);
    left: calc(50vw + ${mapProviderAdjustLeft}px);
    width:${options.reticleSizeSq}px;
    height:${options.reticleSizeSq}px;
    z-index:9999;
}

#JPMOReticleContainer
{
    position:absolute;
    transform-origin:center center;
    transition:transform ${options.apiInterval}ms;
    width: 100%;
    height: 100%;
}

#JPMOFlightData
{
    box-sizing: border-box;
    position: absolute;
    top:100%;
    left:100%;
    padding: 12px 18px;
    border-radius: 0 12px 12px 12px;
    font-size:12px;
    color:white;
    background-color:#000000;
    white-space: nowrap;
    text-shadow: #000 1px 1px 2px;
}
`;//end css
        managedDOMEls.css.textContent = css;
        document.head.append(managedDOMEls.css);

        // central UI
        document.body.prepend(managedDOMEls.centralUI);

        // reticle - NOTE: keep the svg elemnts portable by doing their CSS inline
        var reticleHTML = `
<div id="${managedDOMEls.reticleContainer.id}PlaneRotater" style="pointer-events:none;width:100%;height:100%;position:absolute;overflow:visible;transform-origin:center center;box-sizing:border-box;backface-visibility:hidden;transition:transform ${options.apiInterval}ms;">
    <svg class="svg" id="${managedDOMEls.reticleContainer.id}CircledPlane" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" style="position:absolute;overflow:visible;transform-origin:center center;box-sizing:border-box;backface-visibility:hidden;transition:transform ${options.apiInterval}ms;">
        <mask id="893bs6-f87h3b">
            <rect data-info="The mask matte; black for stamp, white for cutout." fill="white" width="100%" height="100%" />
            <g id="${managedDOMEls.reticleContainer.id}PlaneFront" style="transform-origin:center center;transition:transform ${options.apiInterval}ms;">
                <g id="" transform-origin="center center" transform="scale(0.8 0.8) translate(0 0) rotate(0 0 0) skewX(0)">
                    <rect data-info="The graphic's bounding box; ie the authored size." width="100" height="100" fill="none" />
                    <path id="" fill="black" d="M97.885,63.41C97.885,61.596 96.928,59.932 95.415,58.924L57.561,35.284L57.561,7.561C57.561,3.377 54.184,-0 50,-0C45.816,-0 42.439,3.377 42.439,7.561L42.439,35.284L4.585,58.924C3.072,59.882 2.115,61.596 2.115,63.41C2.115,66.939 5.542,69.509 8.97,68.451L42.439,57.966L42.439,85.69L33.366,92.494C32.711,92.948 32.358,93.704 32.358,94.51L32.358,97.484C32.358,99.148 33.971,100.358 35.584,99.904L50,95.771L64.416,99.904C66.029,100.358 67.642,99.148 67.642,97.484L67.642,94.51C67.642,93.704 67.289,92.948 66.634,92.494L57.561,85.69L57.561,57.966L91.03,68.451C94.458,69.509 97.885,66.939 97.885,63.41Z" />
                </g>
            </g>
        </mask>
        <g id="" style="" transform-origin="center center" transform="scale(1 1) translate(0 0) rotate(0 0 0) skewX(0)">
            <g id="${managedDOMEls.reticleContainer.id}PlaneStroke" style="transform-origin:center center;transition:transform ${options.apiInterval}ms;">
                <g id="" transform-origin="center center" transform="scale(0.8 0.8) translate(0 0) rotate(0 0 0) skewX(0)">
                    <rect data-info="The graphic's bounding box; ie the authored size." width="100" height="100" fill="none" />
                    <path id="" fill="none" stroke="black" stroke-linecap="round" stroke-width="1" d="M97.885,63.41C97.885,61.596 96.928,59.932 95.415,58.924L57.561,35.284L57.561,7.561C57.561,3.377 54.184,-0 50,-0C45.816,-0 42.439,3.377 42.439,7.561L42.439,35.284L4.585,58.924C3.072,59.882 2.115,61.596 2.115,63.41C2.115,66.939 5.542,69.509 8.97,68.451L42.439,57.966L42.439,85.69L33.366,92.494C32.711,92.948 32.358,93.704 32.358,94.51L32.358,97.484C32.358,99.148 33.971,100.358 35.584,99.904L50,95.771L64.416,99.904C66.029,100.358 67.642,99.148 67.642,97.484L67.642,94.51C67.642,93.704 67.289,92.948 66.634,92.494L57.561,85.69L57.561,57.966L91.03,68.451C94.458,69.509 97.885,66.939 97.885,63.41Z" />
                </g>
            </g>
            <circle id="${managedDOMEls.reticleContainer.id}BackgroundCircle" fill="#ffffff66" stroke="white" stroke-linecap="round" stroke-width="1" cx="50%" cy="50%" r="48%" mask="url(#893bs6-f87h3b)" />
            <circle id="${managedDOMEls.reticleContainer.id}HeadingCircle" fill="#DD4444DD" stroke="yellow" stroke-linecap="round" stroke-width="1" cx="50%" cy="2" r="4" />
        </g>
        <rect data-info="The SVG viewBox bounds; use stroke to make visible." fill="none" stroke="none" stroke-linecap="square" stroke-width="1" width="100%" height="100%" />
    </svg>

    <svg class="svg" id="${managedDOMEls.reticleContainer.id}PlaneBack" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" style="transform:rotateY(180deg);position:absolute;overflow:visible;transform-origin:center center;box-sizing:border-box;backface-visibility:hidden;transition:transform ${options.apiInterval}ms;">
        <g id="" transform-origin="center center" transform="scale(0.8 0.8) translate(0 0) rotate(0 0 0) skewX(0)">
            <rect data-info="The graphic's bounding box; ie the authored size." width="100" height="100" fill="none" />
            <path id="" fill="#DD444488" d="M97.885,63.41C97.885,61.596 96.928,59.932 95.415,58.924L57.561,35.284L57.561,7.561C57.561,3.377 54.184,-0 50,-0C45.816,-0 42.439,3.377 42.439,7.561L42.439,35.284L4.585,58.924C3.072,59.882 2.115,61.596 2.115,63.41C2.115,66.939 5.542,69.509 8.97,68.451L42.439,57.966L42.439,85.69L33.366,92.494C32.711,92.948 32.358,93.704 32.358,94.51L32.358,97.484C32.358,99.148 33.971,100.358 35.584,99.904L50,95.771L64.416,99.904C66.029,100.358 67.642,99.148 67.642,97.484L67.642,94.51C67.642,93.704 67.289,92.948 66.634,92.494L57.561,85.69L57.561,57.966L91.03,68.451C94.458,69.509 97.885,66.939 97.885,63.41Z" />
        </g>
        <rect data-info="The SVG viewBox bounds; use stroke to make visible." fill="none" stroke="none" stroke-linecap="square" stroke-width="1" width="100%" height="100%" />
    </svg>
</div>

<div id="${managedDOMEls.reticleContainer.id}PlaneShadowRotater" style="pointer-events:none;width:100%;height:100%;position:absolute;overflow:visible;transform-origin:center center;box-sizing:border-box;backface-visibility:hidden;transition:transform ${options.apiInterval}ms;">
    <svg class="svg" id="${managedDOMEls.reticleContainer.id}PlaneShadow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" style="position:absolute;overflow:visible;transform-origin:center center;box-sizing:border-box;backface-visibility:visible;transition:transform ${options.apiInterval}ms;">
        <defs>
            <filter id="9dn32i-c8h3sk">
                <feGaussianBlur id="9dn32i-c8h3sk-gblur" stdDeviation="5" />
            </filter>
        </defs>
        <g id="" transform-origin="center center" transform="scale(0.8 0.8) translate(0 0) rotate(0 0 0) skewX(0)">
            <rect data-info="The graphic's bounding box; ie the authored size." width="100" height="100" fill="none" />
            <path id="" fill="#00000066" filter="url(#9dn32i-c8h3sk)" d="M97.885,63.41C97.885,61.596 96.928,59.932 95.415,58.924L57.561,35.284L57.561,7.561C57.561,3.377 54.184,-0 50,-0C45.816,-0 42.439,3.377 42.439,7.561L42.439,35.284L4.585,58.924C3.072,59.882 2.115,61.596 2.115,63.41C2.115,66.939 5.542,69.509 8.97,68.451L42.439,57.966L42.439,85.69L33.366,92.494C32.711,92.948 32.358,93.704 32.358,94.51L32.358,97.484C32.358,99.148 33.971,100.358 35.584,99.904L50,95.771L64.416,99.904C66.029,100.358 67.642,99.148 67.642,97.484L67.642,94.51C67.642,93.704 67.289,92.948 66.634,92.494L57.561,85.69L57.561,57.966L91.03,68.451C94.458,69.509 97.885,66.939 97.885,63.41Z" />
        </g>
        <rect data-info="The SVG viewBox bounds; use stroke to make visible." fill="none" stroke="none" stroke-linecap="square" stroke-width="1" width="100%" height="100%" />
    </svg>
</div>
`;//end html
        managedDOMEls.reticleContainer.innerHTML = reticleHTML;
        managedDOMEls.centralUI.prepend(managedDOMEls.reticleContainer);

        // flight data
        managedDOMEls.flightData.innerText = 'NO DATA FOUND\nCHECK CONSOLE'
        managedDOMEls.centralUI.prepend(managedDOMEls.flightData);

        //

        // get existing elements
        managedDOMEls.planeShadowGBlur = document.getElementById('9dn32i-c8h3sk-gblur');
        managedDOMEls.planeShadow = document.getElementById('JPMOReticleContainerPlaneShadow');
        managedDOMEls.planeShadowRotater = document.getElementById('JPMOReticleContainerPlaneShadowRotater');
        managedDOMEls.planeRotater = document.getElementById('JPMOReticleContainerPlaneRotater');
        managedDOMEls.planeStroke = document.getElementById('JPMOReticleContainerPlaneStroke');
        managedDOMEls.planeFront = document.getElementById('JPMOReticleContainerPlaneFront');
        managedDOMEls.planeBack = document.getElementById('JPMOReticleContainerPlaneBack');
        managedDOMEls.planeHeadingDot = document.getElementById('JPMOReticleContainerHeadingCircle');
    }

    function setupFullDOM() {

        // create DOM elements

        managedDOMEls.cssFull = document.createElement('style');
        managedDOMEls.cssFull.id = 'JPMOCSSFull';

        managedDOMEls.queryUI = document.createElement('div');
        managedDOMEls.queryUI.id = 'JPMOQueryUI';

        managedDOMEls.optionsUI = document.createElement('div');
        managedDOMEls.optionsUI.id = 'JPMOOptionsUI';

        //

        // construct elements and add to doc

        // stylesheet
        var cssFull = `
.hide
{
    display: none !important;
}

.nicescroll
{
    scrollbar-width: thin;
     scrollbar-color: #00000033 transparent;
}

.nicescroll::-webkit-scrollbar
{
    width: 6px;
}

.nicescroll::-webkit-scrollbar-track
{
    background: transparent;
}

.nicescroll::-webkit-scrollbar-thumb
{
    background-color: #00000033;
    border-radius: 3px;
}

.leaflet-control-zoom[data-visibility=hidden],
.leaflet-control-scale[data-visibility=hidden]
{
    display: none;
}

input:disabled + label
{
    color: #00000033;
}

.path-thisjourneyshadow
{
    fill: none;
    stroke: black;
    stroke-width: 4px;
}

.path-thisjourney
{
    fill: none;
    stroke: blue;
    stroke-width: 3px;
}

#map-options-menuicon 
{
    display: inline-block;
    width: 12px;
}

#map-options-menuicon > path
{
    stroke: #00000022;
    stroke-width: 6px;
    fill: white;
    paint-order: stroke fill markers;
}

#map-options-menuopener
{
    position: absolute;
    box-sizing: border-box;
    top: 0;
    right: -36px;
    padding: 6px 12px;
    text-align: center;
    border-radius: 0 18px 18px 0;
    background-color: #00000011;
}

#JPMOOptionsUI
{
    font-size: 0;
    position:absolute;
    transition:transform 300ms;
    transform:translate(-96%, 0);
    width: 20vw;
    padding: 12px 0.9vw;
    top: 0;
    bottom: 0;
    left: 0;
    z-index:9999;
    color: #171717;
    background-color: #00000011;
}

#JPMOOptionsUI:hover
{
    transform:translate(0, 0);
}

#map-options
{
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    background-color: white;
    border: 2px solid #00000044;
    border-radius: 5px;
    padding: 12px;
    overflow-y: auto;
}

#map-options > *:first-child
{
    margin-top: 0;
}

#map-options > hr
{
    border: 0;
    height: 0;
    border-top: 1px solid #00000011;
}

#map-options > h1
{
    font-size: 1rem;
    color: #171717BB;
    text-align: center;
    border: 0 double #00000011;
    border-width: 3px 0;
    line-height: 2em;
}

#map-options > span
{
    font-size: 1rem;
    display: inline-block;
    width: 100%;
    box-sizing: border-box;
    margin: 0.8em 0;
}

#map-options > span > *
{
    display: inline-block;
    width: 100%;
    vertical-align: middle;
    font-size: 1em;
    line-height: 1.5em;
}

#map-options > span > input
{
    height: 1.5em;
}

#map-options > span > input[type=radio],
#map-options > span > input[type=checkbox]
{
    width: 10%;
}

#map-options > span > input[type=radio] + label,
#map-options > span > input[type=checkbox] + label
{
    display: inline-block;
    box-sizing: border-box;
    width: 90%;
    padding-left: 0.5em;
    background-color: transparent;
}

#JPMOQueryUI a
{
    color: white;
}

#JPMOQueryUI
{
    font-size: 0;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    z-index: 999;
    text-align: center;
    pointer-events: none;
}

.JPMOQueryExpando[data-visibility=hidden]
{
    margin-right: 260px;
}

.JPMOQueryExpando[data-visibility=hidden] > div
{
    display: none;
}

.JPMOQueryExpando[data-visibility=hidden] > label
{
    border-color: #ffffff77;
}

.JPMOQueryExpando[data-visibility=hidden] > label > svg
{
    fill: #ffffff77;
}

.JPMOQueryExpando
{
    pointer-events: all;
    box-sizing: border-box;
    display: inline-block;
    vertical-align: top;
    text-align: center;
    transition:transform 300ms, width 300ms, height 300ms;
    transform-origin:center left;
    border-radius: 24px 0 24px 0;
    background-color: rgba(0,0,0,0.5);
    white-space: nowrap;
    margin: 12px 6px;
    margin-right: 0;
}

.XXJPMOQueryExpando:before {
    content: '';
    display: inline-block;
    width: 0;
    height: inherit;
    min-height: inherit;
    vertical-align: middle;
}

.JPMOQueryExpando > label
{
    display: inline-block;
    vertical-align: top;
    box-sizing: border-box;
    margin: 6px 6px 6px 6px;
    padding: 8px;
    height: 40px;
    border-radius: 40px;
    border: 2px solid white;
    cursor: pointer;
    user-select: none;
}

.JPMOQueryExpando > label > svg
{
    height: 100%;
    fill: white;
}

.JPMOQueryExpando > div
{
    font-size: 1rem;
    width: 244px;
    display: inline-block;
    vertical-align: middle;
    margin: 0 16px 16px 0;
    text-shadow: #000 1px 1px 2px;
    white-space: normal;
}

.JPMOQueryExpando > div h1
{
    text-align: left;
    font-size: 18px;
    line-height: 46px;
    margin: 0 0 0 6px;
}

.JPMOQueryExpando > div .JPMOQueryExpandoData
{
    text-align: left;
}

.JPMOQueryExpando > div .JPMOQueryExpandoData hr
{
    border: 1px double #ffffff55;
}

@media only screen and (max-width: 1400px) {
    #JPMOOptionsUI
    {
        width: 20vw;
        transform:translate(-96%, 0);
    }
}

@media only screen and (max-width: 1000px) {
    #JPMOOptionsUI
    {
        width: 40vw;
        transform:translate(-100%, 0);
    }
}

@media only screen and (max-width: 700px) {
    #JPMOOptionsUI
    {
        width: 50vw;
    }
}

@media only screen and (max-width: 500px) {
    #JPMOOptionsUI
    {
        width: 90vw;
    }
}

@media only screen and (max-width: 1400px) {
    #JPMOOptionsUI
    {
        transform:translate(-100%, 0);
    }

    #JPMOQueryUI
    {
        text-align: left;
        top: 36px;
        left: 20px;
        white-space: pre;
    }
    
    .JPMOQueryExpando
    {
        margin: 0;
    }
}
`;//end css
        managedDOMEls.cssFull.textContent = cssFull;
        document.head.append(managedDOMEls.cssFull);

        // query location
        var queryUIHTML = `
<div class="JPMOQueryExpando" id="JPMOQueryUILocation">
    <label for="JPMO-opt-showquerylocation">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="100%" height="100%" fill="none"/><path d="M12,2c-4.2,0-8,3.22-8,8.2c0,3.18,2.45,6.92,7.34,11.23c0.38,0.33,0.95,0.33,1.33,0C17.55,17.12,20,13.38,20,10.2 C20,5.22,16.2,2,12,2 M12.71,15.7C12.52,15.9,12.28,16,12,16c-0.27,0-0.53-0.11-0.71-0.3c-0.19-0.19-0.3-0.44-0.29-0.71 c-0.01-0.55,0.43-0.99,0.98-1c0.01,0,0.01,0,0.02,0c0.55-0.01,0.99,0.43,1,0.98c0,0.01,0,0.01,0,0.02 C13,15.27,12.9,15.51,12.71,15.7 M14.69,9.91c-0.21,0.35-0.48,0.71-0.89,1.09c-0.32,0.3-0.53,0.56-0.65,0.77 c-0.1,0.19-0.16,0.49-0.16,0.69v0.07C12.98,12.8,12.75,13,12.48,13h-0.85c-0.28,0-0.5-0.22-0.5-0.5v-0.16c0-0.45,0.1-0.84,0.29-1.16 c0.19-0.33,0.52-0.7,1-1.12c0.28-0.25,0.48-0.47,0.61-0.66s0.19-0.4,0.19-0.64c0-0.29-0.11-0.54-0.32-0.74 c-0.22-0.2-0.5-0.3-0.85-0.3c-0.37,0-0.74,0.1-0.96,0.3c-0.12,0.12-0.21,0.23-0.29,0.38c-0.03,0.07-0.08,0.21-0.09,0.26 C10.66,8.83,10.47,9,10.24,9H9.55c-0.26,0-0.47-0.19-0.5-0.45c-0.01-0.08,0-0.16,0.02-0.24c0.18-0.72,0.52-1.16,0.9-1.52 C10.53,6.29,11.25,6,12,6c0.59,0,1.11,0.12,1.57,0.35s0.79,0.55,1.05,0.96C14.87,7.72,15,8.16,15,8.66 C15,9.15,14.89,9.56,14.69,9.91"/></svg>
    </label>
    <div>
        <h1>Land Location Query</h1>
        <div class="JPMOQueryExpandoData">
            <p>
                Just a moment ...
            </p>
        </div>
    </div>
</div>

<div class="JPMOQueryExpando" id="JPMOQueryUIOcean">
    <label for="JPMO-opt-showqueryocean">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="100%" height="100%" fill="none"/><path d="M17 16.99c-1.35 0-2.2.42-2.95.8-.65.33-1.18.6-2.05.6-.9 0-1.4-.25-2.05-.6-.75-.38-1.57-.8-2.95-.8s-2.2.42-2.95.8c-.43.22-.81.41-1.27.52-.45.1-.78.46-.78.91v.1c0 .6.56 1.03 1.14.91.74-.15 1.3-.43 1.81-.69.65-.33 1.17-.6 2.05-.6s1.4.25 2.05.6c.75.38 1.57.8 2.95.8s2.2-.42 2.95-.8c.65-.33 1.18-.6 2.05-.6.9 0 1.4.25 2.05.6.52.26 1.08.55 1.83.7.58.11 1.12-.33 1.12-.91v-.09c0-.46-.34-.82-.79-.92-.46-.1-.83-.29-1.26-.52-.75-.39-1.6-.81-2.95-.81zm0-4.45c-1.35 0-2.2.43-2.95.8-.65.32-1.18.6-2.05.6-.9 0-1.4-.25-2.05-.6-.75-.38-1.57-.8-2.95-.8s-2.2.43-2.95.8c-.43.21-.81.41-1.28.52-.44.1-.77.46-.77.91v.1c0 .59.54 1.03 1.12.91.75-.15 1.31-.44 1.83-.69.65-.35 1.15-.6 2.05-.6s1.4.25 2.05.6c.75.38 1.57.8 2.95.8s2.2-.43 2.95-.8c.65-.35 1.15-.6 2.05-.6s1.4.25 2.05.6c.52.26 1.08.55 1.83.7.58.11 1.12-.33 1.12-.92v-.09c0-.46-.34-.82-.79-.92-.46-.1-.83-.29-1.26-.52-.75-.38-1.6-.8-2.95-.8zm2.95-8.08c-.75-.38-1.58-.8-2.95-.8s-2.2.42-2.95.8c-.65.32-1.18.6-2.05.6-.9 0-1.4-.25-2.05-.6-.75-.37-1.57-.8-2.95-.8s-2.2.42-2.95.8c-.43.22-.81.41-1.27.52-.45.1-.78.46-.78.91v.07c0 .6.54 1.04 1.12.92.75-.15 1.31-.44 1.83-.69.65-.33 1.17-.6 2.05-.6s1.4.25 2.05.6c.75.38 1.57.8 2.95.8s2.2-.43 2.95-.8c.65-.32 1.18-.6 2.05-.6.9 0 1.4.25 2.05.6.52.26 1.08.55 1.83.7.58.11 1.12-.33 1.12-.92v-.09c0-.46-.34-.82-.79-.92-.46-.1-.83-.28-1.26-.5zM17 8.09c-1.35 0-2.2.43-2.95.8-.65.35-1.15.6-2.05.6s-1.4-.25-2.05-.6c-.75-.38-1.57-.8-2.95-.8s-2.2.43-2.95.8c-.43.23-.8.42-1.26.52-.45.1-.79.46-.79.92v.09c0 .59.54 1.03 1.12.91.75-.15 1.31-.44 1.83-.69.65-.32 1.18-.6 2.05-.6s1.4.25 2.05.6c.75.38 1.57.8 2.95.8s2.2-.43 2.95-.8c.65-.32 1.18-.6 2.05-.6.9 0 1.4.25 2.05.6.52.26 1.08.55 1.83.7.58.11 1.12-.33 1.12-.91v-.09c0-.46-.34-.82-.79-.92-.46-.1-.83-.29-1.26-.52-.75-.39-1.6-.81-2.95-.81z"/></svg>
    </label>
    <div>
        <h1>Water Location Query</h1>
        <div class="JPMOQueryExpandoData">
            <p>
                Just a moment ...
            </p>
        </div>
    </div>
</div>

<div class="JPMOQueryExpando" id="JPMOQueryUIWeather">
    <label for="JPMO-opt-showqueryweather">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="100%" height="100%" fill="none"/><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h.71C7.37 7.69 9.48 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3s-1.34 3-3 3z"/></svg>
</label>
    <div>
        <h1>ICAO Weather Query</h1>
        <div class="JPMOQueryExpandoData">
            <p>
                Just a moment ...
            </p>
        </div>
    </div>
</div>

<div class="JPMOQueryExpando" id="JPMOQueryUIWikipedia">
    <label for="JPMO-opt-showquerywikipedia">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="100%" height="100%" fill="none"/><path d="M12 11.55c-1.82-1.7-4.12-2.89-6.68-3.35C4.11 7.99 3 8.95 3 10.18v6.24c0 1.68.72 2.56 1.71 2.69 2.5.32 4.77 1.35 6.63 2.87.35.29.92.32 1.27.04 1.87-1.53 4.16-2.58 6.68-2.9.94-.13 1.71-1.06 1.71-2.02v-6.92c0-1.23-1.11-2.19-2.32-1.98-2.56.46-4.86 1.65-6.68 3.35zM12 8c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"/></svg>
    </label>
    <div>
        <h1>Wikipedia Query</h1>
        <div class="JPMOQueryExpandoData">
            <p>
                Just a moment ...
            </p>
        </div>
    </div>
</div>

`;//end html
        managedDOMEls.queryUI.innerHTML = queryUIHTML;
        document.body.prepend(managedDOMEls.queryUI);

        // options menu
        var optionsHTML = `
<div id="map-options-menuopener">
    <svg id="map-options-menuicon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><rect width="100%" height="100%" /><path d="M4,18h11c0.55,0,1-0.45,1-1v0c0-0.55-0.45-1-1-1H4c-0.55,0-1,0.45-1,1v0C3,17.55,3.45,18,4,18z M4,13h8c0.55,0,1-0.45,1-1v0 c0-0.55-0.45-1-1-1H4c-0.55,0-1,0.45-1,1v0C3,12.55,3.45,13,4,13z M3,7L3,7c0,0.55,0.45,1,1,1h11c0.55,0,1-0.45,1-1v0 c0-0.55-0.45-1-1-1H4C3.45,6,3,6.45,3,7z M20.3,14.88L17.42,12l2.88-2.88c0.39-0.39,0.39-1.02,0-1.41l0,0 c-0.39-0.39-1.02-0.39-1.41,0l-3.59,3.59c-0.39,0.39-0.39,1.02,0,1.41l3.59,3.59c0.39,0.39,1.02,0.39,1.41,0l0,0 C20.68,15.91,20.69,15.27,20.3,14.88z"/></svg>
</div>
<div id="map-options" class="nicescroll">
    <h1>UI Options</h1>

    <span>
        <label for="JPMO-opt-reticlesize">Reticle Size</label>
        <input id="JPMO-opt-reticlesize" type="range" min="26" max="500" value="100" step="2" />
    </span>

    <hr/>

    <span>
        <input checked type="checkbox" name="" id="JPMO-opt-showflightinfo" /><label for="JPMO-opt-showflightinfo">Show Flight Info</label>
    </span>

    <span>
        <label for="JPMO-opt-flightinfobg">Info Background Opacity</label>
        <input id="JPMO-opt-flightinfobg" type="range" min="0" max="255" value="100" step="1" />
    </span>

    <span>
        <label for="JPMO-opt-flightinfodistance">Info Distance</label>
        <input id="JPMO-opt-flightinfodistance" type="range" min="0" max="300" value="30" step="1" />
    </span>

    <hr/>

    <span>
        <input checked type="checkbox" name="" id="JPMO-opt-showheadingdot" /><label for="JPMO-opt-showheadingdot">Show Heading Dot</label>
    </span>

    <hr/>

    <span>
        <input checked type="checkbox" name="" id="JPMO-opt-showzoomer" /><label for="JPMO-opt-showzoomer">Show Map Zoomer</label>
    </span>

    <hr/>

    <span>
        <input checked type="checkbox" name="" id="JPMO-opt-showscale" /><label for="JPMO-opt-showscale">Show Map Scale</label>
    </span>

    <h1>Layer Options</h1>

    <span>
        <input checked type="radio" id="leaflet-layer-osm" name="leaflet-opt-layerchooser" value="OpenStreetMap" /><label for="leaflet-layer-osm">Open Street Map</label>
    </span>

    <span>
        <input type="radio" id="leaflet-layer-watercolour" name="leaflet-opt-layerchooser" value="Watercolour" /><label for="leaflet-layer-watercolour">Watercolour</label>
    </span class="leaflet-layer-radio">

    <span>
        <input type="radio" id="leaflet-layer-tonerl" name="leaflet-opt-layerchooser" value="Toner Lite" /><label for="leaflet-layer-tonerl">Toner Lite</label>
    </span>

    <span>
        <input type="radio" id="leaflet-layer-toner" name="leaflet-opt-layerchooser" value="Toner" /><label for="leaflet-layer-toner">Toner Full</label>
    </span class="leaflet-layer-radio">

    <span>
        <input type="radio" id="leaflet-layer-tonerh" name="leaflet-opt-layerchooser" value="Toner Hybrid" /><label for="leaflet-layer-tonerh">Toner Hybrid</label>
    </span>

    <span>
        <input type="radio" id="leaflet-layer-terrain" name="leaflet-opt-layerchooser" value="Terrain" /><label for="leaflet-layer-terrain">Terrain</label>
    </span>

    <h1>Geonames Query Options</h1>

    <small>
        Sign up for a free account at <a href="https://www.geonames.org/login" target="_blank">geonames.org</a>. <br/>
        On your <a href="https://www.geonames.org/manageaccount" target="_blank">account page</a> enable free web services.
    </small>

    <span>
        <label for="JPMO-opt-geonamesaccount">geonames.org Account Name: </label>
        <input type="text" id="JPMO-opt-geonamesaccount" name="" placeholder="enter account name" />
    </span>

    <span>
        <label for="JPMO-opt-geonamesinterval">Query Interval (seconds): </label><input type="number" id="JPMO-opt-geonamesinterval" name="" value="60" min="60" max="any">
    </span>

    <hr/>

    <span>
        <input checked type="checkbox" name="" id="JPMO-opt-showquerylocation" /><label for="JPMO-opt-showquerylocation">Show Location Query</label>
    </span>

    <span>
        <input checked type="checkbox" name="" id="JPMO-opt-showqueryocean" /><label for="JPMO-opt-showqueryocean">Show Ocean Query</label>
    </span>

    <span>
        <input checked type="checkbox" name="" id="JPMO-opt-showqueryweather" /><label for="JPMO-opt-showqueryweather">Show Weather Query</label>
    </span>

    <span>
        <input checked type="checkbox" name="" id="JPMO-opt-showquerywikipedia" /><label for="JPMO-opt-showquerywikipedia">Show Wikipedia Query</label>
    </span>

    <hr/>

    <span>
        <label for="JPMO-opt-querybg">Query Background Opacity</label>
        <input id="JPMO-opt-querybg" type="range" min="0" max="255" value="100" step="1" />
    </span>





    <h1 class="hide">Camera Options</h1>

    <span class="hide">
        <label for="JPMO-opt-mapzoom">Zoom</label>
        <input id="JPMO-opt-mapzoom" type="range" min="0" max="19" value="0" step="0.01" />
    </span>

    <span class="hide">
        <input checked disabled type="checkbox" name="" id="JPMO-opt-lockcameratoaircraft" /><label for="JPMO-opt-lockcameratoaircraft">Lock Camera to Aircraft</label>
    </span>

</div>
`;//end html
        managedDOMEls.optionsUI.innerHTML = optionsHTML;
        document.body.prepend(managedDOMEls.optionsUI);

        //

        // get existing elements

        managedDOMEls.leafletScale = document.querySelector('.leaflet-control-scale');
        managedDOMEls.leafletZoomer = document.querySelector('.leaflet-control-zoom');

        managedDOMEls.optionsReticleSize = document.getElementById('JPMO-opt-reticlesize');
        managedDOMEls.optionsFlightInfoVisibility = document.getElementById('JPMO-opt-showflightinfo');
        managedDOMEls.optionsFlightInfoDistance = document.getElementById('JPMO-opt-flightinfodistance');
        managedDOMEls.optionsFlightInfoBgOpacity = document.getElementById('JPMO-opt-flightinfobg');
        managedDOMEls.optionsQueryBgOpacity = document.getElementById('JPMO-opt-querybg');
        managedDOMEls.optionsLockCameraToAircraft = document.getElementById('JPMO-opt-lockcameratoaircraft');
        managedDOMEls.optionsShowScale = document.getElementById('JPMO-opt-showscale');
        managedDOMEls.optionsShowZoomer = document.getElementById('JPMO-opt-showzoomer');
        managedDOMEls.optionsZoom = document.getElementById('JPMO-opt-mapzoom');
        managedDOMEls.optionsShowHeadingDot = document.getElementById('JPMO-opt-showheadingdot');

        managedDOMEls.optionsShowQueryLocation = document.getElementById('JPMO-opt-showquerylocation');
        managedDOMEls.optionsShowQueryOcean = document.getElementById('JPMO-opt-showqueryocean');
        managedDOMEls.optionsShowQueryWeather = document.getElementById('JPMO-opt-showqueryweather');
        managedDOMEls.optionsShowQueryWikipedia = document.getElementById('JPMO-opt-showquerywikipedia');

        managedDOMEls.optionsGeonamesAccount = document.getElementById('JPMO-opt-geonamesaccount');
        managedDOMEls.optionsGeonamesInterval = document.getElementById('JPMO-opt-geonamesinterval');

        managedDOMEls.optionsLayerOSM = document.getElementById('leaflet-layer-osm');
        managedDOMEls.optionsLayerWatercolour = document.getElementById('leaflet-layer-watercolour');
        managedDOMEls.optionsLayerToner = document.getElementById('leaflet-layer-toner');
        managedDOMEls.optionsLayerTonerL = document.getElementById('leaflet-layer-tonerl');
        managedDOMEls.optionsLayerTonerH = document.getElementById('leaflet-layer-tonerh');
        managedDOMEls.optionsLayerTerrain = document.getElementById('leaflet-layer-terrain');

        managedDOMEls.queryUILocation = document.getElementById('JPMOQueryUILocation');
        managedDOMEls.queryUIOcean = document.getElementById('JPMOQueryUIOcean');
        managedDOMEls.queryUIWeather = document.getElementById('JPMOQueryUIWeather');
        managedDOMEls.queryUIWikipedia = document.getElementById('JPMOQueryUIWikipedia');

        // we will be positioning the central UI differently in the full app
        managedDOMEls.centralUI.style.top = 0;
        managedDOMEls.centralUI.style.left = 0;

        //

        // dislocation - in the full app we need some elements to be independant of their initial containers

        // dislocate the plane shadow
        managedDOMEls.planeShadowRotater.style.width = managedDOMEls.planeShadowRotater.clientWidth + 'px'; // hardcode the width
        managedDOMEls.planeShadowRotater.style.height = managedDOMEls.planeShadowRotater.clientHeight + 'px'; // hardcode the height
        managedDOMEls.planeShadowRotater.style.zIndex = '9999'; // hardcode the z index
        managedDOMEls.planeShadowRotater.remove(); // remove from DOM
        document.body.prepend(managedDOMEls.planeShadowRotater); // move to the body

        //

        // bind events that are not suitable for the render loop

        managedDOMEls.optionsZoom.oninput = onUpdateLeafletZoom;
        managedDOMEls.optionsLayerOSM.oninput = onUpdateLeafletLayer;
        managedDOMEls.optionsLayerWatercolour.oninput = onUpdateLeafletLayer;
        managedDOMEls.optionsLayerToner.oninput = onUpdateLeafletLayer;
        managedDOMEls.optionsLayerTonerL.oninput = onUpdateLeafletLayer;
        managedDOMEls.optionsLayerTonerH.oninput = onUpdateLeafletLayer;
        managedDOMEls.optionsLayerTerrain.oninput = onUpdateLeafletLayer;
        managedDOMEls.optionsGeonamesAccount.oninput = onUpdateGeonamesAccount;
        managedDOMEls.optionsGeonamesInterval.oninput = onUpdateGeonamesInterval;

        managedDOMEls.optionsShowQueryLocation.addEventListener('input', function () { if (options.showQueryLocation == 'hidden') doGeonamesQueriesFetch('location'); }, false);
        managedDOMEls.optionsShowQueryOcean.addEventListener('input', function () { if (options.showQueryOcean == 'hidden') doGeonamesQueriesFetch('ocean'); }, false);
        managedDOMEls.optionsShowQueryWeather.addEventListener('input', function () { if (options.showQueryWeather == 'hidden') doGeonamesQueriesFetch('weather'); }, false);
        managedDOMEls.optionsShowQueryWikipedia.addEventListener('input', function () { if (options.showQueryWikipedia == 'hidden') doGeonamesQueriesFetch('wikipedia'); }, false);

        managedDOMEls.optionsReticleSize.addEventListener('input', function () { centralUIPositionDirty = true }, false);
    }

    function setupMapProvider() {

        // find map provider

        var href = window.location.href; // the address bar content

        if (href.search(options.host) > -1) { // self hosted
            options.mapInterval = 50; // if you don't understand this please dont edit it - you can be banned from accessing a map provider if you set this wrong
            mapProvider = 'u';
        }
        else if (href.search('openstreetmap.org') > -1) {
            options.mapInterval = 6000; // if you don't understand this please dont edit it - you can be banned from accessing a map provider if you set this wrong
            mapProvider = 'osm';
            mapProviderAdjustTop = 0;
            mapProviderAdjustLeft = 0;
        }
        else if (href.search('skyvector.com') > -1) {
            // I cannot find sky vector usage terms, but their basic positioning API is open on their public site
            // YOU ARE ENTIRELY RESPONSIBLE FOR ANY USAGE
            options.mapInterval = 6000; // if you don't understand this please dont edit it - you can be banned from accessing a map provider if you set this wrong
            mapProvider = 'sv';
            mapProviderAdjustTop = 20;
            mapProviderAdjustLeft = 0;
        }
    }

    function setupFullLeafletMap() {

        // REQUIRES leaflet.js
        // REQUIRES modified stamen maps js (see map page)

        leaflet.map = L.map('map', {
            center: [52.403331, -1.5385686],
            scrollWheelZoom: 'center', // vital to get rid of zoom shifting
            zoomControl: false,
            easeLinearity: 1,
            zoomSnap: 0.01,
        });

        // base map
        var osm = L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            center: [51.505, -0.09],
            maxZoom: 19,
            attribution: '&copy; <a href="//openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        }).addTo(leaflet.map);

        // http://maps.stamen.com/
        var toner = new L.StamenTileLayer("toner");
        var tonerH = new L.StamenTileLayer("toner-hybrid");
        var tonerL = new L.StamenTileLayer("toner-lite");
        var watercolour = new L.StamenTileLayer("watercolor");
        var terrain = new L.StamenTileLayer("terrain");

        leaflet.layers = {
            "OpenStreetMap": osm,
            "Toner": toner,
            "Toner Hybrid": tonerH,
            "Toner Lite": tonerL,
            "Watercolour": watercolour,
            "Terrain": terrain,
        };

        leaflet.overlays = {
            //"Overlay": something,
        };

        //L.control.layers(layers, overlays).addTo(map);
        L.control.zoom({ position: 'topright' }).addTo(leaflet.map);
        L.control.scale({ position: 'bottomright' }).addTo(leaflet.map);

        // get event states
        leaflet.map.on('zoomstart', function (e) {
            zooming = true;
        });

        leaflet.map.on('zoomend', function (e) {
            zooming = false;
        });

        leaflet.map.on('movestart', function (e) {
            moving = true;
        });

        leaflet.map.on('moveend', function (e) {
            moving = false;
        });

        leaflet.map.on('zoomanim', function (e) {
            centralUIPositionDirty = true;
        });

        // EXAMPLES:

        //var marker = L.marker({ lon: simConnectData.longitude, lat: simConnectData.latitude }).bindPopup('Plane Location').addTo(map);


        //var circle = L.circle([51.508, -0.11], {
        //    color: 'red',
        //    fillColor: '#f03',
        //    fillOpacity: 0.5,
        //    radius: 500
        //}).addTo(map);

        //var polygon = L.polygon([
        //    [51.509, -0.08],
        //    [51.503, -0.06],
        //    [51.51, -0.047]
        //]).addTo(map);

        //marker.bindPopup("<b>Hello world!</b><br>I am a popup.").openPopup();
        //circle.bindPopup("I am a circle.");
        //polygon.bindPopup("I am a polygon.");

        //var popup = L.popup();

        //function onMapClick(e) {
        //    popup
        //        .setLatLng(e.latlng)
        //        .setContent("You clicked the map at " + e.latlng.toString())
        //        .openOn(map);
        //}

        //map.on('click', onMapClick);
    }

    function setupFullOptions() {
        var storedOptions = localStorage.getItem('JPMO-options');
        if (storedOptions) {
            options = JSON.parse(storedOptions);

            managedDOMEls.optionsLockCameraToAircraft.checked = options.lockCameraToAircraft;

            managedDOMEls.optionsReticleSize.value = options.reticleSizeSq;
            managedDOMEls.optionsFlightInfoDistance.value = options.flightInfoDistance;
            managedDOMEls.optionsFlightInfoBgOpacity.value = options.fightInfoBgOpacity;
            managedDOMEls.optionsQueryBgOpacity.value = options.queryBgOpacity;
            managedDOMEls.optionsZoom.value = options.mapZoom;
            managedDOMEls.optionsGeonamesAccount.value = options.geonamesOrgAccount;

            managedDOMEls.optionsShowScale.checked = (options.showMapScale == 'visible') ? true : false;
            managedDOMEls.optionsShowZoomer.checked = (options.showMapZoomer == 'visible') ? true : false;
            managedDOMEls.optionsShowHeadingDot.checked = (options.showHeadingDot == 'visible') ? true : false;
            managedDOMEls.optionsFlightInfoVisibility.checked = (options.flightInfoVisibility == 'visible') ? true : false;
            managedDOMEls.optionsShowQueryLocation.checked = (options.showQueryLocation == 'visible') ? true : false;
            managedDOMEls.optionsShowQueryOcean.checked = (options.showQueryOcean == 'visible') ? true : false;
            managedDOMEls.optionsShowQueryWeather.checked = (options.showQueryWeather == 'visible') ? true : false;
            managedDOMEls.optionsShowQueryWikipedia.checked = (options.showQueryWikipedia == 'visible') ? true : false;

            document.querySelector('input[name=leaflet-opt-layerchooser]:checked').checked = false;
            document.querySelector(`input[value=${options.layerProvider}]`).checked = true;
        }
    }

    function setupFull() {
        setupFullLeafletMap();
        setupFullDOM();
        setupFullOptions();

        onUpdateLeafletLayer();
        onUpdateLeafletZoom();

        doGeonamesQueries = setInterval(doGeonamesQueriesFetch, options.geonamesOrgInterval * 1000);

        window.onresize = function () {
            centralUIPositionDirty = true;
        };
    }

    //

    function run() {

        apiURI = `//${options.host}:4380/aircraft/${((options.demoMode) ? 'dummy' : 'user')}`; // constructs the address of the API

        setupMapProvider();

        setupCoreDOM();

        if (mapProvider == 'u') setupFull(); // self hosting so load the full app

        doSimConnectApiFetch();
        doSyncMapUnderlay();

        doMapUnderlaySyncLoop = setInterval(doSyncMapUnderlay, options.mapInterval);
        doSimConnectApiGetLoop = setInterval(doSimConnectApiFetch, options.apiInterval);

        console.log("Starting JPMO");
    }

    if (options.autoRun) run();

    //

    window.onbeforeunload = function () {

        // adjust unmanaged options (things that we change and track but aren't the authority on, like zoom state)
        options.mapZoom = leaflet.map.getZoom();

        // store app options
        localStorage.setItem('JPMO-options', JSON.stringify(options));

        // store this journey
        if (!options.demoMode) {
            var now = new Date();
            thisJourneyData.ended = `${now.toDateString()}-${now.toTimeString()}`;
            localStorage.setItem(`${thisJourneyData.started}-TO-${thisJourneyData.ended}`, JSON.stringify(thisJourneyData));
        }
    }

    //

    return {
        getOptions: function () { return options; },
        provider: function () { return mapProvider; },
        host: function (set) { return (arguments.length ? options.host = set : options.host); },
        demo: function (set) { return (arguments.length ? options.demoMode = set : options.demoMode); },
        data: function () { return simConnectData; },
        run: run
    };

})();