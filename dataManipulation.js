
var allDataSets = [];
var plot_count = 0;
var dataset_count = 0;

var colorNames = Object.keys(window.chartColors);

drawChart = function(){
    for(var i = 0; i<plot_count; i++) {
        if(window.charts[i]){
            window.charts[i].update();
        }
    }
}

setLabel = function(labels) {
    configTemplate.data.labels = labels;

    for(var i=0; i< plot_count; i++) {
        allDataSets[i].data.labels = labels;
    }

    drawChart();
}

addRandomDataset = function(plot_id){
    data = [];

    for (var index = 0; index < configTemplate.data.labels.length; ++index) {
        data.push(randomScalingFactor());
    }

    addDataset(plot_id, data);
}

addDataset = function(plot_id, dataset){
    var colorName = colorNames[allDataSets[plot_id].data.datasets.length % colorNames.length];
    var newColor = window.chartColors[colorName];


    var newDataset = {
        id: dataset_count,
        label: 'Dataset ' + allDataSets[plot_id].data.datasets.length,
        backgroundColor: newColor,
        borderColor: newColor,
        data: dataset,
        fill: false
    };
    dataset_count++;

    allDataSets[plot_id].data.datasets.push(newDataset);
    drawChart();
}

randomizeData = function(){
    for(var i = 0; i<plot_count; i++) {
        allDataSets[i].data.datasets = allDataSets[i].data.datasets.map(function(dataset){
            dataset.data = dataset.data.map(function(){
                return randomScalingFactor();
            });
            return dataset;
        });
    }

    drawChart();
}


addPlot = function(){
    c = document.createElement("canvas");

    c.id = "c_"+plot_count;

    container = document.getElementById("canvas_container");
    container.appendChild(c);

    var ctx = c.getContext('2d');
    var config = JSON.parse(JSON.stringify(configTemplate));
    console.log(config);
    allDataSets[plot_count]=config;

    window.charts[plot_count] = new Chart(ctx, allDataSets[plot_count]);

    plot_count++;
}

getDatasetData = function(dataset_id){
    dataset_plot = allDataSets.find(function(plot) {
        return plot.data.datasets.find(function(dataset){return dataset.id == dataset_id; }) !== undefined;
    });
    dataset = dataset_plot.data.datasets.find(function(dataset){return dataset.id == dataset_id; });
    return dataset;
}

calculateError = function(dataset_id1, dataset_id2) {
    dataset1 = getDatasetData(dataset_id1).data;
    dataset2 = getDatasetData(dataset_id2).data;

    var total_error = 0;
    for(var i =0; i<dataset1.length; i++) {
        total_error += Math.sqrt(Math.abs(dataset1[i] - dataset2[i]));
    }

    return total_error;
}

splitPlot = function(){
    scores = [];
    for(var dataset_id = 0; dataset_id < dataset_count; dataset_id ++) {
        scores[dataset_id] = [];
        for(var other_dataset_id = 0; other_dataset_id < dataset_count; other_dataset_id ++) {
            var score = calculateError(dataset_id, other_dataset_id);
            scores[dataset_id][other_dataset_id] = score;
        }
    }

    groups = [];
    for(var dataset = 0; dataset < dataset_count; dataset++) {
        if ( groups.length < plot_count ) {
            groups.push([dataset]);
        } else {
            var min_impact = 10000000;
            var preferred_group = -1;
            for(var group_idx = 0; group_idx < groups.length; group_idx++) {
                var group_conflict = 0;
                for(var group_entry_idx = 0; group_entry_idx < groups[group_idx].length; group_entry_idx++) {
                    group_conflict += scores[dataset][groups[group_idx][group_entry_idx]];
                }

                if(group_conflict < min_impact) {
                    min_impact = group_conflict;
                    preferred_group = group_idx;
                }
            }

            groups[preferred_group].push(dataset);
        }
    }

    grouped_datasets = [];
    groups.forEach(function(group) {
        dataset_group = [];

        group.forEach(function(dataset_id){
            dataset_group.push(getDatasetData(dataset_id));
        });

        grouped_datasets.push(dataset_group);
    });

    for(var plot_id = 0; plot_id < plot_count; plot_id++) {
        allDataSets[plot_id].data.datasets = grouped_datasets[plot_id];
    }

    drawChart();

}