var express = require('express');
var router = express.Router();
var request = require('request');
var winston = require('winston');
var properties = require ("properties");
var async = require ("async");
var fs = require('fs');
var lineReader = require('line-reader');
var HashMap = require('HashMap');
var url = require('url');

var zip2destinations;

var city2Zip = new HashMap()
city2Zip.set('Las Vegas NV', '36.1699412,-115.1398296')
city2Zip.set('Denver CO', '39.7392358,-104.990251')
city2Zip.set('Rock Springs WY', '41.5874644,-109.2029043')
city2Zip.set('Page AZ', '36.9147222,-111.4558333')
city2Zip.set('Park City UT', '40.6460622,-111.4979729')
city2Zip.set('Monterey CA', '36.6002378,-121.8946761')
city2Zip.set('Los Angeles CA', '34.0522342,-118.2436849')
city2Zip.set('Carmel CA', '36.5552386,-121.9232879')
city2Zip.set('Sonoma CA', '38.291859,-122.4580356')
city2Zip.set('Honolulu HI', '21.3069444,-157.8583333')
city2Zip.set('Orlando FL', '28.5383355,-81.3792365')
city2Zip.set('Miami FL', '25.7616798,-80.1917902')
city2Zip.set('San Francisco CA', '37.7749295,-122.4194155')
city2Zip.set('Chicago IL', '41.8781136,-87.6297982')
city2Zip.set('Fort Myers FL', '26.640628,-81.8723084')



router.get('/recommend', function(req, res) {

    var url_parts = url.parse(req.url, true);
    var email = url_parts.query.email;


    var emailInput = req.body.email;
    var zip2destinationsFileName = 'routes/zip2destinations.txt'
    var jsonObj = {}

    if (!zip2destinations) {
        zip2destinations = new HashMap();
        lineReader.eachLine(zip2destinationsFileName, function(line, last) {
            console.log(line);
            var strSplit = line.split("=")
            winston.info(strSplit)
            zip2destinations.set(strSplit[0], strSplit[1])
              // do whatever you want with line...
            if(last){
                // or check if it's the last one
                console.log('Done parsing file')
                
                var listOfDestsStr = zip2destinations.get(email)
                var recommendedDestinationsArray = listOfDestsStr.split("|")
                
                jsonObj = {'email':email, 'destinations': recommendedDestinationsArray}

                res.send(jsonObj)
            }
        });
    }
    else {
        
        var listOfDestsStr = zip2destinations.get(email)
        var recommendedDestinationsArray = listOfDestsStr.split("|")
        
        jsonObj = {'email':email, 'destinations': recommendedDestinationsArray}

        res.send(jsonObj)

    }

});


router.get('/inspire_file', function(req, res) {

    var url_parts = url.parse(req.url, true);
    var destination = url_parts.query.destination;

    var inspireFileName = destination.trim().toLowerCase()
    winston.log(inspireFileName)
    var pathToFile = 'routes/' + inspireFileName + '.txt'
    //var pathToFile = 'routes/sanfranciscoca.txt'

    var jsonObj = {}
    var thingsToDoArray = []

    lineReader.eachLine(pathToFile, function(line, last) {
        console.log(line);
        var strSplit = line.split("|")
        winston.info(strSplit)
        var currentThingToDo = {'name' : strSplit[0], 'url': strSplit[1]}
        thingsToDoArray.push(currentThingToDo)
          // do whatever you want with line...
        if(last){
            // or check if it's the last one
            console.log('Done parsing file')
            jsonObj = {'things-to-do' : thingsToDoArray}
            

            res.send(jsonObj)
        }
    });


});

