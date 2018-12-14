

window.onload = function() {
    window.charts = [];
    addPlot();

    var corswrapper = "https://cors-anywhere.herokuapp.com/";
    var file = "https://raw.githubusercontent.com/gleicher/765-2017-dc2-simple-python-spaghetti/master/SampleData/simple-10-200.csv";

    var url_param = window.location.search;
    if(url_param.length > 1) {
        file = url_param.substring(1);
    }

    file = corswrapper + file;

    getText(file, function(text){
        var csv = parseCSV(text);

        var serieses = [];
        for(var series_id = 0; series_id < csv[0].length; series_id++) {
            serieses[series_id] = [];
            for(var row_id = 1; row_id < csv.length; row_id++) {
                serieses[series_id].push(csv[row_id][series_id]);
            }
        }

        setLabel(serieses[0]);

        for(var series_id = 1; series_id < csv[0].length; series_id++) {
            addDataset(0, serieses[series_id]);
        }
        console.log(csv);


        splitPlot();
    });

};

document.getElementById('randomizeData').addEventListener('click', function() {
    randomizeData();
});

document.getElementById('addDataset').addEventListener('click', function() {
    addRandomDataset(0);
});

document.getElementById('splitPlot').addEventListener('click', function() {
    splitPlot();
});

document.getElementById('addPlot').addEventListener('click', function() {
    addPlot();
});