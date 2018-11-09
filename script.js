var groupDomain;
var topicDomain;
var userDomain;
var responseDomain;
var timeDomain;
var lengthDomain;

var showAxis=false;


var width;
var height;
var scale = 5;
var svg,
      circles,
      circleSize = { min: 10, max: 80 };


  var circleRadiusScale;


 var currentForces;

function createBubbleChart(error, entries) {
  var length = entries.map(function(entry) { return +entry.chars_total; });
  var meanPopulation = d3.mean(length),
      lengthExtent = d3.extent(length),
      lengthScaleX,
      lengthScaleY;

  var topicKey = "topicID";
  var groupKey = "groupID";
  var responseCountKey = "numChildren";
  var timeKey = "time";
  var lengthKey = "chars_total";

  entries.forEach(function(d) {
      d[timeKey] = new Date(Date.parse(d[timeKey]));
      d[responseCountKey] = parseInt(d[responseCountKey]);
  });


  var groups = d3.set(entries.map(function(entry) { return entry[groupKey]; }));
  groupDomain = groups.values();

    var topics = d3.set(entries.map(function(entry) { return entry[topicKey]; }));
    topicDomain = topics.values();

    var users = d3.set(entries.map(function(entry) { return entry["user"]; }));
    userDomain = users.values();

    responseDomain = entries.map(function(entry) { return entry[responseCountKey]; }).sort(function(a,b){ return b-a;});;

    timeDomain = entries.map(function(entry) { return entry[timeKey]; }).sort(function(a,b){ return b-a;});;

    lengthDomain = entries.map(function(entry) { return entry[lengthKey]; }).sort(function(a,b){ return b-a;});;

  var groupColorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(topicDomain);


  width = 1200,
  height = 800;

circleRadiusScale = d3.scaleSqrt()
    .domain(lengthExtent)
    .range([circleSize.min, circleSize.max]);

  var forces,
      forceSimulation;

  createSVG();
  toggleContinentKey();
  createCircles();
  createForces();
  createForceSimulation();
  addFillListener();
  addGroupingListeners();

  function createSVG() {
    svg = d3.select("#bubble-chart")
      .append("svg")
        .attr("width", width)
        .attr("height", height);
  }

  function toggleContinentKey(should_show) {
    var keyElementWidth = 150,
        keyElementHeight = 30;
    var onScreenYOffset = keyElementHeight*1.5,
        offScreenYOffset = 100;

    if (d3.select(".continent-key").empty()) {
      createContinentKey();
    }
    var continentKey = d3.select(".continent-key");


    translateContinentKey("translate(0," + (0 - onScreenYOffset) + ")");

    if(should_show) {
        continentKey.style("opacity", 1);
    }else{
        continentKey.style("opacity", 0);
    }

    function createContinentKey() {
      var keyWidth = keyElementWidth * topicDomain.length;
      var continentKeyScale = d3.scaleBand()
        .domain(topicDomain)
        .range([(width - keyWidth) / 2, (width + keyWidth) / 2]);

      svg.append("g")
        .attr("class", "continent-key")
        .attr("transform", "translate(0," + (0 + offScreenYOffset) + ")")
        .selectAll("g")
        .data(topicDomain)
        .enter()
          .append("g")
            .attr("class", "continent-key-element");

      d3.selectAll("g.continent-key-element")
        .append("rect")
          .attr("width", keyElementWidth)
          .attr("height", keyElementHeight)
          .attr("x", function(d) { return continentKeyScale(d); })
          .attr("fill", function(d) { return groupColorScale(d); });

      d3.selectAll("g.continent-key-element")
        .append("text")
          .attr("text-anchor", "middle")
          .attr("x", function(d) { return continentKeyScale(d) + keyElementWidth/2; })
          .text(function(d) { return d; });

      // The text BBox has non-zero values only after rendering
      d3.selectAll("g.continent-key-element text")
          .attr("y", function(d) {
            var textHeight = this.getBBox().height;
            // The BBox.height property includes some extra height we need to remove
            var unneededTextHeight = 4;
            return ((keyElementHeight + textHeight) / 2) - unneededTextHeight;
          });
    }

    function translateContinentKey(translation) {
      continentKey
        .transition()
        .duration(500)
        .attr("transform", translation);
    }
  }

  function createCircles() {
    var formatLength = d3.format(",");
    circles = svg.selectAll("circle")
      .data(entries)
      .enter()
        .append("circle")
        .attr("r", function(d) { return circleRadiusScale(d.chars_total * (scale/100)); })
        .on("mouseover", function(d) {
          updateCountryInfo(d);
        })
        .on("mouseout", function(d) {
          updateCountryInfo();
        });
    updateCircles();

    function updateCountryInfo(elem) {
      var info = "";
      if (elem) {
        info = ["<br><br><br><br>Group: ",elem[groupKey],
        "<br>Topic: ",elem[topicKey],
        "<br>Length: ", elem['chars_total'],
        "<br>Number of Children: ", elem[responseCountKey],
        "<br>Time: ", elem[timeKey].toDateString()
        ].join("");
      }
      d3.select("#country-info").html(info);
    }
  }

  function updateCircles() {
    circles
      .attr("fill", function(d) {
        return groupColorScale(d[topicKey]);
      });
  }









/* Forces */

  function createForces() {
    var forceStrength = 0.03;

    forces = {
      combine:        createCombineForces(),
      group:      createGroupedForces(),
      topic:      createTopicForces(),
      user:         createUserForces(),
      over_time:     createOverTimeForces(),
      over_time_size: createOverTimeSizeForces()
    };

    function createCombineForces() {
      return {
        x: d3.forceX(width / 2).strength(forceStrength),
        y: d3.forceY(height / 2).strength(forceStrength)
      };
    }

    function createGroupedForces() {
      return {
        x: d3.forceX(groupForceX).strength(forceStrength),
        y: d3.forceY(groupForceY).strength(forceStrength)
      };

      function groupForceX(d) {
          return seperateForce(d, groupDomain, groupKey, true);
      }

      function groupForceY(d) {
          return seperateForce(d, groupDomain, groupKey, false);
      }
    }

        function createTopicForces() {
          return {
            x: d3.forceX(topicForceX).strength(forceStrength),
            y: d3.forceY(topicForceY).strength(forceStrength)
          };

          function topicForceX(d) {
              return seperateForce(d, topicDomain, topicKey, true);
          }

          function topicForceY(d) {
                return seperateForce(d, topicDomain, topicKey, false);
          }

        }

         function createUserForces() {
                  return {
                    x: d3.forceX(userForceX).strength(forceStrength),
                    y: d3.forceY(userForceY).strength(forceStrength)
                  };

                  function userForceX(d) {
                      return seperateForce(d, userDomain, "user", true);
                  }

                  function userForceY(d) {
                        return seperateForce(d, userDomain, "user", false);
                  }
                }

        function seperateForce(d, domain, key, isX) {
          var groupCount = domain.length;
          var rowLength = Math.ceil(Math.sqrt(groupCount));
          var columnLength = Math.ceil(groupCount/rowLength);

          var groupIndex = domain.indexOf(d[key]);

          var columnCount = Math.floor(groupIndex/rowLength);
          var rowCount = (groupIndex%rowLength);

          if(isX){
                    var perGroupWidth = width/rowLength;
                    return (perGroupWidth/2) + perGroupWidth*rowCount;
          } else {
                    var perColumnHeight = height/columnLength;
                    return (perColumnHeight/2) + perColumnHeight*columnCount;
          }
        }





    function createOverTimeForces() {
      return {
        x: d3.forceX(function(d) {
            return generateTimeForces(d, true, responseDomain, responseCountKey);
          }).strength(forceStrength),
        y: d3.forceY(function(d) {
          return generateTimeForces(d, false, responseDomain, responseCountKey);
        }).strength(forceStrength)
      };
    }

    function createOverTimeSizeForces() {
          return {
            x: d3.forceX(function(d) {
                return generateTimeForces(d, true, lengthDomain, lengthKey);
              }).strength(forceStrength),
            y: d3.forceY(function(d) {
              return generateTimeForces(d, false, lengthDomain, lengthKey);
            }).strength(forceStrength)
          };
        }

     function generateTimeForces(d, isX, yDomain, yKey) {
            var scaledLengthMargin = 100;
           var startDate = timeDomain[0];
           var endDate = timeDomain[timeDomain.length -1];

           lengthScaleX = d3.scaleTime()
             .domain([endDate, startDate])
             .range([scaledLengthMargin, width-scaledLengthMargin]);
           lengthScaleY = d3.scaleLinear()
             .domain([yDomain[0], yDomain[yDomain.length-1]])
             .range([scaledLengthMargin, height-scaledLengthMargin]);

           if(isX){
                return lengthScaleX(d[timeKey]);
           } else {
               return lengthScaleY(d[yKey]);
           }
     }

  }

  function createForceSimulation() {
    forceSimulation = d3.forceSimulation()
      .force("x", forces.combine.x)
      .force("y", forces.combine.y)
      .force("collide", d3.forceCollide(forceCollide));
    forceSimulation.nodes(entries)
      .on("tick", function() {
        circles
          .attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; });
      });
  }

  function forceCollide(d) {
    return circleRadiusScale(d.chars_total * (scale/100)) + 1;
  }

    function updateForces(forces) {
      forceSimulation
        .force("x", forces.x)
        .force("y", forces.y)
        .force("collide", d3.forceCollide(forceCollide))
        .alphaTarget(0.3)
        .restart();
    }