router.get('/hotrate', function(req, res) {

    async.series([
        function(callback){
            // do some stuff ...
            destinationInput = getDestination(req)
            callback(null, destinationInput);
        },
        function(callback){
            // do some more stuff ...
            var url_parts = url.parse(req.url, true);
            var destinationInput = url_parts.query.destination;
            //destinationInput = 'San Francisco, CA'
            winston.info('Getting hotrate for destination ' + destinationInput)
            winston.info('About to call Hotwire api')

            // ===========================
            var HW_URI_PREFIX = 'http://api.hotwire.com/v1/deal/hotel?dest='
            var HW_URI_SUFFIX = '&apikey=k7z7vx6m2p7kd85wsgb2nb5e&limit=1&format=json'
            var HW_URI = HW_URI_PREFIX + destinationInput + HW_URI_SUFFIX


            // Call HW API to get best deal
            request({
                    uri: HW_URI,
                    method: 'GET',
                }, function (error, response) {

                  if (error) {
                    winston.error('===== Error While Getting Data from Hotwire====');
                    callback(null);
                  } 
                  else {
                    
                    var hw_response = JSON.parse(response.body);
                    winston.info('======= Got Results from HW ======== ');
                    winston.log(hw_response)
                    var deal = hw_response.Result.HotelDeal                

                   var json = {'star' : deal.StarRating, 'price': deal.Price}

                    callback(null, json);
                  }
                });
            // ===========================
            
        }
    ],
    // optional callback
    function(err, results){
        res.send(results[1])
    });


});

router.get('/retailrate', function(req, res) {

    async.series([
        function(callback){
            // do some stuff ...
            destinationInput = getDestination(req)
            callback(null, destinationInput);
        },
        function(callback){
            // do some more stuff ...
            var url_parts = url.parse(req.url, true);
            var destinationInput = url_parts.query.destination;
            var starRatingToCompare = url_parts.query.star;

            winston.info('Getting retail for destination ' + destinationInput)
            winston.info('About to call Expedia api')

            // ===========================
            var latLong = city2Zip.get(destinationInput)
            var EXP_URI_PREFIX = 'http://terminal2.expedia.com/x/hotels?location='
            var EXP_URI_SUFFIX = '&radius=5km&dates=2015-07-29,2015-07-30&apikey=kGtQ8xXnzBa9PkRqiWmXguClhRZnmMYY'
            var EXP_URI = EXP_URI_PREFIX + latLong + EXP_URI_SUFFIX
            winston.info("Expedia URL = ", EXP_URI)


            // Call HW API to get best deal
            request({
                    uri: EXP_URI,
                    method: 'GET',
                }, function (error, response) {

                  if (error) {
                    winston.error('===== Error While Getting Data from Expedia====');
                    callback(null);
                  } 
                  else {
                    
                    var exp_response = JSON.parse(response.body);
                    winston.info('======= Got Results from Expedia ======== ');
                    winston.log(exp_response)
                    var hotels = exp_response.HotelInfoList.HotelInfo
                    winston.info('No. of hotels from Expedia =', hotels.length)

                    var mostExpensive = 0;
                    var mostExpensiveHotelName

                    for (var i = 0; i < hotels.length; i++) {
                        var starRating = hotels[i].StarRating
                        winston.info('Expedia hotel star=', starRating)
                        if (starRating == starRatingToCompare) {
                            winston.info('Found a', starRatingToCompare, ' star hotel')
                            if (hotels[i].Price && (hotels[i].Price.TotalRate.Value > mostExpensive)) {
                                mostExpensive = hotels[i].Price.TotalRate.Value
                                mostExpensiveHotelName = hotels[i].Name
                                winston.info('Found a more expensive hotel =', mostExpensive, 'id=', hotels[i].HotelID)

                            }
                        }
                    }

                    if (mostExpensive == 0) {
                        var json = {'star' : hotels[0].StarRating, 'price': hotels[0].Price.TotalRate.Value, 'hotelName': hotels[0].Name}
                    }
                    else {
                        var json = {'star' : starRatingToCompare, 'price': mostExpensive, 'hotelName': mostExpensiveHotelName}
                    }


                    callback(null, json);
                  }
                });
            // ===========================
            
        }
    ],
    // optional callback
    function(err, results){
        res.send(results[1])
    });


});


