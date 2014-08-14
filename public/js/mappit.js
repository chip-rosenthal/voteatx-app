$(document).ready(function() {

	function mappViewModel() {
		// Configuration
		var DEBUG = true;
		var MAP_ID = 'map_canvas';
		var FALLBACK_LAT = 30.2649;
		var FALLBACK_LNG = -97.7470;
		/* This is the path to the JSON file with data for the election day polling stations
		 * Expected keys: Precinct, Combined Pcts., Name, Address, City, Zip Code, Start Time, End Time, Latitude, Longitude
		 */
		var MAIN_LAYER = "json/ps.json";

		$("#map-canvas").css("height", $(window).height() - $("#messages").height() - $("#controls").height() - 20);
		var blue = [{
			featureType : "all",
			stylers : [{
				saturation : 60
			}, {
				lightness : 20
			}, {
				hue : '#0000BB'
			}]
		}];

		/*
		 *  View Model Data
		 */
		var self = this;

		self.map = null;
		self.marker = null;

		self.chosenLayer = ko.observable();

		self.markers = ko.observableArray();

		self.transitMode = ko.observable("DRIVING");

		self.myLoc = null;
		self.psID = ko.observable("");
		self.endDirections = null;

		self.preMap = [];

		var directionsDisplay;
		var directionsService = new google.maps.DirectionsService();

		/*
		*  View Model Methods
		*/
		// Convert Precinct ID to Address and populate sidebar with Directions
		// TODO: Deal with "Combined Precincts"
		mappViewModel.prototype.getDirections = function() {
			var address = null;
			if (DEBUG)
				console.log("psID: " + self.psID());

			var i = null;
			for ( i = 0; i < self.preMap.length; i++) {
				if (self.preMap[i].precinct.toString() == self.psID().toString()) {
					address = self.preMap[i].address;
					self.psID(address);
					if (DEBUG) {
						console.log("Address: " + address);
						console.log("My Location: " + self.myLoc);
					};
				} // TODO: Add Bootstrap Alert about Precinct not found
			}// TODO: Proper form validation
			if (self.transitMode() !== null | "UFO") {
				var request = {
					origin : self.myLoc,
					destination : address,
					travelMode : self.transitMode()
				};
				directionsService.route(request, function(response, status) {
					if (status == google.maps.DirectionsStatus.OK) {
						directionsDisplay.setDirections(response);
					}
				});
			}

		};

		// Transit Mode UFlOlz
		mappViewModel.prototype.modeUFO = function() {

		};

		// Geolocation Removed

		// Google Maps Methods
		function initialize() {
			var mapOptions = {
				zoom : 13,
				center : new google.maps.LatLng(FALLBACK_LAT, FALLBACK_LNG),
				styles : blue
			};

			self.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
			directionsDisplay = new google.maps.DirectionsRenderer();
			directionsDisplay.setMap(self.map);

			self.marker = new google.maps.Marker({
				position : self.map.getCenter(),
				map : self.map,
				draggable : false
			});

			constructLayers();
			initControls();
		};
		// Listener for initialize
		google.maps.event.addDomListener(window, 'load', initialize);

		// Pans Map and positions YAH Marker
		/* Overloaded to accept LatLng or (Lat, Lng) */
		function setPosition(latlng, lng) {
			var loc;

			if ( typeof lng !== "undefined") {
				loc = new google.maps.LatLng(latlng, lng);
			} else {
				loc = latlng;
			}
			if (DEBUG)
				console.log(loc);
			if (self.map) {
				self.map.panTo(loc);
				self.marker.setPosition(loc);
			} else {
				console.log("Map not found! Check MAP_ID configuration.");
			};
		};

		// Build Map Layers
		function constructLayers() {

			// Construct the Main Layer (Election Day) array
			var mainLayer = [];
			$.getJSON(MAIN_LAYER, function(data) {
				if (DEBUG)
					console.log(data);
				// Iterate through the array of JSON objects and push them to the layer
				$.each(data, function(index, val) {
					var mLatLng = new google.maps.LatLng(val.Latitude, val.Longitude);
					var icon = new google.maps.MarkerImage("mapicons/icon_vote.png");
					var marker = new google.maps.Marker({
						position : mLatLng,
						map : self.map,
						icon : icon, //new google.maps.MarkerImage('icons/vote.svg', null, null, null, new google.maps.Size(36, 36)),
						draggable : false,
					});

					// Construct the Info Window
					var regex = new RegExp(":", "g");
					var contentString = '<div id="content">' + '<div id="siteNotice">' + '</div>' + '<h2 id="firstHeading" class="firstHeading">Precincts: ' + val.Precinct + ' ' + val.Combined_Pcts.replace(regex, " ") + '</h1>' + '<div id="bodyContent">' + '<p><b>Name:</b> ' + val.Name + '<br>' + '<b>Address:</b> ' + val.Address + '<br>' + '<b>Hours:</b> ' + val.Start_Time + ' - ' + val.End_Time + '<br>' + '</p></div>' + '</div>';

					var infowindow = new google.maps.InfoWindow({
						content : contentString
					});

					// Bind the Info Window to the Marker
					google.maps.event.addListener(marker, 'click', function() {
						infowindow.open(self.map, marker);
					});

					// Push the Marker to the Layer
					mainLayer.push(marker);

					var mapping = {
						precinct : val.Precinct,
						address : val.Address,
						zip : val.Zip_Code
					};
					self.preMap.push(mapping);
				});
			});
			if (DEBUG) {
				console.log(mainLayer);
			};
		};

		/*
		 *  App Controls
		 */
		function initControls() {
			// Bounds for AutoComplete
			var defaultBounds = new google.maps.LatLngBounds(new google.maps.LatLng(30.2, -97.9), new google.maps.LatLng(30.5, -97.5));
			var opts = {
				bounds : defaultBounds,
				rankBy : google.maps.places.RankBy.DISTANCE,
				componentRestrictions : {
					country : 'us'
				}
			};

			// AutoComplete for Starting Location (You Are Here)
			var input = document.getElementById('startLoc');
			var autocomplete = new google.maps.places.Autocomplete(input, opts);
			// Listener to respond to AutoComplete
			google.maps.event.addListener(autocomplete, 'place_changed', function() {
				var place = autocomplete.getPlace();
				setPosition(place.geometry.location);
				self.myLoc = place.formatted_address;
			});
		};

		// KOut+BStrap Integration
		ko.bindingHandlers.radio = {
			init : function(element, valueAccessor, allBindings, data, context) {
				var $buttons, $element, observable;
				observable = valueAccessor();
				if (!ko.isWriteableObservable(observable)) {
					throw "You must pass an observable or writeable computed";
				}
				$element = $(element);
				if ($element.hasClass("btn")) {
					$buttons = $element;
				} else {
					$buttons = $(".btn", $element);
				}
				elementBindings = allBindings();
				$buttons.each(function() {
					var $btn, btn, radioValue;
					btn = this;
					$btn = $(btn);
					radioValue = elementBindings.radioValue || $btn.attr("data-value") || $btn.attr("value") || $btn.text();
					$btn.on("click", function() {
						observable(ko.utils.unwrapObservable(radioValue));
					});
					return ko.computed({
						disposeWhenNodeIsRemoved : btn,
						read : function() {
							$btn.toggleClass("active", observable() === ko.utils.unwrapObservable(radioValue));
						}
					});
				});
			}
		};

		ko.bindingHandlers.checkbox = {
			init : function(element, valueAccessor, allBindings, data, context) {
				var $element, observable;
				observable = valueAccessor();
				if (!ko.isWriteableObservable(observable)) {
					throw "You must pass an observable or writeable computed";
				}
				$element = $(element);
				$element.on("click", function() {
					observable(!observable());
				});
				ko.computed({
					disposeWhenNodeIsRemoved : element,
					read : function() {
						$element.toggleClass("active", observable());
					}
				});
			}
		};
	};

	ko.applyBindings(new mappViewModel());
});
