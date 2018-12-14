var configTemplate = {
    type: 'line',
    data: {
        labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
        datasets: []
    },
    options: {
        responsive: true,
        title: {
            display: true,
            text: 'Datasets'
        },
        tooltips: {
            mode: 'index',
            intersect: false,
        },
        hover: {
            mode: 'nearest',
            intersect: true
        },
        legend: {
                    display: false
                 },
        scales: {
            xAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'X'
                }
            }],
            yAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'Y'
                }
            }]
        }
    }
};

var errorChartTemplate = {
    type: 'line',
    data: {
        labels: [1],
        datasets: []
    },
    options: {
        responsive: true,
        title: {
            display: true,
            text: 'Error Per Plot'
        },
        tooltips: {
            mode: 'index',
            intersect: false,
        },
        hover: {
            mode: 'nearest',
            intersect: true
        },
        scales: {
            xAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'Plot Count'
                }
            }],
            yAxes: [{
                display: true,
                type: 'logarithmic',
                scaleLabel: {
                    display: true,
                    labelString: 'Error'
                }
            }]
        }
    }
};