currentForces = forces.combine;

d3.select("#scale").on("change",function(){
    scale = document.getElementById("scale").value;
    circles.attr("r", function(d) { return circleRadiusScale(d.chars_total * (scale/100)); });
    updateForces(currentForces);
});

  function lengthGrouping() {
    return showAxis;
  }

  function addFillListener() {
    d3.selectAll('input[name="fill"]')
      .on("change", function() {
        toggleContinentKey(!lengthGrouping());
        updateCircles();
      });
  }

  function addGroupingListeners() {
    addListener("#combine", forces.combine, false);
    addListener("#groups", forces.group, false);
    addListener("#topic", forces.topic, false);
    addListener("#user", forces.user, false);
    addListener("#over_time", forces.over_time, true);
    addListener("#over_time_size",forces.over_time_size, true);

    function addListener(selector, forces, should_show_axis) {


      d3.select(selector).on("click", function() {

      showAxis = should_show_axis;
        currentForces = forces;
        updateForces(forces);
        toggleContinentKey(!lengthGrouping());

        d3.select(".y-axis").remove();
        toggleLengthAxes(lengthGrouping());
      });
    }

    function toggleLengthAxes(showAxes) {
      var onScreenXOffset = 40,
          offScreenXOffset = -40;
      var onScreenYOffset = 40,
          offScreenYOffset = 100;

      if (d3.select(".y-axis").empty()) {
        createAxes();
      }
      var xAxis = d3.select(".x-axis"),
          yAxis = d3.select(".y-axis");

      if (showAxes) {
        translateAxis(xAxis, "translate(0," + (height - onScreenYOffset) + ")");
        translateAxis(yAxis, "translate(" + onScreenXOffset + ",0)");
      } else {
        translateAxis(xAxis, "translate(0," + (height + offScreenYOffset) + ")");
        translateAxis(yAxis, "translate(" + offScreenXOffset + ",0)");
      }

      function createAxes() {
        var numberOfTicks = 10,
            tickFormat = ".0s";

        var xAxis = d3.axisBottom(lengthScaleX);
          //.ticks(numberOfTicks, tickFormat);

        svg.append("g")
          .attr("class", "x-axis")
          .attr("transform", "translate(0," + (height + offScreenYOffset) + ")")
          .call(xAxis)
          .selectAll(".tick text")
            .attr("font-size", "16px");

        var yAxis = d3.axisLeft(lengthScaleY);
          //.ticks(numberOfTicks, tickFormat);
        svg.append("g")
          .attr("class", "y-axis")
          .attr("transform", "translate(" + offScreenXOffset + ",0)")
          .call(yAxis);
      }

      function translateAxis(axis, translation) {
        axis
          .transition()
          .duration(500)
          .attr("transform", translation);
      }
    }
  }

}
