var groupDomain;
var topicDomain;
var userDomain;
var width;
var height;

function createBubbleChart(error, entries) {
  var length = entries.map(function(entry) { return +entry.chars_total; });
  var meanPopulation = d3.mean(length),
      lengthExtent = d3.extent(length),
      lengthScaleX,
      lengthScaleY;

  var topicKey = "topicID";
  var groupKey = "groupID";
  var responseCountKey = "numChildren"

  var groups = d3.set(entries.map(function(entry) { return entry[topicKey]; }));
  groupDomain = groups.values();

    var topics = d3.set(entries.map(function(entry) { return entry[groupKey]; }));
    topicDomain = topics.values();

        var users = d3.set(entries.map(function(entry) { return entry["user"]; }));
        userDomain = users.values();

  var groupColorScale = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(groupDomain);


  width = 1200,
  height = 800;

  var svg,
      circles,
      circleSize = { min: 10, max: 80 };
  var circleRadiusScale = d3.scaleSqrt()
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

  function toggleContinentKey() {
    var keyElementWidth = 150,
        keyElementHeight = 30;
    var onScreenYOffset = keyElementHeight*1.5,
        offScreenYOffset = 100;

    if (d3.select(".continent-key").empty()) {
      createContinentKey();
    }
    var continentKey = d3.select(".continent-key");

    translateContinentKey("translate(0," + (height - onScreenYOffset) + ")");

    function createContinentKey() {
      var keyWidth = keyElementWidth * groups.values().length;
      var continentKeyScale = d3.scaleBand()
        .domain(groups.values())
        .range([(width - keyWidth) / 2, (width + keyWidth) / 2]);

      svg.append("g")
        .attr("class", "continent-key")
        .attr("transform", "translate(0," + (height + offScreenYOffset) + ")")
        .selectAll("g")
        .data(groups.values())
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

  function isChecked(elementID) {
    return d3.select(elementID).property("checked");
  }

  function createCircles() {
    var formatLength = d3.format(",");
    circles = svg.selectAll("circle")
      .data(entries)
      .enter()
        .append("circle")
        .attr("r", function(d) { return circleRadiusScale(d.chars_total); })
        .on("mouseover", function(d) {
          updateCountryInfo(d);
        })
        .on("mouseout", function(d) {
          updateCountryInfo();
        });
    updateCircles();

    function updateCountryInfo(country) {
      var info = "";
      if (elem) {
        info = "Group: {} \nTopic: {} \nLength: {} \nNumber of Children: {}".format(elem[groupKey], elem[topicKey], elem['chars_total'], elem[responseCountKey]);
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
    var forceStrength = 0.05;

    forces = {
      combine:        createCombineForces(),
      group:      createGroupedForces(),
      topic:      createTopicForces(),
      user:         createUserForces(),
      length:     createLengthForces()
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

    function createLengthForces() {
      var scaledLengthMargin = circleSize.max;

      lengthScaleX = d3.scaleBand()
        .domain(groupDomain)
        .range([scaledLengthMargin, width - scaledLengthMargin*2]);
      lengthScaleY = d3.scaleLog()
        .domain(lengthExtent)
        .range([height - scaledLengthMargin, scaledLengthMargin*2]);

      var centerCirclesInScaleBandOffset = lengthScaleX.bandwidth() / 2;
      return {
        x: d3.forceX(function(d) {
            return lengthScaleX(d[topicKey]) + centerCirclesInScaleBandOffset;
          }).strength(forceStrength),
        y: d3.forceY(function(d) {
          return lengthScaleY(d.chars_total);
        }).strength(forceStrength)
      };
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
    return lengthGrouping() ? 0 : circleRadiusScale(d.chars_total) + 1;
  }

    function updateForces(forces) {
      forceSimulation
        .force("x", forces.x)
        .force("y", forces.y)
        .force("collide", d3.forceCollide(forceCollide))
        .alphaTarget(0.5)
        .restart();
    }



















  function lengthGrouping() {
    return isChecked("#total_chars");
  }

  function addFillListener() {
    d3.selectAll('input[name="fill"]')
      .on("change", function() {
        toggleContinentKey(!lengthGrouping());
        updateCircles();
      });
  }

  function addGroupingListeners() {
    addListener("#combine", forces.combine);
    addListener("#groups", forces.group);
    addListener("#topic", forces.topic);
    addListener("#user", forces.user);
    addListener("#total_chars", forces.length);
    addListener("#response_count", forces.response_count)

    function addListener(selector, forces) {
      d3.select(selector).on("click", function() {
        updateForces(forces);
        toggleContinentKey(!lengthGrouping());
        toggleLengthAxes(lengthGrouping());
      });
    }

    function toggleLengthAxes(showAxes) {
      var onScreenXOffset = 40,
          offScreenXOffset = -40;
      var onScreenYOffset = 40,
          offScreenYOffset = 100;

      if (d3.select(".x-axis").empty()) {
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

        var xAxis = d3.axisBottom(lengthScaleX)
          .ticks(numberOfTicks, tickFormat);

        svg.append("g")
          .attr("class", "x-axis")
          .attr("transform", "translate(0," + (height + offScreenYOffset) + ")")
          .call(xAxis)
          .selectAll(".tick text")
            .attr("font-size", "16px");

        var yAxis = d3.axisLeft(lengthScaleY)
          .ticks(numberOfTicks, tickFormat);
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
