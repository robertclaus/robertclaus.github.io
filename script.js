var groupDomain;

function createBubbleChart(error, entries) {
  var length = entries.map(function(entry) { return +entry.chars_total; });
  var meanPopulation = d3.mean(length),
      lengthExtent = d3.extent(length),
      lengthScaleX,
      lengthScaleY;

  var mainKey = "groupID";
  var secondaryKey = "topicID";
  var titleKey = "groupID";

  var groups = d3.set(entries.map(function(entry) { return entry[mainKey]; }));
  groupDomain = groups.values();
  var groupColorScale = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(groupDomain);


  var width = 1200,
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
      if (country) {
        info = [country[titleKey], formatLength(country.chars_total)].join(": ");
      }
      d3.select("#country-info").html(info);
    }
  }

  function updateCircles() {
    circles
      .attr("fill", function(d) {
        return groupColorScale(d[mainKey]);
      });
  }

  function createForces() {
    var forceStrength = 0.05;

    forces = {
      combine:        createCombineForces(),
      continent:      createGroupedForces(),
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
        x: d3.forceX(continentForceX).strength(forceStrength),
        y: d3.forceY(continentForceY).strength(forceStrength)
      };

      function continentForceX(d) {
          var groupCount = groupDomain.length;
          var rowLength = Math.ceil(Math.sqrt(groupCount));
          var columnLength = Math.ceil(groupCount/rowLength);

          var groupIndex = groupDomain.indexOf(d[mainKey]);

          var rowCount = Math.floor(groupIndex/rowLength);
          var columnCount = groupCount - (rowCount*rowLength);

          return (width/rowLength)*rowCount;
      }

      function continentForceY(d) {
          var groupCount = groupDomain.length;
          var rowLength = Math.ceil(Math.sqrt(groupCount));
          var columnLength = Math.ceil(groupCount/rowLength);

          var groupIndex = groupDomain.indexOf(d[mainKey]);

          var rowCount = Math.floor(groupIndex/rowLength);
          var columnCount = groupCount - (rowCount*rowLength);

          return (width/columnLength)*columnCount;
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
            return lengthScaleX(d[mainKey]) + centerCirclesInScaleBandOffset;
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
    addListener("#combine",         forces.combine);
    addListener("#groups",      forces.continent);
    addListener("#total_chars",      forces.length);

    function addListener(selector, forces) {
      d3.select(selector).on("click", function() {
        updateForces(forces);
        toggleContinentKey(!lengthGrouping());
        toggleLengthAxes(lengthGrouping());
      });
    }

    function updateForces(forces) {
      forceSimulation
        .force("x", forces.x)
        .force("y", forces.y)
        .force("collide", d3.forceCollide(forceCollide))
        .alphaTarget(0.5)
        .restart();
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