router.get('/inspire', function(req, res) {

    var venueId2Name = new HashMap();
    var venueId2Url = new HashMap();

    async.series([
        function(callback){
            var url_parts = url.parse(req.url, true);
            var destinationInput = url_parts.query.destination;
            winston.info('Getting inspiration for destination ' + destinationInput)
            winston.info('About to call Foursquare api')

            // ===========================
            var FOURSQUARE_URI_PREFIX = 'https://api.foursquare.com/v2/venues/explore?near='
            var FOURSQUARE_URI_SUFFIX = '&oauth_token=K4CYK3B1Z4O0LXD0BYMX2S4YE0ZPACNYMGKWQCELDRE0KQVM&v=20150715'
            var FOURSQUARE_URI = FOURSQUARE_URI_PREFIX + destinationInput + FOURSQUARE_URI_SUFFIX 

            // Call Foursquare API to get things to do
            request(FOURSQUARE_URI, function (error, response, venueResponse) {

                if (error) {
                    winston.error('===== Error While Getting Data from Foursquare====');
                    return;
                } 

                var foursquare_response = JSON.parse(response.body);
                winston.info('======= Got Results from Foursquare ======== ');

                var items = foursquare_response.response.groups[0].items                  

                // Get top 5 venues
                for(var i = 0; i < items.length && i < 5; i++) {
                    venueId2Name.set(items[i].venue.id, items[i].venue.name)
                    console.log("COPY THIS:", items[i].venue.name)
                }

                callback(null, venueId2Name.values())
            });
        },
        function(callback) {

            var FOURSQUARE_URI_IMAGE_PREFIX = 'https://api.foursquare.com/v2/venues/'
            var FOURSQUARE_URI_IMAGE_SUFFIX = '/photos?oauth_token=K4CYK3B1Z4O0LXD0BYMX2S4YE0ZPACNYMGKWQCELDRE0KQVM&v=20150715'
            var venueIdKeys = venueId2Name.keys()


            var FOURSQUARE_IMAGE_URI = FOURSQUARE_URI_IMAGE_PREFIX + venueIdKeys[0] + FOURSQUARE_URI_IMAGE_SUFFIX

            // Call Foursquare API to get things to do
            request(FOURSQUARE_IMAGE_URI, function (error, response) {

                if (error) {
                    winston.error('===== Error While Getting Photo Data from Foursquare====');
                    return;
                } 

                var foursquare_photo_response = JSON.parse(response.body);
                winston.info('======= Got Photo Results from Foursquare ======== ');

                var items = foursquare_photo_response.response.photos.items                  

                // Get top venue photos
                for(var j = 0; j < items.length && j < 1; j++) {
                    var imageUrl = items[j].prefix + items[j].width + 'x' + items[j].height + items[j].suffix
                    winston.info("COPY THIS", imageUrl)
                    venueId2Url.set(venueIdKeys[0], imageUrl)
                }
                callback(null, venueId2Url.values())
            });
        },
        function(callback) {

            var FOURSQUARE_URI_IMAGE_PREFIX = 'https://api.foursquare.com/v2/venues/'
            var FOURSQUARE_URI_IMAGE_SUFFIX = '/photos?oauth_token=K4CYK3B1Z4O0LXD0BYMX2S4YE0ZPACNYMGKWQCELDRE0KQVM&v=20150715'
            var venueIdKeys = venueId2Name.keys()


            var FOURSQUARE_IMAGE_URI = FOURSQUARE_URI_IMAGE_PREFIX + venueIdKeys[1] + FOURSQUARE_URI_IMAGE_SUFFIX

            // Call Foursquare API to get things to do
            request(FOURSQUARE_IMAGE_URI, function (error, response) {

                if (error) {
                    winston.error('===== Error While Getting Photo Data from Foursquare====');
                    return;
                } 

                var foursquare_photo_response = JSON.parse(response.body);
                winston.info('======= Got Photo Results from Foursquare ======== ');

                var items = foursquare_photo_response.response.photos.items                  

                // Get top venue photos
                for(var j = 0; j < items.length && j < 1; j++) {
                    var imageUrl = items[j].prefix + items[j].width + 'x' + items[j].height + items[j].suffix
                    winston.info("COPY THIS", imageUrl)
                    venueId2Url.set(venueIdKeys[0], imageUrl)
                }
                callback(null, venueId2Url.values())
            });
            
        },
        function(callback) {

            var FOURSQUARE_URI_IMAGE_PREFIX = 'https://api.foursquare.com/v2/venues/'
            var FOURSQUARE_URI_IMAGE_SUFFIX = '/photos?oauth_token=K4CYK3B1Z4O0LXD0BYMX2S4YE0ZPACNYMGKWQCELDRE0KQVM&v=20150715'
            var venueIdKeys = venueId2Name.keys()


            var FOURSQUARE_IMAGE_URI = FOURSQUARE_URI_IMAGE_PREFIX + venueIdKeys[2] + FOURSQUARE_URI_IMAGE_SUFFIX

            // Call Foursquare API to get things to do
            request(FOURSQUARE_IMAGE_URI, function (error, response) {

                if (error) {
                    winston.error('===== Error While Getting Photo Data from Foursquare====');
                    return;
                } 

                var foursquare_photo_response = JSON.parse(response.body);
                winston.info('======= Got Photo Results from Foursquare ======== ');

                var items = foursquare_photo_response.response.photos.items                  

                // Get top venue photos
                for(var j = 0; j < items.length && j < 1; j++) {
                    var imageUrl = items[j].prefix + items[j].width + 'x' + items[j].height + items[j].suffix
                    winston.info("COPY THIS", imageUrl)
                    venueId2Url.set(venueIdKeys[0], imageUrl)
                }
                callback(null, venueId2Url.values())
            });
            
        },
        function(callback) {

            var FOURSQUARE_URI_IMAGE_PREFIX = 'https://api.foursquare.com/v2/venues/'
            var FOURSQUARE_URI_IMAGE_SUFFIX = '/photos?oauth_token=K4CYK3B1Z4O0LXD0BYMX2S4YE0ZPACNYMGKWQCELDRE0KQVM&v=20150715'
            var venueIdKeys = venueId2Name.keys()


            var FOURSQUARE_IMAGE_URI = FOURSQUARE_URI_IMAGE_PREFIX + venueIdKeys[3] + FOURSQUARE_URI_IMAGE_SUFFIX

            // Call Foursquare API to get things to do
            request(FOURSQUARE_IMAGE_URI, function (error, response) {

                if (error) {
                    winston.error('===== Error While Getting Photo Data from Foursquare====');
                    return;
                } 

                var foursquare_photo_response = JSON.parse(response.body);
                winston.info('======= Got Photo Results from Foursquare ======== ');

                var items = foursquare_photo_response.response.photos.items                  

                // Get top venue photos
                for(var j = 0; j < items.length && j < 1; j++) {
                    var imageUrl = items[j].prefix + items[j].width + 'x' + items[j].height + items[j].suffix
                    winston.info("COPY THIS", imageUrl)
                    venueId2Url.set(venueIdKeys[0], imageUrl)
                }
                callback(null, venueId2Url.values())
            });
            
        },
        function(callback) {

            var FOURSQUARE_URI_IMAGE_PREFIX = 'https://api.foursquare.com/v2/venues/'
            var FOURSQUARE_URI_IMAGE_SUFFIX = '/photos?oauth_token=K4CYK3B1Z4O0LXD0BYMX2S4YE0ZPACNYMGKWQCELDRE0KQVM&v=20150715'
            var venueIdKeys = venueId2Name.keys()


            var FOURSQUARE_IMAGE_URI = FOURSQUARE_URI_IMAGE_PREFIX + venueIdKeys[4] + FOURSQUARE_URI_IMAGE_SUFFIX

            // Call Foursquare API to get things to do
            request(FOURSQUARE_IMAGE_URI, function (error, response) {

                if (error) {
                    winston.error('===== Error While Getting Photo Data from Foursquare====');
                    return;
                } 

                var foursquare_photo_response = JSON.parse(response.body);
                winston.info('======= Got Photo Results from Foursquare ======== ');

                var items = foursquare_photo_response.response.photos.items                  

                // Get top venue photos
                for(var j = 0; j < items.length && j < 1; j++) {
                    var imageUrl = items[j].prefix + items[j].width + 'x' + items[j].height + items[j].suffix
                    winston.info("COPY THIS", imageUrl)
                    venueId2Url.set(venueIdKeys[0], imageUrl)
                }
                callback(null, venueId2Url.values())
            });
            
        }
    ],
    // optional callback
    function(err, results){
        // results is now equal to ['one', 'two']
        venue1 = {'name': results[0][0], 'url': results[1]}
        venue2 = {'name': results[0][1], 'url': results[2]}
        venue3 = {'name': results[0][2], 'url': results[3]}
        venue4 = {'name': results[0][3], 'url': results[4]}
        venue5 = {'name': results[0][4], 'url': results[5]}

        venueArray = [venue1, venue2, venue3, venue4, venue5]

        venueInfo = {'things-to-do': venueArray}

        res.send(venueInfo)
    });

});


function getDestination(req) {
    var url_parts = url.parse(req.url, true);
    return url_parts.query.destination;
}


module.exports = router;
