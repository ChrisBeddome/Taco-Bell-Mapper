//Stores user-inputted and calculated data
var appData = {
	userWeight: null,
	userLocation: null,
	totalCals: null,
	distanceRequired: null
};

//Methods for rendering pages
//Also contains validation 
var pageManager = {
	container: document.getElementById("mainContainer"),

	clearContainer: function () {
		while (pageManager.container.children.length > 0) {
			pageManager.container.removeChild(pageManager.container.firstChild);
		}
	},

	renderHeader: function () {
		var header = document.createElement("header");
		var img = document.createElement("img");
		img.src = "imgs/tacoBell.png";
		img.alt = "taco bell logo";
		header.appendChild(img);
		document.getElementById("headerContainer").appendChild(header);
	},

	renderPage1: function () {
		var div = document.createElement("div");
		div.id = "startContainer";

		var h1 = document.createElement("h1");
		h1.textContent = "Welcome!";

		var p = document.createElement("p");
		p.textContent = "You will be asked a few questions regarding your physical condition as well as the contents of your anticipated Taco Bell meal. Use this application to determine which Taco Bell you must walk to in order to ensure that the caloric content of your meal is nullified.";

		var button = document.createElement("button");
		button.textContent = "BEGIN";
		button.addEventListener("click", pageManager.renderPage2, false);

		div.appendChild(h1);
		div.appendChild(p);
		div.appendChild(button);
		pageManager.container.appendChild(div);
	},

	renderPage2: function () {

		pageManager.clearContainer();

		var div = document.createElement("div");
		div.id = "infoContainer";

		var label = document.createElement("label");
		var p = document.createElement("p");
		p.textContent = "How much do you weigh? (lbs)";
		label.appendChild(p);

		var input = document.createElement("input");
		input.id = "weightInput";
		input.type = "text";

		var button = document.createElement("button");
		button.textContent = "NEXT";
		button.addEventListener("click", pageManager.renderPage3, false);

		div.appendChild(label);
		div.appendChild(input);
		div.appendChild(button);
		pageManager.container.appendChild(div);

		input.focus();
	},


	renderPage3: function () {

		//make sure user has entered valid weight before loading page 3
		var weight = parseInt(document.getElementById("weightInput").value);
		if (isNaN(weight) || weight < 1) {
			alert("please enter valid weight");
			document.getElementById("weightInput").value = "";
			document.getElementById("weightInput").focus();
		} else {
			appData.userWeight = weight;

			pageManager.clearContainer();

			var div = document.createElement("div");
			div.id = "foodContainer";

			var h1 = document.createElement("h1");
			h1.textContent = "What would you like to eat?";

			var menuItemsDiv = document.createElement("div");
			menuItemsDiv.id = "menuItems";

			var button = document.createElement("button");
			button.textContent = "NEXT";
			button.addEventListener("click", pageManager.renderPage4, false);

			div.appendChild(h1);
			div.appendChild(menuItemsDiv);
			div.appendChild(button);
			pageManager.container.appendChild(div);
			menuItems.renderAll();
		}
	},

	renderPage4: function () {
		//make sure user has selected at least one item
		//we do this by checking if the SUM of all menuItems qty properties is above 0
		if (
			Object.values(menuItems)
				.map(x => x instanceof MenuItem ? x.qty : 0)
				.reduce((x, y) => x + y) < 1) {
			alert("Must select at least one item");
		} else {
			pageManager.clearContainer();

			appData.totalCals = calculateCalories();
			appData.distanceRequired = calculateDistance(appData.totalCals, appData.userWeight);

			var div = document.createElement("div");
			div.id = "resultsContainer";

			var map = document.createElement("div");
			map.id = "map";

			var textData = document.createElement("div");
			textData.id = "textData";

			div.appendChild(map);
			div.appendChild(textData);

			pageManager.container.appendChild(div);

			//Once page 4 loads, we request the users location. 
			//Once user location is gathered, a chain of events begins which loads the map and markers, beginning with initMap()
			getUserLocation();
		}
	}
};

//MenuItem instances are created on page load
function MenuItem(calories, img) {
	this.qty = 0;
	this.calories = calories;
	this.img = img;

	this.incrementQty = function () {
		this.qty++;
	};

	//renders the menuItem into the div on page 3
	this.render = function () {
		var that = this;

		var div = document.createElement("div");
		div.classList.add("menuItem");
		div.addEventListener("click", function () {
			that.click(this)
		}, false);

		var img = document.createElement("img");
		img.src = this.img;

		var qtyDisplay = document.createElement("div");
		qtyDisplay.classList.add("qty");

		div.appendChild(img);
		div.appendChild(qtyDisplay);
		document.getElementById("menuItems").appendChild(div);
	};

	//event handler to clicking a menu item
	//increments the qty property and updates dom to reflect new value
	this.click = function (div) {
		this.incrementQty();

		var qtyDisplay = div.getElementsByClassName("qty")[0];
		var img = div.getElementsByTagName("img")[0];

		if (img.style.opacity != 0.3) {
			img.style.opacity = 0.3;
		}

		qtyDisplay.textContent = this.qty;
	};
}

//holds all MenuItem objects
var menuItems = {};

//renders all MenuItem instances within the menuItems container object
menuItems.renderAll = function () {

	for (var property in this) {
		if (this.hasOwnProperty(property) && this[property] instanceof MenuItem) {
			this[property].render();
		}
	}
};

//loop through all MenuItems and determine the total caloric content of meal
function calculateCalories() {
	var totalCals = 0;

	for (var property in menuItems) {
		if (menuItems[property] instanceof MenuItem) {
			totalCals += menuItems[property].qty * menuItems[property].calories;
		}
	}

	return totalCals;
}

//determine required taco bell distance
function calculateDistance(calories, weight) {
	// multiply by 1.60934 to convert from miles to meters
	// divide by two because we assume user will walk both to and from taco bell
	return ((calories / (weight * 0.5)) * 1609.34) / 2;
}

//**********************************************MAP STUFFS*****************************************************

//stores information about nearby taco bell restaraunts
var tacoBells = {

	//stores individual locations
	restaurants: [],
	//stores the calculated "correct" restaraunt
	correctRestaurant: null,

	//used to keep track of the number of distance queries completed from the "getDistances" method
	//once distance is found for all restaurants, callback can be called.
	distancesFound: 0,

	findRestaurants: function (outerCallback) {

		var request = {
			location: appData.userLocation,
			radius: '50000',
			query: ['taco bell']
		};

		var service = new google.maps.places.PlacesService(document.createElement("div"));

		service.textSearch(request, callback);

		var that = this;

		//store results in this objects restaurants property
		function callback(results, status) {
			if (status === google.maps.places.PlacesServiceStatus.OK) {
				for (var i = 0; i < results.length; i++) {
					that.restaurants.push(results[i]);
				}
			}
			//outerCallback defined in initMap()
			outerCallback();
		}
	},

	//this method gets the distance between the user location and each taco bell found
	//adds distance as a property of the restaurant within this.restaurants array
	getDistances: function (outerCallback) {
		var distanceService = new google.maps.DistanceMatrixService();

		for (var i = 0; i < this.restaurants.length; i++) {

			let pos = i;

			distanceService.getDistanceMatrix({
				origins: [appData.userLocation],
				destinations: [{
					lat: this.restaurants[pos].geometry.location.lat(),
					lng: this.restaurants[pos].geometry.location.lng()
				}],
				travelMode: 'WALKING',
			}, callback);

			function callback(response, status) {
				tacoBells.restaurants[pos].distance = response.rows[0].elements[0].distance.value;
				tacoBells.distancesFound++;
				if (tacoBells.distancesFound === tacoBells.restaurants.length) {
					//outerCallback defined in initMap()
					outerCallback();
				}
			}
		}
	},
};

function getUserLocation() {
	navigator.geolocation.getCurrentPosition(initMap);
}

function findCorrectRestaurant(callback) {
	//sort taco bells by distance
	function compare(a, b) {
		if (a.distance < b.distance)
			return -1;
		if (a.distance > b.distance)
			return 1;
		return 0;
	}

	tacoBells.restaurants = tacoBells.restaurants.sort(compare);

	//loop through all the taco bell restaurants (sorted by distance)
	//when distance of location meets distanceRequired, set as correctRestaurant
	for (var i = 0; i < tacoBells.restaurants.length; i++) {
		if (tacoBells.restaurants[i].distance < appData.distanceRequired) {
			continue;
		} else {
			tacoBells.correctRestaurant = tacoBells.restaurants[i];
			break;
		}
	}
	
	if (tacoBells.correctRestaurant) {
		callback();
	} else {
		alert("No results found within search radius, try entering a smaller number of food items");
	}

}

function initMap(location) {

	appData.userLocation = {
		lat: location.coords.latitude,
		lng: location.coords.longitude
	}

	//initialize a chain of function calls
	//all functions in chain are asynchronous, which is why nested callbacks are needed
	tacoBells.findRestaurants(
		function () {
			tacoBells.getDistances(function () {
				findCorrectRestaurant(callback);
			});
		});

	function callback() {
		var map = new google.maps.Map(document.getElementById('map'), {
			zoom: 13,
			center: appData.userLocation
		});

		var userMarker = new google.maps.Marker({
			position: appData.userLocation,
			map: map,
			icon: 'imgs/location.png'
		});

		var restaurantMarker = new google.maps.Marker({
			position: tacoBells.correctRestaurant.geometry.location,
			map: map
		});

		var bounds = new google.maps.LatLngBounds();
		bounds.extend(userMarker.getPosition());
		bounds.extend(restaurantMarker.getPosition());
		map.fitBounds(bounds);

		loadTextData();
	}
}

function loadTextData() {
	var div = document.getElementById("textData");
	var p = document.createElement("p");
	var p2 = document.createElement("p");
	p.textContent = "The closest Taco Bell that will ensure the entirety of your " + appData.totalCals + " calorie meal is burned off is located at " + tacoBells.correctRestaurant.formatted_address + ".";
	p2.textContent = "Remember that you must walk to the restaurant and back to your starting position in order to ensure a caloric defecit.";

	div.appendChild(p);
	div.appendChild(p2);
}

pageManager.renderHeader();
pageManager.renderPage1();
menuItems.beefBurrito = new MenuItem(308, "imgs/beefBurrito.jpg");
menuItems.beanBurrito = new MenuItem(378, "imgs/beanBurrito.jpg");
menuItems.quesadilla = new MenuItem(458, "imgs/quesadilla.jpg");
menuItems.taco = new MenuItem(166, "imgs/taco.jpg");
menuItems.nachos = new MenuItem(360, "imgs/nachos.jpg");
menuItems.crunchWrap = new MenuItem(530, "imgs/crunchWrap.jpg");
